import React, { useState } from 'react';
import { 
  Plus, ArrowUpDown, ChevronDown, ChevronRight, 
  LayoutList, LayoutGrid, Calendar, CalendarRange, Clock, AlertTriangle 
} from 'lucide-react';
import { Tarefa } from '../../types/tarefas';
import { ItemTarefa } from './ItemTarefa';

interface ListaTarefasProps {
  viewName: string;
  viewId: string;
  tarefas: Tarefa[];
  onAddTarefa: (titulo: string) => void;
  onToggleConcluir: (id: string) => void;
  onToggleEstrela: (id: string) => void;
  onSelectTarefa: (tarefa: Tarefa) => void;
  selectedTarefaId?: string;
}

type SortOption = 'data' | 'prioridade' | 'estrela' | 'titulo' | 'criado';

export const ListaTarefas: React.FC<ListaTarefasProps> = ({
  viewName,
  viewId,
  tarefas,
  onAddTarefa,
  onToggleConcluir,
  onToggleEstrela,
  onSelectTarefa,
  selectedTarefaId,
}) => {
  const [novoTitulo, setNovoTitulo] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [viewMode, setViewMode] = useState<'lista' | 'grade'>('lista');
  const [sortBy, setSortBy] = useState<SortOption>('criado');
  const [showCompleted, setShowCompleted] = useState(true);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    onAddTarefa(novoTitulo.trim());
    setNovoTitulo('');
  };

  // Sort logic
  const sortTasks = (tasksList: Tarefa[]) => {
    return [...tasksList].sort((a, b) => {
      if (sortBy === 'estrela') {
        if (a.estrela === b.estrela) return 0;
        return a.estrela ? -1 : 1;
      }
      if (sortBy === 'prioridade') {
        const priorities = { alta: 3, media: 2, normal: 1 };
        return priorities[b.prioridade] - priorities[a.prioridade];
      }
      if (sortBy === 'data') {
        if (!a.dataVencimento) return 1;
        if (!b.dataVencimento) return -1;
        return a.dataVencimento.localeCompare(b.dataVencimento);
      }
      if (sortBy === 'titulo') {
        return a.titulo.localeCompare(b.titulo);
      }
      // default: criado (newest first)
      return b.criadoEm.localeCompare(a.criadoEm);
    });
  };

  const activeTasks = sortTasks(tarefas.filter(t => t.status !== 'concluida'));
  const completedTasks = sortTasks(tarefas.filter(t => t.status === 'concluida'));

  // Group planejado helpers
  const getPlannedGroups = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const groups: { [key: string]: { label: string; icon: React.ReactNode; color: string; list: Tarefa[] } } = {
      atrasadas: { label: '📌 ATRASADAS', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-500', list: [] },
      hoje: { label: '☀️ HOJE', icon: <Clock className="h-4 w-4" />, color: 'text-amber-500', list: [] },
      amanha: { label: '📅 AMANHÃ', icon: <Calendar className="h-4 w-4" />, color: 'text-blue-500', list: [] },
      proximos: { label: '📆 PRÓXIMOS 7 DIAS', icon: <CalendarRange className="h-4 w-4" />, color: 'text-emerald-500', list: [] },
      adiante: { label: '🗓️ MAIS ADIANTE', icon: <Calendar className="h-4 w-4" />, color: 'text-purple-500', list: [] },
      semdata: { label: '📋 SEM DATA', icon: <Calendar className="h-4 w-4" />, color: 'text-[var(--text-3)]', list: [] },
    };

    activeTasks.forEach(t => {
      if (!t.dataVencimento) {
        groups.semdata.list.push(t);
        return;
      }
      
      const tDate = new Date(t.dataVencimento);
      tDate.setHours(0,0,0,0);

      if (t.dataVencimento < todayStr) {
        groups.atrasadas.list.push(t);
      } else if (t.dataVencimento === todayStr) {
        groups.hoje.list.push(t);
      } else if (t.dataVencimento === tomorrowStr) {
        groups.amanha.list.push(t);
      } else if (tDate > tomorrow && tDate <= nextWeek) {
        groups.proximos.list.push(t);
      } else {
        groups.adiante.list.push(t);
      }
    });

    return groups;
  };

  const plannedGroups = getPlannedGroups();

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] overflow-hidden">
      {/* Header da lista */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
            {viewName}
          </h2>
          <p className="text-xs text-[var(--text-3)] font-medium font-sans mt-0.5">
            {activeTasks.length} pendentes • {completedTasks.length} concluídas
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          {/* Classificar Select */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-2)] bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 shadow-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-[var(--text-3)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value="criado">Data de Criação</option>
              <option value="prioridade">Prioridade</option>
              <option value="data">Vencimento</option>
              <option value="estrela">Importância</option>
              <option value="titulo">Ordem Alfabética</option>
            </select>
          </div>

          {/* Grid/List Layout Mode Toggles */}
          <div className="flex border border-[var(--border)] bg-[var(--bg)] p-1 rounded-lg">
            <button
              onClick={() => setViewMode('lista')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'lista' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
              }`}
              title="Visualização em Lista"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grade')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'grade' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
              }`}
              title="Visualização em Grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main List Workspace */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quick Add Task Input */}
        <form 
          onSubmit={handleAddSubmit}
          className={`bg-[var(--surface)] border transition-all duration-200 rounded-xl shadow-xs overflow-hidden ${
            isInputFocused ? 'ring-2 ring-[var(--primary)]/30 border-[var(--primary)]' : 'border-[var(--border)]'
          }`}
        >
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <button
              type="submit"
              className="text-[var(--primary)] hover:scale-115 transition flex-shrink-0"
              title="Adicionar tarefa"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </button>
            <input
              type="text"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
              className="w-full text-sm font-medium text-[var(--text-2)] placeholder-slate-400 focus:outline-none bg-transparent"
              placeholder="+ Adicionar uma nova tarefa nesta lista..."
            />
          </div>
          
          {/* Expanded detail form features when input is focused */}
          {isInputFocused && (
            <div className="bg-slate-50/70 border-t border-[var(--border)] px-4 py-2 flex items-center justify-between text-[11px] text-[var(--text-3)] font-medium">
              <span>Pressione Enter para salvar na lista</span>
              <span className="font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)]">PENDENTE</span>
            </div>
          )}
        </form>

        {/* Tasks View Rendering */}
        {viewId === 'planejado' ? (
          /* "Planejado" timeline grouping */
          <div className="space-y-6 animate-fade-in">
            {Object.entries(plannedGroups).map(([key, value]) => {
              if (value.list.length === 0) return null;
              return (
                <div key={key} className="space-y-2.5">
                  <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${value.color} font-mono mb-1.5`}>
                    {value.icon}
                    <span>{value.label} ({value.list.length})</span>
                  </div>
                  <div className={viewMode === 'grade' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-2'}>
                    {value.list.map(t => (
                      <ItemTarefa
                        key={t.id}
                        tarefa={t}
                        isSelected={selectedTarefaId === t.id}
                        onToggleConcluir={onToggleConcluir}
                        onToggleEstrela={onToggleEstrela}
                        onSelect={onSelectTarefa}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {activeTasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[var(--text-3)] text-sm font-medium">Não há tarefas planejadas no momento.</p>
              </div>
            )}
          </div>
        ) : (
          /* Standard and List Grouping */
          <div className="space-y-6">
            {activeTasks.length > 0 ? (
              <div className={viewMode === 'grade' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
                {activeTasks.map(t => (
                  <ItemTarefa
                    key={t.id}
                    tarefa={t}
                    isSelected={selectedTarefaId === t.id}
                    onToggleConcluir={onToggleConcluir}
                    onToggleEstrela={onToggleEstrela}
                    onSelect={onSelectTarefa}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[var(--surface)] rounded-2xl border border-dashed border-[var(--border)]">
                <p className="text-[var(--text-3)] text-sm font-medium">Sem tarefas pendentes por aqui. Bom trabalho!</p>
              </div>
            )}

            {/* Completed section */}
            {completedTasks.length > 0 && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-3)] hover:text-[var(--text-2)] font-sans tracking-wide transition uppercase"
                >
                  {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>Concluídas ({completedTasks.length})</span>
                </button>

                {showCompleted && (
                  <div className={viewMode === 'grade' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-in-down' : 'space-y-2 animate-slide-in-down'}>
                    {completedTasks.map(t => (
                      <ItemTarefa
                        key={t.id}
                        tarefa={t}
                        isSelected={selectedTarefaId === t.id}
                        onToggleConcluir={onToggleConcluir}
                        onToggleEstrela={onToggleEstrela}
                        onSelect={onSelectTarefa}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
