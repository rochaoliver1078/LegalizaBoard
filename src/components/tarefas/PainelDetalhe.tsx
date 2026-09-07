import React, { useState, useEffect } from 'react';
import { 
  X, Sun, Calendar, RotateCw, User, Star, Trash2, 
  Plus, Check, Trash, Link2, FileText, ChevronRight 
} from 'lucide-react';
import { Tarefa, SubTarefa, TarefaPrioridade } from '../../types/tarefas';
import { Processo } from '../../types';

interface PainelDetalheProps {
  tarefa: Tarefa;
  processos: Processo[];
  onClose: () => void;
  onUpdateTarefa: (t: Tarefa) => void;
  onExcluirTarefa: (id: string) => void;
  onOpenProcessDrawer?: (id: string) => void;
}

export const PainelDetalhe: React.FC<PainelDetalheProps> = ({
  tarefa,
  processos,
  onClose,
  onUpdateTarefa,
  onExcluirTarefa,
  onOpenProcessDrawer,
}) => {
  const [titulo, setTitulo] = useState(tarefa.titulo);
  const [novaSubTexto, setNovaSubTexto] = useState('');
  const [buscaProcesso, setBuscaProcesso] = useState('');
  const [showProcessList, setShowProcessList] = useState(false);

  useEffect(() => {
    setTitulo(tarefa.titulo);
  }, [tarefa.id, tarefa.titulo]);

  const handleUpdate = (updates: Partial<Tarefa>) => {
    onUpdateTarefa({
      ...tarefa,
      ...updates,
    });
  };

  const handleTituloBlur = () => {
    if (titulo.trim() && titulo !== tarefa.titulo) {
      handleUpdate({ titulo: titulo.trim() });
    }
  };

  // Subtarefas handlers
  const handleAddSubTarefa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaSubTexto.trim()) return;
    const newSub: SubTarefa = {
      id: crypto.randomUUID(),
      texto: novaSubTexto.trim(),
      concluida: false,
    };
    handleUpdate({
      subTarefas: [...tarefa.subTarefas, newSub],
    });
    setNovaSubTexto('');
  };

  const handleToggleSub = (subId: string) => {
    const updated = tarefa.subTarefas.map(s => {
      if (s.id === subId) {
        return { ...s, concluida: !s.concluida };
      }
      return s;
    });
    handleUpdate({ subTarefas: updated });
  };

  const handleRemoveSub = (subId: string) => {
    const updated = tarefa.subTarefas.filter(s => s.id !== subId);
    handleUpdate({ subTarefas: updated });
  };

  // Quick Chips para Data Vencimento
  const setQuickVencimento = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    handleUpdate({ dataVencimento: `${yyyy}-${mm}-${dd}` });
  };

  const handleSelectProcesso = (p: Processo) => {
    handleUpdate({
      processoId: p.id,
      processoNome: p.razaoSocial,
      tipoProcesso: p.tipoProcesso,
    });
    setShowProcessList(false);
    setBuscaProcesso('');
  };

  const handleRemoverProcesso = () => {
    handleUpdate({
      processoId: undefined,
      processoNome: undefined,
      tipoProcesso: undefined,
    });
  };

  const formatCriadoEm = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Hoje';
    const dia = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dataFmt = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `Criado em ${dia}, ${dataFmt}`;
  };

  // Processos filtrados para busca
  const filtrados = processos.filter(p => 
    p.razaoSocial.toLowerCase().includes(buscaProcesso.toLowerCase()) ||
    (p.documento || '').includes(buscaProcesso)
  ).slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] border-l border-[var(--border)] w-full max-w-sm md:w-[360px] flex-shrink-0 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <span className="text-xs font-semibold text-[var(--text-3)] font-mono">DETALHES DA TAREFA</span>
        <button 
          onClick={onClose}
          className="p-1.5 text-[var(--text-3)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Titulo inline edit */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xs">
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={handleTituloBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className="w-full text-base font-bold text-[var(--text)] focus:outline-none bg-transparent"
            placeholder="Título da tarefa..."
          />
        </div>

        {/* Subtarefas / Próxima etapa */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xs space-y-3">
          <h4 className="text-[11px] font-bold text-[var(--text-3)] uppercase font-mono tracking-wider">Etapas de Resolução</h4>
          
          <div className="space-y-2">
            {tarefa.subTarefas.map(sub => (
              <div key={sub.id} className="flex items-center justify-between gap-2 py-1 group/sub">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleSub(sub.id)}
                    className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition flex-shrink-0 ${
                      sub.concluida 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-[var(--border)] hover:border-slate-500'
                    }`}
                  >
                    {sub.concluida && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </button>
                  <span className={`text-xs text-[var(--text-2)] truncate ${sub.concluida ? 'line-through text-[var(--text-3)]' : ''}`}>
                    {sub.texto}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveSub(sub.id)}
                  className="text-[var(--text-3)] hover:text-red-500 p-0.5 transition opacity-0 group-hover/sub:opacity-100"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSubTarefa} className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border)]">
            <Plus className="h-3.5 w-3.5 text-[var(--primary)] flex-shrink-0" />
            <input
              type="text"
              value={novaSubTexto}
              onChange={(e) => setNovaSubTexto(e.target.value)}
              className="w-full text-xs text-[var(--text-2)] focus:outline-none bg-transparent"
              placeholder="Adicionar etapa..."
            />
          </form>
        </div>

        {/* Adicionar a Meu Dia */}
        <button
          onClick={() => handleUpdate({ meuDia: !tarefa.meuDia })}
          className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition shadow-xs text-xs font-semibold ${
            tarefa.meuDia
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sun className={`h-4 w-4 ${tarefa.meuDia ? 'fill-amber-500 text-amber-500 animate-spin-slow' : 'text-[var(--text-3)]'}`} />
            <span>{tarefa.meuDia ? 'Adicionado a Meu Dia' : 'Adicionar a Meu Dia'}</span>
          </div>
          {tarefa.meuDia && <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md font-sans">Ativo</span>}
        </button>

        {/* Data Vencimento / Conclusão */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-2)]">
            <Calendar className="h-4 w-4 text-[var(--text-3)]" />
            <div className="flex-1">
              <span className="block text-[10px] text-[var(--text-3)] uppercase font-semibold font-mono">Data de Conclusão</span>
              <input
                type="date"
                value={tarefa.dataVencimento || ''}
                onChange={(e) => handleUpdate({ dataVencimento: e.target.value || undefined })}
                className="w-full text-xs font-semibold text-[var(--text-2)] bg-transparent focus:outline-none mt-0.5 cursor-pointer"
              />
            </div>
          </div>
          {/* Quick chips */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setQuickVencimento(0)}
              className="bg-[var(--bg)] hover:bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border)] text-[10px] px-2 py-1 rounded-lg font-medium transition"
            >
              Hoje
            </button>
            <button
              onClick={() => setQuickVencimento(1)}
              className="bg-[var(--bg)] hover:bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border)] text-[10px] px-2 py-1 rounded-lg font-medium transition"
            >
              Amanhã
            </button>
            <button
              onClick={() => setQuickVencimento(7)}
              className="bg-[var(--bg)] hover:bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border)] text-[10px] px-2 py-1 rounded-lg font-medium transition"
            >
              Próx. Semana
            </button>
          </div>
        </div>

        {/* Repetir */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-2)]">
            <RotateCw className="h-4 w-4 text-[var(--text-3)]" />
            <div className="flex-1">
              <span className="block text-[10px] text-[var(--text-3)] uppercase font-semibold font-mono">Repetir</span>
              <select
                value={tarefa.repetir || ''}
                onChange={(e) => handleUpdate({ repetir: (e.target.value as Tarefa['repetir']) || null })}
                className="w-full text-xs font-semibold text-[var(--text-2)] bg-transparent focus:outline-none mt-0.5 cursor-pointer"
              >
                <option value="">Não repetir</option>
                <option value="diario">Diariamente</option>
                <option value="semanal">Semanalmente</option>
                <option value="mensal">Mensalmente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsável */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-2)]">
            <User className="h-4 w-4 text-[var(--text-3)]" />
            <div className="flex-1">
              <span className="block text-[10px] text-[var(--text-3)] uppercase font-semibold font-mono">Responsável</span>
              <select
                value={tarefa.responsavel || ''}
                onChange={(e) => handleUpdate({ responsavel: e.target.value || undefined })}
                className="w-full text-xs font-semibold text-[var(--text-2)] bg-transparent focus:outline-none mt-0.5 cursor-pointer"
              >
                <option value="">Ninguém atribuído</option>
                <option value="Rocha">Rocha</option>
                <option value="Nicolly">Nicolly</option>
                <option value="Alexsander">Alexsander</option>
              </select>
            </div>
          </div>
        </div>

        {/* Prioridade */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-2)]">
            <Star className="h-4 w-4 text-[var(--text-3)]" />
            <div className="flex-1">
              <span className="block text-[10px] text-[var(--text-3)] uppercase font-semibold font-mono">Prioridade</span>
              <select
                value={tarefa.prioridade}
                onChange={(e) => handleUpdate({ prioridade: e.target.value as TarefaPrioridade })}
                className="w-full text-xs font-semibold text-[var(--text-2)] bg-transparent focus:outline-none mt-0.5 cursor-pointer"
              >
                <option value="normal">🟢 Normal</option>
                <option value="media">🟡 Média</option>
                <option value="alta">🔴 Alta</option>
              </select>
            </div>
          </div>
        </div>

        {/* Processo Vinculado */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xs space-y-2 relative">
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-2)]">
            <Link2 className="h-4 w-4 text-[var(--text-3)]" />
            <div className="flex-1">
              <span className="block text-[10px] text-[var(--text-3)] uppercase font-semibold font-mono">Processo Vinculado</span>
              {tarefa.processoNome ? (
                <div className="mt-1 flex items-center justify-between gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-2)] text-xs truncate">{tarefa.processoNome}</p>
                    <p className="text-[10px] text-[var(--text-3)]">{tarefa.tipoProcesso}</p>
                  </div>
                  <div className="flex gap-1">
                    {onOpenProcessDrawer && tarefa.processoId && (
                      <button
                        type="button"
                        onClick={() => onOpenProcessDrawer(tarefa.processoId!)}
                        className="text-xs bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white p-1 rounded transition flex items-center gap-0.5 shadow-xs"
                        title="Ver Processo"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoverProcesso}
                      className="text-[10px] bg-[var(--surface-hover)] hover:bg-red-100 text-[var(--text-2)] hover:text-red-600 px-1.5 py-1 rounded transition"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  <input
                    type="text"
                    value={buscaProcesso}
                    onChange={(e) => {
                      setBuscaProcesso(e.target.value);
                      setShowProcessList(true);
                    }}
                    onFocus={() => setShowProcessList(true)}
                    placeholder="Buscar processo societário..."
                    className="w-full text-xs font-medium text-[var(--text-2)] border border-[var(--border)] rounded-lg p-2 focus:outline-none bg-transparent"
                  />
                  {showProcessList && buscaProcesso && (
                    <div className="absolute left-0 right-0 z-30 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg mt-1 overflow-hidden">
                      {filtrados.length > 0 ? (
                        filtrados.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProcesso(p)}
                            className="p-2 hover:bg-[var(--bg)] cursor-pointer border-b border-[var(--border)] text-xs"
                          >
                            <p className="font-semibold text-[var(--text)] truncate">{p.razaoSocial}</p>
                            <p className="text-[10px] text-[var(--text-3)]">{p.tipoProcesso}</p>
                          </div>
                        ))
                      ) : (
                        <p className="p-3 text-[var(--text-3)] text-xs text-center">Nenhum processo localizado</p>
                      )}
                      <div className="bg-[var(--bg)] p-1 text-right">
                        <button
                          type="button"
                          onClick={() => setShowProcessList(false)}
                          className="text-[10px] font-semibold text-[var(--text-3)] hover:text-[var(--text)] px-2 py-0.5"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Adicionar Arquivo */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-2)]">
            <FileText className="h-4 w-4 text-[var(--text-3)]" />
            <div className="flex-1">
              <span className="block text-[10px] text-[var(--text-3)] uppercase font-semibold font-mono">Arquivo Anexo</span>
              {tarefa.arquivo ? (
                <div className="mt-1.5 flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2">
                  <span className="font-mono text-xs text-[var(--text-2)] truncate">{tarefa.arquivo}</span>
                  <button
                    onClick={() => handleUpdate({ arquivo: undefined })}
                    className="text-[10px] text-red-500 hover:underline font-semibold"
                  >
                    Excluir
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleUpdate({ arquivo: `anexo_${Date.now().toString().slice(-4)}.pdf` })}
                  className="mt-1.5 w-full text-left text-xs text-[var(--text-3)] hover:text-[var(--primary)] border border-dashed border-[var(--border)] hover:border-[var(--primary)] rounded-lg p-2 transition font-medium"
                >
                  + Vincular PDF de Protocolo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Anotação */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xs space-y-1.5">
          <span className="block text-[10px] text-[var(--text-3)] uppercase font-semibold font-mono">Anotações</span>
          <textarea
            value={tarefa.anotacao || ''}
            onChange={(e) => handleUpdate({ anotacao: e.target.value })}
            rows={4}
            className="w-full text-xs text-[var(--text-2)] focus:outline-none bg-transparent resize-none leading-relaxed"
            placeholder="Escreva notas, observações ou links adicionais..."
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between text-[11px] text-[var(--text-3)] font-medium">
        <span>{formatCriadoEm(tarefa.criadoEm)}</span>
        <button
          onClick={() => onExcluirTarefa(tarefa.id)}
          className="p-1.5 text-[var(--text-3)] hover:text-red-600 rounded-lg hover:bg-red-50 transition"
          title="Excluir tarefa"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
};
