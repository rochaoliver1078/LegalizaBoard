import { useState, useCallback, useRef, useEffect } from 'react';

export interface ToastOptions {
  /** Rótulo de um botão de ação (ex.: "Desfazer"). */
  actionLabel?: string;
  /** Callback do botão de ação. */
  onAction?: () => void;
  /** Duração em ms antes do fechamento automático. */
  duration?: number;
}

export interface ToastItem {
  id: number;
  msg: string;
  isError?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
}

/** Assinatura pública usada pelos componentes ao emitir avisos. */
export type ShowToast = (msg: string, isError?: boolean, options?: ToastOptions) => void;

/**
 * Fila de avisos (toasts) empilháveis, com fechamento automático,
 * botão de ação opcional (ex.: Desfazer) e dispensa manual.
 * Mantém no máximo 4 toasts visíveis.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const showToast = useCallback<ShowToast>((msg, isError = false, options) => {
    const id = Date.now() + Math.random();
    const duration = options?.duration ?? (options?.actionLabel ? 6000 : 3200);
    setToasts(prev => [
      ...prev.slice(-3),
      { id, msg, isError, actionLabel: options?.actionLabel, onAction: options?.onAction, duration },
    ]);
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timers.current.delete(id);
    }, duration);
    timers.current.set(id, timer);
  }, []);

  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); map.clear(); };
  }, []);

  return { toasts, showToast, dismiss };
}
