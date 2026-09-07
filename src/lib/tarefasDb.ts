import { supabase } from './supabase';
import { registrarSaveProprio } from './realtimeEcho';
import { Tarefa, ListaTarefas } from '../types/tarefas';
import { LISTAS_PADRAO } from '../data/tarefas';

interface TarefaRow {
  id: string;
  payload: Tarefa;
  processo_id: string | null;
  fase_id: string | null;
  item_key: string | null;
}

interface ListaRow {
  id: string;
  payload: ListaTarefas;
}

const KEY_TAREFAS = 'osc-tarefas:tarefas';
const KEY_LISTAS = 'osc-tarefas:listas';

function limparUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (key, value) => value === undefined ? null : value));
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve =>
      setTimeout(() => {
        console.warn(
          `[LegalizaBoard Tarefas] Operação Supabase excedeu ${ms}ms — usando fallback local.`
        );
        resolve(fallback);
      }, ms)
    )
  ]);
}

export async function carregarTarefas(uid: string): Promise<Tarefa[]> {
  const localRaw = localStorage.getItem(KEY_TAREFAS);
  const localData: Tarefa[] = localRaw ? JSON.parse(localRaw) : [];

  if (!uid) return localData;

  try {
    const fetchPromise = (async () => {
      const sb = supabase;
      const { data, error } = await sb
        .from('tarefas')
        .select('*')
        .eq('workspace_id', uid);
      if (error) throw error;

      const remote = (data || []).map((row: TarefaRow) => ({
        ...row.payload,
        id: row.id,
        processoId: row.processo_id || undefined,
        faseId: row.fase_id || undefined,
        itemKey: row.item_key || undefined
      })) as Tarefa[];

      localStorage.setItem(KEY_TAREFAS, JSON.stringify(remote));
      return remote;
    })();

    return await withTimeout(fetchPromise, 8000, localData);
  } catch (error) {
    console.warn('[LegalizaBoard Tarefas] Falha ao carregar tarefas do Supabase, usando localStorage:', error);
    return localData;
  }
}

export async function salvarTarefa(uid: string, t: Tarefa): Promise<void> {
  // Defesa: bloqueia gravação sem workspace resolvido
  if (!uid) {
    console.error('[LegalizaBoard Tarefas] uid ausente — save bloqueado');
    return;
  }

  // Always save to localStorage first
  const local = localStorage.getItem(KEY_TAREFAS);
  const list: Tarefa[] = local ? JSON.parse(local) : [];
  const idx = list.findIndex(x => x.id === t.id);
  if (idx >= 0) {
    list[idx] = t;
  } else {
    list.push(t);
  }
  localStorage.setItem(KEY_TAREFAS, JSON.stringify(list));

  try {
    const sb = supabase;
    const savePromise = (async () => {
      const updatedAt = new Date().toISOString();
      registrarSaveProprio(updatedAt);
      const { error } = await sb.from('tarefas').upsert({
        id: t.id,
        workspace_id: uid,
        processo_id: t.processoId || null,
        fase_id: t.faseId || null,
        item_key: t.itemKey || null,
        payload: limparUndefined(t),
        updated_at: updatedAt
      });
      if (error) throw error;
    })();

    await withTimeout(savePromise, 8000, undefined);
  } catch (error) {
    console.error('[LegalizaBoard Tarefas] Erro ao salvar tarefa no Supabase:', error);
  }
}

export async function excluirTarefa(uid: string, id: string): Promise<void> {
  if (!uid) {
    console.error('[LegalizaBoard Tarefas] uid ausente — delete bloqueado');
    return;
  }

  // Always remove from localStorage
  const local = localStorage.getItem(KEY_TAREFAS);
  if (local) {
    const list: Tarefa[] = JSON.parse(local);
    const filtered = list.filter(x => x.id !== id);
    localStorage.setItem(KEY_TAREFAS, JSON.stringify(filtered));
  }

  try {
    const sb = supabase;
    const deletePromise = (async () => {
      const { error } = await sb
        .from('tarefas')
        .delete()
        .eq('id', id)
        .eq('workspace_id', uid);
      if (error) throw error;
    })();

    await withTimeout(deletePromise, 8000, undefined);
  } catch (error) {
    console.error('[LegalizaBoard Tarefas] Erro ao excluir tarefa no Supabase:', error);
  }
}

