import React from 'react';
import { TIPOS_PROCESSO } from '../data/fases';
import { TiposProcessoMap } from '../lib/localCache';

interface FiltrosProcessosProps {
  mostrarChips: boolean;
  tiposProcesso: TiposProcessoMap;
  filtroTipo: string;
  onChangeFiltroTipo: (tipo: string) => void;
  view: 'kanban' | 'tabela';
  onChangeView: (view: 'kanban' | 'tabela') => void;
}

/** Chips de categoria + alternador Kanban/Tabela do diretório de processos. */
export const FiltrosProcessos: React.FC<FiltrosProcessosProps> = ({
  mostrarChips, tiposProcesso, filtroTipo, onChangeFiltroTipo, view, onChangeView,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-4 select-none">
    {mostrarChips && (
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onChangeFiltroTipo('todos')}
          className={`text-xs px-3 py-1 rounded-full font-semibold border transition ${filtroTipo === 'todos' ? 'bg-[#1C1F26] text-white border-[#1C1F26]' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-2)] hover:border-gray-500'}`}
        >
          Todos
        </button>
        {(Object.entries((tiposProcesso && Object.keys(tiposProcesso).length > 0) ? tiposProcesso : TIPOS_PROCESSO) as Array<[string, { label: string; color: string }]>).map(([id, t]) => (
          <button
            key={id}
            onClick={() => onChangeFiltroTipo(id)}
            className={`text-xs px-3 py-1 rounded-full font-semibold border transition flex items-center gap-1 ${filtroTipo === id ? 'bg-[#1C1F26] text-white border-[#1C1F26]' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-2)] hover:border-[#1C1F26]'}`}
          >
            <span style={{ color: t.color }} className="text-base leading-none">•</span>
            {t.label}
          </button>
        ))}
      </div>
    )}

    <div className="flex bg-[var(--border)]/40 border border-[var(--border)] rounded-xl p-0.5 ml-auto text-xs font-semibold">
      <button
        onClick={() => onChangeView('kanban')}
        className={`px-3 py-1.5 rounded-lg transition-all ${view === 'kanban' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text)]'}`}
      >
        Quadro Kanban
      </button>
      <button
        onClick={() => onChangeView('tabela')}
        className={`px-3 py-1.5 rounded-lg transition-all ${view === 'tabela' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text)]'}`}
      >
        Grade Tabela
      </button>
    </div>
  </div>
);
