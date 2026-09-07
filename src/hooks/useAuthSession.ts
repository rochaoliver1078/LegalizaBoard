import { useState, useEffect, useRef, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getActiveWorkspace, signOutUser } from '../lib/supabase';
import { setAutorAtual, limparAutorAtual, nomeExibicaoDeEmail } from '../lib/sessaoAtual';
import { UserRole } from '../types';

interface UseAuthSessionOpts {
  /** Chamado quando o workspace do usuário logado foi resolvido. */
  onWorkspaceReady: (wsId: string, role: UserRole, user: SupabaseUser) => Promise<void> | void;
  /** Limpeza executada antes do signOut concluir (timers, caches). */
  onBeforeLogout?: () => void;
  showToast: (msg: string, isError?: boolean) => void;
}

/**
 * Sessão Supabase Auth + workspace ativo + papel do usuário.
 * A sessão vem exclusivamente de onAuthStateChange — nunca do localStorage.
 */
export function useAuthSession(opts: UseAuthSessionOpts) {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  const [activeSessionEmail, setActiveSessionEmail] = useState<string | null>(null);

  // Callbacks sempre atuais sem re-assinar o listener
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      // Carimbo de autoria para o histórico (cacheado fora do React)
      if (user) {
        const nomeMeta = (user.user_metadata?.name as string | undefined) || (user.user_metadata?.full_name as string | undefined);
        setAutorAtual({ email: user.email ?? null, nome: nomeMeta || nomeExibicaoDeEmail(user.email) });
      } else {
        limparAutorAtual();
      }
      if (user) {
        void (async () => {
          try {
            // Workspace + papel vêm do banco (workspaces / workspace_members).
            // O trigger handle_new_user garante que todo usuário tem workspace.
            const ws = await getActiveWorkspace();
            if (!ws) {
              console.error('Nenhum workspace encontrado para o usuário — verifique o trigger handle_new_user.');
              optsRef.current.showToast('Sua conta ainda não possui um workspace. Contate o administrador.', true);
              return;
            }
            setActiveRole(ws.role);
            setActiveWorkspaceId(ws.id);
            setActiveSessionEmail(user.email ?? null);
            await optsRef.current.onWorkspaceReady(ws.id, ws.role, user);
          } catch (err) {
            console.error('Erro ao sincronizar workspace:', err);
          }
        })();
      } else {
        setActiveWorkspaceId(null);
        setActiveSessionEmail(null);
        setActiveRole('admin');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOutUser();
      // Cancela gravações pendentes e limpa o cache local de leitura
      optsRef.current.onBeforeLogout?.();
      Object.keys(localStorage)
        .filter(k => k.startsWith('osc-legalizacao:') || k.startsWith('osc-tarefas:'))
        .forEach(k => localStorage.removeItem(k));
      optsRef.current.showToast('Sessão encerrada com sucesso.');
    } catch (err: unknown) {
      console.error('Falha ao desconectar:', err);
    }
  }, []);

  return { currentUser, activeWorkspaceId, activeRole, activeSessionEmail, handleLogout };
}
