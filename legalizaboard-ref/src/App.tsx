import React, { useState, useEffect, useRef } from 'react';
import { AppState, Board, List, Task, Subtask, Label, UndoItem, FilterType } from './types';
import {
  loadState,
  saveState,
  uid,
  todayStr,
  dueStatus,
  COLORS,
  DEFAULT_LABELS,
} from './utils/storage';
import { Topbar } from './components/Topbar';
import { Sidebar } from './components/Sidebar';
import { BoardHeader } from './components/BoardHeader';
import { ListColumn } from './components/ListColumn';
import { TaskPanel } from './components/TaskPanel';
import { DatePickerModal } from './components/DatePickerModal';
import { LabelPickerModal } from './components/LabelPickerModal';
import { Toast } from './components/Toast';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [searchQuery, setSearchQuery] = useState("");
  const [openTaskRef, setOpenTaskRef] = useState<{ boardId: string; listId: string; taskId: string } | null>(null);
  const [undoStack, setUndoStack] = useState<UndoItem | null>(null);
  const [toast, setToast] = useState<{ msg: string; withUndo?: boolean } | null>(null);

  // Inline task expansion state
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [inlineEditor, setInlineEditor] = useState<'due' | 'color' | 'subtask' | 'file' | null>(null);
  const [subInlineEditor, setSubInlineEditor] = useState<'due' | 'color' | 'file' | null>(null);

  // Modal pickers
  const [datePickerConfig, setDatePickerConfig] = useState<{
    anchorRect: DOMRect;
    targetObj: Task | Subtask;
  } | null>(null);

  const [labelPickerConfig, setLabelPickerConfig] = useState<{
    anchorRect: DOMRect;
    targetObj: Task | Subtask;
  } | null>(null);

  // Drag and Drop state
  const [dragTask, setDragTask] = useState<{ taskId: string; sourceListId: string } | null>(null);
  const [dragList, setDragList] = useState<{ listId: string } | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const boardTitleRef = useRef<HTMLHeadingElement>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Save state on changes
  useEffect(() => {
    saveState(state);
    document.documentElement.setAttribute("data-theme", state.theme);
  }, [state]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        !(document.activeElement as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpenTaskRef(null);
        setDatePickerConfig(null);
        setLabelPickerConfig(null);
        if (expandedTaskId) {
          setExpandedTaskId(null);
          setInlineEditor(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedTaskId]);

  // Active Board helper
  const activeBoard = state.boards.find((b) => b.id === state.activeBoard) || state.boards[0] || {
    id: uid(),
    name: "Meu quadro",
    color: "#d93025",
    lists: [],
  };

  const showToast = (msg: string, withUndo = false) => {
    setToast({ msg, withUndo });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleUndo = () => {
    if (!undoStack) return;
    if (undoStack.type === "task" && undoStack.list && undoStack.task) {
      const restoredList = undoStack.list;
      const restoredTask = undoStack.task;
      const idx = undoStack.idx;
      setState((prev) => ({
        ...prev,
        boards: prev.boards.map((b) => ({
          ...b,
          lists: b.lists.map((l) => {
            if (l.id === restoredList.id) {
              const newTasks = [...l.tasks];
              newTasks.splice(Math.min(idx, newTasks.length), 0, restoredTask);
              return { ...l, tasks: newTasks };
            }
            return l;
          }),
        })),
      }));
    } else if (undoStack.type === "list" && undoStack.board && undoStack.list) {
      const restoredBoard = undoStack.board;
      const restoredList = undoStack.list;
      const idx = undoStack.idx;
      setState((prev) => ({
        ...prev,
        boards: prev.boards.map((b) => {
          if (b.id === restoredBoard.id) {
            const newLists = [...b.lists];
            newLists.splice(Math.min(idx, newLists.length), 0, restoredList);
            return { ...b, lists: newLists };
          }
          return b;
        }),
      }));
    }
    setUndoStack(null);
    setToast(null);
  };

  // Board operations
  const handleSelectBoard = (boardId: string) => {
    setState((prev) => ({ ...prev, activeBoard: boardId }));
    if (window.innerWidth <= 900) {
      setState((prev) => ({ ...prev, sidebarCollapsed: true }));
    }
  };

  const handleAddBoard = () => {
    const palette = ["#d93025", "#f29900", "#34a853", "#1a73e8", "#a142f4", "#12b5cb", "#5f6368"];
    const newBoard: Board = {
      id: uid(),
      name: `Quadro ${state.boards.length + 1}`,
      color: palette[state.boards.length % palette.length],
      lists: [
        { id: uid(), name: "A fazer", tasks: [] },
        { id: uid(), name: "Em andamento", tasks: [] },
        { id: uid(), name: "Concluído", tasks: [] },
      ],
    };
    setState((prev) => ({
      ...prev,
      boards: [...prev.boards, newBoard],
      activeBoard: newBoard.id,
    }));
    setTimeout(() => {
      if (boardTitleRef.current) {
        boardTitleRef.current.focus();
        window.getSelection()?.selectAllChildren(boardTitleRef.current);
      }
    }, 50);
  };

  const handleUpdateBoardName = (newName: string) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id ? { ...b, name: newName } : b
      ),
    }));
  };

  const handleChangeBoardColor = (color: string) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id ? { ...b, color } : b
      ),
    }));
    showToast("Cor do quadro atualizada");
  };

  const handleDeleteCurrentBoard = () => {
    if (state.boards.length === 1) {
      showToast("Não é possível excluir o único quadro");
      return;
    }
    if (!window.confirm(`Excluir o quadro "${activeBoard.name}" e todas as suas tarefas?`)) return;
    const remaining = state.boards.filter((b) => b.id !== activeBoard.id);
    setState((prev) => ({
      ...prev,
      boards: remaining,
      activeBoard: remaining[0].id,
    }));
    showToast(`Quadro "${activeBoard.name}" excluído`);
  };

  const handleShareBoard = () => {
    try {
      const payload = JSON.stringify({ sharedBoard: activeBoard }, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeBoard.name.replace(/[^\w\-]+/g, "_")}-compartilhado-${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Arquivo do quadro exportado — envie para compartilhar");
    } catch {
      showToast("Não foi possível exportar o arquivo neste navegador");
    }
  };

  // List operations
  const handleAddList = () => {
    const newList: List = { id: uid(), name: "Nova lista", tasks: [] };
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id ? { ...b, lists: [...b.lists, newList] } : b
      ),
    }));
  };

  const handleUpdateListName = (listId: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id
          ? {
              ...b,
              lists: b.lists.map((l) =>
                l.id === listId ? { ...l, name: newName.trim() || "Sem nome" } : l
              ),
            }
          : b
      ),
    }));
  };

  const handleSortListDate = (listId: string) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id
          ? {
              ...b,
              lists: b.lists.map((l) => {
                if (l.id !== listId) return l;
                const sorted = [...l.tasks].sort((a, b) => {
                  if (a.done !== b.done) return a.done ? 1 : -1;
                  if (!a.due && !b.due) return 0;
                  if (!a.due) return 1;
                  if (!b.due) return -1;
                  return a.due.localeCompare(b.due);
                });
                return { ...l, tasks: sorted };
              }),
            }
          : b
      ),
    }));
  };

  const handleSortListPriority = (listId: string) => {
    const prioOrder: Record<string, number> = { high: 0, medium: 1, low: 2, "": 3 };
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id
          ? {
              ...b,
              lists: b.lists.map((l) => {
                if (l.id !== listId) return l;
                const sorted = [...l.tasks].sort((a, b) => {
                  if (a.done !== b.done) return a.done ? 1 : -1;
                  return (prioOrder[a.priority || ""] ?? 3) - (prioOrder[b.priority || ""] ?? 3);
                });
                return { ...l, tasks: sorted };
              }),
            }
          : b
      ),
    }));
  };

  const handleClearListCompleted = (listId: string) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id
          ? {
              ...b,
              lists: b.lists.map((l) =>
                l.id === listId ? { ...l, tasks: l.tasks.filter((t) => !t.done) } : l
              ),
            }
          : b
      ),
    }));
  };

  const handleDeleteList = (list: List) => {
    const idx = activeBoard.lists.findIndex((l) => l.id === list.id);
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id
          ? { ...b, lists: b.lists.filter((l) => l.id !== list.id) }
          : b
      ),
    }));
    setUndoStack({ type: "list", board: activeBoard, list, idx });
    showToast(`Lista "${list.name}" excluída`, true);
  };

  // Task operations
  const handleAddTask = (listId: string, title: string) => {
    const newTask: Task = {
      id: uid(),
      title,
      notes: "",
      due: "",
      priority: "",
      labels: [],
      done: false,
      subtasks: [],
      createdAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id
          ? {
              ...b,
              lists: b.lists.map((l) =>
                l.id === listId ? { ...l, tasks: [newTask, ...l.tasks] } : l
              ),
            }
          : b
      ),
    }));
  };

  const handleToggleDone = (task: Task) => {
    const isDone = !task.done;
    const updated: Task = {
      ...task,
      done: isDone,
      completedAt: isDone ? Date.now() : undefined,
    };
    handleUpdateTask(updated);
    if (isDone) showToast("Tarefa concluída ✓");
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) => ({
        ...b,
        lists: b.lists.map((l) => ({
          ...l,
          tasks: l.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
        })),
      })),
    }));
  };

  const handleDeleteTask = (task: Task) => {
    let targetList: List | undefined;
    let taskIdx = -1;

    for (const l of activeBoard.lists) {
      const idx = l.tasks.findIndex((t) => t.id === task.id);
      if (idx !== -1) {
        targetList = l;
        taskIdx = idx;
        break;
      }
    }

    if (!targetList) return;

    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) => ({
        ...b,
        lists: b.lists.map((l) =>
          l.id === targetList?.id
            ? { ...l, tasks: l.tasks.filter((t) => t.id !== task.id) }
            : l
        ),
      })),
    }));

    if (expandedTaskId === task.id) setExpandedTaskId(null);
    setUndoStack({ type: "task", list: targetList, task, idx: taskIdx });
    showToast("Tarefa excluída", true);
  };

  const handleDuplicateTask = (task: Task) => {
    const copy: Task = JSON.parse(JSON.stringify(task));
    copy.id = uid();
    copy.done = false;
    copy.completedAt = undefined;
    (copy.subtasks || []).forEach((sb) => (sb.id = uid()));
    (copy.files || []).forEach((f) => (f.id = uid()));

    for (const l of activeBoard.lists) {
      const idx = l.tasks.findIndex((t) => t.id === task.id);
      if (idx !== -1) {
        const nextTasks = [...l.tasks];
        nextTasks.splice(idx + 1, 0, copy);
        setState((prev) => ({
          ...prev,
          boards: prev.boards.map((b) =>
            b.id === activeBoard.id
              ? {
                  ...b,
                  lists: b.lists.map((list) =>
                    list.id === l.id ? { ...list, tasks: nextTasks } : list
                  ),
                }
              : b
          ),
        }));
        break;
      }
    }
    showToast("Tarefa duplicada");
  };

  const handleNestTask = (task: Task, targetParent: Task) => {
    const parentSubtasks = targetParent.subtasks || [];
    const newSubs: Subtask[] = [
      ...parentSubtasks,
      { id: uid(), title: task.title, done: !!task.done },
      ...(task.subtasks || []).map((sb) => ({ id: uid(), title: sb.title, done: !!sb.done })),
    ];
    const updatedParent: Task = { ...targetParent, subtasks: newSubs };

    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id
          ? {
              ...b,
              lists: b.lists.map((l) => ({
                ...l,
                tasks: l.tasks
                  .filter((t) => t.id !== task.id)
                  .map((t) => (t.id === targetParent.id ? updatedParent : t)),
              })),
            }
          : b
      ),
    }));
    if (expandedTaskId === task.id) setExpandedTaskId(null);
    showToast(`Agora é subtarefa de "${targetParent.title}"`);
  };

  const handlePromoteSubtask = (parentTaskId: string, subtaskId: string) => {
    let subTitle = "";
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) => {
        if (b.id !== activeBoard.id) return b;
        return {
          ...b,
          lists: b.lists.map((l) => {
            const parentTask = l.tasks.find((t) => t.id === parentTaskId);
            if (!parentTask) return l;

            const subObj = (parentTask.subtasks || []).find((s) => s.id === subtaskId);
            if (!subObj) return l;
            subTitle = subObj.title;

            const updatedParent: Task = {
              ...parentTask,
              subtasks: (parentTask.subtasks || []).filter((s) => s.id !== subtaskId),
            };

            const newMainTask: Task = {
              id: uid(),
              title: subObj.title,
              done: subObj.done,
              due: subObj.due,
              labels: subObj.labels || [],
              files: subObj.files || [],
              createdAt: Date.now(),
            };

            const parentIdx = l.tasks.findIndex((t) => t.id === parentTaskId);
            const nextTasks = [...l.tasks];
            nextTasks[parentIdx] = updatedParent;
            nextTasks.splice(parentIdx + 1, 0, newMainTask);

            return { ...l, tasks: nextTasks };
          }),
        };
      }),
    }));
    showToast(`"${subTitle || 'Subtarefa'}" convertida em tarefa principal`);
  };

  const handleMoveTaskToList = (task: Task, targetListId: string) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) => {
        if (b.id !== activeBoard.id) return b;
        return {
          ...b,
          lists: b.lists.map((l) => {
            if (l.tasks.some((t) => t.id === task.id)) {
              return { ...l, tasks: l.tasks.filter((t) => t.id !== task.id) };
            }
            if (l.id === targetListId) {
              return { ...l, tasks: [task, ...l.tasks] };
            }
            return l;
          }),
        };
      }),
    }));
    const target = activeBoard.lists.find((l) => l.id === targetListId);
    showToast(`Movida para "${target?.name || 'lista'}"`);
  };

  // Helper to find parent task of any subtask
  const findParentTaskOfSubtask = (subtaskId: string): Task | null => {
    for (const b of state.boards) {
      for (const l of b.lists) {
        for (const t of l.tasks) {
          if (t.subtasks?.some((s) => s.id === subtaskId)) {
            return t;
          }
        }
      }
    }
    return null;
  };

  // Label Management
  const handleToggleLabelForObj = (obj: Task | Subtask, labelId: string) => {
    const current = obj.labels || [];
    const updatedLabels = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];

    if ('subtasks' in obj) {
      handleUpdateTask({ ...obj, labels: updatedLabels });
    } else {
      const parent = findParentTaskOfSubtask(obj.id);
      if (parent) {
        const nextSubs = (parent.subtasks || []).map((s) =>
          s.id === obj.id ? { ...s, labels: updatedLabels } : s
        );
        handleUpdateTask({ ...parent, subtasks: nextSubs });
      }
    }
  };

  const handleCreateLabel = (name: string) => {
    const used = state.labels.map((l) => l.color);
    const free = COLORS.filter((c) => c.value && !used.includes(c.id))[0] || COLORS[1];
    const newLbl: Label = { id: uid(), emoji: "🏷", name, color: free.id };
    setState((prev) => ({
      ...prev,
      labels: [...prev.labels, newLbl],
    }));
  };

  const handleUpdateLabel = (updatedLabel: Label) => {
    setState((prev) => ({
      ...prev,
      labels: prev.labels.map((l) => (l.id === updatedLabel.id ? updatedLabel : l)),
    }));
  };

  const handleDeleteLabel = (labelId: string) => {
    setState((prev) => ({
      ...prev,
      labels: prev.labels.filter((l) => l.id !== labelId),
      boards: prev.boards.map((b) => ({
        ...b,
        lists: b.lists.map((l) => ({
          ...l,
          tasks: l.tasks.map((t) => ({
            ...t,
            labels: (t.labels || []).filter((id) => id !== labelId),
            subtasks: (t.subtasks || []).map((sb) => ({
              ...sb,
              labels: (sb.labels || []).filter((id) => id !== labelId),
            })),
          })),
        })),
      })),
    }));
  };

  // Due Date selection handler
  const handleSelectDueDate = (dueDate: string) => {
    if (!datePickerConfig) return;
    const { targetObj } = datePickerConfig;
    if ('subtasks' in targetObj) {
      handleUpdateTask({ ...targetObj, due: dueDate });
    } else {
      const parent = findParentTaskOfSubtask(targetObj.id);
      if (parent) {
        const nextSubs = (parent.subtasks || []).map((s) =>
          s.id === targetObj.id ? { ...s, due: dueDate } : s
        );
        handleUpdateTask({ ...parent, subtasks: nextSubs });
      }
    }
    setDatePickerConfig(null);
  };

  // Drag and Drop Logic
  const handleTaskDragStart = (e: React.DragEvent, taskId: string, listId: string) => {
    setDragTask({ taskId, sourceListId: listId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTaskDragOver = (e: React.DragEvent, listId: string) => {
    if (dragTask) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverListId(listId);
    }
  };

  const handleTaskDrop = (e: React.DragEvent, targetListId: string) => {
    if (!dragTask) return;
    e.preventDefault();
    setDragOverListId(null);

    const { taskId, sourceListId } = dragTask;
    let movedTask: Task | null = null;

    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) => {
        if (b.id !== activeBoard.id) return b;

        const newLists = b.lists.map((l) => {
          if (l.id === sourceListId) {
            const found = l.tasks.find((t) => t.id === taskId);
            if (found) movedTask = found;
            return { ...l, tasks: l.tasks.filter((t) => t.id !== taskId) };
          }
          return l;
        });

        if (!movedTask) return b;

        return {
          ...b,
          lists: newLists.map((l) => {
            if (l.id === targetListId) {
              return { ...l, tasks: [movedTask!, ...l.tasks] };
            }
            return l;
          }),
        };
      }),
    }));

    setDragTask(null);
  };

  const handleListDragStart = (e: React.DragEvent, listId: string) => {
    setDragList({ listId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleListDragOver = (e: React.DragEvent, _listId: string) => {
    if (dragList) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleListDrop = (e: React.DragEvent, targetListId: string) => {
    if (!dragList || dragList.listId === targetListId) return;
    e.preventDefault();

    const fromIdx = activeBoard.lists.findIndex((l) => l.id === dragList.listId);
    const toIdx = activeBoard.lists.findIndex((l) => l.id === targetListId);

    if (fromIdx === -1 || toIdx === -1) return;

    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) => {
        if (b.id !== activeBoard.id) return b;
        const newLists = [...b.lists];
        const [moved] = newLists.splice(fromIdx, 1);
        newLists.splice(toIdx, 0, moved);
        return { ...b, lists: newLists };
      }),
    }));

    setDragList(null);
  };

  // Export / Import Data
  const handleExportData = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legalizaboard-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup exportado");
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || !Array.isArray(parsed.boards) || !parsed.boards.length) {
          throw new Error("Formato inválido");
        }
        setState(parsed);
        showToast("Dados importados com sucesso");
      } catch {
        showToast("Arquivo inválido — importação cancelada");
      }
    };
    reader.readAsText(file);
  };

  const handleClearBoardCompleted = () => {
    let count = 0;
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === activeBoard.id
          ? {
              ...b,
              lists: b.lists.map((l) => {
                count += l.tasks.filter((t) => t.done).length;
                return { ...l, tasks: l.tasks.filter((t) => !t.done) };
              }),
            }
          : b
      ),
    }));
    showToast(count ? `${count} tarefa(s) concluída(s) removida(s)` : "Nada para limpar");
  };

  // Opened Task for Panel
  const openTaskObj = openTaskRef
    ? activeBoard.lists
        .find((l) => l.id === openTaskRef.listId)
        ?.tasks.find((t) => t.id === openTaskRef.taskId)
    : null;

  const currentListForOpenTask = openTaskRef
    ? activeBoard.lists.find((l) => l.id === openTaskRef.listId)
    : null;

  return (
    <div>
      <Topbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() =>
          setState((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }))
        }
        theme={state.theme}
        onToggleTheme={() =>
          setState((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))
        }
        onExportData={handleExportData}
        onImportData={handleImportData}
        onClearBoardCompleted={handleClearBoardCompleted}
        searchInputRef={searchInputRef}
      />

      <div className="app-body">
        <Sidebar
          boards={state.boards}
          activeBoardId={activeBoard.id}
          collapsed={state.sidebarCollapsed}
          onSelectBoard={handleSelectBoard}
          onAddBoard={handleAddBoard}
        />

        <main className="board-area" id="boardArea">
          <BoardHeader
            board={activeBoard}
            currentFilter={state.filter}
            onUpdateBoardName={handleUpdateBoardName}
            onChangeFilter={(filterId) => setState((prev) => ({ ...prev, filter: filterId }))}
            onShareBoard={handleShareBoard}
            onChangeBoardColor={handleChangeBoardColor}
            onDeleteBoard={handleDeleteCurrentBoard}
            titleInputRef={boardTitleRef}
          />

          <div className="lists-container">
            {activeBoard.lists.map((list) => (
              <ListColumn
                key={list.id}
                board={activeBoard}
                list={list}
                allLabels={state.labels}
                searchQuery={searchQuery}
                filterType={state.filter}
                expandedTaskId={expandedTaskId}
                expandedSubId={expandedSubId}
                inlineEditor={inlineEditor}
                subInlineEditor={subInlineEditor}
                onUpdateListName={handleUpdateListName}
                onAddTask={handleAddTask}
                onToggleDone={handleToggleDone}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onDuplicateTask={handleDuplicateTask}
                onNestTask={handleNestTask}
                onPromoteSubtask={handlePromoteSubtask}
                onMoveTaskToList={handleMoveTaskToList}
                onSortListDate={handleSortListDate}
                onSortListPriority={handleSortListPriority}
                onClearListCompleted={handleClearListCompleted}
                onDeleteList={handleDeleteList}
                onOpenPanel={(task) =>
                  setOpenTaskRef({
                    boardId: activeBoard.id,
                    listId: list.id,
                    taskId: task.id,
                  })
                }
                onToggleExpandTask={(taskId) => {
                  if (expandedTaskId === taskId) {
                    setExpandedTaskId(null);
                    setInlineEditor(null);
                  } else {
                    setExpandedTaskId(taskId);
                    setInlineEditor(null);
                  }
                  setExpandedSubId(null);
                  setSubInlineEditor(null);
                }}
                onSetInlineEditor={setInlineEditor}
                onToggleExpandSub={(subId) => {
                  if (expandedSubId === subId) {
                    setExpandedSubId(null);
                    setSubInlineEditor(null);
                  } else {
                    setExpandedSubId(subId);
                    setSubInlineEditor(null);
                  }
                }}
                onSetSubInlineEditor={setSubInlineEditor}
                onOpenDatePicker={(anchor, obj) => setDatePickerConfig({ anchorRect: anchor, targetObj: obj })}
                onOpenLabelPicker={(anchor, obj) => setLabelPickerConfig({ anchorRect: anchor, targetObj: obj })}
                onShowToast={showToast}
                onTaskDragStart={handleTaskDragStart}
                onTaskDragOver={handleTaskDragOver}
                onTaskDrop={handleTaskDrop}
                onListDragStart={handleListDragStart}
                onListDragOver={handleListDragOver}
                onListDrop={handleListDrop}
                isDragOver={dragOverListId === list.id}
              />
            ))}

            <button className="add-list-btn" onClick={handleAddList}>
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Adicionar lista
            </button>
          </div>
        </main>
      </div>

      {/* Task Drawer Panel */}
      {openTaskObj && currentListForOpenTask && (
        <TaskPanel
          board={activeBoard}
          currentList={currentListForOpenTask}
          task={openTaskObj}
          allLabels={state.labels}
          onUpdateTask={handleUpdateTask}
          onMoveList={(targetListId) => {
            handleMoveTaskToList(openTaskObj, targetListId);
            setOpenTaskRef({
              boardId: activeBoard.id,
              listId: targetListId,
              taskId: openTaskObj.id,
            });
          }}
          onDeleteTask={() => {
            handleDeleteTask(openTaskObj);
            setOpenTaskRef(null);
          }}
          onPromoteSubtask={(subId) => handlePromoteSubtask(openTaskObj.id, subId)}
          onClose={() => setOpenTaskRef(null)}
        />
      )}

      {/* Floating Date Picker */}
      {datePickerConfig && (
        <DatePickerModal
          anchorRect={datePickerConfig.anchorRect}
          currentDue={datePickerConfig.targetObj.due}
          onSelect={handleSelectDueDate}
          onClose={() => setDatePickerConfig(null)}
        />
      )}

      {/* Floating Label Picker */}
      {labelPickerConfig && (
        <LabelPickerModal
          anchorRect={labelPickerConfig.anchorRect}
          selectedLabels={labelPickerConfig.targetObj.labels || []}
          allLabels={state.labels}
          onToggleLabel={(labelId) => handleToggleLabelForObj(labelPickerConfig.targetObj, labelId)}
          onCreateLabel={handleCreateLabel}
          onUpdateLabel={handleUpdateLabel}
          onDeleteLabel={handleDeleteLabel}
          onClose={() => setLabelPickerConfig(null)}
        />
      )}

      {/* Toast notification */}
      <Toast
        message={toast?.msg || null}
        withUndo={toast?.withUndo}
        onUndo={handleUndo}
      />
    </div>
  );
}
