import React from 'react';
import { menorPrazoAberto } from '../utils/exigencias';
import { Processo } from '../types';
import { Tarefa } from '../types/tarefas';
import { TIPOS_PROCESSO } from '../data/fases';
import { 
  progressoProcesso, 
  faseAtualProcesso, 
  estaAtrasado, 
  diasEmAberto 
} from '../utils/helpers';
import { Calendar, FileText, AlertCircle } from 'lucide-react';

interface ProcessoCardProps {
  p: Processo;
  onClick: () => void;
  tiposProcesso?: Record<string, { label: string; color: string; wash: string; icon: string }>;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  tarefas?: Tarefa[];
}

const ProcessoCardBase: React.FC<ProcessoCardProps> = ({ p, onClick, tiposProcesso, onDragStart, onDragEnd, tarefas = [] }) => {
  const menorPrazoExigencia = menorPrazoAberto(p);
  const activeTipos = (tiposProcesso && Object.keys(tiposProcesso).length > 0) ? tiposProcesso : TIPOS_PROCESSO;
  const tipo = activeTipos[p.tipoProcesso] || { label: p.tipoProcesso, color: '#333333', wash: '#EEEEEE' };
  const pct = progressoProcesso(p);
  const fase = faseAtualProcesso(p);
  const atrasado = estaAtrasado(p);
  const dias = diasEmAberto(p);

  const procTarefas = tarefas.filter(t => t.processoId === p.id);
  const totalTarefas = procTarefas.length;
  const concluidasTarefas = procTarefas.filter(t => t.status === 'concluida').length;

  return (
    <div 
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', p.id);
        e.dataTransfer.effectAllowed = 'move';
        if (onDragStart) onDragStart(p.id);
      }}
      onDragEnd={() => {
        if (onDragEnd) onDragEnd();
      }}
      className="kanban-card cursor-grab active:cursor-grabbing hover:-translate-y-0.5 relative select-none"
    >
      {/* Header with tags */}
      <div className="flex justify-between items-start gap-1.5 mb-2.5">
        <div className="flex flex-wrap gap-1 items-center">
          <span 
            style={{ backgroundColor: tipo.wash, color: tipo.color }} 
            className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full animate-fade-in"
          >
            {tipo.label}
          </span>
          {menorPrazoExigencia !== null && (
            <span
              className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-fade-in border ${
                menorPrazoExigencia <= 7
                  ? 'bg-red-600 text-white border-red-700 animate-pulse'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
              title="Exigência JUCESP aberta — dias até o prazo mais crítico"
            >
              ⚠ Exigência • {menorPrazoExigencia < 0 ? 'vencida' : `${menorPrazoExigencia} dia(s)`}
            </span>
          )}
          {totalTarefas > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full animate-fade-in" title="Tarefas Concluídas / Total">
              ✓ {concluidasTarefas}/{totalTarefas}
            </span>
          )}
        </div>
        
        {atrasado && (
          <span className="flex items-center gap-1 text-[10px] text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">
            <AlertCircle className="h-3 w-3" /> Atrasado
          </span>
        )}
      </div>

      {/* Main Name */}
      <h4 className="font-sans font-bold text-[var(--text)] text-[13.5px] leading-tight mb-1 truncate" title={p.razaoSocial}>
        {p.razaoSocial || '(Sem nome)'}
      </h4>

      {/* Document Description */}
      <div className="font-mono text-[10.5px] text-[var(--text-2)] mb-3 flex items-center gap-1.5">
        <FileText className="h-3 w-3 text-[var(--text-3)] flex-shrink-0" />
        <span className="truncate">{p.documento || 'Sem docto'}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[var(--surface-2)] h-1.5 rounded-full overflow-hidden mb-3">
        <div 
          style={{ 
            width: `${pct}%`,
            background: 'linear-gradient(to right, var(--primary) 0%, #f59e0b 50%, #10b981 100%)',
            backgroundSize: `${10000 / Math.max(pct, 1)}% 100%`
          }} 
          className="h-full transition-all duration-300"
        ></div>
      </div>

      {/* Footer Details */}
      <div className="flex justify-between items-center text-[11px] text-[var(--text-3)] font-sans border-t border-[var(--border)] pt-2.5 mt-2.5">
        <span className="font-medium text-[var(--text-2)]">
          {fase?.trilha
            ? `Trilha ${fase.trilha} — ${f_name(fase)}`
            : fase
              ? f_name(fase)
              : 'Concluído'
          }
        </span>
        <span className="flex items-center gap-1 text-[var(--text-3)] font-mono flex-shrink-0 ml-2">
          <Calendar className="h-3 w-3" />
          <span className={atrasado ? 'text-red-600 font-bold' : ''}>{dias}d ativo</span>
        </span>
      </div>
    </div>
  );
};

// Simple safe name resolution
function f_name(fase: { nome?: string } | null | undefined): string {
  return fase ? fase.nome : '—';
}

// Memoizado: só re-renderiza quando o próprio processo (ou props) mudam
export const ProcessoCard = React.memo(ProcessoCardBase);
