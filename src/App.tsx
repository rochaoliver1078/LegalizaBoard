import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Processo, Alarme } from './types';
import { gerarAlertas } from './utils/helpers';
import { listarExigenciasAbertas } from './utils/exigencias';
import { Sidebar } from './components/Sidebar';
import { KPICards } from './components/KPICards';
import { ProcessoDrawer } from './components/ProcessoDrawer';
import { LgpdConsentModal } from './components/LgpdConsentModal';
import { TrilhasManager } from './components/TrilhasManager';
import { AccessControlView } from './components/AccessControlView';
import { LoginView } from './components/LoginView';
import { ResetPasswordView } from './components/ResetPasswordView';
import { GestorTarefas } from './components/tarefas/GestorTarefas';
import { HeaderBar } from './components/HeaderBar';
import { AlertasPanel } from './components/AlertasPanel';
import { AlarmesView } from './components/AlarmesView';
import { ProcessoListView } from './components/ProcessoListView';
import { TabelaProcessos } from './components/TabelaProcessos';
import { NovoProcessoModal } from './components/NovoProcessoModal';
import { RelatorioView } from './components/RelatorioView';
import { ToastContainer } from './components/ToastContainer';
import { FiltrosProcessos } from './components/FiltrosProcessos';
import { useToast } from './hooks/useToast';
import { useAuthSession } from './hooks/useAuthSession';
import { useTarefas } from './hooks/useTarefas';
import { useWorkspaceConfig } from './hooks/useWorkspaceConfig';
import { useProcessos } from './hooks/useProcessos';
import { supabase } from './lib/supabase';
import { Search, Scale, Plus } from 'lucide-react';

