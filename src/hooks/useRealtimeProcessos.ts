import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { supabase } from '../lib/supabase';
import { ehEcoProprio } from '../lib/realtimeEcho';
import { Processo } from '../types';

interface LinhaProcesso {
  id: string;
  workspace_id: string;
  payload: Processo;
  updated_at: string;
}

/**
 * Assina mudanças em tempo real na tabela processos do workspace ativo.
 * INSERT/UPDATE fazem merge por id no estado; DELETE remove.
 * Eventos originados dos próprios saves (eco) são ignorados.
 */
export function useRealtimeProcessos(
  workspaceId: string | null,
  setProcessos: Dispatch<SetStateAction<Processo[]>>,
  onRowUpdatedAt?: (id: string, updatedAt: string) => void,
): void {
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`processos-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processos',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (evento) => {
          if (evento.eventType === 'DELETE') {
            const idRemovido = (evento.old as Partial<LinhaProcesso>)?.id;
            if (idRemovido) {
              setProcessos(prev => prev.filter(p => p.id !== idRemovido));
            }
            return;
          }

          const linha = evento.new as LinhaProcesso;
          if (!linha?.payload) return;
          if (ehEcoProprio(linha.updated_at)) return;

          onRowUpdatedAt?.(linha.id, linha.updated_at);
          setProcessos(prev => {
            const existe = prev.some(p => p.id === linha.id);
            return existe
              ? prev.map(p => (p.id === linha.id ? linha.payload : p))
              : [linha.payload, ...prev];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, setProcessos, onRowUpdatedAt]);
}
