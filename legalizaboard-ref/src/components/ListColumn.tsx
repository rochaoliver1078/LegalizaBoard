import React, { useState, useRef } from 'react';
import { Board, List, Task, Subtask, Label } from '../types';
import { TaskCard } from './TaskCard';
import { uid, dueStatus } from '../utils/storage';

interface ListColumnProps {
  board: Board;
  list: List;
  allLabels: Label[];
  searchQuery: string;
  filterType: string;
  expandedTaskId: string | null;
  expandedSubId: string | null;
  inlineEditor: 'due' | 'color' | 'subtask' | 'file' | null;
  subInlineEditor: 'due' | 'color' | 'file' | null;
  onUpdateListName: (listId: string, newName: string) => void;
  onAddTask: (listId: string, title: string) => void;
  onToggleDone: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onNestTask: (task: Task, targetParent: Task) => void;
  onPromoteSubtask: (parentTaskId: string, subtaskId: string) => void;
  onMoveTaskToList: (task: Task, targetListId: string) => void;
  onSortListDate: (listId: string) => void;
  onSortListPriority: (listId: string) => void;
  onClearListCompleted: (listId: string) => void;
  onDeleteList: (list: List) => void;
  onOpenPanel: (task: Task) => void;
  onToggleExpandTask: (taskId: string) => void;
  onSetInlineEditor: (editor: 'due' | 'color' | 'subtask' | 'file' | null) => void;
  onToggleExpandSub: (subId: string) => void;
  onSetSubInlineEditor: (editor: 'due' | 'color' | 'file' | null) => void;
  onOpenDatePicker: (anchor: DOMRect, obj: Task | Subtask) => void;
  onOpenLabelPicker: (anchor: DOMRect, obj: Task | Subtask) => void;
  onShowToast: (msg: string, withUndo?: boolean) => void;
  // Drag & Drop
  onTaskDragStart: (e: React.DragEvent, taskId: string, listId: string) => void;
  onTaskDragOver: (e: React.DragEvent, listId: string) => void;
  onTaskDrop: (e: React.DragEvent, listId: string) => void;
  onListDragStart: (e: React.DragEvent, listId: string) => void;
  onListDragOver: (e: React.DragEvent, listId: string) => void;
  onListDrop: (e: React.DragEvent, listId: string) => void;
  isDragOver: boolean;
}

