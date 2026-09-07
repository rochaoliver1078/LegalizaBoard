import React from 'react';
import { Processo, ColunaKanban } from '../types';
import { Tarefa } from '../types/tarefas';
import { ORDEM_COLUNAS, COLUNAS_KANBAN, TIPOS_PROCESSO } from '../data/fases';
import { colunaKanban, progressoProcesso, faseAtualProcesso, estaAtrasado } from '../utils/helpers';
import { menorPrazoAberto } from '../utils/exigencias';
import { TiposProcessoMap } from '../lib/localCache';
import { AlertCircle, ChevronRight } from 'lucide-react';

interface ProcessoListViewProps {
  processos: Processo[];
  tiposProcesso: TiposProcessoMap;
  tarefas: Tarefa[];
  onOpenProcesso: (id: string) => void;
}

// Resolução segura do nome da fase atual (processo concluído não tem fase ativa)
function nomeFase(fase: { nome?: string; trilha?: string } | null | undefined): string {
  if (!fase) return 'Concluído';
  return fase.trilha ? `Trilha ${fase.trilha} — ${fase.nome ?? '—'}` : (fase.nome ?? '—');
}

/**
 * Lista de processos em linhas, agrupada por etapa (estilo Google Tasks) —
 * substitui o quadro kanban. Cada linha é clicável e abre o drawer com
 * todas as informações do processo (mesmo fluxo usado no kanban/tabela).
 */
export const ProcessoListView: React.FC<ProcessoListViewProps> = ({
  processos, tiposProcesso, tarefas, onOpenProcesso,
}) => {
  const grupos = React.useMemo(() => {
    const mapa = new Map<ColunaKanban, Processo[]>();
    ORDEM_COLUNAS.forEach(colId => mapa.set(colId, []));
    processos.forEach(p => {
      mapa.get(colunaKanban(p))?.push(p);
    });
    return ORDEM_COLUNAS
      .map(colId => ({ colId, itens: mapa.get(colId) ?? [] }))
      .filter(g => g.itens.length > 0);
  }, [processos]);

  const activeTipos = (tiposProcesso && Object.keys(tiposProcesso).length > 0) ? tiposProcesso : TIPOS_PROCESSO;

  if (grupos.length === 0) return null;

  return (
    <div className="bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-1)] overflow-hidden">
      {grupos.map(({ colId, itens }, gIdx) => {
        const colInfo = COLUNAS_KANBAN[colId];
        return (
          <div key={colId} className={gIdx > 0 ? 'mt-2' : ''}>
            <div className="flex items-center gap-2 px-5 pt-4 pb-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colInfo.cor }} />
              <span className="text-[13px] font-medium text-[var(--text)]">{colInfo.label}</span>
              <span className="text-[12px] text-[var(--text-3)]">{itens.length}</span>
            </div>

            {itens.map(p => {
              const tipo = activeTipos[p.tipoProcesso] || TIPOS_PROCESSO[p.tipoProcesso] || { label: p.tipoProcesso, color: '#475569' };
              const pct = progressoProcesso(p);
              const fase = faseAtualProcesso(p);
              const atrasado = estaAtrasado(p);
              const prazoExigencia = menorPrazoAberto(p);
              const procTarefas = tarefas.filter(t => t.processoId === p.id);
              const totalTarefas = procTarefas.length;
              const concluidasTarefas = procTarefas.filter(t => t.status === 'concluida').length;

              return (
                <div
                  key={p.id}
                  onClick={() => onOpenProcesso(p.id)}
                  className="flex items-center gap-3 px-5 py-2.5 mx-2 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors select-none"
                >
                  <span className="w-[18px] h-[18px] rounded-full flex-shrink-0" style={{ border: `2px solid ${tipo.color}`, background: 'var(--surface)' }} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium text-[var(--text)] text-[13.5px] truncate max-w-[280px]">{p.razaoSocial || '(Sem nome)'}</p>
                      {atrasado && (
                        <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <AlertCircle className="h-3 w-3" /> Atrasado
                        </span>
                      )}
                      {prazoExigencia !== null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${prazoExigencia <= 7 ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}>
                          ⚠ {prazoExigencia < 0 ? 'exigência vencida' : `${prazoExigencia}d exigência`}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-3)] truncate">
                      {tipo.label} · {nomeFase(fase)}
                      {p.responsavelLegal ? ` · ${p.responsavelLegal}` : ''}
                    </p>
                  </div>

                  {totalTarefas > 0 && (
                    <span className="hidden sm:inline-flex text-[10px] font-semibold text-[var(--text-3)] flex-shrink-0">
                      {concluidasTarefas}/{totalTarefas} tarefas
                    </span>
                  )}

                  <div className="hidden sm:flex items-center gap-2 w-28 flex-shrink-0">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary), var(--yellow), var(--green))' }} />
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--text-3)] w-8 text-right">{pct}%</span>
                  </div>

                  <ChevronRight className="h-4 w-4 text-[var(--text-3)] flex-shrink-0" />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
