import React, { useState, useRef, useEffect } from 'react';
import { Processo, Alarme, DocumentoAnexo, UserProfile } from '../types';
import { Tarefa } from '../types/tarefas';
import { TIPOS_PROCESSO, REGIMES_TRIBUTARIOS, TIPOS_SOCIETARIOS } from '../data/fases';
import {
  fasesAtivas, statusFase, checklistResolvido,
  progressoProcesso, diasEmAberto, fmtMoeda, fmtData, fmtDataHora,
  faseAtualProcesso, novaEntradaHistorico, fmtHistoricoData
} from '../utils/helpers';
import { 
  X, Calendar, DollarSign, Plus, Bell, Trash2,
  Paperclip, FileText, Download, User, Info, ArrowUpRight,
  MessageSquare, Mail, Copy, Check
} from 'lucide-react';
import { carregarTarefasDoProcesso } from '../lib/tarefasDb';
import type { ShowToast } from '../hooks/useToast';
import { uploadAnexo, getAnexoUrl, removerAnexo, TAMANHO_MAX_ANEXO } from '../lib/anexosStorage';
import { ExigenciasSection } from './ExigenciasSection';
import { tramitaNaJucesp } from '../utils/exigencias';
import { Exigencia } from '../types';
import { mascaraDocumento, mascaraCPF, validarDocumento, validarCPF } from '../utils/documentos';

interface ProcessoDrawerProps {
  processoId: string | null;
  processos: Processo[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Processo>) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onAddAlarme: (procId: string, alarme: Omit<Alarme, 'id' | 'concluido' | 'criadoEm'>) => void;
  onToggleAlarme: (procId: string, alarmeId: string) => void;
  onDeleteAlarme: (procId: string, alarmeId: string) => void;
  onAttachDocument: (procId: string, anexo: DocumentoAnexo) => void;
  onRemoveDocument: (procId: string, anexoId: string) => void;
  workspaceId?: string | null;
  showToast?: ShowToast;
  onAddExigencia?: (procId: string, dados: Omit<Exigencia, 'id' | 'status'>) => void;
  onUpdateExigencia?: (procId: string, exigenciaId: string, patch: Partial<Exigencia>) => void;
  onToggleCheckItem: (procId: string, faseId: string, key: string) => void;
  onAddCheckItem: (procId: string, faseId: string, texto: string) => void;
  onRemoveCheckItem: (procId: string, faseId: string, key: string) => void;
  onAddFase: (procId: string, nome: string, meta: string) => void;
  onRemoveFase: (procId: string, faseId: string) => void;
  onCycleFaseStatus: (procId: string, faseId: string) => void;
  tiposProcesso?: Record<string, { label: string; color: string; wash: string; icon: string }>;
  userProfile?: UserProfile;
  tarefas?: Tarefa[];
  onAddTarefaVinculada?: (titulo: string, faseId: string, itemKey: string, processo: Processo) => Promise<void>;
  onGerarTarefas?: (processoId: string) => Promise<void>;
  onToggleTarefaVinculada?: (tarefa: Tarefa) => Promise<void>;
  /** Quando false (perfil visualizador), o painel fica somente leitura. */
  podeEditar?: boolean;
}