export const ListColumn: React.FC<ListColumnProps> = ({
  board,
  list,
  allLabels,
  searchQuery,
  filterType,
  expandedTaskId,
  expandedSubId,
  inlineEditor,
  subInlineEditor,
  onUpdateListName,
  onAddTask,
  onToggleDone,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onNestTask,
  onPromoteSubtask,
  onMoveTaskToList,
  onSortListDate,
  onSortListPriority,
  onClearListCompleted,
  onDeleteList,
  onOpenPanel,
  onToggleExpandTask,
  onSetInlineEditor,
  onToggleExpandSub,
  onSetSubInlineEditor,
  onOpenDatePicker,
  onOpenLabelPicker,
  onShowToast,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDrop,
  onListDragStart,
  onListDragOver,
  onListDrop,
  isDragOver,
}) => {
  const [showInput, setShowInput] = useState(false);
  const [newTitle, setNewInputTitle] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showCompleted, setShowCompleted] = useState(!!list._showCompleted);

  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const taskMatches = (task: Task): boolean => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inTitle = task.title.toLowerCase().includes(q);
      const inNotes = (task.notes || "").toLowerCase().includes(q);
      const inSub = (task.subtasks || []).some((s) => s.title.toLowerCase().includes(q));
      if (!inTitle && !inNotes && !inSub) return false;
    }
    switch (filterType) {
      case "pending": return !task.done;
      case "today": return !task.done && dueStatus(task.due) === "today";
      case "overdue": return !task.done && dueStatus(task.due) === "overdue";
      case "high": return !task.done && task.priority === "high";
      default: return true;
    }
  };

  const pendingTasks = list.tasks.filter((t) => !t.done && taskMatches(t));
  const completedTasks = list.tasks.filter((t) => t.done && taskMatches(t));

  const taskInputRef = useRef<HTMLInputElement>(null);

  const handleCommitTask = () => {
    const title = newTitle.trim();
    if (title) {
      onAddTask(list.id, title);
      setNewInputTitle("");
      setShowInput(true);
      setTimeout(() => taskInputRef.current?.focus(), 10);
    } else {
      setShowInput(false);
    }
  };

  const getMenuPositionStyle = (): React.CSSProperties => {
    if (!menuBtnRef.current) return { top: 0, left: 0 };
    const rect = menuBtnRef.current.getBoundingClientRect();
    const w = 230;
    let left = Math.min(rect.left, window.innerWidth - w - 12);
    let top = Math.min(rect.bottom + 4, window.innerHeight - 200);
    return { top: `${top}px`, left: `${left}px` };
  };

  return (
    <div
      className={`list${isDragOver ? ' drag-over' : ''}`}
      onDragOver={(e) => {
        onListDragOver(e, list.id);
        onTaskDragOver(e, list.id);
      }}
      onDrop={(e) => {
        onListDrop(e, list.id);
        onTaskDrop(e, list.id);
      }}
    >
      {/* Header */}
      <div
        className="list-header"
        draggable
        onDragStart={(e) => onListDragStart(e, list.id)}
      >
        <input
          className="list-title"
          value={list.name}
          onChange={(e) => onUpdateListName(list.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="list-count">{pendingTasks.length}</span>
        <button
          ref={menuBtnRef}
          className="icon-btn list-menu-btn"
          title="Opções da lista"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((p) => !p);
          }}
        >
          <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>
        </button>

        {showMenu && (
          <div className="dropdown" style={getMenuPositionStyle()} onClick={(e) => e.stopPropagation()}>
            <button
              className="dropdown-item"
              onClick={() => {
                setShowMenu(false);
                onSortListDate(list.id);
              }}
            >
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
              Ordenar por data
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                setShowMenu(false);
                onSortListPriority(list.id);
              }}
            >
              <svg viewBox="0 0 24 24"><path d="M5 21V4m0 0h11l-2 4 2 4H5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Ordenar por prioridade
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                setShowMenu(false);
                onClearListCompleted(list.id);
              }}
            >
              <svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Limpar concluídas
            </button>
            <button
              className="dropdown-item danger"
              onClick={() => {
                setShowMenu(false);
                onDeleteList(list);
              }}
            >
              <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
              Excluir lista
            </button>
          </div>
        )}
      </div>

      {/* Add Task Trigger */}
      <button
        className="list-add-task"
        onClick={() => setShowInput(true)}
      >
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Adicionar tarefa
      </button>

      {/* Inline Quick Task Creator */}
      {showInput && (
        <div className="task-input-wrap">
          <input
            ref={taskInputRef}
            type="text"
            placeholder="Título da tarefa (Enter para salvar)"
            value={newTitle}
            onChange={(e) => setNewInputTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCommitTask();
              if (e.key === "Escape") setShowInput(false);
            }}
            onBlur={() => {
              if (!newTitle.trim()) setShowInput(false);
              else handleCommitTask();
            }}
            autoFocus
          />
        </div>
      )}

      {/* Pending Tasks Container */}
      <div className="tasks">
        {pendingTasks.map((t, idx) => (
          <TaskCard
            key={t.id}
            board={board}
            list={list}
            task={t}
            allLabels={allLabels}
            prevTaskInList={idx > 0 ? pendingTasks[idx - 1] : null}
            expandedTaskId={expandedTaskId}
            expandedSubId={expandedSubId}
            inlineEditor={inlineEditor}
            subInlineEditor={subInlineEditor}
            onToggleDone={onToggleDone}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onDuplicateTask={onDuplicateTask}
            onNestTask={onNestTask}
            onPromoteSubtask={onPromoteSubtask}
            onMoveTaskToList={onMoveTaskToList}
            onOpenPanel={onOpenPanel}
            onToggleExpandTask={onToggleExpandTask}
            onSetInlineEditor={onSetInlineEditor}
            onToggleExpandSub={onToggleExpandSub}
            onSetSubInlineEditor={onSetSubInlineEditor}
            onOpenDatePicker={onOpenDatePicker}
            onOpenLabelPicker={onOpenLabelPicker}
            onShowToast={onShowToast}
            onDragStart={(e, taskId) => onTaskDragStart(e, taskId, list.id)}
            onDragEnd={() => {}}
          />
        ))}
      </div>

      {/* Collapsible Completed Section */}
      {completedTasks.length > 0 && (
        <>
          <button
            className={`completed-toggle${showCompleted ? ' open' : ''}`}
            onClick={() => setShowCompleted((p) => !p)}
          >
            <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Concluídas ({completedTasks.length})
          </button>
          {showCompleted && (
            <div className="completed-tasks">
              {completedTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  board={board}
                  list={list}
                  task={t}
                  allLabels={allLabels}
                  prevTaskInList={null}
                  expandedTaskId={expandedTaskId}
                  expandedSubId={expandedSubId}
                  inlineEditor={inlineEditor}
                  subInlineEditor={subInlineEditor}
                  onToggleDone={onToggleDone}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onDuplicateTask={onDuplicateTask}
                  onNestTask={onNestTask}
                  onPromoteSubtask={onPromoteSubtask}
                  onMoveTaskToList={onMoveTaskToList}
                  onOpenPanel={onOpenPanel}
                  onToggleExpandTask={onToggleExpandTask}
                  onSetInlineEditor={onSetInlineEditor}
                  onToggleExpandSub={onToggleExpandSub}
                  onSetSubInlineEditor={onSetSubInlineEditor}
                  onOpenDatePicker={onOpenDatePicker}
                  onOpenLabelPicker={onOpenLabelPicker}
                  onShowToast={onShowToast}
                  onDragStart={(e, taskId) => onTaskDragStart(e, taskId, list.id)}
                  onDragEnd={() => {}}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