export default function App() {
  // --- UI STATE ---
  const [abaAtiva, setAbaAtiva] = useState<string>('painel');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroBusca, setFiltroBusca] = useState<string>('');
  const [view, setView] = useState<'lista' | 'tabela'>('lista');
  const [drawerProcessoId, setDrawerProcessoId] = useState<string | null>(null);
  const [viewTarefas, setViewTarefas] = useState(false);
  const [showConsentCenter, setShowConsentCenter] = useState(false);
  const [showNovoProcessoModal, setShowNovoProcessoModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarMinimizada, setSidebarMinimizada] = useState<boolean>(() =>
    localStorage.getItem('osc-legalizacao:sidebar-collapsed') === 'true');
  const [recoveryMode, setRecoveryMode] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.location.hash.includes('type=recovery'));

  const { toasts, showToast, dismiss } = useToast();

  // --- RECUPERAÇÃO DE SENHA ---
  // Quando o usuário chega pelo link de redefinição enviado por e-mail,
  // o Supabase dispara PASSWORD_RECOVERY; mostramos a tela de nova senha.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- SESSÃO + WORKSPACE + DADOS ---
  const { currentUser, activeWorkspaceId, activeRole, activeSessionEmail, handleLogout } = useAuthSession({
    showToast,
    onWorkspaceReady: (wsId, role, user) =>
      procs.sincronizarComNuvem(wsId, role, user.email ?? null),
    onBeforeLogout: () => procs.cancelarSavesPendentes(),
  });

  const config = useWorkspaceConfig({ workspaceId: activeWorkspaceId, activeRole, showToast });
  const { tarefas, reloadTarefas } = useTarefas(activeWorkspaceId);

  const procs = useProcessos({
    workspaceId: activeWorkspaceId,
    activeRole,
    userProfile: config.userProfile,
    consent: config.consent,
    tarefas,
    reloadTarefas,
    showToast,
    aplicarConfigNuvem: config.aplicarConfigNuvem,
  });
  const { processos } = procs;

  // --- ATALHOS DE TECLADO ---
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-bar')?.focus();
      }
      if (e.key === 'Escape') {
        setDrawerProcessoId(null);
        setShowNovoProcessoModal(false);
        setShowConsentCenter(false);
      }
      if (e.key.toLowerCase() === 'n' && e.altKey) {
        e.preventDefault();
        setShowNovoProcessoModal(true);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarMinimizada(prev => {
      const next = !prev;
      localStorage.setItem('osc-legalizacao:sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  const handleDownloadShortcut = useCallback(() => {
    const targetUrl = window.location.origin;
    const shortcutContent = `[InternetShortcut]\r\nURL=${targetUrl}\r\nIconIndex=0\r\n`;
    const blob = new Blob([shortcutContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LegalizaBoard.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Atalho "LegalizaBoard" baixado com sucesso! Mova o arquivo da pasta Downloads para sua Área de Trabalho.', false);
  }, [showToast]);

  const handleOpenProcesso = useCallback((id: string) => setDrawerProcessoId(id), []);

  const handleNavigate = useCallback((aba: string) => {
    setAbaAtiva(aba);
    setFiltroTipo('todos');
  }, []);

  // --- FILTRO, ALERTAS E ALARMES (memoizados) ---
  const filteredProcessos = useMemo(() => processos.filter(p => {
    if (abaAtiva === 'lixeira') return p.deletado;
    if (p.deletado) return false;

    if (abaAtiva.startsWith('tipo:')) {
      const typeKey = abaAtiva.split(':')[1];
      if (p.tipoProcesso !== typeKey) return false;
    }
    if (filtroTipo !== 'todos' && p.tipoProcesso !== filtroTipo) return false;

    if (filtroBusca.trim()) {
      const q = filtroBusca.toLowerCase().trim();
      return (p.razaoSocial || '').toLowerCase().includes(q)
        || (p.documento || '').toLowerCase().includes(q)
        || (p.responsavelLegal || '').toLowerCase().includes(q)
        || (p.solicitante || '').toLowerCase().includes(q);
    }
    return true;
  }), [processos, abaAtiva, filtroTipo, filtroBusca]);

  const alertas = useMemo(() => gerarAlertas(processos), [processos]);
  const exigenciasAbertas = useMemo(() => listarExigenciasAbertas(processos), [processos]);

  const alarmesAtivos = useMemo(() => {
    const arr: Array<{ alarme: Alarme; proc: Processo }> = [];
    processos.filter(p => !p.deletado).forEach(p => {
      (p.alarmes || []).forEach(a => {
        if (!a.concluido) arr.push({ alarme: a, proc: p });
      });
    });
    return arr.sort((a, b) => new Date(a.alarme.dataHora).getTime() - new Date(b.alarme.dataHora).getTime());
  }, [processos]);

  // --- ROTEAMENTO DE TELAS ---
  if (recoveryMode) {
    return <ResetPasswordView showToast={showToast} onDone={() => setRecoveryMode(false)} />;
  }

  if (!currentUser) {
    return <LoginView onSuccess={() => { /* onAuthStateChange resolve a sessão */ }} showToast={showToast} />;
  }

  if (viewTarefas && activeRole !== 'visualizador') {
    return (
      <GestorTarefas
        processos={processos}
        currentUser={currentUser}
        onBack={() => setViewTarefas(false)}
        onOpenProcessDrawer={(id) => {
          setDrawerProcessoId(id);
          setViewTarefas(false);
        }}
        onSyncChecklistItem={procs.handleSyncChecklistItem}
        onUpdateProcesso={procs.updateProcesso}
      />
    );
  }

  const sidebarProps = {
    abaAtiva,
    processos,
    userProfile: config.userProfile,
    onChangeProfile: config.saveProfile,
    tiposProcesso: config.tiposProcesso,
    currentUser,
    activeRole,
    activeSessionEmail,
    onLogout: handleLogout,
    setViewTarefas,
    tarefas,
  };

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden antialiased font-sans relative">
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10 bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:16px_16px]"></div>

      {/* --- SIDEBAR DESKTOP --- */}
      <div className={`hidden lg:block h-full flex-shrink-0 z-10 transition-all duration-300 ${sidebarMinimizada ? 'w-20' : 'w-64'}`}>
        <Sidebar
          {...sidebarProps}
          onNavigate={handleNavigate}
          onOpenPrivacyCenter={() => setShowConsentCenter(true)}
          minimizada={sidebarMinimizada}
          onToggleMinimizar={handleToggleSidebar}
        />
      </div>

      {/* --- SIDEBAR MOBILE --- */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileSidebarOpen(false)}></div>
          <div className="relative w-64 h-full bg-[#1C1F26] shadow-xl flex flex-col z-50">
            <Sidebar
              {...sidebarProps}
              onNavigate={(aba) => { handleNavigate(aba); setMobileSidebarOpen(false); }}
              onOpenPrivacyCenter={() => { setShowConsentCenter(true); setMobileSidebarOpen(false); }}
            />
          </div>
        </div>
      )}

      {/* --- MAIN --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <HeaderBar
          abaAtiva={abaAtiva}
          tiposProcesso={config.tiposProcesso}
          filtroBusca={filtroBusca}
          onChangeBusca={setFiltroBusca}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onDownloadShortcut={handleDownloadShortcut}
          onNovoProcesso={() => setShowNovoProcessoModal(true)}
          podeCriar={activeRole !== 'visualizador'}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Busca mobile */}
          <div className="md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-3)]" />
              <input
                type="text"
                placeholder="Busca rápida (CNPJ, nome)..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                className="bg-[var(--surface)] border border-[var(--border)] pl-9 pr-4 py-2.5 rounded-lg text-xs w-full focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
          </div>

          {abaAtiva === 'painel' && (
            <KPICards processos={processos} onNavigate={setAbaAtiva} />
          )}
          {abaAtiva === 'painel' && (
            <AlertasPanel
              modo="resumo"
              alertas={alertas}
              exigencias={exigenciasAbertas}
              tiposProcesso={config.tiposProcesso}
              onOpenProcesso={handleOpenProcesso}
              onVerTodos={() => setAbaAtiva('alertas')}
            />
          )}

          {abaAtiva === 'alertas' ? (
            <AlertasPanel
              modo="completo"
              alertas={alertas}
              exigencias={exigenciasAbertas}
              tiposProcesso={config.tiposProcesso}
              onOpenProcesso={handleOpenProcesso}
            />
          ) : abaAtiva === 'alarmes' ? (
            <AlarmesView
              alarmesAtivos={alarmesAtivos}
              tiposProcesso={config.tiposProcesso}
              onOpenProcesso={handleOpenProcesso}
              onToggleAlarme={procs.handleToggleAlarme}
            />
          ) : abaAtiva === 'trilhas' && activeRole === 'admin' ? (
            <TrilhasManager
              tiposProcesso={config.tiposProcesso}
              saveTiposProcesso={config.saveTiposProcesso}
              faseModelos={config.faseModelos}
              saveFaseModelos={config.saveFaseModelos}
              showToast={showToast}
              processos={processos}
            />
          ) : abaAtiva === 'controle-acesso' && activeRole === 'admin' ? (
            <AccessControlView
              currentUser={currentUser}
              activeRole={activeRole}
              activeSessionEmail={activeSessionEmail}
              workspaceId={activeWorkspaceId}
              showToast={showToast}
            />
          ) : abaAtiva === 'relatorio' ? (
            <RelatorioView
              processos={processos}
              tiposProcesso={config.tiposProcesso}
            />
          ) : (
            <div className="space-y-4">
              <FiltrosProcessos
                mostrarChips={abaAtiva === 'processos'}
                tiposProcesso={config.tiposProcesso}
                filtroTipo={filtroTipo}
                onChangeFiltroTipo={setFiltroTipo}
                view={view}
                onChangeView={setView}
              />

              {filteredProcessos.length === 0 ? (
                processos.filter(p => !p.deletado).length === 0 && abaAtiva !== 'lixeira' ? (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-16 text-center select-none animate-fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-4">
                      <Scale className="h-8 w-8 text-[var(--primary)]" />
                    </div>
                    <p className="font-sans font-semibold text-[var(--text)] text-base">Comece seu primeiro processo</p>
                    <p className="text-xs mt-1.5 text-[var(--text-3)] max-w-sm mx-auto">
                      Cadastre um processo de legalização para acompanhar fases, prazos de exigências e tarefas em um só lugar.
                    </p>
                    {activeRole !== 'visualizador' && (
                      <button
                        onClick={() => setShowNovoProcessoModal(true)}
                        className="mt-5 inline-flex items-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" /> Criar primeiro processo
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-16 text-center select-none animate-fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--surface-2)] mb-4">
                      <Search className="h-8 w-8 text-[var(--text-3)]" />
                    </div>
                    <p className="font-semibold text-[var(--text)] text-sm">Nenhum processo encontrado</p>
                    <p className="text-xs mt-1 text-[var(--text-3)]">Tente ajustar a busca rápida ou os chips de categoria societária.</p>
                    {(filtroBusca.trim() || filtroTipo !== 'todos') && (
                      <button
                        onClick={() => { setFiltroBusca(''); setFiltroTipo('todos'); }}
                        className="mt-4 inline-flex items-center gap-1.5 border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg)] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                )
              ) : view === 'lista' ? (
                <ProcessoListView
                  processos={filteredProcessos}
                  tiposProcesso={config.tiposProcesso}
                  tarefas={tarefas}
                  onOpenProcesso={handleOpenProcesso}
                />
              ) : (
                <TabelaProcessos
                  processos={filteredProcessos}
                  tiposProcesso={config.tiposProcesso}
                  onOpenProcesso={handleOpenProcesso}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* --- DRAWER DO PROCESSO --- */}
      {drawerProcessoId && (
        <div className="fixed inset-0 z-30 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition" onClick={() => setDrawerProcessoId(null)}></div>
          <div className="relative ml-auto w-full max-w-xl h-full bg-[var(--surface)] shadow-2xl z-40 transform transition-all flex flex-col border-l border-[var(--border)]">
            <ProcessoDrawer
              processoId={drawerProcessoId}
              processos={processos}
              onClose={() => setDrawerProcessoId(null)}
              onUpdate={procs.handleUpdateProcesso}
              onDelete={procs.handleDeleteProcessoPermanently}
              onRestore={procs.handleRestoreProcessoFromLixeira}
              onAddAlarme={procs.handleAddAlarme}
              onToggleAlarme={procs.handleToggleAlarme}
              onDeleteAlarme={procs.handleDeleteAlarme}
              onAttachDocument={procs.handleAttachDocument}
              onRemoveDocument={procs.handleRemoveDocument}
              workspaceId={activeWorkspaceId}
              showToast={showToast}
              onToggleCheckItem={procs.handleToggleCheckItem}
              onAddCheckItem={procs.handleAddCheckItem}
              onRemoveCheckItem={procs.handleRemoveCheckItem}
              onAddFase={procs.handleAddFase}
              onRemoveFase={procs.handleRemoveFase}
              onCycleFaseStatus={procs.handleCycleFaseStatus}
              tiposProcesso={config.tiposProcesso}
              userProfile={config.userProfile}
              tarefas={tarefas}
              onAddTarefaVinculada={procs.handleAddTarefaVinculada}
              onGerarTarefas={procs.handleGerarTarefas}
              onAddExigencia={procs.handleAddExigencia}
              onUpdateExigencia={procs.handleUpdateExigencia}
              onToggleTarefaVinculada={procs.handleToggleTarefaVinculada}
              podeEditar={activeRole !== 'visualizador'}
            />
          </div>
        </div>
      )}

      {/* --- MODAL NOVO PROCESSO --- */}
      <NovoProcessoModal
        aberto={showNovoProcessoModal}
        onClose={() => setShowNovoProcessoModal(false)}
        onCreate={(created) => {
          procs.updateProcesso(created);
          setShowNovoProcessoModal(false);
          setDrawerProcessoId(created.id);
        }}
        tiposProcesso={config.tiposProcesso}
        faseModelos={config.faseModelos}
        responsavelPadrao={config.userProfile.nome}
        showToast={showToast}
      />

      {/* --- LGPD --- */}
      <LgpdConsentModal
        consent={config.consent}
        onAccept={config.saveConsent}
        processos={processos}
        onClose={() => setShowConsentCenter(false)}
        forcingView={showConsentCenter}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
