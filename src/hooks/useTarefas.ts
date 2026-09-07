import { useState, useEffect, useCallback } from 'react';
import { Tarefa } from '../types/tarefas';
import { carregarTarefas } from '../lib/tarefasDb';
import { useRealtimeTarefas } from './useRealtimeTarefas';

/** Estado de tarefas do workspace + recarga + sincronização realtime. */
export function useTarefas(workspaceId: string | null) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);

  const reloadTarefas = useCallback(async () => {
    if (workspaceId) {
      const list = await carregarTarefas(workspaceId);
      setTarefas(list);
    } else {
      setTarefas([]);
    }
  }, [workspaceId]);

  useEffect(() => {
    reloadTarefas();
  }, [reloadTarefas]);

  useRealtimeTarefas(workspaceId, setTarefas);

  return { tarefas, setTarefas, reloadTarefas };
}