export async function carregarListas(uid: string): Promise<ListaTarefas[]> {
  const localRaw = localStorage.getItem(KEY_LISTAS);
  const localData: ListaTarefas[] = localRaw
    ? JSON.parse(localRaw)
    : LISTAS_PADRAO;

  if (!uid) return localData;

  try {
    const fetchPromise = (async () => {
      const sb = supabase;
      const { data, error } = await sb
        .from('listas_tarefas')
        .select('*')
        .eq('workspace_id', uid);
      if (error) throw error;

      const remote = (data || []).map((row: ListaRow) => ({
        ...row.payload,
        id: row.id
      })) as ListaTarefas[];

      if (remote.length === 0) {
        localStorage.setItem(KEY_LISTAS, JSON.stringify(LISTAS_PADRAO));
        // seed em background
        seedListasBackgroundSupabase(uid);
        return LISTAS_PADRAO;
      }

      localStorage.setItem(KEY_LISTAS, JSON.stringify(remote));
      return remote.sort((a, b) => a.ordem - b.ordem);
    })();

    return await withTimeout(fetchPromise, 8000, localData);
  } catch (error) {
    console.warn('[LegalizaBoard Tarefas] Falha ao carregar listas do Supabase, usando localStorage:', error);
    return localData;
  }
}

async function seedListasBackgroundSupabase(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const sb = supabase;
    for (const l of LISTAS_PADRAO) {
      await sb.from('listas_tarefas').upsert({
        id: l.id,
        workspace_id: uid,
        payload: limparUndefined(l),
        updated_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.warn('[LegalizaBoard Tarefas] Seed de listas Supabase falhou:', error);
  }
}

export async function salvarLista(uid: string, l: ListaTarefas): Promise<void> {
  if (!uid) {
    console.error('[LegalizaBoard Tarefas] uid ausente — save bloqueado');
    return;
  }

  const local = localStorage.getItem(KEY_LISTAS);
  const list: ListaTarefas[] = local ? JSON.parse(local) : LISTAS_PADRAO;
  const idx = list.findIndex(x => x.id === l.id);
  if (idx >= 0) {
    list[idx] = l;
  } else {
    list.push(l);
  }
  localStorage.setItem(KEY_LISTAS, JSON.stringify(list));

  try {
    const sb = supabase;
    const savePromise = (async () => {
      const { error } = await sb.from('listas_tarefas').upsert({
        id: l.id,
        workspace_id: uid,
        payload: limparUndefined(l),
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    })();

    await withTimeout(savePromise, 8000, undefined);
  } catch (error) {
    console.error('[LegalizaBoard Tarefas] Erro ao salvar lista no Supabase:', error);
  }
}

export async function excluirLista(uid: string, id: string): Promise<void> {
  if (!uid) {
    console.error('[LegalizaBoard Tarefas] uid ausente — delete bloqueado');
    return;
  }

  const local = localStorage.getItem(KEY_LISTAS);
  if (local) {
    const list: ListaTarefas[] = JSON.parse(local);
    const filtered = list.filter(x => x.id !== id);
    localStorage.setItem(KEY_LISTAS, JSON.stringify(filtered));
  }

  try {
    const sb = supabase;
    const deletePromise = (async () => {
      const { error } = await sb
        .from('listas_tarefas')
        .delete()
        .eq('id', id)
        .eq('workspace_id', uid);
      if (error) throw error;
    })();

    await withTimeout(deletePromise, 8000, undefined);
  } catch (error) {
    console.error('[LegalizaBoard Tarefas] Erro ao excluir lista no Supabase:', error);
  }
}

export async function carregarTarefasDoProcesso(
  uid: string,
  processoId: string
): Promise<Tarefa[]> {
  const tarefas = await carregarTarefas(uid);
  return tarefas.filter(t => t.processoId === processoId);
}

export async function sincronizarItemNoBanco(
  uid: string,
  processoId: string,
  faseId: string,
  itemKey: string,
  marcado: boolean
): Promise<void> {
  const tarefas = await carregarTarefas(uid);
  const updated = tarefas.map(t => {
    const tFaseId = t.faseId;
    const tItemKey = t.itemKey;
    if (t.processoId === processoId && tFaseId === faseId && tItemKey === itemKey) {
      const nextStatus = marcado ? 'concluida' : 'pendente';
      if (t.status !== nextStatus) {
        return {
          ...t,
          status: nextStatus,
          concluidoEm: marcado ? new Date().toISOString() : undefined
        } as Tarefa;
      }
    }
    return t;
  });

  const changed = updated.filter((t, idx) => t.status !== tarefas[idx]?.status);
  if (changed.length > 0) {
    await Promise.all(changed.map(t => salvarTarefa(uid, t)));
  }
}
