import React, { useState } from 'react';
import { TIPOS_PROCESSO } from '../data/fases';
import { Processo, UserProfile } from '../types';
import { Tarefa } from '../types/tarefas';
import { 
  Grid, Folder, Bell, Clock, Trash2, Shield, PlusCircle, Edit, 
  Archive, Shuffle, ListChecks, Building, User, Settings, Check, LogOut,
  ChevronLeft, ChevronRight, Database, CheckSquare, BarChart3, Download
} from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { gerarAlertas } from '../utils/helpers';

interface SidebarProps {
  abaAtiva: string;
  onNavigate: (aba: string) => void;
  processos: Processo[];
  userProfile: UserProfile;
  onChangeProfile: (profile: UserProfile) => void;
  onOpenPrivacyCenter: () => void;
  tiposProcesso?: Record<string, { label: string; color: string; wash: string; icon: string }>;
  currentUser?: { email?: string | null } | null;
  activeRole?: string;
  activeSessionEmail?: string | null;
  onLogout?: () => void;
  minimizada?: boolean;
  onToggleMinimizar?: () => void;
  setViewTarefas?: (val: boolean) => void;
  tarefas?: Tarefa[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  abaAtiva,
  onNavigate,
  processos,
  userProfile,
  onChangeProfile,
  onOpenPrivacyCenter,
  tiposProcesso,
  currentUser,
  activeRole = 'admin',
  activeSessionEmail,
  onLogout,
  minimizada = false,
  onToggleMinimizar,
  setViewTarefas,
  tarefas = []
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nomeInput, setNomeInput] = useState(userProfile.nome);
  const [, setCrcInput] = useState(userProfile.crc);
  const { podeInstalar, instalar } = useInstallPrompt();

  // Load tasks count from localStorage for badge fallback
  const [localTarefas, setLocalTarefas] = React.useState<Tarefa[]>([]);
  React.useEffect(() => {
    try {
      const local = localStorage.getItem('osc-tarefas:tarefas');
      if (local) {
        setLocalTarefas(JSON.parse(local));
      }
    } catch (e) {
      console.error(e);
    }
  }, [abaAtiva]);

  // Merge live tasks and local tasks cleanly
  const activeTarefas = (tarefas && tarefas.length > 0) ? tarefas : localTarefas;

  const todayStr = new Date().toISOString().split('T')[0];
  const tarefasVencidasCount = activeTarefas.filter(t => 
    t.status !== 'concluida' && 
    t.dataVencimento && 
    t.dataVencimento <= todayStr
  ).length;

  const activeTipos = (tiposProcesso && Object.keys(tiposProcesso).length > 0) ? tiposProcesso : TIPOS_PROCESSO;

  // Counts of active processes
  const totalAtivos = processos.filter(p => !p.finalizado && !p.deletado).length;
  const totalLixeira = processos.filter(p => p.deletado).length;
  const totalAlertas = gerarAlertas(processos).length;
  
  // Counts of alerts based on active alarms
  const totalAlarmeAtivo = processos.reduce((acc, p) => {
    if (p.deletado) return acc;
    const alarmesAtivos = (p.alarmes || []).filter(a => !a.concluido).length;
    return acc + alarmesAtivos;
  }, 0);

  const getTipoCount = (tipoId: string) => {
    return processos.filter(p => p.tipoProcesso === tipoId && !p.finalizado && !p.deletado).length;
  };

  const getIcon = (name: string, className = "h-[18px] w-[18px]") => {
    switch (name) {
      case 'plus-circle': return <PlusCircle className={className} />;
      case 'edit': return <Edit className={className} />;
      case 'archive': return <Archive className={className} />;
      case 'shuffle': return <Shuffle className={className} />;
      case 'list-checks': return <ListChecks className={className} />;
      case 'shield': return <Shield className={className} />;
      case 'building': return <Building className={className} />;
      default: return <Grid className={className} />;
    }
  };

