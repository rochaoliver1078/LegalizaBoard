import React from 'react';
import { Clock } from 'lucide-react';
import { Processo, Alarme } from '../types';
import { TIPOS_PROCESSO } from '../data/fases';
import { fmtData, fmtDataHora } from '../utils/helpers';
import { TiposProcessoMap } from '../lib/localCache';

interface AlarmesViewProps {
  alarmesAtivos: Array<{ alarme: Alarme; proc: Processo }>;
  tiposProcesso: TiposProcessoMap;
  onOpenProcesso: (id: string) => void;
  onToggleAlarme: (procId: string, alarmeId: string) => void;
}

/** Agenda geral de lembretes/alarmes ativos de todos os processos. */
export const AlarmesView: React.FC<AlarmesViewProps> = ({
  alarmesAtivos, tiposProcesso, onOpenProcesso, onToggleAlarme,
}) => (
  <div className="space-y-4 select-none">
    <h3 className="font-sans text-lg font-bold text-[var(--text)]">Agenda Geral de Alarmes</h3>
    {alarmesAtivos.length === 0 ? (
      <div className="bg-[var(--surface)] border rounded-2xl p-10 text-center text-[var(--text-3)]">
        <Clock className="h-12 w-12 text-[var(--text-3)] mx-auto mb-3" />
        <p className="font-semibold text-[var(--text)]">Sem lembretes pendentes</p>
        <p className="text-xs mt-1">Agende avisos importantes em etapas abrindo a ficha de qualquer processo societário.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alarmesAtivos.map(({ alarme, proc }) => (
          <div
            key={alarme.id}
            onClick={() => onOpenProcesso(proc.id)}
            className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl cursor-pointer hover:shadow-md transition flex items-start justify-between"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-amber-50 text-[var(--yellow)] border border-[var(--yellow)]/30 rounded text-[9px] uppercase font-bold font-mono">
                  {(tiposProcesso && tiposProcesso[proc.tipoProcesso])?.label || TIPOS_PROCESSO[proc.tipoProcesso]?.label}
                </span>
                <span className="text-[10px] text-[var(--yellow)] font-mono leading-none">
                  {fmtDataHora(alarme.dataHora).split(' ')[1]}
                </span>
              </div>
              <h4 className="font-bold text-[var(--text)] text-sm truncate">{alarme.titulo}</h4>
              <p className="text-[11px] text-[var(--text-3)] truncate">{proc.razaoSocial} — Etapa {proc.fasesExtras?.find(e => e.id === alarme.faseId)?.nome || alarme.faseId}</p>
            </div>

            <div className="flex flex-col items-end gap-1.5 ml-4 flex-shrink-0 select-none">
              <span className="text-[10px] font-mono font-bold bg-[var(--surface-2)] text-[var(--yellow)] px-2.5 py-0.5 rounded-full">
                {fmtData(alarme.dataHora.split('T')[0])}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAlarme(proc.id, alarme.id);
                }}
                className="text-[10px] bg-[var(--bg)] hover:bg-[var(--green)]/10 hover:text-[var(--green)] border rounded px-2 py-0.5 font-bold"
              >
                Marcar Concluído
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
