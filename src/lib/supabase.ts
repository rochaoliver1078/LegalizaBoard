import { createClient, type Session, type User } from '@supabase/supabase-js';

const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Supabase] Variáveis de ambiente ausentes. Defina VITE_SUPABASE_URL e ' +
    'VITE_SUPABASE_ANON_KEY no arquivo .env (veja .env.example). ' +
    'A aplicação não conseguirá autenticar nem carregar dados sem elas.'
  );
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type WorkspaceRole = 'admin' | 'editor' | 'visualizador';

export interface ActiveWorkspace {
  id: string;
  nome: string | null;
  role: WorkspaceRole;
}

/** Usuário da sessão atual, ou null se deslogado. */
export async function getSessionUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

/**
 * Resolve o workspace ativo do usuário logado: o primeiro do qual
 * ele é owner (role 'admin') ou, na falta, o primeiro do qual é membro.
 */
export async function getActiveWorkspace(): Promise<ActiveWorkspace | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const { data: owned, error: ownedErr } = await supabase
    .from('workspaces')
    .select('id, nome')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (ownedErr) {
    console.error('[Supabase] Erro ao buscar workspaces próprios:', ownedErr.message);
  }
  if (owned && owned.length > 0) {
    return { id: owned[0].id, nome: owned[0].nome, role: 'admin' };
  }

  const { data: memberships, error: memberErr } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(nome)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (memberErr) {
    console.error('[Supabase] Erro ao buscar afiliações de workspace:', memberErr.message);
  }
  if (memberships && memberships.length > 0) {
    const m = memberships[0];
    const wsNome = (m.workspaces as unknown as { nome: string | null } | null)?.nome ?? null;
    return { id: m.workspace_id, nome: wsNome, role: m.role as WorkspaceRole };
  }

  return null;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signUp(email: string, password: string): Promise<Session | null> {
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
  });
  if (error) throw error;
  // session é null quando a confirmação por e-mail está ativa
  return data.session;
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.toLowerCase().trim(),
    { redirectTo: `${window.location.origin}/` },
  );
  if (error) throw error;
}

/**
 * Define uma nova senha para o usuário logado. Usado no fluxo de
 * recuperação (após clicar no link do e-mail, que abre uma sessão de
 * recovery) para o usuário cadastrar a própria senha.
 */
export async function updatePassword(novaSenha: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw error;
}
