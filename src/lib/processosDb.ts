import { supabase } from './supabase';
import { registrarSaveProprio } from './realtimeEcho';
import { Processo } from '../types';

function linha(workspaceId: string, p: Processo, updatedAt: string) {
  return {
    id: p.id,
    workspace_id: workspaceId,
    payload: p,
    updated_at: updatedAt,
  };
}

export interface ProcessoCarregado {
  processo: Processo;
  updatedAt: string;
}

export async function carregarProcessos(workspaceId: string): Promise<ProcessoCarregado[]> {
  const { data, error } = await supabase
    .from('processos')
    .select('payload, updated_at')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return (data ?? []).map(row => ({
    processo: row.payload as Processo,
    updatedAt: row.updated_at as string,
  }));
}

export async function salvarProcesso(workspaceId: string, p: Processo): Promise<string | null> {
  const updatedAt = new Date().toISOString();
  registrarSaveProprio(updatedAt);
  const { error } = await supabase.from('processos').upsert(linha(workspaceId, p, updatedAt));
  if (error) {
    console.error('[LegalizaBoard Processos] Erro ao salvar processo:', error.message);
    return null;
  }
  return updatedAt;
}

export type ResultadoSave =
  | { status: 'ok'; updatedAt: string }
  | { status: 'conflito'; servidor: Processo; updatedAtServidor: string }
  | { status: 'erro' };

/**
 * Save com detecção básica de conflito: se o servidor tiver uma versão
 * mais nova que a última conhecida por este cliente, NÃO sobrescreve —
 * devolve a versão do servidor para o chamador aplicar.
 */
export async function salvarProcessoComConflito(
  workspaceId: string,
  p: Processo,
  updatedAtConhecido: string | null,
): Promise<ResultadoSave> {
  try {
    if (updatedAtConhecido) {
      const { data: atual } = await supabase
        .from('processos')
        .select('payload, updated_at')
        .eq('id', p.id)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (atual && atual.updated_at > updatedAtConhecido) {
        return {
          status: 'conflito',
          servidor: atual.payload as Processo,
          updatedAtServidor: atual.updated_at as string,
        };
      }
    }

    const updatedAt = new Date().toISOString();
    registrarSaveProprio(updatedAt);
    const { data, error } = await supabase
      .from('processos')
      .upsert(linha(workspaceId, p, updatedAt))
      .select('updated_at')
      .single();
    if (error) throw error;
    return { status: 'ok', updatedAt: (data?.updated_at as string) ?? updatedAt };
  } catch (e) {
    console.error('[LegalizaBoard Processos] Erro no save com verificação de conflito:', e);
    return { status: 'erro' };
  }
}

/** Um único upsert com todas as linhas — para seed/importação em massa. */
export async function salvarProcessosBatch(workspaceId: string, processos: Processo[]): Promise<void> {
  if (processos.length === 0) return;
  const updatedAt = new Date().toISOString();
  registrarSaveProprio(updatedAt);
  const { error } = await supabase
    .from('processos')
    .upsert(processos.map(p => linha(workspaceId, p, updatedAt)));
  if (error) {
    console.error('[LegalizaBoard Processos] Erro no upsert em lote:', error.message);
  }
}

export async function excluirProcesso(workspaceId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('processos')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);
  if (error) {
    console.error('[LegalizaBoard Processos] Erro ao excluir processo:', error.message);
  }
}
