import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { SidebarTarefas } from './SidebarTarefas';
import { ListaTarefas } from './ListaTarefas';
import { PainelDetalhe } from './PainelDetalhe';
import { Tarefa, ListaTarefas as ListaType } from '../../types/tarefas';
import { Processo } from '../../types';
import { 
  carregarTarefas, salvarTarefa, excluirTarefa,
  carregarListas, salvarLista, excluirLista 
} from '../../lib/tarefasDb';
import { LISTAS_PADRAO } from '../../data/tarefas';
import { aplicarConclusaoTarefaNoProcesso } from '../../utils/integracaoTarefas';

interface GestorTarefasProps {
  processos: Processo[];
  currentUser: { id?: string; email?: string | null } | null;
  onBack: () => void;
  onOpenProcessDrawer?: (id: string) => void;
  onSyncChecklistItem?: (processoId: string, faseId: string, itemKey: string, isChecked: boolean) => void;
  onUpdateProcesso?: (p: Processo) => void;
}

export const GestorTarefas: React.FC<GestorTarefasProps> = ({
  processos,
  currentUser,
  onBack,
  onOpenProcessDrawer,
  onSyncChecklistItem,
  onUpdateProcesso,
}) => {
  const uid = currentUser?.uid || '';
  const [listas, setListas] = useState<ListaType[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [activeView, setActiveView] = useState<string>('todas');
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Load Initial Data
  useEffect(() => {
    let ativo = true;
    async function init() {
      try {
        setLoading(true);
        const fetchedListas = await carregarListas(uid);
        const fetchedTarefas = await carregarTarefas(uid);
        if (!ativo) return;
        setListas(fetchedListas);
        setTarefas(fetchedTarefas);
      } catch (err) {
        console.error('Erro ao carregar gestor de tarefas:', err);
        if (ativo) {
          // Fallback de emergência: usa listas padrão
          setListas(LISTAS_PADRAO);
          setTarefas([]);
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }
    init();
    return () => { ativo = false; };
  }, [uid]);

  useEffect(() => {
    if (!loading) {
      setLoadingTimeout(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimeout(true), 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Determine view label and filter tasks
  const getViewDetails = () => {
    if (activeView === 'meu-dia') {
      return { nome: '☀️ Meu Dia', list: tarefas.filter(t => t.meuDia) };
    }
    if (activeView === 'importante') {
      return { nome: '⭐ Importante', list: tarefas.filter(t => t.estrela) };
    }
    if (activeView === 'planejado') {
      return { nome: '📅 Planejado', list: tarefas.filter(t => !!t.dataVencimento) };
    }
    if (activeView === 'todas') {
      return { nome: '✅ Todas as Tarefas', list: tarefas };
    }
    if (activeView === 'concluida') {
      return { nome: '✔️ Concluídas', list: tarefas.filter(t => t.status === 'concluida') };
    }
    if (activeView === 'atribuido') {
      const uName = currentUser?.displayName || 'Rocha';
      return { nome: '👤 Atribuídas a mim', list: tarefas.filter(t => t.responsavel?.toLowerCase() === uName.toLowerCase()) };
    }
    // Custom list view
    const foundList = listas.find(l => l.id === activeView);
    return {
      nome: foundList ? foundList.nome : 'Tarefas',
      list: tarefas.filter(t => t.listaId === activeView),
    };
  };

  const { nome: activeViewLabel, list: filteredTarefas } = getViewDetails();

  // Task Handlers
  const handleAddTarefa = async (titulo: string) => {
    // Determine listId
    let targetListId = 'geral';
    const isCustomList = listas.some(l => l.id === activeView);
    if (isCustomList) {
      targetListId = activeView;
    } else {
      // Find first list as fallback
      const first = listas[0];
      if (first) targetListId = first.id;
    }

    const novaTarefa: Tarefa = {
      id: crypto.randomUUID(),
      titulo,
      listaId: targetListId,
      prioridade: 'normal',
      status: 'pendente',
      subTarefas: [],
      estrela: activeView === 'importante',
      meuDia: activeView === 'meu-dia',
      criadoEm: new Date().toISOString(),
      ...(activeView === 'planejado'
        ? { dataVencimento: new Date().toISOString().split('T')[0] }
        : {}),
    };

    const updated = [...tarefas, novaTarefa];
    setTarefas(updated);
    await salvarTarefa(uid, novaTarefa);
  };

  const handleToggleConcluir = async (id: string) => {
    const updated = tarefas.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'concluida' ? 'pendente' : 'concluida';
        const nextChecked = nextStatus === 'concluida';
        const updatedTask = {
          ...t,
          status: nextStatus,
          concluidoEm: nextChecked ? new Date().toISOString() : undefined,
        };
        // Auto-update selected task if it is the one being toggled
        if (selectedTarefa?.id === id) {
          setSelectedTarefa(updatedTask);
        }
        salvarTarefa(uid, updatedTask);
        
        // Notify checklist mirroring
        if (t.processoId && t.faseId && t.itemKey) {
          const proc = processos.find(x => x.id === t.processoId);
          if (proc && onUpdateProcesso) {
            const updatedProc = aplicarConclusaoTarefaNoProcesso(proc, updatedTask);
            onUpdateProcesso(updatedProc);
          } else {
            onSyncChecklistItem?.(t.processoId, t.faseId, t.itemKey, nextChecked);
          }
        }

        return updatedTask;
      }
      return t;
    });
    setTarefas(updated);
  };

  const handleToggleEstrela = async (id: string) => {
    const updated = tarefas.map(t => {
      if (t.id === id) {
        const updatedTask = { ...t, estrela: !t.estrela };
        if (selectedTarefa?.id === id) {
          setSelectedTarefa(updatedTask);
        }
        salvarTarefa(uid, updatedTask);
        return updatedTask;
      }
      return t;
    });
    setTarefas(updated);
  };

  const handleUpdateTarefa = async (t: Tarefa) => {
    const updated = tarefas.map(x => (x.id === t.id ? t : x));
    setTarefas(updated);
    setSelectedTarefa(t);
    await salvarTarefa(uid, t);
    
    // Notify checklist mirroring
    if (t.processoId && t.faseId && t.itemKey) {
      const isChecked = t.status === 'concluida';
      const proc = processos.find(x => x.id === t.processoId);
      if (proc && onUpdateProcesso) {
        const updatedProc = aplicarConclusaoTarefaNoProcesso(proc, t);
        onUpdateProcesso(updatedProc);
      } else {
        onSyncChecklistItem?.(t.processoId, t.faseId, t.itemKey, isChecked);
      }
    }
  };

  const handleExcluirTarefa = async (id: string) => {
    const t = tarefas.find(x => x.id === id);
    if (t && t.processoId && t.faseId && t.itemKey) {
      const proc = processos.find(x => x.id === t.processoId);
      if (proc && onUpdateProcesso) {
        const dummyTask = { ...t, status: 'pendente' as const };
        const updatedProc = aplicarConclusaoTarefaNoProcesso(proc, dummyTask);
        onUpdateProcesso(updatedProc);
      } else {
        onSyncChecklistItem?.(t.processoId, t.faseId, t.itemKey, false);
      }
    }

    const filtered = tarefas.filter(x => x.id !== id);
    setTarefas(filtered);
    if (selectedTarefa?.id === id) {
      setSelectedTarefa(null);
    }
    await excluirTarefa(uid, id);
  };

  // Custom List Handlers
  const handleAddLista = async (nome: string) => {
    const novaLista: ListaType = {
      id: crypto.randomUUID(),
      nome,
      cor: '#94A3B8',
      ordem: listas.length + 1,
    };
    const updated = [...listas, novaLista];
    setListas(updated);
    await salvarLista(uid, novaLista);
    setActiveView(novaLista.id);
  };

  const handleUpdateLista = async (l: ListaType) => {
    const updated = listas.map(x => (x.id === l.id ? l : x));
    setListas(updated);
    await salvarLista(uid, l);
  };

  const handleExcluirLista = async (id: string) => {
    const updated = listas.filter(x => x.id !== id);
    setListas(updated);
    
    // Deletar tarefas vinculadas a essa lista
    const tarefasVivas = tarefas.filter(t => t.listaId !== id);
    setTarefas(tarefasVivas);
    
    // Se estivesse visualizando essa lista, reseta visão
    if (activeView === id) {
      setActiveView('todas');
    }

    // Excluir listas do BD
    await excluirLista(uid, id);
    
    // Excluir tarefas associadas do BD
    const tarefasParaExcluir = tarefas.filter(t => t.listaId === id);
    for (const t of tarefasParaExcluir) {
      await excluirTarefa(uid, t.id);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[var(--bg)] text-[var(--text-3)]">
        <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin mb-3" />
        <span className="font-sans font-semibold text-xs tracking-wider uppercase">
          Carregando tarefas...
        </span>
        {loadingTimeout && (
          <button
            onClick={() => setLoading(false)}
            className="mt-5 px-4 py-2 text-xs font-bold text-white bg-[var(--primary)] rounded-lg hover:bg-[var(--primary-dark)] transition"
          >
            Continuar offline
          </button>
        )}
        <button
          onClick={onBack}
          className="mt-3 text-[11px] text-[var(--text-3)] hover:text-[var(--text-2)]"
        >
          Voltar ao Gestor de Processos
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[var(--bg)] font-sans">
      {/* Top Mobile Bar with Back Button */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#1C1F26] text-white border-b border-[#15181F]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold hover:text-[var(--text-3)] transition"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <span className="text-xs font-bold tracking-widest uppercase">MÓDULO TAREFAS</span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Sidebar (Desktop & Mobile unified layout) */}
      <div className="hidden md:block h-full">
        <SidebarTarefas
          listas={listas}
          tarefas={tarefas}
          activeView={activeView}
          onSelectView={(v) => {
            setActiveView(v);
            setSelectedTarefa(null); // Close detail on filter change
          }}
          onAddLista={handleAddLista}
          onUpdateLista={handleUpdateLista}
          onExcluirLista={handleExcluirLista}
          currentUser={currentUser}
        />
      </div>

      {/* Main List Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Desktop Back button to Main Process app */}
        <div className="hidden md:flex items-center gap-3 px-6 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-3)] hover:text-[var(--primary)] transition"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar ao Gestor de Processos
          </button>
        </div>

        {/* List layout and inputs */}
        <ListaTarefas
          viewName={activeViewLabel}
          viewId={activeView}
          tarefas={filteredTarefas}
          onAddTarefa={handleAddTarefa}
          onToggleConcluir={handleToggleConcluir}
          onToggleEstrela={handleToggleEstrela}
          onSelectTarefa={(t) => setSelectedTarefa(selectedTarefa?.id === t.id ? null : t)}
          selectedTarefaId={selectedTarefa?.id}
        />
      </div>

      {/* Right Detail Panel Drawer */}
      {selectedTarefa && (
        <div className="fixed inset-0 md:relative md:inset-auto z-50 md:z-0 flex justify-end md:h-full bg-slate-900/30 backdrop-blur-xs md:bg-transparent">
          {/* Backdrop click on mobile to close */}
          <div className="absolute inset-0 md:hidden" onClick={() => setSelectedTarefa(null)} />
          
          <div className="relative h-full shadow-2xl md:shadow-none max-w-sm w-full">
            <PainelDetalhe
              tarefa={selectedTarefa}
              processos={processos}
              onClose={() => setSelectedTarefa(null)}
              onUpdateTarefa={handleUpdateTarefa}
              onExcluirTarefa={handleExcluirTarefa}
              onOpenProcessDrawer={onOpenProcessDrawer}
            />
          </div>
        </div>
      )}

      {/* Bottom Mobile navigation tab bar just to switch lists when in mobile */}
      <div className="md:hidden p-3 bg-[#1C1F26] border-t border-[#15181F] flex gap-2 overflow-x-auto select-none">
        <button
          onClick={() => {
            setActiveView('meu-dia');
            setSelectedTarefa(null);
          }}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
            activeView === 'meu-dia' ? 'bg-[var(--primary)] text-white' : 'bg-[#2D3139] text-[var(--text-3)]'
          }`}
        >
          ☀️ Meu Dia
        </button>
        <button
          onClick={() => {
            setActiveView('importante');
            setSelectedTarefa(null);
          }}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
            activeView === 'importante' ? 'bg-[var(--primary)] text-white' : 'bg-[#2D3139] text-[var(--text-3)]'
          }`}
        >
          ⭐ Importante
        </button>
        <button
          onClick={() => {
            setActiveView('todas');
            setSelectedTarefa(null);
          }}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
            activeView === 'todas' ? 'bg-[var(--primary)] text-white' : 'bg-[#2D3139] text-[var(--text-3)]'
          }`}
        >
          📋 Todas
        </button>
        {listas.map(l => (
          <button
            key={l.id}
            onClick={() => {
              setActiveView(l.id);
              setSelectedTarefa(null);
            }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeView === l.id ? 'bg-[var(--primary)] text-white' : 'bg-[#2D3139] text-[var(--text-3)]'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: l.cor }} />
            {l.nome}
          </button>
        ))}
      </div>
    </div>
  );
};
