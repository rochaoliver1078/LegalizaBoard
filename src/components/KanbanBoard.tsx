import React, { useState, useMemo, useCallback } from 'react';
import { Processo, ColunaKanban } from '../types';
import { Tarefa } from '../types/tarefas';
import { ORDEM_COLUNAS, COLUNAS_KANBAN } from '../data/fases';
import { colunaKanban } from '../utils/helpers';
import { ProcessoCard } from './ProcessoCard';
import { Inbox } from 'lucide-react';
import { TiposProcessoMap } from '../lib/localCache';

interface KanbanBoardProps {
  processos: Processo[];
  tiposProcesso: TiposProcessoMap;
  tarefas: Tarefa[];
  onOpenProcesso: (id: string) => void;
  /** Executa a movimentação de coluna (lógica de domínio no hook useProcessos). */
  onMoverParaColuna: (id: string, colId: ColunaKanban) => void;
}

/**
 * Quadro kanban com drag entre colunas e confirmação ao avançar fase.
 * O agrupamento por coluna é memoizado — digitar na busca não recalcula
 * nada além da lista filtrada recebida via props.
 */
export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  processos, tiposProcesso, tarefas, onOpenProcesso, onMoverParaColuna,
}) => {
  const [draggedOverColumn, setDraggedOverColumn] = useState<ColunaKanban | null>(null);
  const [draggedProcessoId, setDraggedProcessoId] = useState<string | null>(null);
  const [kanbanConfirm, setKanbanConfirm] = useState<{ procId: string; targetColId: ColunaKanban } | null>(null);

  const itensPorColuna = useMemo(() => {
    const mapa = new Map<ColunaKanban, Processo[]>();
    ORDEM_COLUNAS.forEach(colId => mapa.set(colId, []));
    processos.forEach(p => {
      mapa.get(colunaKanban(p))?.push(p);
    });
    return mapa;
  }, [processos]);

  const handleDropToColumn = useCallback((e: React.DragEvent, colId: ColunaKanban) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    let id = e.dataTransfer.getData('text/plain');
    if (!id) {
      id = draggedProcessoId || '';
    }
    if (!id) return;

    const p = processos.find(x => x.id === id);
    if (!p) return;

    const orderIndex = ORDEM_COLUNAS.indexOf(colId);
    const colunaOrigem = colunaKanban(p);
    const indexOrigem = ORDEM_COLUNAS.indexOf(colunaOrigem);

    if (orderIndex > indexOrigem) {
      // Avanço de coluna: abre confirmação customizada em React
      setKanbanConfirm({ procId: id, targetColId: colId });
    } else {
      // Movimento para coluna anterior ou mesma coluna: executa imediatamente
      onMoverParaColuna(id, colId);
    }
  }, [processos, draggedProcessoId, onMoverParaColuna]);

  const handleDragStartCard = useCallback((id: string) => setDraggedProcessoId(id), []);
  const handleDragEndCard = useCallback(() => {
    setTimeout(() => {
      setDraggedProcessoId(null);
      setDraggedOverColumn(null);
    }, 100);
  }, []);

  return (
    <>
      <div
        className="flex xl:grid xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-6 -mx-4 px-4 xl:mx-0 xl:px-0"
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) {
            setDraggedOverColumn(null);
          }
        }}
      >
        {ORDEM_COLUNAS.map(colId => {
          const colInfo = COLUNAS_KANBAN[colId];
          const items = itensPorColuna.get(colId) ?? [];
          const isDraggedOver = draggedOverColumn === colId;
          return (
            <div
              key={colId}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedOverColumn !== colId) {
                  setDraggedOverColumn(colId);
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (draggedOverColumn !== colId) {
                  setDraggedOverColumn(colId);
                }
              }}
              onDrop={(e) => handleDropToColumn(e, colId)}
              className={`p-4 rounded-xl animate-fade-in flex-shrink-0 w-[280px] xl:w-full transition-all duration-300 border ${
                isDraggedOver
                  ? 'bg-[var(--surface)] scale-[1.02] shadow-lg md:shadow-xl'
                  : 'bg-[var(--bg)] border-[var(--border)] shadow-xs'
              }`}
              style={
                isDraggedOver
                  ? {
                      borderColor: colInfo.cor,
                      boxShadow: `0 12px 20px -8px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03), 0 0 0 4px ${colInfo.cor}18`
                    }
                  : undefined
              }
            >
              <div className="flex flex-col gap-1 mb-3 select-none">
                <div className="flex justify-between items-center animate-fade-in">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider truncate pr-1 transition-colors duration-300" style={{ color: colInfo.cor }}>
                    {colInfo.label}
                  </span>
                  <span className="font-mono text-[11px] bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] px-1.5 py-0.5 rounded-md font-bold shadow-xs">
                    {items.length}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-3)] font-sans leading-tight line-clamp-1">{colInfo.descricao}</p>
              </div>
              <div className="space-y-3 min-h-[300px] flex flex-col justify-start">
                {items.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {items.map(p => (
                        <ProcessoCard
                          key={p.id}
                          p={p}
                          onClick={() => onOpenProcesso(p.id)}
                          tiposProcesso={tiposProcesso}
                          onDragStart={handleDragStartCard}
                          onDragEnd={handleDragEndCard}
                          tarefas={tarefas}
                        />
                      ))}
                    </div>
                    {isDraggedOver && (
                      <div
                        className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center min-h-[90px] text-center mt-3 transition-all duration-300 animate-pulse"
                        style={{
                          borderColor: colInfo.cor,
                          backgroundColor: `${colInfo.cor}08`
                        }}
                      >
                        <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: colInfo.cor }}>
                          Soltar Aqui
                        </p>
                        <p className="text-[9px] text-gray-500/80 mt-0.5 leading-none">Mecanismo Kanban</p>
                      </div>
                    )}
                  </>
                ) : (
                  isDraggedOver ? (
                    <div
                      className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center min-h-[220px] text-center my-auto transition-all duration-300 animate-pulse w-full"
                      style={{
                        borderColor: colInfo.cor,
                        backgroundColor: `${colInfo.cor}08`
                      }}
                    >
                      <p className="text-[11px] font-extrabold uppercase tracking-widest mb-1" style={{ color: colInfo.cor }}>
                        Soltar Aqui
                      </p>
                      <p className="text-[10px] text-[var(--text-3)]">Mapear para {colInfo.label}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center py-16 select-none bg-[var(--surface)]/60 border border-dashed border-[var(--border)] rounded-lg">
                      <Inbox className="h-6 w-6 text-[var(--text-3)] mb-1.5" />
                      <p className="text-[10px] text-[var(--text-3)]">Arraste para cá</p>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmação de avanço de fase */}
      {kanbanConfirm && (() => {
        const p = processos.find(x => x.id === kanbanConfirm.procId);
        const colLabel = COLUNAS_KANBAN[kanbanConfirm.targetColId]?.label || kanbanConfirm.targetColId;
        if (!p) return null;
        return (
          <div className="fixed inset-0 modal-overlay backdrop-blur-xs flex items-center justify-center p-4">
            <div className="modal-shell border border-[var(--border)] rounded-2xl w-full max-w-md p-6 relative animate-fade-in">
              <button
                onClick={() => setKanbanConfirm(null)}
                className="absolute top-4 right-4 text-[var(--text-3)] hover:text-[var(--text)]" aria-label="Fechar"
              >
                ✕
              </button>

              <h3 className="font-sans text-lg font-bold text-[var(--text)] border-b border-[var(--border)] pb-3 mb-4">
                Confirmar Avanço de Fase
              </h3>

              <p className="text-xs text-[var(--text-2)] leading-relaxed mb-4">
                Você tem certeza de que todas as etapas foram realmente cumpridas para mover <strong className="text-[var(--text)]">"{p.razaoSocial}"</strong> para a coluna <strong className="text-[var(--text)]">"{colLabel}"</strong>?
              </p>

              <div className="bg-[var(--yellow-wash)] border border-amber-200 rounded-xl p-3 mb-5">
                <p className="text-[11px] text-[var(--yellow)] leading-normal font-medium">
                  ⚠️ <strong>Aviso de Automação:</strong> Ao mover o processo para a próxima fase, todos os checklists das etapas anteriores e desta etapa serão marcados como <strong>concluídos</strong>.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setKanbanConfirm(null)}
                  className="btn btn-secondary !text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onMoverParaColuna(kanbanConfirm.procId, kanbanConfirm.targetColId);
                    setKanbanConfirm(null);
                  }}
                  className="btn !bg-[var(--green)] hover:!bg-green-700 !text-white !text-xs"
                >
                  Sim, Confirmar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};
