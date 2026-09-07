import React, { useState, useEffect, useRef } from 'react';
import { Board, List, Task, Label, Subtask, FileAttachment } from '../types';
import { labelHex, dueStatus, formatDue, formatBytes, MAX_FILE_BYTES, uid } from '../utils/storage';
import { FileUploadButton } from './FileUploadButton';

interface TaskPanelProps {
  board: Board;
  currentList: List;
  task: Task;
  allLabels: Label[];
  onUpdateTask: (updated: Task) => void;
  onMoveList: (targetListId: string) => void;
  onDeleteTask: () => void;
  onClose: () => void;
  onPromoteSubtask?: (subtaskId: string) => void;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({
  board,
  currentList,
  task,
  allLabels,
  onUpdateTask,
  onMoveList,
  onDeleteTask,
  onClose,
  onPromoteSubtask,
}) => {
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    autoGrow(titleTextareaRef.current);
  }, [task.title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateTask({ ...task, title: e.target.value });
    autoGrow(e.target);
  };

  const handleToggleDone = () => {
    const isDone = !task.done;
    onUpdateTask({
      ...task,
      done: isDone,
      completedAt: isDone ? Date.now() : undefined,
      subtasks: (task.subtasks || []).map((s) => ({
        ...s,
        done: isDone,
      })),
    });
  };

