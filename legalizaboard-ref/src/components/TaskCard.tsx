import React, { useState, useRef } from 'react';
import { Board, List, Task, Subtask, FileAttachment, Label } from '../types';
import { labelHex, dueStatus, formatDue, formatBytes, MAX_FILE_BYTES, uid } from '../utils/storage';
import { FileUploadButton } from './FileUploadButton';

interface TaskCardProps {
  board: Board;
  list: List;
  task: Task;
  allLabels: Label[];
  prevTaskInList?: Task | null;
  expandedTaskId: string | null;
  expandedSubId: string | null;
  inlineEditor: 'due' | 'color' | 'subtask' | 'file' | null;
  subInlineEditor: 'due' | 'color' | 'file' | null;
  onToggleDone: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onNestTask: (task: Task, targetParent: Task) => void;
  onPromoteSubtask?: (parentTaskId: string, subtaskId: string) => void;
  onMoveTaskToList: (task: Task, targetListId: string) => void;
  onOpenPanel: (task: Task) => void;
  onToggleExpandTask: (taskId: string) => void;
  onSetInlineEditor: (editor: 'due' | 'color' | 'subtask' | 'file' | null) => void;
  onToggleExpandSub: (subId: string) => void;
  onSetSubInlineEditor: (editor: 'due' | 'color' | 'file' | null) => void;
  onOpenDatePicker: (anchor: DOMRect, obj: Task | Subtask) => void;
  onOpenLabelPicker: (anchor: DOMRect, obj: Task | Subtask) => void;
  onShowToast: (msg: string, withUndo?: boolean) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  board,
  list,
  task,
  allLabels,
  prevTaskInList,
  expandedTaskId,
  expandedSubId,
  inlineEditor,
  subInlineEditor,
  onToggleDone,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onNestTask,
  onPromoteSubtask,
  onMoveTaskToList,
  onOpenPanel,
  onToggleExpandTask,
  onSetInlineEditor,
  onToggleExpandSub,
  onSetSubInlineEditor,
  onOpenDatePicker,
  onOpenLabelPicker,
  onShowToast,
  onDragStart,
  onDragEnd,
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuSub, setMenuSub] = useState<'root' | 'move'>('root');
  const kebabBtnRef = useRef<HTMLButtonElement>(null);

  const getLabels = (obj: Task | Subtask) => {
    return (obj.labels || [])
      .map((id) => allLabels.find((l) => l.id === id))
      .filter(Boolean) as Label[];
  };

  const taskLabels = getLabels(task);
  const firstLabel = taskLabels[0];
  const isExpanded = expandedTaskId === task.id;

  const subtasks = task.subtasks || [];
  const completedSubtasksCount = subtasks.filter((s) => s.done).length;
  const hasSubtasks = subtasks.length > 0;
  const progressPercent = hasSubtasks
    ? Math.round((completedSubtasksCount / subtasks.length) * 100)
    : 0;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".task-expand") ||
      target.closest(".task-menu-btn") ||
      target.closest(".task-preview-list") ||
      target.closest(".check-circle") ||
      target.closest(".dropdown")
    ) {
      return;
    }
    onToggleExpandTask(task.id);
  };

  // Subtask Meta HTML Chips
  const renderSubtaskMeta = (sub: Subtask) => {
    const bits: React.ReactNode[] = [];
    if (sub.due) {
      const st = dueStatus(sub.due);
      const cls = !sub.done && st === "overdue" ? " overdue" : !sub.done && st === "today" ? " today" : "";
      bits.push(
        <span key="due" className={`meta-chip${cls}`}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          {formatDue(sub.due)}
        </span>
      );
    }
    const subLbls = getLabels(sub);
    if (subLbls.length > 0) {
      subLbls.forEach((l) => {
        const c = labelHex(l);
        bits.push(
          <span key={l.id} className="label-pill" style={{ background: `${c}22`, color: c }}>
            {l.emoji} {l.name}
          </span>
        );
      });
    }
    if (sub.files && sub.files.length) {
      bits.push(
        <span key="files" className="meta-chip">
          <svg viewBox="0 0 24 24"><path d="M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {sub.files.length}
        </span>
      );
    }
    return bits;
  };

  // File upload handler
  const handleAddFiles = (files: File[], targetObj: Task | Subtask) => {
    let currentFiles = targetObj.files || [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const entry: FileAttachment = {
          id: uid(),
          name: file.name,
          size: file.size,
          type: file.type,
          data: reader.result as string,
        };
        currentFiles = [...currentFiles, entry];
        if ('subtasks' in targetObj) {
          onUpdateTask({ ...task, files: currentFiles });
        } else {
          const nextSubs = (task.subtasks || []).map((s) =>
            s.id === targetObj.id ? { ...s, files: currentFiles } : s
          );
          onUpdateTask({ ...task, subtasks: nextSubs });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (fileId: string, targetObj: Task | Subtask) => {
    const nextFiles = (targetObj.files || []).filter((f) => f.id !== fileId);
    if ('subtasks' in targetObj) {
      onUpdateTask({ ...task, files: nextFiles });
    } else {
      const nextSubs = (task.subtasks || []).map((s) =>
        s.id === targetObj.id ? { ...s, files: nextFiles } : s
      );
      onUpdateTask({ ...task, subtasks: nextSubs });
    }
  };

  const handleMoveSubtask = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subtasks.length) return;
    const updated = [...subtasks];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    onUpdateTask({ ...task, subtasks: updated });
  };

  // Render Subtask Inline Editor controls
  const renderSubExpand = (sub: Subtask) => {
    return (
      <div className="sub-expand" onClick={(e) => e.stopPropagation()}>
        <div className="task-actions">
          <button
            className={`task-action-btn${subInlineEditor === 'due' ? ' active' : ''}`}
            title="Data"
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onOpenDatePicker(rect, sub);
            }}
          >
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
            <span>Data</span>
          </button>
          <button
            className={`task-action-btn${subInlineEditor === 'color' ? ' active' : ''}`}
            title="Etiqueta"
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onOpenLabelPicker(rect, sub);
            }}
          >
            <svg viewBox="0 0 24 24"><path d="M3 12V5a2 2 0 012-2h7l9 9-9 9-9-9z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg>
            <span>Etiqueta</span>
          </button>
          <button
            className={`task-action-btn${subInlineEditor === 'file' ? ' active' : ''}`}
            title="Anexo"
            onClick={(e) => {
              e.stopPropagation();
              onSetSubInlineEditor(subInlineEditor === 'file' ? null : 'file');
            }}
          >
            <svg viewBox="0 0 24 24"><path d="M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>Anexo</span>
          </button>
        </div>

        {subInlineEditor === 'file' && (
          <div className="task-editor sub">
            {(sub.files || []).map((f) => (
              <div key={f.id} className="editor-file">
                <a className="editor-file-name" href={f.data} download={f.name} title={`Baixar ${f.name}`}>
                  {f.name}
                </a>
                <span className="editor-file-size">{formatBytes(f.size)}</span>
                <button
                  className="editor-subtask-remove"
                  title="Remover anexo"
                  onClick={() => handleRemoveFile(f.id, sub)}
                >
                  <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
            <FileUploadButton
              onFilesSelected={(files) => handleAddFiles(files, sub)}
              onShowToast={onShowToast}
              label="Escolher arquivos"
              hint={`Até ${formatBytes(MAX_FILE_BYTES)} por arquivo — guardado neste navegador`}
            />
          </div>
        )}
      </div>
    );
  };

  // Inline Subtask Editor block for Main Task
  const renderSubtaskEditorBlock = () => {
    return (
      <div className="task-editor" onClick={(e) => e.stopPropagation()}>
        {subtasks.map((sub, idx) => {
          const isSubExpanded = expandedSubId === sub.id;
          return (
            <div
              key={sub.id}
              className={`editor-subtask-wrap${isSubExpanded ? ' expanded' : ''}`}
            >
              <div
                className={`editor-subtask${sub.done ? ' done' : ''}`}
                onClick={() => onToggleExpandSub(sub.id)}
              >
                <button
                  className={`check-circle small${sub.done ? ' checked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextSubs = subtasks.map((s) =>
                      s.id === sub.id ? { ...s, done: !s.done } : s
                    );
                    onUpdateTask({ ...task, subtasks: nextSubs });
                  }}
                />
                <span className="editor-subtask-title">{sub.title}</span>
                <span className="sub-meta">{renderSubtaskMeta(sub)}</span>
                
                {/* Reorder & Promote actions */}
                <div className="subtask-reorder-btns">
                  {idx > 0 && (
                    <button
                      className="subtask-order-btn"
                      title="Mover para cima"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSubtask(idx, 'up');
                      }}
                    >
                      <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  )}
                  {idx < subtasks.length - 1 && (
                    <button
                      className="subtask-order-btn"
                      title="Mover para baixo"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSubtask(idx, 'down');
                      }}
                    >
                      <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  )}
                  {onPromoteSubtask && (
                    <button
                      className="subtask-order-btn"
                      title="Promover a tarefa principal"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPromoteSubtask(task.id, sub.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  )}
                </div>

                <button
                  className="editor-subtask-remove"
                  title="Remover"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextSubs = subtasks.filter((s) => s.id !== sub.id);
                    onUpdateTask({ ...task, subtasks: nextSubs });
                  }}
                >
                  <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
              {isSubExpanded && renderSubExpand(sub)}
            </div>
          );
        })}
        <input
          type="text"
          className="editor-input"
          placeholder="Nova subtarefa — Enter para salvar"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const val = (e.target as HTMLInputElement).value.trim();
              if (val) {
                const newSub: Subtask = { id: uid(), title: val, done: false, labels: [] };
                onUpdateTask({ ...task, subtasks: [...subtasks, newSub] });
                (e.target as HTMLInputElement).value = "";
              }
            }
          }}
        />
      </div>
    );
  };

  // Inline File Editor block for Main Task
  const renderFileEditorBlock = () => {
    const files = task.files || [];
    return (
      <div className="task-editor" onClick={(e) => e.stopPropagation()}>
        {files.map((f) => (
          <div key={f.id} className="editor-file">
            <a className="editor-file-name" href={f.data} download={f.name} title={`Baixar ${f.name}`}>
              {f.name}
            </a>
            <span className="editor-file-size">{formatBytes(f.size)}</span>
            <button
              className="editor-subtask-remove"
              title="Remover anexo"
              onClick={() => handleRemoveFile(f.id, task)}
            >
              <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        ))}
        <FileUploadButton
          onFilesSelected={(files) => handleAddFiles(files, task)}
          onShowToast={onShowToast}
          label="Escolher arquivos"
          hint={`Até ${formatBytes(MAX_FILE_BYTES)} por arquivo — guardado neste navegador`}
        />
      </div>
    );
  };

  // Context Menu calculation
  const getMenuPositionStyle = (): React.CSSProperties => {
    if (!kebabBtnRef.current) return { top: 0, left: 0 };
    const rect = kebabBtnRef.current.getBoundingClientRect();
    const menuWidth = 230;
    let left = Math.max(8, Math.min(rect.left - menuWidth + 32, window.innerWidth - menuWidth - 12));
    let top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 200));
    return { top: `${top}px`, left: `${left}px` };
  };

  return (
    <div
      className={`task-card${task.done ? ' done' : ''}${isExpanded ? ' expanded' : ''}`}
      draggable={!isExpanded}
      onClick={handleCardClick}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
    >
      {firstLabel && (
        <span className="color-bar" style={{ background: labelHex(firstLabel) }} />
      )}

      <button
        className={`check-circle${task.done ? ' checked' : ''}`}
        title={task.done ? "Marcar como pendente" : "Concluir"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(task);
        }}
      />

      <div className="task-main">
        <div className="task-title-text">{task.title}</div>
        {task.notes && !task.done && (
          <div className="task-notes-preview">{task.notes}</div>
        )}
        <div className="task-meta">
          {taskLabels.map((l) => {
            const c = labelHex(l);
            return (
              <span key={l.id} className="label-pill" style={{ background: `${c}22`, color: c }}>
                {l.emoji} {l.name}
              </span>
            );
          })}
          {task.due && (
            <span
              className={`meta-chip${
                !task.done && dueStatus(task.due) === "overdue"
                  ? " overdue"
                  : !task.done && dueStatus(task.due) === "today"
                  ? " today"
                  : ""
              }`}
            >
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
              {formatDue(task.due)}
            </span>
          )}
          {task.priority && (
            <span className={`meta-chip prio-${task.priority}`}>
              <svg viewBox="0 0 24 24"><path d="M5 21V4m0 0h11l-2 4 2 4H5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
            </span>
          )}
          {hasSubtasks && (
            <span
              className={`meta-chip subtask-badge${completedSubtasksCount === subtasks.length ? ' done-badge' : ''}`}
              title="Progresso de subtarefas"
            >
              <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {completedSubtasksCount}/{subtasks.length}
            </span>
          )}
          {task.files && task.files.length > 0 && (
            <span className="meta-chip">
              <svg viewBox="0 0 24 24"><path d="M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {task.files.length}
            </span>
          )}
          {task.notes && (
            <span className="meta-chip">
              <svg viewBox="0 0 24 24"><path d="M6 3h9l5 5v13H6z M15 3v5h5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round"/></svg>
              Nota
            </span>
          )}
        </div>
      </div>

      <button
        ref={kebabBtnRef}
        className="task-menu-btn"
        title="Mais opções"
        onClick={(e) => {
          e.stopPropagation();
          setShowContextMenu((prev) => !prev);
          setMenuSub('root');
        }}
      >
        <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/></svg>
      </button>

      {/* Visual Subtask Progress Bar */}
      {hasSubtasks && (
        <div className="card-progress-bar" title={`Progresso das subtarefas: ${progressPercent}%`}>
          <div className="card-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      {/* Task Context Menu */}
      {showContextMenu && (
        <div className="dropdown" style={getMenuPositionStyle()} onClick={(e) => e.stopPropagation()}>
          {menuSub === 'root' ? (
            <>
              <button
                className="dropdown-item"
                onClick={() => {
                  setShowContextMenu(false);
                  onOpenPanel(task);
                }}
              >
                <svg viewBox="0 0 24 24"><path d="M4 20h4L20 8l-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round"/></svg>
                Editar
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setShowContextMenu(false);
                  onToggleExpandTask(task.id);
                  onSetInlineEditor("subtask");
                }}
              >
                <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Adicionar uma subtarefa
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setShowContextMenu(false);
                  onDuplicateTask(task);
                }}
              >
                <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M5 15V6a2 2 0 012-2h9" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                Duplicar tarefa
              </button>
              <button
                className="dropdown-item has-sub"
                onClick={() => setMenuSub('move')}
              >
                <svg viewBox="0 0 24 24"><path d="M4 12h15m-5-5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Mover para outra lista
                <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {prevTaskInList && (
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowContextMenu(false);
                    onNestTask(task, prevTaskInList);
                  }}
                >
                  <svg viewBox="0 0 24 24"><path d="M4 12h11m-4-4l4 4-4 4M20 5v14" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Definir como subtarefa de "{prevTaskInList.title}"
                </button>
              )}
              <button
                className="dropdown-item danger"
                onClick={() => {
                  setShowContextMenu(false);
                  onDeleteTask(task);
                }}
              >
                <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                Excluir
              </button>
            </>
          ) : (
            <>
              <button className="dropdown-item dropdown-back" onClick={() => setMenuSub('root')}>
                <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Voltar
              </button>
              <div className="dropdown-sep" />
              {board.lists.filter((l) => l.id !== list.id).length > 0 ? (
                board.lists
                  .filter((l) => l.id !== list.id)
                  .map((l) => (
                    <button
                      key={l.id}
                      className="dropdown-item"
                      onClick={() => {
                        setShowContextMenu(false);
                        onMoveTaskToList(task, l.id);
                      }}
                    >
                      {l.name}
                    </button>
                  ))
              ) : (
                <div className="dropdown-empty">Nenhuma outra lista neste quadro</div>
              )}
            </>
          )}
        </div>
      )}

      {/* Subtasks preview list */}
      {hasSubtasks && (
        <div className="task-preview-list">
          {subtasks.map((sub, idx) => {
            const isSubExpanded = expandedSubId === sub.id;
            return (
              <div
                key={sub.id}
                className={`task-preview-wrap${isSubExpanded ? ' expanded' : ''}`}
              >
                <div
                  className={`task-preview-item${sub.done ? ' done' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpandSub(sub.id);
                  }}
                >
                  <button
                    className={`check-circle small${sub.done ? ' checked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextSubs = subtasks.map((s) =>
                        s.id === sub.id ? { ...s, done: !s.done } : s
                      );
                      onUpdateTask({ ...task, subtasks: nextSubs });
                    }}
                  />
                  <span className="task-preview-title">{sub.title}</span>
                  <span className="sub-meta">{renderSubtaskMeta(sub)}</span>
                  
                  {/* Promote subtask button on hover */}
                  {onPromoteSubtask && (
                    <button
                      className="subtask-order-btn"
                      title="Promover a tarefa principal"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPromoteSubtask(task.id, sub.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  )}
                  {/* Delete subtask button on hover */}
                  <button
                    className="subtask-remove"
                    title="Excluir subtarefa"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextSubs = subtasks.filter((s) => s.id !== sub.id);
                      onUpdateTask({ ...task, subtasks: nextSubs });
                    }}
                  >
                    <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
                {isSubExpanded && renderSubExpand(sub)}
              </div>
            );
          })}
        </div>
      )}

      {/* Inline expanded controls */}
      {isExpanded && (
        <div className="task-expand" onClick={(e) => e.stopPropagation()}>
          <div className="task-actions">
            <button
              className={`task-action-btn${inlineEditor === 'due' ? ' active' : ''}`}
              title="Data"
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onOpenDatePicker(rect, task);
              }}
            >
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
              <span>Data</span>
            </button>

            <button
              className={`task-action-btn${inlineEditor === 'color' ? ' active' : ''}`}
              title="Etiqueta"
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onOpenLabelPicker(rect, task);
              }}
            >
              <svg viewBox="0 0 24 24"><path d="M3 12V5a2 2 0 012-2h7l9 9-9 9-9-9z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg>
              <span>Etiqueta</span>
            </button>

            <button
              className={`task-action-btn${inlineEditor === 'subtask' ? ' active' : ''}`}
              title="Subtarefa"
              onClick={(e) => {
                e.stopPropagation();
                onSetInlineEditor(inlineEditor === 'subtask' ? null : 'subtask');
              }}
            >
              <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>Subtarefa</span>
            </button>

            <button
              className={`task-action-btn${inlineEditor === 'file' ? ' active' : ''}`}
              title="Anexo"
              onClick={(e) => {
                e.stopPropagation();
                onSetInlineEditor(inlineEditor === 'file' ? null : 'file');
              }}
            >
              <svg viewBox="0 0 24 24"><path d="M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Anexo</span>
            </button>
          </div>

          {inlineEditor === 'subtask' && renderSubtaskEditorBlock()}
          {inlineEditor === 'file' && renderFileEditorBlock()}
        </div>
      )}
    </div>
  );
};
