export interface Color {
  id: string;
  value: string;
  label?: string;
}

export interface Label {
  id: string;
  emoji: string;
  name: string;
  color: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  due?: string;
  labels?: string[];
  files?: FileAttachment[];
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  priority?: string;
  color?: string; // legacy color support
  labels?: string[];
  done: boolean;
  subtasks?: Subtask[];
  files?: FileAttachment[];
  createdAt: number;
  completedAt?: number;
}

export interface List {
  id: string;
  name: string;
  tasks: Task[];
  _showCompleted?: boolean;
}

export interface Board {
  id: string;
  name: string;
  color?: string;
  lists: List[];
}

export interface AppState {
  theme: 'light' | 'dark';
  activeBoard: string;
  filter: string;
  sidebarCollapsed: boolean;
  boards: Board[];
  labels: Label[];
}

export type FilterType = 'all' | 'pending' | 'today' | 'overdue' | 'high';

export interface TaskRef {
  boardId: string;
  listId: string;
  taskId: string;
}

export interface UndoItem {
  type: 'task' | 'list';
  list?: List;
  task?: Task;
  board?: Board;
  idx: number;
}