export const ProcessoDrawer: React.FC<ProcessoDrawerProps> = ({
  processoId,
  processos,
  onClose,
  onUpdate: onUpdateRaw,
  onDelete: onDeleteRaw,
  onRestore: onRestoreRaw,
  onAddAlarme: onAddAlarmeRaw,
  onToggleAlarme: onToggleAlarmeRaw,
  onDeleteAlarme: onDeleteAlarmeRaw,
  onAttachDocument: onAttachDocumentRaw,
  onRemoveDocument: onRemoveDocumentRaw,
  workspaceId,
  showToast,
  onAddExigencia: onAddExigenciaRaw,
  onUpdateExigencia: onUpdateExigenciaRaw,
  onToggleCheckItem: onToggleCheckItemRaw,
  onAddCheckItem: onAddCheckItemRaw,
  onRemoveCheckItem: onRemoveCheckItemRaw,
  onRemoveFase: onRemoveFaseRaw,
  onCycleFaseStatus: onCycleFaseStatusRaw,
  tiposProcesso,
  userProfile,
  tarefas = [],
  onAddTarefaVinculada: onAddTarefaVinculadaRaw,
  onGerarTarefas: onGerarTarefasRaw,
  onToggleTarefaVinculada: onToggleTarefaVinculadaRaw,
  podeEditar = true,
}) => {
  // --- MODO SOMENTE LEITURA (perfil visualizador) ---
  // Quando podeEditar=false, toda gravação vinda deste painel é neutralizada
  // (a segurança real é o RLS no banco; isto alinha a UI e evita cliques
  // sem efeito para o leitor). Admin/editor mantêm o comportamento original.
  const bloquearEdicao = () =>
    showToast?.('Perfil somente leitura — você não pode alterar processos.', true);
  const onUpdate:          ProcessoDrawerProps['onUpdate']          = podeEditar ? onUpdateRaw          : () => bloquearEdicao();
  const onDelete:          ProcessoDrawerProps['onDelete']          = podeEditar ? onDeleteRaw          : () => bloquearEdicao();
  const onRestore:         ProcessoDrawerProps['onRestore']         = podeEditar ? onRestoreRaw         : () => bloquearEdicao();
  const onAddAlarme:       ProcessoDrawerProps['onAddAlarme']       = podeEditar ? onAddAlarmeRaw       : () => bloquearEdicao();
  const onToggleAlarme:    ProcessoDrawerProps['onToggleAlarme']    = podeEditar ? onToggleAlarmeRaw    : () => bloquearEdicao();
  const onDeleteAlarme:    ProcessoDrawerProps['onDeleteAlarme']    = podeEditar ? onDeleteAlarmeRaw    : () => bloquearEdicao();
  const onAttachDocument:  ProcessoDrawerProps['onAttachDocument']  = podeEditar ? onAttachDocumentRaw  : () => bloquearEdicao();
  const onRemoveDocument:  ProcessoDrawerProps['onRemoveDocument']  = podeEditar ? onRemoveDocumentRaw  : () => bloquearEdicao();
  const onAddExigencia:    ProcessoDrawerProps['onAddExigencia']    = podeEditar ? onAddExigenciaRaw    : () => bloquearEdicao();
  const onUpdateExigencia: ProcessoDrawerProps['onUpdateExigencia'] = podeEditar ? onUpdateExigenciaRaw : () => bloquearEdicao();
  const onToggleCheckItem: ProcessoDrawerProps['onToggleCheckItem'] = podeEditar ? onToggleCheckItemRaw : () => bloquearEdicao();
  const onAddCheckItem:    ProcessoDrawerProps['onAddCheckItem']    = podeEditar ? onAddCheckItemRaw    : () => bloquearEdicao();
  const onRemoveCheckItem: ProcessoDrawerProps['onRemoveCheckItem'] = podeEditar ? onRemoveCheckItemRaw : () => bloquearEdicao();
  const onRemoveFase:      ProcessoDrawerProps['onRemoveFase']      = podeEditar ? onRemoveFaseRaw      : () => bloquearEdicao();
  const onCycleFaseStatus: ProcessoDrawerProps['onCycleFaseStatus'] = podeEditar ? onCycleFaseStatusRaw : () => bloquearEdicao();
  const onAddTarefaVinculada:    ProcessoDrawerProps['onAddTarefaVinculada']    = podeEditar ? onAddTarefaVinculadaRaw    : async () => { bloquearEdicao(); };
  const onGerarTarefas:          ProcessoDrawerProps['onGerarTarefas']          = podeEditar ? onGerarTarefasRaw          : async () => { bloquearEdicao(); };
  const onToggleTarefaVinculada: ProcessoDrawerProps['onToggleTarefaVinculada'] = podeEditar ? onToggleTarefaVinculadaRaw : async () => { bloquearEdicao(); };
  const p = processos.find(x => x.id === (processoId || ''));
  const [notaInput, setNotaInput] = useState('');
  const [activeTab, setActiveTab] = useState<'tramitacao' | 'dados' | 'financeiro' | 'compartilhar' | 'tarefas'>('tramitacao');
  const [drawerTarefas, setDrawerTarefas] = useState<Tarefa[]>([]);
  const [confirmingSoftDelete, setConfirmingSoftDelete] = useState(false);
  const [confirmingPermanentDelete, setConfirmingPermanentDelete] = useState(false);

  const uid = userProfile?.uid || '';

  // Fetch linked tasks for the active process.
  // Depende de p?.id (identidade), não de `p` inteiro, para não recarregar
  // a cada edição de campo do processo.
  useEffect(() => {
    if (p && uid) {
      carregarTarefasDoProcesso(uid, p.id).then(setDrawerTarefas);
    } else {
      setDrawerTarefas([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id, uid, tarefas]);

  // Sharing local state — pré-preenchido com os dados reais do processo.
  const [sharePhone, setSharePhone] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareTemplate, setShareTemplate] = useState<'geral' | 'pendencias'>('geral');
  const [copiedShare, setCopiedShare] = useState(false);

  // Sync share fields when process mounts.
  // Reset intencional apenas quando muda o processo (p?.id), não a cada edição.
  useEffect(() => {
    if (p) {
      setSharePhone(p.whatsapp ?? '');
      setShareEmail(p.email ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id]);

  // Alarm creation local state
  const [showAlarmeModalForFase, setShowAlarmeModalForFase] = useState<string | null>(null);
  const [alarmeTitulo, setAlarmeTitulo] = useState('');
  const [alarmeDataHora, setAlarmeDataHora] = useState('');

  // Checklist items local custom names add input
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFaseId, setUploadingFaseId] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [isUploadingAnexo, setIsUploadingAnexo] = useState(false);
  const [anexoAbrindoId, setAnexoAbrindoId] = useState<string | null>(null);

  const handleAbrirAnexo = async (an: DocumentoAnexo) => {
    if (an.storagePath) {
      setAnexoAbrindoId(an.id);
      try {
        const url = await getAnexoUrl(an.storagePath);
        window.open(url, '_blank', 'noopener');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast?.(msg, true);
      } finally {
        setAnexoAbrindoId(null);
      }
    } else if (an.conteudoUrl) {
      // Anexo legado em DataURL — somente leitura
      window.open(an.conteudoUrl, '_blank', 'noopener');
    }
  };

  const handleExcluirAnexo = async (an: DocumentoAnexo) => {
    if (!podeEditar) { bloquearEdicao(); return; }
    if (an.storagePath) {
      try {
        await removerAnexo(an.storagePath);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast?.(msg, true);
        return;
      }
    }
    onRemoveDocument(p.id, an.id);
  };

  // Billing simulation state
  const [boletoGerado, setBoletoGerado] = useState(false);
  const [faturamentoStatus, setFaturamentoStatus] = useState<'pendente' | 'pago'>('pendente');

  if (!p) return null;

  const activeTipos = (tiposProcesso && Object.keys(tiposProcesso).length > 0) ? tiposProcesso : TIPOS_PROCESSO;
  const tipo = activeTipos[p.tipoProcesso] || { label: p.tipoProcesso, color: '#333', wash: '#EEE' };
  const pct = progressoProcesso(p);
  const ativas = fasesAtivas(p);
  const diasAtivo = diasEmAberto(p);

  const handleFieldChange = <K extends keyof Processo>(field: K, value: Processo[K]) => {
    onUpdate(p.id, { [field]: value, ultimaAtualizacao: new Date().toISOString().slice(0, 10) });
  };

  const handleAddNota = () => {
    if (!notaInput.trim()) return;
    const historico = [...(p.historico || [])];
    historico.push(novaEntradaHistorico(`Nota técnica: ${notaInput.trim()}`));
    onUpdate(p.id, { historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) });
    setNotaInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, faseId: string, itemKey: string) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-selecionar o mesmo arquivo depois
    if (!file) return;
    if (!podeEditar) { bloquearEdicao(); return; }

    if (file.size > TAMANHO_MAX_ANEXO) {
      showToast?.('Arquivo excede o limite de 10MB por anexo.', true);
      setUploadingFaseId(null);
      setUploadingKey(null);
      return;
    }
    if (!workspaceId) {
      showToast?.('Workspace ainda não carregado — tente novamente em instantes.', true);
      return;
    }

    const sizeInKb = Math.round(file.size / 1024);
    const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    setIsUploadingAnexo(true);
    let storagePath: string;
    try {
      storagePath = await uploadAnexo(workspaceId, p.id, faseId, file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast?.(msg, true);
      setIsUploadingAnexo(false);
      setUploadingFaseId(null);
      setUploadingKey(null);
      return;
    }
    setIsUploadingAnexo(false);

    const anexo: DocumentoAnexo = {
      id: 'doc_' + Date.now(),
      faseId,
      itemKey,
      nomeArquivo: file.name,
      tamanho: sizeStr,
      dataUpload: new Date().toISOString().slice(0, 10),
      storagePath
    };

    onAttachDocument(p.id, anexo);
    setUploadingFaseId(null);
    setUploadingKey(null);

    // Append to logs
    const historico = [...(p.historico || [])];
    const faseNome = fasesAtivas(p).find(f => f.id === faseId)?.nome || faseId;
    historico.push(novaEntradaHistorico(`Anexou comprovante na etapa "${faseNome}": ${file.name}`));
    onUpdate(p.id, { historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) });
  };

  const triggerFileInput = (faseId: string, itemKey: string) => {
    setUploadingFaseId(faseId);
    setUploadingKey(itemKey);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  // Generate Simulated Invoice (Boleto)
  const handleGerarBoleto = () => {
    setBoletoGerado(true);
    setFaturamentoStatus('pendente');
    // Log faturamento
    const historico = [...(p.historico || [])];
    historico.push(novaEntradaHistorico(`Gerou boleto de honorários (R$ ${p.valorProcesso || 0}).`));
    onUpdate(p.id, { historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) });
  };

  const handleConciliarPagamento = () => {
    setFaturamentoStatus('pago');
    const historico = [...(p.historico || [])];
    historico.push(novaEntradaHistorico(`Realizou conciliação bancária (Honorários de R$ ${p.valorProcesso || 0} liquidados como PAGO).`));
    onUpdate(p.id, { historico, finalizado: true, dataFinalizacao: new Date().toISOString().slice(0, 10), ultimaAtualizacao: new Date().toISOString().slice(0, 10) });
  };

  const handleCreateAlarme = (faseId: string) => {
    if (!alarmeTitulo.trim() || !alarmeDataHora) return;
    onAddAlarme(p.id, {
      faseId,
      titulo: alarmeTitulo.trim(),
      dataHora: alarmeDataHora
    });
    setAlarmeTitulo('');
    setAlarmeDataHora('');
    setShowAlarmeModalForFase(null);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] relative font-sans">
      
      {/* Hidden file input for uploads */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={(e) => {
          if (uploadingFaseId && uploadingKey) {
            handleFileUpload(e, uploadingFaseId, uploadingKey);
          }
        }}
        className="hidden" 
        accept=".pdf,.doc,.docx,.png,.jpg"
      />

      {/* Drawer Header */}
      <div className="p-6 bg-[#1C1F26] text-[var(--surface-2)] relative select-none">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-[var(--text-3)] hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <span 
            style={{ backgroundColor: tipo.color }} 
            className="text-[10px] font-bold text-white uppercase tracking-wider px-2 py-0.5 rounded"
          >
            {tipo.label}
          </span>
          {p.finalizado ? (
            <span className="text-[10px] font-semibold text-[var(--green)] bg-[var(--green-wash)] px-2 py-0.5 rounded flex items-center gap-1">
              ✓ Protocolado
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-[var(--yellow)] bg-[var(--surface-2)] px-2 py-0.5 rounded">
              Em Tramitação
            </span>
          )}
        </div>

        <h3 className="font-sans text-xl font-bold leading-tight pr-10 truncate text-white" title={p.razaoSocial}>
          {p.razaoSocial || '(Sem razão social)'}
        </h3>
        <p className="text-xs text-[var(--text-3)] mt-1.5 font-mono">
          CNPJ/CPF: {p.documento || 'Provisório'} {p.nire ? `· NIRE ${p.nire}` : ''}
        </p>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-[var(--border)] bg-[var(--bg)] text-xs font-semibold px-4 select-none">
        <button 
          onClick={() => setActiveTab('tramitacao')}
          className={`px-4 py-3 border-b-2  transition ${activeTab === 'tramitacao' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-3)] hover:text-[var(--text)]'}`}
        >
          Trâmite societário
        </button>
        <button 
          onClick={() => setActiveTab('dados')}
          className={`px-4 py-3 border-b-2 transition ${activeTab === 'dados' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-3)] hover:text-[var(--text)]'}`}
        >
          Dados do cliente
        </button>
        <button 
          onClick={() => setActiveTab('financeiro')}
          className={`px-4 py-3 border-b-2 transition ${activeTab === 'financeiro' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-3)] hover:text-[var(--text)]'}`}
        >
          Controle financeiro
        </button>
        <button 
          onClick={() => setActiveTab('compartilhar')}
          className={`px-4 py-3 border-b-2 transition ${activeTab === 'compartilhar' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-3)] hover:text-[var(--text)]'}`}
        >
          Notificar / Enviar
        </button>
        <button 
          onClick={() => setActiveTab('tarefas')}
          className={`px-4 py-3 border-b-2 transition ${activeTab === 'tarefas' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-3)] hover:text-[var(--text)]'}`}
        >
          Tarefas
        </button>
      </div>

      {/* Drawer Body Scroll */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-28">

        {activeTab === 'tramitacao' && (
          <>
            {/* PROGRESS REGION */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-[var(--text-3)] mb-1.5">
                <span>Progresso global</span>
                <span className="text-[var(--text)]">{pct}%</span>
              </div>
              <div className="w-full bg-[var(--surface-2)] h-2 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${pct}%` }} 
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all"
                ></div>
              </div>
              <p className="text-[11px] text-[var(--text-3)] font-mono mt-1 text-right">
                {diasAtivo} dias em trâmite ativo · Previsão: {p.duracaoPrevista || 30} dias
              </p>
            </div>

            {/* EXIGÊNCIAS JUCESP (trilhas que tramitam na Junta) */}
            {tramitaNaJucesp(p.tipoProcesso) && onAddExigencia && onUpdateExigencia && (
              <ExigenciasSection
                p={p}
                onUpdate={onUpdate}
                onAddExigencia={onAddExigencia}
                onUpdateExigencia={onUpdateExigencia}
                showToast={showToast}
              />
            )}

            {/* PIPELINE DESCRIPTIONS */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-1.5">
                <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wide">Trilha de Fases</span>
                <span className="text-[10px] text-[#6B7280]">Clique no círculo para alternar status</span>
              </div>

              <div className="space-y-0.5">
                {ativas.map((fase, idx) => {
                  const status = statusFase(p, fase.id);
                  const itens = checklistResolvido(p, fase.id);
                  const alarmesFase = (p.alarmes || []).filter(a => a.faseId === fase.id);
                  const anexosFase = (p.anexos || []).filter(an => an.faseId === fase.id);

                  const isLocked = p.exigirEtapasCompletas && status === 'progress' && (() => {
                    return itens.some(it => !p.fases[fase.id]?.checklist?.[it.key]);
                  })();

                  return (
                    <div key={fase.id} className="relative pl-9 pb-6 last:pb-1">
                      {/* Vertical connector line */}
                      {idx < ativas.length - 1 && (
                        <div 
                          className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${status === 'done' ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`}
                        ></div>
                      )}

                      {/* Timeline status indicator button */}
                      <button 
                        onClick={() => onCycleFaseStatus(p.id, fase.id)}
                        className={`absolute left-0 top-1 w-7.5 h-7.5 rounded-full flex items-center justify-center border font-sans text-xs font-bold transition-all ${
                          status === 'done' 
                            ? 'bg-[var(--green)] text-white border-[var(--green)]' 
                            : status === 'progress'
                              ? 'bg-[var(--surface-2)] text-[var(--yellow)] border-[var(--yellow)] ring-2 ring-[var(--yellow)]/20'
                              : status === 'na'
                                ? 'bg-[var(--surface-2)] text-[var(--text-3)] border-[var(--border)] line-through'
                                : 'bg-[var(--surface)] text-[var(--text-3)] border-[var(--border)] hover:border-gray-800'
                        }`}
                        title="Trocar status da etapa"
                      >
                        {status === 'done' ? '✓' : idx + 1}
                      </button>

                      {/* Stage Headers */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`text-sm font-semibold leading-snug flex flex-wrap items-center gap-1.5 ${status === 'na' ? 'text-[var(--text-3)] line-through' : 'text-[var(--text)]'}`}>
                            <span>{fase.nome}</span>
                            {isLocked && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md select-none">
                                🔒 Checklist pendente
                              </span>
                            )}
                          </h4>
                          <p className={`text-[11px] mt-0.5 ${status === 'na' ? 'text-[var(--text-3)] line-through' : 'text-[var(--text-3)]'}`}>
                            {fase.meta || 'Etapa personalizada'}
                          </p>
                        </div>
                        {fase.extra && (
                          <button 
                            onClick={() => onRemoveFase(p.id, fase.id)}
                            className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      {/* Checklist Elements */}
                      {status !== 'na' && (
                        <div className="mt-3 space-y-1.5 pl-0.5">
                          {itens.map((item) => {
                            const isChecked = !!(p.fases[fase.id]?.checklist?.[item.key]);
                            const itemAnexos = anexosFase.filter(a => a.itemKey === item.key);
                            const linkedTask = tarefas.find(t => t.processoId === p.id && t.faseId === fase.id && t.itemKey === item.key);

                            return (
                              <div key={item.key} className="group border-b border-gray-100/50 pb-1.5 last:border-none">
                                <div className="flex items-start justify-between gap-2 text-xs">
                                  <label className={`flex items-start gap-2 cursor-pointer flex-1 ${isChecked ? 'text-[var(--text-3)] line-through' : 'text-[var(--text-2)]'}`}>
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => onToggleCheckItem(p.id, fase.id, item.key)}
                                      className="mt-0.5 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                                    />
                                    <span className="leading-relaxed">{item.texto}</span>
                                  </label>

                                  <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all flex-shrink-0">
                                    <button 
                                      onClick={() => triggerFileInput(fase.id, item.key)}
                                      disabled={isUploadingAnexo}
                                      className="text-[var(--text-3)] hover:text-[var(--yellow)] p-1 cursor-pointer disabled:opacity-40 disabled:cursor-wait"
                                      title={isUploadingAnexo ? 'Enviando anexo…' : 'Anexar documento PDF/Comprovante'}
                                    >
                                      <Paperclip className={`h-3.5 w-3.5 ${isUploadingAnexo && uploadingFaseId === fase.id && uploadingKey === item.key ? 'animate-pulse text-[var(--yellow)]' : ''}`} />
                                    </button>
                                    <button 
                                      onClick={() => onRemoveCheckItem(p.id, fase.id, item.key)}
                                      className="text-[var(--text-3)] hover:text-red-500 p-1 cursor-pointer"
                                      title="Remover do checklist"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Tarefa Vinculada Status or Generator Button */}
                                <div className="pl-6 mt-1 flex flex-wrap gap-2 items-center">
                                  {linkedTask ? (
                                    <div className="flex items-center gap-1.5 text-[10px] bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded-md select-none">
                                      <span className="text-[var(--text-3)] font-medium">📋 Tarefa Vinculada:</span>
                                      <span className={`px-1 py-0.1 rounded text-[8px] font-bold uppercase tracking-wider ${
                                        linkedTask.status === 'concluida' 
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                                      }`}>
                                        {linkedTask.status === 'concluida' ? 'Concluída' : 'Pendente'}
                                      </span>
                                      {linkedTask.responsavel && (
                                        <span className="text-[var(--text-3)] text-[9px]">({linkedTask.responsavel})</span>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onAddTarefaVinculada?.(item.texto, fase.id, item.key, p)}
                                      className="text-[9px] text-[var(--primary)] hover:text-[var(--primary-dark)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-1.5 py-0.5 rounded-md transition font-semibold flex items-center gap-1 cursor-pointer"
                                      title="Criar tarefa no Gestor de Tarefas vinculada a esta etapa"
                                    >
                                      <span>+ Criar Tarefa Vinculada</span>
                                    </button>
                                  )}
                                </div>

                                {/* Attached Files within item */}
                                {itemAnexos.length > 0 && (
                                  <div className="pl-6 mt-1.5 space-y-1">
                                    {itemAnexos.map(an => (
                                      <div key={an.id} className="flex items-center justify-between text-[10px] bg-[var(--bg)] border border-[var(--border)] px-2 py-1 rounded">
                                        <div className="flex items-center gap-1.5 text-[var(--text-2)] truncate">
                                          <FileText className="h-3 w-3 text-[var(--green)]" />
                                          <span className="font-medium truncate">{an.nomeArquivo}</span>
                                          <span className="text-[9px] text-[#9CA3AF]">({an.tamanho})</span>
                                          {!an.storagePath && an.conteudoUrl && (
                                            <span
                                              className="text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded"
                                              title="Anexo antigo gravado no formato legado (DataURL). Somente leitura — re-anexe o arquivo para migrá-lo ao Storage."
                                            >
                                              anexo legado
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          {(an.storagePath || an.conteudoUrl) && (
                                            <button
                                              onClick={() => handleAbrirAnexo(an)}
                                              disabled={anexoAbrindoId === an.id}
                                              className="text-[var(--green)] hover:text-[#2C5A38] font-bold disabled:opacity-50 flex items-center gap-0.5"
                                              title="Visualizar / baixar"
                                            >
                                              <Download className="h-3 w-3" />
                                              {anexoAbrindoId === an.id ? 'abrindo…' : 'abrir'}
                                            </button>
                                          )}
                                          <button 
                                            onClick={() => handleExcluirAnexo(an)}
                                            className="text-[var(--primary)] hover:text-[var(--primary-dark)] font-bold"
                                          >
                                            excluir
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Quick Add Checklist target */}
                          <div className="flex gap-2 pt-1.5">
                            <input 
                              type="text" 
                              placeholder="Novo item..."
                              value={newItemTexts[fase.id] || ''}
                              onChange={(e) => {
                                setNewItemTexts({ ...newItemTexts, [fase.id]: e.target.value });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newItemTexts[fase.id]?.trim()) {
                                  onAddCheckItem(p.id, fase.id, newItemTexts[fase.id].trim());
                                  setNewItemTexts({ ...newItemTexts, [fase.id]: '' });
                                }
                              }}
                              className="bg-[var(--bg)] border border-[var(--border)] px-2 py-1 text-xs rounded-lg flex-1 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30 text-[var(--text)]"
                            />
                            <button 
                              onClick={() => {
                                if (newItemTexts[fase.id]?.trim()) {
                                  onAddCheckItem(p.id, fase.id, newItemTexts[fase.id].trim());
                                  setNewItemTexts({ ...newItemTexts, [fase.id]: '' });
                                }
                              }}
                              className="border border-[var(--border)] h-7 w-7 rounded-lg flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition text-[var(--text-3)] cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Reminder Alarms within stage */}
                      {status !== 'na' && (
                        <div className="mt-3 space-y-1.5">
                          {alarmesFase.map(a => (
                            <div key={a.id} className="flex items-center justify-between text-xs bg-[var(--surface-2)] border border-[var(--yellow)]/30 text-[var(--yellow)] px-2 py-1.5 rounded-lg">
                              <div className="flex items-center gap-1.5 truncate">
                                <Bell className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className={`truncate ${a.concluido ? 'line-through text-[var(--text-3)]' : 'font-medium'}`}>
                                  {a.titulo}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="font-mono text-[9.5px] bg-[var(--yellow)]/10 px-1.5 py-0.5 rounded text-[var(--yellow)]">
                                  {fmtDataHora(a.dataHora).split(' ')[0]}
                                </span>
                                <button 
                                  onClick={() => onToggleAlarme(p.id, a.id)}
                                  className="text-[10px] font-bold hover:underline"
                                >
                                  {a.concluido ? 'Reabrir' : 'Feito'}
                                </button>
                                <button 
                                  onClick={() => onDeleteAlarme(p.id, a.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {showAlarmeModalForFase === fase.id ? (
                            <div className="bg-[var(--bg)] border border-[var(--border)] p-3 rounded-lg space-y-2 mt-2">
                              <h5 className="text-[11px] font-bold text-[var(--text)] uppercase tracking-wide">Agendar Alarme</h5>
                              <input 
                                type="text"
                                value={alarmeTitulo}
                                onChange={(e) => setAlarmeTitulo(e.target.value)}
                                placeholder="Avisar sobre o que?"
                                className="w-full bg-[var(--surface)] border border-[var(--border)] px-2 py-1 rounded text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                              />
                              <input 
                                type="datetime-local"
                                value={alarmeDataHora}
                                onChange={(e) => setAlarmeDataHora(e.target.value)}
                                className="w-full bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button 
                                  onClick={() => setShowAlarmeModalForFase(null)}
                                  className="text-[10px] text-[var(--text-3)] px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded hover:bg-[var(--surface-2)]"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  onClick={() => handleCreateAlarme(fase.id)}
                                  className="text-[10px] text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-2.5 py-1 rounded flex items-center gap-1 font-semibold"
                                >
                                  Agendar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setAlarmeTitulo('');
                                setAlarmeDataHora(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
                                setShowAlarmeModalForFase(fase.id);
                              }}
                              className="text-[11px] text-[var(--text-3)] hover:text-[var(--primary)] flex items-center gap-1 mt-1 border border-dashed border-[var(--border)] hover:border-[var(--primary)]/40 px-2 py-1 rounded-md"
                            >
                              <Bell className="h-3 w-3" /> Criar Lembrete / Alarme nesta etapa
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>


          </>
        )}

        {activeTab === 'dados' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider border-b border-[var(--border)] pb-1.5">Ficha de Dados Societários</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">Razão Social / Cliente</label>
                <input 
                  type="text" 
                  value={p.razaoSocial}
                  onChange={(e) => handleFieldChange('razaoSocial', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">CNPJ / CPF</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={p.documento}
                  onChange={(e) => handleFieldChange('documento', mascaraDocumento(e.target.value))}
                  className={`w-full bg-[var(--bg)] border p-2 rounded-lg text-xs focus:outline-none focus:ring-2 ${
                    validarDocumento(p.documento) ? 'border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]/30' : 'border-red-400 focus:border-red-500 focus:ring-red-200'
                  }`}
                />
                {!validarDocumento(p.documento) && (
                  <p className="text-[10px] text-red-600 mt-1">Documento inválido (dígito verificador).</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">NIRE</label>
                <input 
                  type="text" 
                  value={p.nire || ''}
                  onChange={(e) => handleFieldChange('nire', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">Tipo Societário</label>
                <select 
                  value={p.tipoSocietario}
                  onChange={(e) => handleFieldChange('tipoSocietario', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                >
                  {TIPOS_SOCIETARIOS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">Solicitante (Parceiro)</label>
                <input 
                  type="text" 
                  value={p.solicitante}
                  onChange={(e) => handleFieldChange('solicitante', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
              
              {/* Dynamic Responsible Input Assignment of free-text */}
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">Responsável Técnico Designado</label>
                <input
                  type="text"
                  placeholder="Ex: nome do responsável legal"
                  value={p.responsavelLegal || ''}
                  onChange={(e) => handleFieldChange('responsavelLegal', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">CPF Responsável</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={p.cpfResponsavel || ''}
                  onChange={(e) => handleFieldChange('cpfResponsavel', mascaraCPF(e.target.value))}
                  className={`w-full bg-[var(--bg)] border p-2 rounded-lg text-xs focus:outline-none focus:ring-2 ${
                    (!p.cpfResponsavel || validarCPF(p.cpfResponsavel)) ? 'border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]/30' : 'border-red-400 focus:border-red-500 focus:ring-red-200'
                  }`}
                />
                {p.cpfResponsavel && !validarCPF(p.cpfResponsavel) && (
                  <p className="text-[10px] text-red-600 mt-1">CPF inválido.</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">Regime Tributário</label>
                <select 
                  value={p.regimeTributario}
                  onChange={(e) => handleFieldChange('regimeTributario', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                >
                  {REGIMES_TRIBUTARIOS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">WhatsApp de Contato</label>
                <input 
                  type="text" 
                  value={p.whatsapp || ''}
                  onChange={(e) => handleFieldChange('whatsapp', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">E-mail</label>
                <input 
                  type="text" 
                  value={p.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">Data Homologação/Início</label>
                <input 
                  type="date" 
                  value={p.inicio}
                  onChange={(e) => handleFieldChange('inicio', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">Duração Prevista (dias)</label>
                <input 
                  type="number" 
                  value={p.duracaoPrevista}
                  onChange={(e) => handleFieldChange('duracaoPrevista', Number(e.target.value) || 30)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">CNAEs do Objeto Social</label>
              <textarea 
                value={p.cnaes || ''}
                onChange={(e) => handleFieldChange('cnaes', e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs h-20 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>

            {/* Logical variables toggle mapping */}
            <div className="space-y-1 bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
              <span className="text-[10.5px] font-bold text-[var(--text-3)] uppercase tracking-wide block mb-2">Variáveis Fiscais e Riscos</span>
              
              <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer py-1 select-none">
                <input 
                  type="checkbox"
                  checked={p.mudaEnderecoOuObjeto}
                  onChange={(e) => handleFieldChange('mudaEnderecoOuObjeto', e.target.checked)}
                  className="rounded text-[var(--primary)]"
                />
                <span>Há mudança de endereço ou objeto (exige viabilidade JUCESP/Prefeitura)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer py-1 select-none">
                <input 
                  type="checkbox"
                  checked={p.trocaAdministrador}
                  onChange={(e) => handleFieldChange('trocaAdministrador', e.target.checked)}
                  className="rounded text-[var(--primary)]"
                />
                <span>Há alteração do Administrador Legal (exige novo e-CNPJ)</span>
              </label>

              {p.tipoProcesso === 'licenciamento' && (
                <>
                  <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer py-1 select-none">
                    <input 
                      type="checkbox"
                      checked={p.altoRisco}
                      onChange={(e) => handleFieldChange('altoRisco', e.target.checked)}
                      className="rounded text-[var(--primary)]"
                    />
                    <span>Atividade classificada como Alto Risco Sanitário COVISA</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer py-1 select-none">
                    <input 
                      type="checkbox"
                      checked={p.exigeLicencaAmbiental}
                      onChange={(e) => handleFieldChange('exigeLicencaAmbiental', e.target.checked)}
                      className="rounded text-[var(--primary)]"
                    />
                    <span>Exige Licenciamento Ambiental CETESB / SVMA</span>
                  </label>
                </>
              )}

              {p.tipoProcesso === 'ata' && (
                <>
                  <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer py-1 select-none">
                    <input 
                      type="checkbox"
                      checked={p.geraAlteracaoContratual}
                      onChange={(e) => handleFieldChange('geraAlteracaoContratual', e.target.checked)}
                      className="rounded text-[var(--primary)]"
                    />
                    <span>Ata gera alteração contratual consolidada concomitante</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer py-1 select-none">
                    <input 
                      type="checkbox"
                      checked={p.impactaCnpj}
                      onChange={(e) => handleFieldChange('impactaCnpj', e.target.checked)}
                      className="rounded text-[var(--primary)]"
                    />
                    <span>Deliberação gera alteração de rff/administrador no CNPJ</span>
                  </label>
                </>
              )}

              <span className="text-[10.5px] font-bold text-[var(--text-3)] uppercase tracking-wide block mt-4 mb-2">Comportamento de Avanço e Tarefas</span>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer p-2.5 rounded-xl border border-red-200 bg-red-50/70 select-none font-medium hover:bg-red-50 transition">
                  <input 
                    type="checkbox"
                    checked={!!p.exigirEtapasCompletas}
                    onChange={(e) => handleFieldChange('exigirEtapasCompletas', e.target.checked)}
                    className="rounded text-[var(--primary)] focus:ring-red-300"
                  />
                  <span>Bloquear avanço de fase caso existam tarefas pendentes no checklist</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 select-none font-medium hover:bg-blue-50 transition">
                  <input 
                    type="checkbox"
                    checked={!!p.orquestracaoAtiva}
                    onChange={(e) => handleFieldChange('orquestracaoAtiva', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-300"
                  />
                  <span>Automatizar tarefas por fase (Orquestração de ciclo de vida)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financeiro' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider border-b border-[var(--border)] pb-1.5">Faturamento Societário e Receitas</h4>

            <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)] space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-3)] font-medium">Honorários Contratados</span>
                <span className="font-sans font-bold text-[var(--text)] text-base">{fmtMoeda(p.valorProcesso || 0)}</span>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[var(--text-3)] block mb-1">Ajustar valor (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-3)]" />
                  <input 
                    type="number"
                    value={p.valorProcesso || ''}
                    onChange={(e) => handleFieldChange('valorProcesso', Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-[var(--surface)] border border-[var(--border)] pl-8 p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </div>
              </div>

              {/* simulated invoice actions */}
              <div className="border-t border-[var(--border)]/50 pt-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-3)] font-medium">Situação de Cobrança</span>
                  {boletoGerado ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${faturamentoStatus === 'pago' ? 'bg-[var(--green-wash)] text-[var(--green)]' : 'bg-[var(--surface-2)] text-[var(--yellow)]'}`}>
                      {faturamentoStatus === 'pago' ? 'Liquidado' : 'Aguardando Pagamento'}
                    </span>
                  ) : (
                    <span className="bg-[var(--surface-2)] text-[var(--text-3)] px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                      Não Faturado
                    </span>
                  )}
                </div>

                {!boletoGerado ? (
                  <button 
                    onClick={handleGerarBoleto}
                    className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-2 px-4 rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-1"
                  >
                    Emitir Boleto de Cobrança <ArrowUpRight className="h-[18px] w-[18px]" />
                  </button>
                ) : (
                  <>
                    <div className="text-[11px] text-[var(--text-3)] bg-[var(--surface)] p-3 border border-[var(--border)] rounded-lg">
                      <div className="font-bold text-[var(--text)] mb-1">Nosso Número: 35.18882-9</div>
                      <div>Banco: Itaú S.A. · Vencimento: em 5 dias</div>
                      <div className="font-mono text-[var(--text-3)] text-[10px] mt-1 pr-6 truncate select-all">34191.79001 01043.518881 29000.000003 9 000000000</div>
                    </div>
                    {faturamentoStatus === 'pendente' && (
                      <button 
                        onClick={handleConciliarPagamento}
                        className="w-full bg-[var(--green)] hover:bg-[var(--green)] text-white py-2 px-4 rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-1"
                      >
                        Autenticar Conciliação (Registrar Pagamento)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compartilhar' && (
          <div className="space-y-4 text-xs">
            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider border-b border-[var(--border)] pb-1.5">Enviar Informativos Técnicos</h4>

            <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)] space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-2">Selecione o Modelo de Mensagem</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShareTemplate('geral')}
                    className={`p-3 rounded-xl border text-left transition select-none flex flex-col gap-1 cursor-pointer ${shareTemplate === 'geral' ? 'border-[var(--primary)] bg-red-50/50 text-[var(--primary-dark)] font-bold' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--bg)]'}`}
                  >
                    <span className="font-semibold text-xs leading-none">📢 Andamento Geral</span>
                    <span className="text-[10px] text-[var(--text-3)] font-normal leading-normal">Envia progresso percentual, etapa atual e intermediador do processo.</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShareTemplate('pendencias')}
                    className={`p-3 rounded-xl border text-left transition select-none flex flex-col gap-1 cursor-pointer ${shareTemplate === 'pendencias' ? 'border-amber-600 bg-amber-50/50 text-amber-900 font-bold' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--bg)]'}`}
                  >
                    <span className="font-semibold text-xs leading-none">⚠️ Cobrança de Requisitos</span>
                    <span className="text-[10px] text-[var(--text-3)] font-normal leading-normal">Lista todas as tarefas abertas do checklist com pedido de envio ágil.</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">WhatsApp do Destinatário</label>
                  <input 
                    type="text" 
                    value={sharePhone}
                    onChange={(e) => setSharePhone(e.target.value)}
                    placeholder="Ex: 11999998888"
                    className="w-full bg-[var(--surface)] border border-[var(--border)] p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                  <span className="text-[10px] text-[var(--text-3)] mt-1 block">Apenas números com DDD.</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">E-mail do Destinatário</label>
                  <input 
                    type="email" 
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="Ex: cliente@destino.com.br"
                    className="w-full bg-[var(--surface)] border border-[var(--border)] p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                  <span className="text-[10px] text-[var(--text-3)] mt-1 block">E-mail corporativo ou do solicitante.</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Pré-Visualização do Conteúdo</label>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 font-mono text-[11px] text-[var(--text-2)] leading-relaxed whitespace-pre-wrap select-all max-h-48 overflow-y-auto relative block">
                  {(() => {
                    const currentFase = faseAtualProcesso(p);
                    const prog = progressoProcesso(p);
                    const openTasksList: string[] = [];
                    if (currentFase) {
                      const items = checklistResolvido(p, currentFase.id);
                      items.forEach(it => {
                        const isChecked = !!(p.fases[currentFase.id]?.checklist?.[it.key]);
                        if (!isChecked) {
                          openTasksList.push(it.texto);
                        }
                      });
                    }

                    const tipoLabel = activeTipos[p.tipoProcesso]?.label || p.tipoProcesso;
                    if (shareTemplate === 'geral') {
                      return `Olá! Passando para informar o andamento do processo societário de *${p.razaoSocial}* (${tipoLabel}).\n\n📌 *Status Geral:* ${prog}% concluído\n📍 *Etapa Atual:* ${currentFase ? currentFase.nome : 'Trâmites finais'}\n👤 *Intermediador:* ${p.responsavelLegal}\n\nSe tiver alguma dúvida, estamos à disposição!\nAtenciosamente, Fábio da Silva Carvalho & equipe.`;
                    } else {
                      const taskBulletList = openTasksList.length > 0 
                        ? openTasksList.map(t => `• ${t}`).join('\n') 
                        : 'Nenhuma pendência cadastrada para esta fase no momento!';
                      return `Olá! Referente ao processo societário de *${p.razaoSocial}* (${tipoLabel}), necessitamos da sua colaboração ou documentação para as seguintes etapas pendentes:\n\n${taskBulletList}\n\n📍 *Fase Atual bloqueada:* ${currentFase ? currentFase.nome : 'Sem fase ativa'}\n\nPor favor, envie os listados acima o quanto antes para darmos continuidade!\nAtenciosamente.`;
                    }
                  })()}
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const currentFase = faseAtualProcesso(p);
                    const prog = progressoProcesso(p);
                    const openTasksList: string[] = [];
                    if (currentFase) {
                      const items = checklistResolvido(p, currentFase.id);
                      items.forEach(it => {
                        const isChecked = !!(p.fases[currentFase.id]?.checklist?.[it.key]);
                        if (!isChecked) {
                          openTasksList.push(it.texto);
                        }
                      });
                    }
                    const tipoLabel = activeTipos[p.tipoProcesso]?.label || p.tipoProcesso;
                    let text: string;
                    if (shareTemplate === 'geral') {
                      text = `Olá! Passando para informar o andamento do processo societário de *${p.razaoSocial}* (${tipoLabel}).\n\n📌 *Status Geral:* ${prog}% concluído\n📍 *Etapa Atual:* ${currentFase ? currentFase.nome : 'Trâmites finais'}\n👤 *Intermediador:* ${p.responsavelLegal}\n\nSe tiver alguma dúvida, estamos à disposição!\nAtenciosamente, Fábio da Silva Carvalho & equipe.`;
                    } else {
                      const taskBulletList = openTasksList.length > 0 
                        ? openTasksList.map(t => `• ${t}`).join('\n') 
                        : 'Nenhuma pendência cadastrada para esta fase no momento!';
                      text = `Olá! Referente ao processo societário de *${p.razaoSocial}* (${tipoLabel}), necessitamos da sua colaboração ou documentação para as seguintes etapas pendentes:\n\n${taskBulletList}\n\n📍 *Fase Atual bloqueada:* ${currentFase ? currentFase.nome : 'Sem fase ativa'}\n\nPor favor, envie os listados acima o quanto antes para darmos continuidade!\nAtenciosamente.`;
                    }
                    navigator.clipboard.writeText(text);
                    setCopiedShare(true);
                    setTimeout(() => setCopiedShare(false), 2000);
                  }}
                  className="bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] text-[var(--text)] py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedShare ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-[var(--text-3)]" /> Copiar Texto
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const currentFase = faseAtualProcesso(p);
                    const prog = progressoProcesso(p);
                    const openTasksList: string[] = [];
                    if (currentFase) {
                      const items = checklistResolvido(p, currentFase.id);
                      items.forEach(it => {
                        const isChecked = !!(p.fases[currentFase.id]?.checklist?.[it.key]);
                        if (!isChecked) {
                          openTasksList.push(it.texto);
                        }
                      });
                    }
                    const tipoLabel = activeTipos[p.tipoProcesso]?.label || p.tipoProcesso;
                    let text: string;
                    if (shareTemplate === 'geral') {
                      text = `Olá! Passando para informar o andamento do processo societário de *${p.razaoSocial}* (${tipoLabel}).\n\n📌 *Status Geral:* ${prog}% concluído\n📍 *Etapa Atual:* ${currentFase ? currentFase.nome : 'Trâmites finais'}\n👤 *Intermediador:* ${p.responsavelLegal}\n\nSe tiver alguma dúvida, estamos à disposição!\nAtenciosamente, Fábio da Silva Carvalho & equipe.`;
                    } else {
                      const taskBulletList = openTasksList.length > 0 
                        ? openTasksList.map(t => `• ${t}`).join('\n') 
                        : 'Nenhuma pendência cadastrada para esta fase no momento!';
                      text = `Olá! Referente ao processo societário de *${p.razaoSocial}* (${tipoLabel}), necessitamos da sua colaboração ou documentação para as seguintes etapas pendentes:\n\n${taskBulletList}\n\n📍 *Fase Atual bloqueada:* ${currentFase ? currentFase.nome : 'Sem fase ativa'}\n\nPor favor, envie os listados acima o quanto antes para darmos continuidade!\nAtenciosamente.`;
                    }
                    const subject = `Informativo Técnico: Processo de ${p.razaoSocial}`;
                    window.open(`mailto:${shareEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`);
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white py-2.5 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Mail className="h-4 w-4" /> Enviar por E-mail
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const currentFase = faseAtualProcesso(p);
                    const prog = progressoProcesso(p);
                    const openTasksList: string[] = [];
                    if (currentFase) {
                      const items = checklistResolvido(p, currentFase.id);
                      items.forEach(it => {
                        const isChecked = !!(p.fases[currentFase.id]?.checklist?.[it.key]);
                        if (!isChecked) {
                          openTasksList.push(it.texto);
                        }
                      });
                    }
                    const tipoLabel = activeTipos[p.tipoProcesso]?.label || p.tipoProcesso;
                    let text: string;
                    if (shareTemplate === 'geral') {
                      text = `Olá! Passando para informar o andamento do processo societário de *${p.razaoSocial}* (${tipoLabel}).\n\n📌 *Status Geral:* ${prog}% concluído\n📍 *Etapa Atual:* ${currentFase ? currentFase.nome : 'Trâmites finais'}\n👤 *Intermediador:* ${p.responsavelLegal}\n\nSe tiver alguma dúvida, estamos à disposição!\nAtenciosamente, Fábio da Silva Carvalho & equipe.`;
                    } else {
                      const taskBulletList = openTasksList.length > 0 
                        ? openTasksList.map(t => `• ${t}`).join('\n') 
                        : 'Nenhuma pendência cadastrada para esta fase no momento!';
                      text = `Olá! Referente ao processo societário de *${p.razaoSocial}* (${tipoLabel}), necessitamos da sua colaboração ou documentação para as seguintes etapas pendentes:\n\n${taskBulletList}\n\n📍 *Fase Atual bloqueada:* ${currentFase ? currentFase.nome : 'Sem fase ativa'}\n\nPor favor, envie os listados acima o quanto antes para darmos continuidade!\nAtenciosamente.`;
                    }
                    const cleanNum = sharePhone.replace(/\D/g, '');
                    window.open(`https://api.whatsapp.com/send?phone=55${cleanNum}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" /> Disparar no WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tarefas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
              <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">Tarefas Vinculadas ao Processo</h4>
              {onGerarTarefas && (
                <button
                  onClick={() => onGerarTarefas(p.id)}
                  className="text-[11px] text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  ⚙️ Gerar tarefas das fases pendentes
                </button>
              )}
            </div>

            <div className="space-y-4">
              {ativas.map((fase) => {
                const faseTarefas = drawerTarefas.filter(t => t.faseId === fase.id);
                const total = faseTarefas.length;
                const concluidas = faseTarefas.filter(t => t.status === 'concluida').length;

                return (
                  <div key={fase.id} className="border border-[var(--border)] rounded-xl p-4 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="text-xs font-bold text-[var(--text)]">{fase.nome}</h5>
                      <span className="text-[10px] font-mono font-medium text-[var(--text-3)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                        {concluidas} de {total} tarefas concluídas nesta fase
                      </span>
                    </div>

                    {total > 0 ? (
                      <div className="space-y-2">
                        {faseTarefas.map((t) => (
                          <div key={t.id} className="flex items-start justify-between gap-3 p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:shadow-sm transition">
                            <label className="flex items-start gap-2.5 cursor-pointer flex-1 select-none">
                              <input 
                                type="checkbox"
                                checked={t.status === 'concluida'}
                                onChange={() => onToggleTarefaVinculada?.(t)}
                                className="mt-0.5 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                              />
                              <div className="flex-1">
                                <span className={`text-xs font-medium ${t.status === 'concluida' ? 'text-[var(--text-3)] line-through' : 'text-[var(--text)]'}`}>
                                  {t.titulo}
                                </span>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[var(--text-3)]">
                                  {t.responsavel && (
                                    <span className="flex items-center gap-0.5 bg-[var(--surface-2)] text-[var(--text-2)] px-1.5 py-0.5 rounded">
                                      <User className="h-2.5 w-2.5" />
                                      {t.responsavel}
                                    </span>
                                  )}
                                  {t.dataVencimento && (
                                    <span className="flex items-center gap-0.5 bg-[var(--surface-2)] text-[var(--text-2)] px-1.5 py-0.5 rounded">
                                      <Calendar className="h-2.5 w-2.5" />
                                      Prazo: {fmtData(t.dataVencimento)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                            
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex-shrink-0 ${
                              t.status === 'concluida' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {t.status === 'concluida' ? 'Concluída' : 'Pendente'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[var(--text-3)] italic">Nenhuma tarefa vinculada para esta fase.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LOG DE AUDITORIA HISTÓRICO */}
        <div className="pt-2 border-t border-[var(--border)]/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text)] uppercase tracking-wide mb-3">
            <Info className="h-4 w-4 text-[var(--yellow)]" />
            <span>Registro de Auditoria Imutável (LGPD art. 18)</span>
          </div>
          
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 max-h-48 overflow-y-auto text-[11px] font-sans text-[var(--text-2)] space-y-2">
            {[...(p.historico || [])].slice().reverse().map((h, i) => (
              <div key={i} className="flex gap-2 last:mb-0 border-b border-[var(--border)] pb-1.5 last:border-b-0">
                <span className="font-mono text-[var(--text-3)] select-none flex-shrink-0">{fmtHistoricoData(h.data)}</span>
                {h.autorNome && (
                  <span className="font-semibold text-[var(--yellow)] select-none flex-shrink-0" title={h.autorEmail || undefined}>
                    {h.autorNome} —
                  </span>
                )}
                <span className="text-[#3A3F4B]">{h.texto}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            <input 
              type="text" 
              placeholder="Adicionar nota técnica corporativa..." 
              value={notaInput}
              onChange={(e) => setNotaInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddNota(); }}
              className="bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs flex-1 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
            />
            <button 
              onClick={handleAddNota}
              className="bg-[#1C1F26] hover:bg-black text-xs text-white font-semibold px-4 rounded-lg"
            >
              Gravar
            </button>
          </div>
        </div>

      </div>

      {/* Drawer Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--surface)] border-t border-[var(--border)] flex justify-between gap-3 select-none">
        {confirmingSoftDelete ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-2 w-full justify-between animate-fade-in select-none">
            <span className="text-[11px] font-medium text-red-950">Mover processo para a lixeira por até 30 dias?</span>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => {
                  const idProc = p.id;
                  onUpdate(idProc, { deletado: true, dataDelecao: new Date().toISOString().slice(0, 10) });
                  showToast?.('Processo movido para a lixeira.', false, {
                    actionLabel: 'Desfazer',
                    onAction: () => onRestore(idProc),
                  });
                  onClose();
                  setConfirmingSoftDelete(false);
                }}
                className="bg-[var(--primary)] hover:bg-red-800 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition"
              >
                Mover
              </button>
              <button
                onClick={() => setConfirmingSoftDelete(false)}
                className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg)] rounded-lg px-3 py-1.5 text-xs font-bold transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : confirmingPermanentDelete ? (
          <div className="flex items-center gap-3 bg-red-100 border border-red-300 rounded-xl p-2 w-full justify-between animate-fade-in select-none">
            <span className="text-[11px] font-bold text-red-950">Excluir permanentemente? Ação irreversível!</span>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => {
                  onDelete(p.id);
                  onClose();
                  setConfirmingPermanentDelete(false);
                }}
                className="bg-red-700 hover:bg-red-800 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition"
              >
                Excluir
              </button>
              <button
                onClick={() => setConfirmingPermanentDelete(false)}
                className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg)] rounded-lg px-3 py-1.5 text-xs font-bold transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : !podeEditar ? (
          <span className="text-[11px] text-[var(--text-3)] italic select-none">
            Perfil somente leitura — sem ações disponíveis.
          </span>
        ) : p.deletado ? (
          <>
            <button
              onClick={() => {
                setConfirmingPermanentDelete(true);
              }}
              className="bg-red-700 hover:bg-red-800 text-white rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              Destruir Dados Permanentes
            </button>
            <button 
              onClick={() => {
                onRestore(p.id);
                onClose();
              }}
              className="bg-green-700 hover:bg-green-800 text-white rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              Restaurar Processo
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => {
                setConfirmingSoftDelete(true);
              }}
              className="text-[var(--text-3)] hover:text-red-500 bg-[var(--surface-2)] hover:bg-red-50 rounded-lg p-2 transition"
              title="Mover para Lixeira (Soft Delete)"
            >
              <Trash2 className="h-5 w-5" />
            </button>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const val = !p.finalizado;
                  onUpdate(p.id, { 
                    finalizado: val, 
                    dataFinalizacao: val ? new Date().toISOString().slice(0, 10) : undefined 
                  });
                }}
                className={`py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${p.finalizado ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' : 'bg-[var(--green)] hover:bg-[var(--green)] text-white'}`}
              >
                {p.finalizado ? 'Reabrir Processo' : '✓ Finalizar e Certificar Protocolo'}
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
};
