import React from 'react';
import { Star, Calendar, Sun, Link2, User, Check } from 'lucide-react';
import { Tarefa } from '../../types/tarefas';

interface ItemTarefaProps {
  tarefa: Tarefa;
  isSelected: boolean;
  onToggleConcluir: (id: string) => void;
  onToggleEstrela: (id: string) => void;
  onSelect: (tarefa: Tarefa) => void;
}

const ItemTarefaBase: React.FC<ItemTarefaProps> = ({
  tarefa,
  isSelected,
  onToggleConcluir,
  onToggleEstrela,
  onSelect,
}) => {
  const isConcluida = tarefa.status === 'concluida';

  // Subtasks progress
  const totalSub = tarefa.subTarefas.length;
  const concluidaSub = tarefa.subTarefas.filter(s => s.concluida).length;

  // Formatar data de vencimento simplificada
  const formatVencimento = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  return (
    <div
      onClick={() => onSelect(tarefa)}
      className={`group flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl cursor-pointer hover:shadow-sm transition-all duration-200 ${
        isSelected ? 'ring-2 ring-[var(--primary)]/40 border-transparent' : ''
      } ${isConcluida ? 'opacity-65' : ''}`}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {/* Checkbox circular */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleConcluir(tarefa.id);
          }}
          className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            isConcluida
              ? 'bg-emerald-500 border-emerald-500 text-white scale-105'
              : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-red-50/50'
          }`}
        >
          {isConcluida && <Check className="h-3 w-3 stroke-[3]" />}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium text-[var(--text)] truncate transition-all ${
              isConcluida ? 'line-through text-[var(--text-3)]' : ''
            }`}
          >
            {tarefa.titulo}
          </p>

          {/* Subtitles & Metadados */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-[var(--text-3)]">
            {/* Subtarefas count */}
            {totalSub > 0 && (
              <span className="bg-[var(--surface-2)] text-[var(--text-2)] px-1.5 py-0.5 rounded-md font-sans font-medium">
                {concluidaSub} de {totalSub} etapas
              </span>
            )}

            {/* Prioridade Alta */}
            {tarefa.prioridade === 'alta' && (
              <span className="text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded-md">
                🔴 Alta
              </span>
            )}
            {tarefa.prioridade === 'media' && (
              <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md">
                🟡 Média
              </span>
            )}

            {/* Meu Dia */}
            {tarefa.meuDia && (
              <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                <Sun className="h-3 w-3 fill-amber-500" /> Meu Dia
              </span>
            )}

            {/* Data Vencimento */}
            {tarefa.dataVencimento && (
              <span className={`flex items-center gap-1 font-medium ${
                new Date(tarefa.dataVencimento) < new Date() && !isConcluida
                  ? 'text-red-500'
                  : 'text-[var(--text-3)]'
              }`}>
                <Calendar className="h-3 w-3" />
                {formatVencimento(tarefa.dataVencimento)}
              </span>
            )}

            {/* Responsável */}
            {tarefa.responsavel && (
              <span className="flex items-center gap-0.5 text-[var(--text-3)]">
                <User className="h-3 w-3" /> {tarefa.responsavel}
              </span>
            )}

            {/* Processo Vinculado */}
            {tarefa.processoNome && (
              <span className="flex items-center gap-0.5 text-[var(--text-3)] max-w-[150px] truncate">
                <Link2 className="h-3 w-3" /> {tarefa.processoNome}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Estrela Estrela de Favorito */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleEstrela(tarefa.id);
        }}
        className="p-1 text-[var(--text-3)] hover:text-amber-500 transition-colors duration-150 flex-shrink-0 ml-2"
      >
        <Star
          className={`h-4 w-4 ${
            tarefa.estrela ? 'fill-amber-400 text-amber-500' : 'text-[var(--text-3)]'
          }`}
        />
      </button>
    </div>
  );
};

// Memoizado: listas grandes de tarefas não re-renderizam item a item
export const ItemTarefa = React.memo(ItemTarefaBase);
