import { AppState, Color, Label, FilterType, Task, Subtask } from '../types';

export const STORAGE_KEY = "legalizaboard-v1";
export const LEGACY_STORAGE_KEY = "taskboard-premium-v1";
export const MAX_FILE_BYTES = 400 * 1024; // 400 KB limit per file attachment

export const COLORS: Color[] = [
  { id: "", label: "Nenhuma", value: "" },
  { id: "red", value: "#d93025" },
  { id: "yellow", value: "#f29900" },
  { id: "green", value: "#34a853" },
  { id: "blue", value: "#1a73e8" },
  { id: "purple", value: "#a142f4" },
  { id: "teal", value: "#12b5cb" },
  { id: "graphite", value: "#5f6368" },
];

export const DEFAULT_LABELS: Label[] = [
  { id: "lbl-red",      emoji: "❗", name: "Urgente",    color: "red" },
  { id: "lbl-yellow",   emoji: "🔥", name: "Prioridade", color: "yellow" },
  { id: "lbl-teal",     emoji: "📌", name: "Exigência",  color: "teal" },
  { id: "lbl-graphite", emoji: "⏳", name: "Aguardando", color: "graphite" },
  { id: "lbl-blue",     emoji: "💡", name: "Ideia",      color: "blue" },
  { id: "lbl-purple",   emoji: "👀", name: "Acompanhar", color: "purple" },
  { id: "lbl-green",    emoji: "✅", name: "Revisado",   color: "green" },
];

export const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pendentes" },
  { id: "today", label: "Para hoje" },
  { id: "overdue", label: "Atrasadas" },
  { id: "high", label: "Prioridade alta" },
];

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dueStatus(due?: string): "overdue" | "today" | "future" | "" {
  if (!due) return "";
  const d = parseDate(due);
  if (!d) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d < today) return "overdue";
  if (d.getTime() === today.getTime()) return "today";
  return "future";
}

export function formatDue(due?: string): string {
  if (!due) return "";
  const status = dueStatus(due);
  if (status === "today") return "Hoje";
  const d = parseDate(due);
  if (!d) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.getTime() === tomorrow.getTime()) return "Amanhã";
  if (d.getTime() === yesterday.getTime()) return "Ontem";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("pt-BR", opts);
}

export function formatBytes(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " KB";
  return (b / 1024 / 1024).toFixed(1) + " MB";
}

export function labelHex(label: Label): string {
  return COLORS.find((c) => c.id === label.color)?.value || "#5f6368";
}

export function defaultState(): AppState {
  const boardId = uid();
  return {
    theme: window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    activeBoard: boardId,
    filter: "all",
    sidebarCollapsed: false,
    labels: DEFAULT_LABELS.map((l) => ({ ...l })),
    boards: [
      {
        id: boardId,
        name: "Meu quadro",
        color: "#d93025",
        lists: [
          {
            id: uid(),
            name: "A fazer",
            tasks: [
              {
                id: uid(),
                title: "Bem-vindo ao LegalizaBoard 🎉",
                notes: "Clique em uma tarefa para abrir os detalhes: notas, data, prioridade, cor e subtarefas.",
                due: "",
                priority: "",
                labels: ["lbl-red"],
                done: false,
                subtasks: [
                  { id: uid(), title: "Arraste tarefas entre listas", done: false },
                  { id: uid(), title: "Experimente o tema escuro no topo", done: false },
                ],
                createdAt: Date.now(),
              },
              {
                id: uid(),
                title: "Criar minha primeira tarefa",
                notes: "",
                due: todayStr(),
                priority: "high",
                labels: [],
                done: false,
                subtasks: [],
                createdAt: Date.now(),
              },
            ],
          },
          { id: uid(), name: "Em andamento", tasks: [] },
          {
            id: uid(),
            name: "Concluído",
            tasks: [
              {
                id: uid(),
                title: "Instalar o LegalizaBoard",
                notes: "",
                due: "",
                priority: "",
                labels: ["lbl-green"],
                done: true,
                subtasks: [],
                createdAt: Date.now(),
              },
            ],
          },
        ],
      },
    ],
  };
}

export function migrate(st: any): AppState {
  if (!Array.isArray(st.labels) || !st.labels.length) {
    st.labels = DEFAULT_LABELS.map((l) => ({ ...l }));
  }
  const byColor: Record<string, string> = {};
  st.labels.forEach((l: Label) => { if (!byColor[l.color]) byColor[l.color] = l.id; });

  const fix = (o: any) => {
    if (!Array.isArray(o.labels)) o.labels = [];
    if (o.color && !o.labels.length && byColor[o.color]) o.labels.push(byColor[o.color]);
    delete o.color;
  };

  if (Array.isArray(st.boards)) {
    st.boards.forEach((b: any) => {
      if (Array.isArray(b.lists)) {
        b.lists.forEach((l: any) => {
          if (Array.isArray(l.tasks)) {
            l.tasks.forEach((t: any) => {
              fix(t);
              if (Array.isArray(t.subtasks)) t.subtasks.forEach(fix);
            });
          }
        });
      }
    });
  }
  return st as AppState;
}

export function loadState(): AppState {
  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.boards) && parsed.boards.length) return migrate(parsed);
    } catch (e) {
      /* ignore corrupted entry */
    }
  }
  return migrate(defaultState());
}

export function saveState(st: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    return true;
  } catch (err) {
    console.warn("Falha ao salvar no localStorage:", err);
    return false;
  }
}
