import React, { useState } from 'react';
import { 
  Sun, Star, Calendar, CheckSquare, Clipboard, 
  User, Plus, MoreVertical, Edit2, Trash2 
} from 'lucide-react';
import { ListaTarefas, Tarefa } from '../../types/tarefas';

interface SidebarTarefasProps {
  listas: ListaTarefas[];
  tarefas: Tarefa[];
  activeView: string; // 'meu-dia' | 'importante' | 'planejado' | 'todas' | 'concluida' | 'atribuido' | listaId
  onSelectView: (view: string) => void;
  onAddLista: (nome: string) => void;
  onUpdateLista: (lista: ListaTarefas) => void;
  onExcluirLista: (id: string) => void;
  currentUser: { id?: string; email?: string | null } | null;
}

export const SidebarTarefas: React.FC<SidebarTarefasProps> = ({
  listas,
  tarefas,
  activeView,
  onSelectView,
  onAddLista,
  onUpdateLista,
  onExcluirLista,
  currentUser,
}) => {
  const [showAddInput, setShowAddInput] = useState(false);
  const [novaListaNome, setNovaListaNome] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Counters
  const countMeuDia = tarefas.filter(t => t.meuDia && t.status !== 'concluida').length;
  const countImportante = tarefas.filter(t => t.estrela && t.status !== 'concluida').length;
  const countPlanejado = tarefas.filter(t => t.dataVencimento && t.status !== 'concluida').length;
  const countTodas = tarefas.filter(t => t.status !== 'concluida').length;
  const countConcluidas = tarefas.filter(t => t.status === 'concluida').length;
  
  const userName = currentUser?.displayName || 'Rocha'; // Fallback to current role if matching name
  const countAtribuido = tarefas.filter(t => t.responsavel?.toLowerCase() === userName.toLowerCase() && t.status !== 'concluida').length;

  const handleAddListaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;
    onAddLista(novaListaNome.trim());
    setNovaListaNome('');
    setShowAddInput(false);
  };

  const handleMudarCor = (l: ListaTarefas, cor: string) => {
    onUpdateLista({ ...l, cor });
    setActiveMenuId(null);
  };

  const handleRenomear = (l: ListaTarefas) => {
    const novoNome = window.prompt('Digite o novo nome para a lista:', l.nome);
    if (novoNome && novoNome.trim()) {
      onUpdateLista({ ...l, nome: novoNome.trim() });
    }
    setActiveMenuId(null);
  };

  const handleExcluir = (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a lista "${nome}"?`)) {
      onExcluirLista(id);
      if (activeView === id) {
        onSelectView('todas');
      }
    }
    setActiveMenuId(null);
  };

  const getListCount = (listaId: string) => {
    return tarefas.filter(t => t.listaId === listaId && t.status !== 'concluida').length;
  };

  const colors = ['var(--primary)', '#1C6E8C', '#6D4C9C', 'var(--green)', 'var(--yellow)', 'var(--yellow)', '#94A3B8', '#E11D48', '#2563EB', '#059669'];

  return (
    <div className="w-64 bg-[#1C1F26] text-[var(--text-3)] flex flex-col h-full select-none border-r border-[#15181F]">
      {/* User Info Header */}
      <div className="p-4 border-b border-[#2D3139] flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm shadow-inner">
          {userName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--text-3)] font-semibold uppercase tracking-wider">Gestor de Tarefas</p>
          <p className="text-sm font-bold text-white truncate">{userName}</p>
        </div>
      </div>

      {/* Smart Filters (Visões Fixas) */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        <button
          onClick={() => onSelectView('meu-dia')}
          className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold transition ${
            activeView === 'meu-dia' ? 'bg-[#2D3139] text-white font-bold' : 'hover:bg-[#252830] text-[var(--text-3)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Sun className={`h-4 w-4 ${activeView === 'meu-dia' ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-3)]'}`} />
            <span>Meu Dia</span>
          </div>
          {countMeuDia > 0 && <span className="text-[10px] bg-[var(--primary)] text-white font-bold px-1.5 py-0.5 rounded-full">{countMeuDia}</span>}
        </button>

        <button
          onClick={() => onSelectView('importante')}
          className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold transition ${
            activeView === 'importante' ? 'bg-[#2D3139] text-white font-bold' : 'hover:bg-[#252830] text-[var(--text-3)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Star className={`h-4 w-4 ${activeView === 'importante' ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-3)]'}`} />
            <span>Importante</span>
          </div>
          {countImportante > 0 && <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full">{countImportante}</span>}
        </button>

        <button
          onClick={() => onSelectView('planejado')}
          className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold transition ${
            activeView === 'planejado' ? 'bg-[#2D3139] text-white font-bold' : 'hover:bg-[#252830] text-[var(--text-3)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-[var(--text-3)]" />
            <span>Planejado</span>
          </div>
          {countPlanejado > 0 && <span className="text-[10px] bg-[#2D3139] border border-slate-500 text-[var(--text-3)] font-bold px-1.5 py-0.5 rounded-full">{countPlanejado}</span>}
        </button>

        <button
          onClick={() => onSelectView('todas')}
          className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold transition ${
            activeView === 'todas' ? 'bg-[#2D3139] text-white font-bold' : 'hover:bg-[#252830] text-[var(--text-3)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="h-4 w-4 text-[var(--text-3)]" />
            <span>Todas as Tarefas</span>
          </div>
          {countTodas > 0 && <span className="text-[10px] bg-slate-700 text-[var(--text-3)] font-bold px-1.5 py-0.5 rounded-full">{countTodas}</span>}
        </button>

        <button
          onClick={() => onSelectView('concluida')}
          className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold transition ${
            activeView === 'concluida' ? 'bg-[#2D3139] text-white font-bold' : 'hover:bg-[#252830] text-[var(--text-3)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Clipboard className="h-4 w-4 text-[var(--text-3)]" />
            <span>Concluídas</span>
          </div>
          {countConcluidas > 0 && <span className="text-[10px] bg-slate-800 text-[var(--text-3)] px-1.5 py-0.5 rounded-full">{countConcluidas}</span>}
        </button>

        <button
          onClick={() => onSelectView('atribuido')}
          className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold transition ${
            activeView === 'atribuido' ? 'bg-[#2D3139] text-white font-bold' : 'hover:bg-[#252830] text-[var(--text-3)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-[var(--text-3)]" />
            <span>Atribuídas a mim</span>
          </div>
          {countAtribuido > 0 && <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-full">{countAtribuido}</span>}
        </button>

        {/* Separador */}
        <div className="pt-4 pb-2 px-4">
          <div className="h-px bg-[#2D3139]" />
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mt-3">MINHAS LISTAS</p>
        </div>

        {/* Dynamic List Items */}
        <div className="space-y-0.5">
          {listas.map(lista => {
            const isSelected = activeView === lista.id;
            const menuOpen = activeMenuId === lista.id;
            const count = getListCount(lista.id);

            return (
              <div key={lista.id} className="relative group/item">
                <div
                  onClick={() => onSelectView(lista.id)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold cursor-pointer transition ${
                    isSelected ? 'bg-[#2D3139] text-white font-bold' : 'hover:bg-[#252830] text-[var(--text-3)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-6">
                    <span 
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lista.cor || '#94A3B8' }}
                    />
                    <span className="truncate">{lista.nome}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {count > 0 && (
                      <span className="text-[10px] text-[var(--text-3)] group-hover/item:hidden">
                        {count}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(menuOpen ? null : lista.id);
                      }}
                      className="p-1 text-[var(--text-3)] hover:text-white rounded hidden group-hover/item:block transition"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* More Options Dropdown */}
                {menuOpen && (
                  <div className="absolute right-4 top-8 z-40 bg-[#252830] border border-[#3E424B] rounded-xl shadow-2xl p-2 space-y-1 w-44">
                    <button
                      onClick={() => handleRenomear(lista)}
                      className="w-full text-left text-[11px] font-semibold flex items-center gap-2 p-1.5 hover:bg-[#2D3139] hover:text-white rounded"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Renomear
                    </button>
                    <div className="p-1.5">
                      <p className="text-[10px] text-[var(--text-3)] font-bold uppercase mb-1">Escolher Cor:</p>
                      <div className="grid grid-cols-5 gap-1">
                        {colors.map(col => (
                          <button
                            key={col}
                            onClick={() => handleMudarCor(lista, col)}
                            className="h-4 w-4 rounded-full border border-[#3E424B] transition-all hover:scale-110"
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleExcluir(lista.id, lista.nome)}
                      className="w-full text-left text-[11px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-2 p-1.5 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir Lista
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / Create New List Input */}
      <div className="p-4 border-t border-[#2D3139] bg-[#171A21]">
        {showAddInput ? (
          <form onSubmit={handleAddListaSubmit} className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={novaListaNome}
              onChange={(e) => setNovaListaNome(e.target.value)}
              className="bg-[#252830] border border-[#3E424B] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none w-full"
              placeholder="Nome da lista..."
            />
            <button
              type="submit"
              className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white p-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddInput(false);
                setNovaListaNome('');
              }}
              className="text-[var(--text-3)] hover:text-white text-xs px-1 font-semibold"
            >
              X
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className="w-full flex items-center gap-2.5 text-xs font-semibold text-[var(--text-3)] hover:text-white transition py-1"
          >
            <Plus className="h-4 w-4 text-[var(--primary)]" />
            <span>Criar Nova Lista</span>
          </button>
        )}
      </div>
    </div>
  );
};
