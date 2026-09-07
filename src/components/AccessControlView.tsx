import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, UserPlus, Trash, Key, Mail, AlertTriangle, Check, Loader2, Hourglass,
} from 'lucide-react';
import { UserRole, WorkspaceMemberInfo, ConvitePendente } from '../types';
import { supabase } from '../lib/supabase';

interface AccessControlViewProps {
  currentUser: { id: string; email?: string | null } | null;
  activeRole: UserRole;
  activeSessionEmail: string | null;
  workspaceId: string | null;
  showToast: (msg: string, isError?: boolean) => void;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  visualizador: 'Leitor',
};

export const AccessControlView: React.FC<AccessControlViewProps> = ({
  currentUser,
  activeRole,
  activeSessionEmail,
  workspaceId,
  showToast,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('visualizador');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [convites, setConvites] = useState<ConvitePendente[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const carregarListas = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingList(true);
    try {
      const { data: memberRows, error: memberErr } = await supabase
        .from('workspace_members')
        .select('user_id, role, convidado_email, created_at')
        .eq('workspace_id', workspaceId);
      if (memberErr) throw memberErr;

      setMembers((memberRows ?? []).map(m => ({
        userId: m.user_id as string,
        email: (m.convidado_email as string | null) ?? null,
        role: m.role as UserRole,
        createdAt: (m.created_at as string | null) ?? null,
      })));

      // Só admins têm SELECT em convites_pendentes; para os demais a
      // policy devolve lista vazia sem erro.
      const { data: conviteRows, error: conviteErr } = await supabase
        .from('convites_pendentes')
        .select('id, email, role, created_at')
        .eq('workspace_id', workspaceId);
      if (conviteErr) throw conviteErr;

      setConvites((conviteRows ?? []).map(c => ({
        id: c.id as string,
        email: c.email as string,
        role: c.role as UserRole,
        createdAt: (c.created_at as string | null) ?? null,
      })));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Erro ao carregar membros/convites:', msg);
    } finally {
      setIsLoadingList(false);
    }
  }, [workspaceId]);

  useEffect(() => { carregarListas(); }, [carregarListas]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole !== 'admin') {
      showToast('Somente administradores deste workspace podem convidar colaboradores.', true);
      return;
    }
    if (!workspaceId) {
      showToast('Workspace ainda não carregado. Tente novamente em instantes.', true);
      return;
    }

    const email = inviteEmail.toLowerCase().trim();
    if (!email || !email.includes('@')) {
      showToast('Por favor, digite um endereço de e-mail corporativo válido.', true);
      return;
    }
    if (convites.some(c => c.email.toLowerCase() === email) ||
        members.some(m => m.email?.toLowerCase() === email)) {
      showToast('Este endereço de e-mail já possui convite ou acesso neste workspace.', true);
      return;
    }

    setIsSendingInvite(true);
    try {
      const { error } = await supabase.from('convites_pendentes').insert({
        workspace_id: workspaceId,
        email,
        role: inviteRole,
      });
      if (error) throw error;

      showToast(`Convite registrado para ${email}! Ao criar a conta com este e-mail, o acesso é liberado automaticamente.`);
      setInviteEmail('');
      await carregarListas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Erro ao registrar convite:', msg);
      showToast(`Erro ao registrar convite: ${msg}`, true);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRevokeConvite = async (convite: ConvitePendente) => {
    if (activeRole !== 'admin') {
      showToast('Apenas administradores podem revogar convites.', true);
      return;
    }
    if (!window.confirm(`Cancelar o convite pendente de "${convite.email}"?`)) return;
    try {
      const { error } = await supabase.from('convites_pendentes').delete().eq('id', convite.id);
      if (error) throw error;
      showToast(`Convite de ${convite.email} cancelado.`);
      await carregarListas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Falha ao cancelar convite: ${msg}`, true);
    }
  };

  const handleRemoveMember = async (member: WorkspaceMemberInfo) => {
    if (activeRole !== 'admin') {
      showToast('Apenas administradores podem remover colaboradores.', true);
      return;
    }
    if (member.userId === currentUser?.id) {
      showToast('Você não pode remover o próprio acesso.', true);
      return;
    }
    const rotulo = member.email ?? member.userId;
    if (!window.confirm(`Remover o acesso de "${rotulo}" a este workspace?`)) return;
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', member.userId);
      if (error) throw error;
      showToast(`Acesso de ${rotulo} removido.`);
      await carregarListas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Falha ao remover colaborador: ${msg}`, true);
    }
  };

  const roleBadgeClass = (role: UserRole) =>
    role === 'admin'
      ? 'bg-red-50 text-[var(--primary)] border-red-200'
      : role === 'editor'
        ? 'bg-purple-50 text-purple-600 border-purple-200'
        : 'bg-amber-50 text-amber-600 border-amber-200';

  return (
    <div className="space-y-6">

      {/* SECTION 1: MY SECURE ACCOUNT STATUS */}
      <div className="bg-[var(--surface)] rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4 border-b border-[var(--border)] pb-3">
          <Key className="h-5 w-5 text-emerald-500" />
          <h2 className="font-semibold text-[var(--text)] text-sm">Status da Conexão Segura na Nuvem</h2>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-[var(--text-3)] leading-relaxed">
            O painel societário está conectado utilizando o Supabase Auth (senhas com hash bcrypt no servidor)
            e políticas de segurança em nível de linha (RLS) aplicadas no banco de dados.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg)] border border-slate-200/60 p-4 rounded-xl flex items-start gap-3">
              <Mail className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider font-sans">Conta Autenticada</div>
                <div className="text-xs font-semibold text-slate-850 break-all">{currentUser?.email || activeSessionEmail || 'Acesso Offline (Demonstração)'}</div>
                <div className="text-[10px] text-[var(--text-3)] mt-1 font-mono">ID: {currentUser?.id || 'offline-dummy-id'}</div>
              </div>
            </div>

            <div className="bg-[var(--bg)] border border-slate-200/60 p-4 rounded-xl flex items-start gap-3">
              <Shield className={`h-5 w-5 ${activeRole === 'admin' ? 'text-blue-500' : activeRole === 'editor' ? 'text-purple-500' : 'text-amber-500'} shrink-0 mt-0.5`} />
              <div>
                <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider font-sans">Permissão Ativa</div>
                <div className="text-xs font-semibold text-slate-850 uppercase">
                  {activeRole === 'admin' ? 'Administrador do Workspace' : activeRole === 'editor' ? 'Editor de Processos' : 'Apenas Visualizador'}
                </div>
                <div className="text-[10px] text-[var(--text-3)] mt-1">
                  {activeRole === 'admin'
                    ? 'Acesso total para criar, editar, convidar e excluir dados.'
                    : activeRole === 'editor'
                      ? 'Permissão para criar e editar registros. Exclusão bloqueada.'
                      : 'Nível de convidado de apenas leitura de processos.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ACCESS CREATION & INVITE WORKFLOW (ADMIN ONLY) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* INVITE BOX */}
        <div className="bg-[var(--surface)] rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4 border-b border-[var(--border)] pb-3">
              <UserPlus className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="font-semibold text-[var(--text)] text-sm">Adicionar Novo Colaborador</h2>
            </div>

            {activeRole !== 'admin' ? (
              <div className="bg-amber-50 border border-amber-200/60 text-amber-800 text-xs rounded-xl p-4 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <h4 className="font-bold">Acesso Restrito ao Administrador</h4>
                  <p className="mt-0.5 text-[var(--text-2)] leading-relaxed text-[11px]">
                    Sendo um colaborador convidado ({activeRole}), você não pode emitir novos privilégios ou autorizar terceiros para este workspace. Entre em contato com o proprietário do escritório contábil.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <p className="text-xs text-[var(--text-3)] leading-relaxed">
                  Informe o e-mail do colaborador. Se ele já tiver conta, entrará no próximo login;
                  se ainda não tiver, o acesso é vinculado automaticamente no momento do cadastro.
                </p>

                <div>
                  <label className="block text-[10px] text-[var(--text-3)] uppercase tracking-wider mb-1">E-mail do Convidado</label>
                  <input
                    type="email"
                    required
                    placeholder="EX: colaborador@contabilidade.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs px-3 py-2 text-slate-850 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[var(--text-3)] uppercase tracking-wider mb-1">Nível de Permissão (Cargo)</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs px-3 py-1.5 text-slate-850 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  >
                    <option value="visualizador">Apenas Visualizar (Visualizador)</option>
                    <option value="editor">Editor (Criar e Editar Processos, Exclusão Bloqueada)</option>
                    <option value="admin">Administrador Corporativo (Acesso Total &amp; Gerência de Usuários)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white w-full py-2 rounded-lg text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Conceder &amp; Habilitar Acesso
                </button>
              </form>
            )}
          </div>
        </div>

        {/* CURRENT AUTHORIZED MEMBERS + PENDING INVITES */}
        <div className="bg-[var(--surface)] rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 border-b border-[var(--border)] pb-3">
            <Users className="h-5 w-5 text-purple-500" />
            <h2 className="font-semibold text-[var(--text)] text-sm">
              Colaboradores do Workspace ({members.length + convites.length})
            </h2>
            {isLoadingList && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-3)]" />}
          </div>

          <p className="text-xs text-[var(--text-3)] leading-relaxed mb-4">
            Membros ativos e convites aguardando cadastro neste workspace corporativo.
          </p>

          {members.length === 0 && convites.length === 0 ? (
            <div className="border border-dashed border-[var(--border)] text-[var(--text-3)] text-xs rounded-xl p-8 text-center bg-slate-50/50">
              Nenhum outro usuário convidado atualmente para este workspace societário.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto space-y-2.5 pr-1">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between py-2 leading-tight">
                  <div className="truncate">
                    <p className="text-xs text-[var(--text)] font-medium truncate" title={member.email ?? member.userId}>
                      ✉️ {member.email ?? <span className="font-mono text-[10px]">{member.userId}</span>}
                    </p>
                    <p className="text-[10px] text-[var(--text-3)] mt-0.5">Membro ativo</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 border rounded-full ${roleBadgeClass(member.role)}`}>
                      {ROLE_LABEL[member.role]}
                    </span>

                    {activeRole === 'admin' && member.userId !== currentUser?.id && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-200 transition-all cursor-pointer"
                        title="Remover Acesso"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {convites.map((convite) => (
                <div key={convite.id} className="flex items-center justify-between py-2 leading-tight opacity-80">
                  <div className="truncate">
                    <p className="text-xs text-[var(--text)] font-medium truncate" title={convite.email}>
                      ✉️ {convite.email}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                      <Hourglass className="h-2.5 w-2.5" /> Convite pendente — aguardando cadastro
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 border rounded-full ${roleBadgeClass(convite.role)}`}>
                      {ROLE_LABEL[convite.role]}
                    </span>

                    {activeRole === 'admin' && (
                      <button
                        onClick={() => handleRevokeConvite(convite)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-200 transition-all cursor-pointer"
                        title="Cancelar Convite"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