  const handleToggleLabel = (labelId: string) => {
    const current = task.labels || [];
    const next = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];
    onUpdateTask({ ...task, labels: next });
  };

  const handleAddFilesToTask = (files: File[]) => {
    let currentFiles = task.files || [];
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
        onUpdateTask({ ...task, files: currentFiles });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFileFromTask = (fileId: string) => {
    const nextFiles = (task.files || []).filter((f) => f.id !== fileId);
    onUpdateTask({ ...task, files: nextFiles });
  };

  // Subtask handlers
  const handleAddSubtask = () => {
    const title = subtaskInput.trim();
    if (!title) return;
    const newSubtask: Subtask = { id: uid(), title, done: false, labels: [] };
    const nextSubtasks = [...(task.subtasks || []), newSubtask];
    onUpdateTask({ ...task, subtasks: nextSubtasks });
    setSubtaskInput("");
    // Retain focus for continuous subtask addition
    setTimeout(() => {
      subtaskInputRef.current?.focus();
    }, 10);
  };

  const handleToggleSubtask = (subId: string) => {
    const nextSubtasks = (task.subtasks || []).map((s) =>
      s.id === subId ? { ...s, done: !s.done } : s
    );
    onUpdateTask({ ...task, subtasks: nextSubtasks });
  };

  const handleUpdateSubtaskTitle = (subId: string, title: string) => {
    const nextSubtasks = (task.subtasks || []).map((s) =>
      s.id === subId ? { ...s, title } : s
    );
    onUpdateTask({ ...task, subtasks: nextSubtasks });
  };

  const handleRemoveSubtask = (subId: string) => {
    const nextSubtasks = (task.subtasks || []).filter((s) => s.id !== subId);
    onUpdateTask({ ...task, subtasks: nextSubtasks });
    if (expandedSubId === subId) setExpandedSubId(null);
  };

  const handleMoveSubtask = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subtasks.length) return;
    const updated = [...subtasks];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    onUpdateTask({ ...task, subtasks: updated });
  };

  const handleToggleSubtaskLabel = (subId: string, labelId: string) => {
    const nextSubtasks = (task.subtasks || []).map((s) => {
      if (s.id !== subId) return s;
      const current = s.labels || [];
      const next = current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId];
      return { ...s, labels: next };
    });
    onUpdateTask({ ...task, subtasks: nextSubtasks });
  };

  const handleUpdateSubtaskDue = (subId: string, due: string) => {
    const nextSubtasks = (task.subtasks || []).map((s) =>
      s.id === subId ? { ...s, due } : s
    );
    onUpdateTask({ ...task, subtasks: nextSubtasks });
  };

  const handleAddFilesToSubtask = (subId: string, files: File[]) => {
    let sub = (task.subtasks || []).find((s) => s.id === subId);
    if (!sub) return;
    let currentFiles = sub.files || [];

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
        const nextSubtasks = (task.subtasks || []).map((s) =>
          s.id === subId ? { ...s, files: currentFiles } : s
        );
        onUpdateTask({ ...task, subtasks: nextSubtasks });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFileFromSubtask = (subId: string, fileId: string) => {
    const nextSubtasks = (task.subtasks || []).map((s) => {
      if (s.id !== subId) return s;
      return { ...s, files: (s.files || []).filter((f) => f.id !== fileId) };
    });
    onUpdateTask({ ...task, subtasks: nextSubtasks });
  };

  const subtasks = task.subtasks || [];
  const completedSubtasksCount = subtasks.filter((s) => s.done).length;
  const progressPercent = subtasks.length > 0
    ? Math.round((completedSubtasksCount / subtasks.length) * 100)
    : 0;

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="task-panel">
        <div className="task-panel-header">
          <button className="icon-btn" onClick={onClose} title="Fechar">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="task-panel-header-actions">
            <button className="icon-btn danger-hover" onClick={onDeleteTask} title="Excluir tarefa">
              <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        <div className="task-panel-body">
          <div className="panel-title-row">
            <button
              className={`check-circle${task.done ? ' checked' : ''}`}
              title={task.done ? "Marcar como pendente" : "Concluir tarefa e subtarefas"}
              onClick={handleToggleDone}
            />
            <textarea
              ref={titleTextareaRef}
              className="panel-title"
              rows={1}
              placeholder="Título da tarefa"
              value={task.title}
              onChange={handleTitleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
            />
          </div>

          <div className="panel-field">
            <label className="panel-label">Detalhes</label>
            <textarea
              className="panel-notes"
              rows={3}
              placeholder="Adicionar detalhes..."
              value={task.notes || ""}
              onChange={(e) => onUpdateTask({ ...task, notes: e.target.value })}
            />
          </div>

          <div className="panel-field-row">
            <div className="panel-field">
              <label className="panel-label">Data de vencimento</label>
              <input
                type="date"
                className="panel-input"
                value={task.due || ""}
                onChange={(e) => onUpdateTask({ ...task, due: e.target.value })}
              />
            </div>
            <div className="panel-field">
              <label className="panel-label">Prioridade</label>
              <select
                className="panel-input"
                value={task.priority || ""}
                onChange={(e) => onUpdateTask({ ...task, priority: e.target.value })}
              >
                <option value="">Nenhuma</option>
                <option value="low">🟢 Baixa</option>
                <option value="medium">🟡 Média</option>
                <option value="high">🔴 Alta</option>
              </select>
            </div>
          </div>

          <div className="panel-field">
            <label className="panel-label">Etiquetas</label>
            <div className="color-labels">
              {allLabels.map((l) => {
                const c = labelHex(l);
                const on = (task.labels || []).includes(l.id);
                return (
                  <button
                    key={l.id}
                    className={`label-pill selectable${on ? ' on' : ''}`}
                    style={{
                      background: `${c}${on ? "33" : "18"}`,
                      color: c,
                    }}
                    onClick={() => handleToggleLabel(l.id)}
                  >
                    {l.emoji} {l.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anexos da Tarefa Principal */}
          <div className="panel-field">
            <label className="panel-label">Anexos ({task.files?.length || 0})</label>
            {(task.files || []).map((f) => (
              <div key={f.id} className="editor-file">
                <a className="editor-file-name" href={f.data} download={f.name} title={`Baixar ${f.name}`}>
                  {f.name}
                </a>
                <span className="editor-file-size">{formatBytes(f.size)}</span>
                <button
                  className="editor-subtask-remove"
                  title="Remover anexo"
                  onClick={() => handleRemoveFileFromTask(f.id)}
                >
                  <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
            <FileUploadButton
              onFilesSelected={handleAddFilesToTask}
              onShowToast={(msg) => alert(msg)}
              label="Adicionar anexo à tarefa"
            />
          </div>

          {/* Subtarefas */}
          <div className="panel-field">
            <div className="subtask-header-row">
              <label className="panel-label">
                Subtarefas{' '}
                <span className="subtask-count">
                  {subtasks.length > 0 ? `(${completedSubtasksCount}/${subtasks.length})` : ""}
                </span>
              </label>
            </div>

            {subtasks.length > 0 && (
              <div className="panel-progress-track" title={`Progresso: ${progressPercent}%`}>
                <div
                  className="panel-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            <div className="subtask-list">
              {subtasks.map((sub, idx) => {
                const isExpanded = expandedSubId === sub.id;
                const subLabels = (sub.labels || [])
                  .map((id) => allLabels.find((l) => l.id === id))
                  .filter(Boolean) as Label[];

                return (
                  <div key={sub.id} className={`subtask-panel-card${isExpanded ? ' expanded' : ''}`}>
                    <div className={`subtask-item${sub.done ? ' done' : ''}`}>
                      <button
                        className={`check-circle small${sub.done ? ' checked' : ''}`}
                        title={sub.done ? "Desmarcar subtarefa" : "Concluir subtarefa"}
                        onClick={() => handleToggleSubtask(sub.id)}
                      />
                      <input
                        type="text"
                        value={sub.title}
                        onChange={(e) => handleUpdateSubtaskTitle(sub.id, e.target.value)}
                      />

                      {/* Subtask vertical reorder & promote buttons */}
                      <div className="subtask-reorder-btns">
                        {idx > 0 && (
                          <button
                            type="button"
                            className="subtask-order-btn"
                            title="Mover para cima"
                            onClick={() => handleMoveSubtask(idx, 'up')}
                          >
                            <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        )}
                        {idx < subtasks.length - 1 && (
                          <button
                            type="button"
                            className="subtask-order-btn"
                            title="Mover para baixo"
                            onClick={() => handleMoveSubtask(idx, 'down')}
                          >
                            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        )}
                        {onPromoteSubtask && (
                          <button
                            type="button"
                            className="subtask-order-btn"
                            title="Promover a tarefa principal"
                            onClick={() => onPromoteSubtask(sub.id)}
                          >
                            <svg viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        className={`subtask-expand-btn${isExpanded ? ' active' : ''}`}
                        title="Opções da subtarefa"
                        onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                      >
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                      <button
                        className="subtask-remove"
                        title="Excluir subtarefa"
                        onClick={() => handleRemoveSubtask(sub.id)}
                      >
                        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </div>

                    {/* Meta summary pill when collapsed */}
                    {!isExpanded && (sub.due || subLabels.length > 0 || (sub.files && sub.files.length > 0)) && (
                      <div className="sub-meta-row" onClick={() => setExpandedSubId(sub.id)}>
                        {sub.due && (
                          <span className={`meta-chip${!sub.done && dueStatus(sub.due) === "overdue" ? " overdue" : !sub.done && dueStatus(sub.due) === "today" ? " today" : ""}`}>
                            📅 {formatDue(sub.due)}
                          </span>
                        )}
                        {subLabels.map((l) => (
                          <span key={l.id} className="label-pill" style={{ background: `${labelHex(l)}22`, color: labelHex(l) }}>
                            {l.emoji} {l.name}
                          </span>
                        ))}
                        {sub.files && sub.files.length > 0 && (
                          <span className="meta-chip">📎 {sub.files.length}</span>
                        )}
                      </div>
                    )}

                    {/* Subtask Details / Options when expanded */}
                    {isExpanded && (
                      <div className="subtask-details-box">
                        <div className="panel-field">
                          <label className="panel-label">Vencimento da subtarefa</label>
                          <input
                            type="date"
                            className="panel-input"
                            value={sub.due || ""}
                            onChange={(e) => handleUpdateSubtaskDue(sub.id, e.target.value)}
                          />
                        </div>

                        <div className="panel-field">
                          <label className="panel-label">Etiquetas da subtarefa</label>
                          <div className="color-labels">
                            {allLabels.map((l) => {
                              const c = labelHex(l);
                              const on = (sub.labels || []).includes(l.id);
                              return (
                                <button
                                  key={l.id}
                                  type="button"
                                  className={`label-pill selectable${on ? ' on' : ''}`}
                                  style={{ background: `${c}${on ? "33" : "18"}`, color: c }}
                                  onClick={() => handleToggleSubtaskLabel(sub.id, l.id)}
                                >
                                  {l.emoji} {l.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="panel-field">
                          <label className="panel-label">Anexos da subtarefa ({sub.files?.length || 0})</label>
                          {(sub.files || []).map((f) => (
                            <div key={f.id} className="editor-file">
                              <a className="editor-file-name" href={f.data} download={f.name} title={`Baixar ${f.name}`}>
                                {f.name}
                              </a>
                              <span className="editor-file-size">{formatBytes(f.size)}</span>
                              <button
                                type="button"
                                className="editor-subtask-remove"
                                title="Remover anexo"
                                onClick={() => handleRemoveFileFromSubtask(sub.id, f.id)}
                              >
                                <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              </button>
                            </div>
                          ))}
                          <FileUploadButton
                            onFilesSelected={(files) => handleAddFilesToSubtask(sub.id, files)}
                            onShowToast={(msg) => alert(msg)}
                            label="Anexar arquivo à subtarefa"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="subtask-add">
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <input
                ref={subtaskInputRef}
                type="text"
                placeholder="Adicionar uma subtarefa... (Pressione Enter)"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
            </div>
          </div>

          <div className="panel-field">
            <label className="panel-label">Mover para lista</label>
            <select
              className="panel-input"
              value={currentList.id}
              onChange={(e) => onMoveList(e.target.value)}
            >
              {board.lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>
    </>
  );
};