  const handleSaveProfile = () => {
    onChangeProfile({
      nome: nomeInput || 'Responsável Técnico',
      crc: userProfile.crc
    });
    setIsEditingProfile(false);
  };

  return (
    <aside className="sidebar h-full w-full flex flex-col justify-between bg-[var(--bg)] text-[var(--text-2)] select-none font-sans transition-all duration-300">
      <div className="flex-1 overflow-y-auto">
        {/* Brand */}
        <div className={`p-4 border-b border-[var(--border)] mb-5 flex ${minimizada ? 'flex-col items-center justify-center gap-3' : 'items-center justify-between gap-2'}`}>
          <div className={`flex items-center ${minimizada ? 'flex-col gap-2 text-center' : 'gap-3'}`}>
            {/* Marca LegalizaBoard: haste + pé formando um "L" */}
            <svg viewBox="0 0 100 100" className="w-10 h-10 shrink-0 select-none" aria-label="LegalizaBoard">
              <rect x="14" y="8" width="30" height="84" rx="9" fill="var(--primary)" />
              <rect x="54" y="62" width="30" height="30" rx="9" fill="var(--primary)" />
            </svg>
            {!minimizada && (
              <div>
                <div className="font-sans text-[13px] font-black text-[var(--text)] tracking-wider leading-none uppercase">
                  LegalizaBoard
                </div>
                <div className="text-[8px] text-[var(--text-3)] tracking-[0.04em] font-semibold uppercase mt-1 leading-tight">
                  Organização Contábil
                </div>
              </div>
            )}
          </div>
          {onToggleMinimizar && (
            <button
              onClick={onToggleMinimizar}
              className={`p-1 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-3)] hover:text-[var(--text)] transition duration-200 cursor-pointer ${minimizada ? 'mt-1' : ''}`}
              title={minimizada ? "Expandir menu" : "Recolher menu"}
              aria-label={minimizada ? "Expandir menu" : "Recolher menu"}
            >
              {minimizada ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {!minimizada && (
          <div className="px-5 mb-4 space-y-1.5">
            <div
              className="flex items-center gap-1.5 border px-2.5 py-1 rounded-md text-[10px] font-mono w-max bg-emerald-50 border-emerald-200 text-emerald-700"
              title="Dados armazenados no Supabase com RLS"
            >
              <Database className="h-3 w-3 shrink-0" />
              <span>Nuvem: Supabase</span>
            </div>

            {/* Auth Metadata / Status */}
            {currentUser ? (
              <div className="space-y-1">
                {activeRole && (
                  <div className={`flex items-center gap-1 bg-[var(--surface-2)] px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider w-max ${
                    activeRole === 'admin' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : activeRole === 'editor' 
                        ? 'bg-purple-50 text-purple-700 border-purple-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <Shield className="h-3 w-3" /> {activeRole === 'admin' ? 'Administrador' : activeRole === 'editor' ? 'Editor' : 'Apenas Visualizar'}
                  </div>
                )}
                {activeSessionEmail && (
                  <div className="text-[9px] text-[var(--text-3)] font-mono max-w-[180px] truncate flex items-center gap-1" title={activeSessionEmail}>
                    <User className="h-3 w-3 text-[var(--text-3)]" /> {activeSessionEmail}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] text-[var(--text-3)] font-mono w-max">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span>Conectado</span>
              </div>
            )}
          </div>
        )}

        {/* Global Nav */}
        <div className="px-2.5 space-y-1 mb-6">
          <button 
            onClick={() => onNavigate('painel')}
            title="Painel Geral"
            className={`w-full flex items-center ${minimizada ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} rounded-full text-sm transition-all text-left ${abaAtiva === 'painel' ? 'bg-[var(--primary-wash)] text-[var(--primary-dark)] font-semibold' : 'text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'}`}
          >
            <Grid className="h-[18px] w-[18px] opacity-85 shrink-0" />
            {!minimizada && <span>Painel Geral</span>}
          </button>

          <button 
            onClick={() => onNavigate('processos')}
            title="Todos os Processos"
            className={`relative w-full flex items-center ${minimizada ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} rounded-full text-sm transition-all text-left ${abaAtiva === 'processos' ? 'bg-[var(--primary-wash)] text-[var(--primary-dark)] font-semibold' : 'text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'}`}
          >
            <Folder className="h-[18px] w-[18px] opacity-85 shrink-0" />
            {!minimizada ? (
              <>
                <span className="flex-1">Todos os Processos</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${abaAtiva === 'processos' ? 'bg-[var(--primary)]/15 text-[var(--primary-dark)]' : 'bg-[var(--surface-2)] text-[var(--text-2)]'}`}>{totalAtivos}</span>
              </>
            ) : (
              totalAtivos > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-650 px-1 text-[8px] font-extrabold text-white leading-none">
                  {totalAtivos}
                </span>
              )
            )}
          </button>

          <button 
            onClick={() => onNavigate('alertas')}
            title="Alertas Ativos"
            className={`relative w-full flex items-center ${minimizada ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} rounded-full text-sm transition-all text-left ${abaAtiva === 'alertas' ? 'bg-[var(--primary-wash)] text-[var(--primary-dark)] font-semibold' : 'text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'}`}
          >
            <Bell className="h-[18px] w-[18px] opacity-85 shrink-0" />
            {!minimizada ? (
              <>
                <span className="flex-1">Alertas Ativos</span>
                {totalAlertas > 0 && <span className="text-[10px] font-mono bg-red-600 px-2 py-0.5 rounded-full text-white font-bold">{totalAlertas}</span>}
              </>
            ) : (
              totalAlertas > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-extrabold text-white leading-none">
                  {totalAlertas}
                </span>
              )
            )}
          </button>

          <button 
            onClick={() => onNavigate('alarmes')}
            title="Lembretes & Alarmes"
            className={`relative w-full flex items-center ${minimizada ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} rounded-full text-sm transition-all text-left ${abaAtiva === 'alarmes' ? 'bg-[var(--primary-wash)] text-[var(--primary-dark)] font-semibold' : 'text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'}`}
          >
            <Clock className="h-[18px] w-[18px] opacity-85 shrink-0" />
            {!minimizada ? (
              <>
                <span className="flex-1">Lembretes & Alarmes</span>
                {totalAlarmeAtivo > 0 && <span className="text-[10px] font-mono bg-amber-600 px-2 py-0.5 rounded-full text-white font-bold">{totalAlarmeAtivo}</span>}
              </>
            ) : (
              totalAlarmeAtivo > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[8px] font-extrabold text-white leading-none">
                  {totalAlarmeAtivo}
                </span>
              )
            )}
          </button>

          <button 
            onClick={() => onNavigate('lixeira')}
            title="Lixeira"
            className={`relative w-full flex items-center ${minimizada ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} rounded-full text-sm transition-all text-left ${abaAtiva === 'lixeira' ? 'bg-[var(--primary-wash)] text-[var(--primary-dark)] font-semibold' : 'text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'}`}
          >
            <Trash2 className="h-[18px] w-[18px] opacity-85 shrink-0" />
            {!minimizada ? (
              <>
                <span className="flex-1">Lixeira</span>
                {totalLixeira > 0 && <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${abaAtiva === 'lixeira' ? 'bg-[var(--primary)]/15 text-[var(--primary-dark)]' : 'bg-[var(--surface-2)] text-[var(--text-3)]'}`}>{totalLixeira}</span>}
              </>
            ) : (
              totalLixeira > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--surface-2)] border border-[var(--border)] px-1 text-[8px] font-extrabold text-[var(--text-2)] leading-none">
                  {totalLixeira}
                </span>
              )
            )}
          </button>

          {activeRole === 'admin' && (
            <button
              onClick={() => onNavigate('trilhas')}
              title="Modelos de Trilhas"
              className={`w-full flex items-center ${minimizada ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} rounded-full text-sm transition-all text-left ${abaAtiva === 'trilhas' ? 'bg-[var(--primary-wash)] text-[var(--primary-dark)] font-semibold' : 'text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'}`}
            >
              <Settings className="h-[18px] w-[18px] opacity-85 text-[var(--text-3)] shrink-0" />
              {!minimizada && <span className="flex-1">Modelos de Trilhas</span>}
            </button>
          )}

          <button
            onClick={() => onNavigate('relatorio')}
            title="Relatório"
            className={`w-full flex items-center ${minimizada ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} rounded-full text-sm transition-all text-left ${abaAtiva === 'relatorio' ? 'bg-[var(--primary-wash)] text-[var(--primary-dark)] font-semibold' : 'text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'}`}
          >
            <BarChart3 className="h-[18px] w-[18px] opacity-85 text-blue-400 shrink-0" />
            {!minimizada && <span className="flex-1">Relatório</span>}
          </button>

          {activeRole === 'admin' && (
            <button
              onClick={() => onNavigate('controle-acesso')}
              title="Controle de Acesso"
              className={`w-full flex items-center ${minimizada ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} rounded-full text-sm transition-all text-left ${abaAtiva === 'controle-acesso' ? 'bg-[var(--primary-wash)] text-[var(--primary-dark)] font-semibold' : 'text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'}`}
            >
              <Shield className="h-[18px] w-[18px] opacity-85 text-emerald-400 font-bold shrink-0" />
              {!minimizada && <span className="flex-1">Controle de Acesso</span>}
            </button>
          )}

          {activeRole !== 'visualizador' && (
          <button
            onClick={() => setViewTarefas && setViewTarefas(true)}
            title="Gestor de Tarefas"
            className={`relative w-full flex items-center ${minimizada ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} rounded-full text-sm transition-all text-left text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]`}
          >
            <CheckSquare className="h-[18px] w-[18px] opacity-85 text-amber-500 shrink-0" />
            {!minimizada ? (
              <>
                <span className="flex-1">Tarefas</span>
                {tarefasVencidasCount > 0 && (
                  <span className="text-[10px] font-mono bg-red-600 px-2 py-0.5 rounded-full text-white font-bold">
                    {tarefasVencidasCount}
                  </span>
                )}
              </>
            ) : (
              tarefasVencidasCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-extrabold text-white leading-none">
                  {tarefasVencidasCount}
                </span>
              )
            )}
          </button>
          )}
        </div>

        {/* Categories Section */}
        <div className="mb-6">
          {!minimizada ? (
            <div className="text-[10px] uppercase font-bold text-[var(--text-3)] px-6 py-3 tracking-widest">Por Tipo Societário</div>
          ) : (
            <div className="w-8 h-[1px] bg-[var(--border)] mx-auto my-3"></div>
          )}
          <div className="px-2.5 space-y-1">
            {Object.entries(activeTipos).map(([id, t]) => {
              const active = abaAtiva === `tipo:${id}`;
              const count = getTipoCount(id);
              const item = t as { label: string; color: string; wash: string; icon: string };
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(`tipo:${id}`)}
                  title={item.label}
                  className={`relative w-full flex items-center ${minimizada ? 'justify-center p-2.5' : 'gap-3 px-3 py-1.5'} rounded-full text-xs transition-colors text-left ${active ? 'bg-[var(--primary-wash)] text-[var(--primary-dark)] font-semibold' : 'text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'}`}
                >
                  <span style={{ color: active ? '#FFFFFF' : item.color }} className="shrink-0">{getIcon(item.icon, "h-4 w-4")}</span>
                  {!minimizada ? (
                    <>
                      <span className="flex-1 capitalize truncate">{item.label}</span>
                      {count > 0 && <span className={`text-[9px] font-mono opacity-80 px-2 py-0.5 rounded-full ${active ? 'bg-[var(--primary)]/15' : 'bg-[var(--surface-2)]'}`}>{count}</span>}
                    </>
                  ) : (
                    count > 0 && (
                      <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                    )
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer / Profile Manager */}
      <div className={`${minimizada ? 'p-3 flex flex-col items-center gap-4' : 'p-5'} mt-4 border-t border-[var(--border)] bg-[var(--surface-2)]/60 font-sans text-xs`}>
        {!minimizada ? (
          <>
            <div className="w-8 h-[2px] bg-[var(--border)] mb-4 rounded-full"></div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[var(--text-3)] uppercase text-[9px] tracking-wider font-semibold">Responsável Técnico</span>
              <button 
                onClick={() => {
                  setIsEditingProfile(!isEditingProfile);
                  setNomeInput(userProfile.nome);
                  setCrcInput(userProfile.crc);
                }} 
                className="text-[var(--text-3)] hover:text-[var(--text)] transition"
              >
                <Settings className="h-3 w-3" />
              </button>
            </div>

            {isEditingProfile ? (
              <div className="space-y-2 mt-2 bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--border)]">
                <div>
                  <label className="text-[9px] text-[var(--text-3)] block mb-0.5">Nome Completo</label>
                  <input 
                    type="text" 
                    value={nomeInput}
                    onChange={(e) => setNomeInput(e.target.value)}
                    className="w-full bg-[var(--surface)] text-[var(--text)] p-1 rounded-lg text-xs border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text)] rounded-lg px-2 py-0.5 text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg px-2.5 py-0.5 text-[10px] flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" /> Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="font-semibold text-[var(--text)] truncate">{userProfile.nome}</div>
              </div>
            )}

            <button
              onClick={onOpenPrivacyCenter}
              className="mt-3 text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)] underline font-medium block w-full text-center"
            >
              Centro de Privacidade LGPD
            </button>

            {podeInstalar && (
              <button
                onClick={instalar}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-[var(--primary)]/15 border border-[var(--primary)]/40 text-[var(--primary-dark)] hover:text-white hover:bg-[var(--primary)]/30 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer"
                title="Instalar o app na área de trabalho / tela inicial"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Instalar aplicativo</span>
              </button>
            )}

            {currentUser && onLogout && (
              <button
                onClick={onLogout}
                className="mt-3.5 w-full flex items-center justify-center gap-2 bg-[var(--primary-wash)] border border-[var(--primary)]/30 text-[var(--primary)] hover:text-[var(--primary-dark)] hover:bg-[var(--primary)]/15 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Desconectar Conta</span>
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={() => {
                if (onToggleMinimizar) onToggleMinimizar();
                setIsEditingProfile(true);
                setNomeInput(userProfile.nome);
                setCrcInput(userProfile.crc);
              }}
              className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition cursor-pointer"
              title={`Responsável: ${userProfile.nome}`}
              aria-label={`Editar responsável: ${userProfile.nome}`}
            >
              <User className="h-4 w-4" />
            </button>

            <button
              onClick={onOpenPrivacyCenter}
              className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition cursor-pointer"
              title="Centro de Privacidade LGPD"
              aria-label="Centro de Privacidade LGPD"
            >
              <Shield className="h-4 w-4 text-[var(--text-3)]" />
            </button>

            {podeInstalar && (
              <button
                onClick={instalar}
                className="p-2 rounded-lg bg-[var(--primary)]/15 text-[var(--primary-dark)] hover:text-white hover:bg-[var(--primary)]/30 border border-[var(--primary)]/30 transition cursor-pointer"
                title="Instalar aplicativo"
                aria-label="Instalar aplicativo"
              >
                <Download className="h-4 w-4" />
              </button>
            )}

            {currentUser && onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-[var(--primary-wash)] text-[var(--primary)] hover:text-[var(--primary-dark)] hover:bg-[var(--primary)]/15 border border-[var(--primary)]/30 transition cursor-pointer"
                title="Desconectar Conta"
                aria-label="Desconectar conta"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
