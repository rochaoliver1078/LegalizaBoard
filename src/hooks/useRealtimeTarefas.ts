import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { supabase } from '../lib/supabase';
import { ehEcoProprio } from '../lib/realtimeEcho';
import { Tarefa } from '../types/tarefas';

interface LinhaTarefa {
  id: string;
  workspace_id: string;
  processo_id: string | null;
  fase_id: string | null;
  item_key: string | null;
  payload: Tarefa;
  updated_at: string;
}

function linhaParaTarefa(linha: LinhaTarefa): Tarefa {
  return {
    ...linha.payload,
    id: linha.id,
    processoId: linha.processo_id ?? undefined,
    faseId: linha.fase_id ?? undefined,
    itemKey: linha.item_key ?? undefined,
  } as Tarefa;
}

/**
 * Assina mudanças em tempo real na tabela tarefas do workspace ativo.
 * Mesmo padrão de useRealtimeProcessos: merge por id, DELETE remove,
 * eco dos próprios saves ignorado.
 */
export function useRealtimeTarefas(
  workspaceId: string | null,
  setTarefas: Dispatch<SetStateAction<Tarefa[]>>,
): void {
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`tarefas-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tarefas',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (evento) => {
          if (evento.eventType === 'DELETE') {
            const idRemovido = (evento.old as Partial<LinhaTarefa>)?.id;
            if (idRemovido) {
              setTarefas(prev => prev.filter(t => t.id !== idRemovido));
            }
            return;
          }

          const linha = evento.new as LinhaTarefa;
          if (!linha?.payload) return;
          if (ehEcoProprio(linha.updated_at)) return;

          const tarefa = linhaParaTarefa(linha);
          setTarefas(prev => {
            const existe = prev.some(t => t.id === tarefa.id);
            return existe
              ? prev.map(t => (t.id === tarefa.id ? tarefa : t))
              : [...prev, tarefa];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, setTarefas]);
}
