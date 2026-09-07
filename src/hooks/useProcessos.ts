import { useState, useEffect, useRef, useCallback } from 'react';
import { Processo, UserProfile, LgpdConsent, Alarme, DocumentoAnexo, UserRole, ColunaKanban, Exigencia } from '../types';
import { Tarefa } from '../types/tarefas';
import { supabase } from '../lib/supabase';
import { salvarProcessoComConflito, salvarProcessosBatch, excluirProcesso } from '../lib/processosDb';
import { salvarTarefa, excluirTarefa, sincronizarItemNoBanco } from '../lib/tarefasDb';
import { removerAnexo } from '../lib/anexosStorage';
import { orquestrarTarefasPorFase, gerarTarefasDeProcesso } from '../utils/integracaoTarefas';
import { useRealtimeProcessos } from './useRealtimeProcessos';
import {
  checklistResolvido, fasesAtivas, resolveColuna, colunaKanban, colunaKanbanAutomatica,
  novaEntradaHistorico,
} from '../utils/helpers';
import { ORDEM_COLUNAS, COLUNAS_KANBAN } from '../data/fases';
import { lerCacheLocal, SEEDS, STORAGE_KEY, TIPOS_KEY, MODELOS_KEY, PROFILE_KEY, CONSENT_KEY, TiposProcessoMap, FaseModelosMap } from '../lib/localCache';

interface UseProcessosOpts {
  workspaceId: string | null;
  activeRole: UserRole;
  userProfile: UserProfile;
  consent: LgpdConsent;
  tarefas: Tarefa[];
  reloadTarefas: () => Promise<void>;
  showToast: (msg: string, isError?: boolean) => void;
  aplicarConfigNuvem: (cfg: {
    tipos: TiposProcessoMap;
    modelos: FaseModelosMap;
    profile: UserProfile;
    consent: LgpdConsent;
  }) => void;
}

/**
 * Estado e operações de domínio dos processos: carga/seed do workspace,
 * gravação com debounce por item e detecção de conflito, realtime e
 * todos os handlers de mutação usados pela UI.
 *
 * Handlers têm identidade estável (useCallback com deps via ref), o que
 * permite React.memo eficaz nos componentes filhos.
 */
export function useProcessos(opts: UseProcessosOpts) {
  const [processos, setProcessos] = useState<Processo[]>(() => {
    const cache = lerCacheLocal();
    if (cache.processos) return cache.processos;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEEDS.processos));
    return SEEDS.processos;
  });

  // Deps sempre atuais para handlers de identidade estável
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const processosRef = useRef<Processo[]>(processos);
  useEffect(() => { processosRef.current = processos; }, [processos]);

  // Debounce de gravação por processo + updated_at conhecido (conflitos)
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const updatedAtRef = useRef<Map<string, string>>(new Map());

  const registrarUpdatedAt = useCallback((id: string, updatedAt: string) => {
    updatedAtRef.current.set(id, updatedAt);
  }, []);

  useRealtimeProcessos(opts.workspaceId, setProcessos, registrarUpdatedAt);

  const cancelarSavesPendentes = useCallback(() => {
    saveTimersRef.current.forEach(t => clearTimeout(t));
    saveTimersRef.current.clear();
  }, []);

  // ── Carga inicial / seed do workspace (config + processos) ──────────
  const sincronizarComNuvem = useCallback(async (wsId: string, role: UserRole, email: string | null) => {
    const { userProfile, consent, aplicarConfigNuvem } = optsRef.current;

    let cloudProcs: Processo[] = [];
    let cloudTipos = SEEDS.tipos;
    let cloudModelos = SEEDS.modelos;
    let cloudProfile = userProfile;
    let cloudConsent = consent;

    const { data: configSnap } = await supabase
      .from('workspace_config')
      .select('payload')
      .eq('workspace_id', wsId)
      .maybeSingle();

    const { data: pSnap } = await supabase
      .from('processos')
      .select('payload, updated_at')
      .eq('workspace_id', wsId);

    const hasCloudDocs = !!configSnap?.payload || (pSnap && pSnap.length > 0);

    if (!hasCloudDocs && role !== 'visualizador') {
      const activeProcs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').length > 0
        ? JSON.parse(localStorage.getItem(STORAGE_KEY)!)
        : SEEDS.processos;
      const activeTipos = Object.keys(JSON.parse(localStorage.getItem(TIPOS_KEY) || '{}')).length > 0
        ? JSON.parse(localStorage.getItem(TIPOS_KEY)!)
        : SEEDS.tipos;
      const activeModelos = Object.keys(JSON.parse(localStorage.getItem(MODELOS_KEY) || '{}')).length > 0
        ? JSON.parse(localStorage.getItem(MODELOS_KEY)!)
        : SEEDS.modelos;
      const activeProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') || userProfile;
      const activeConsent = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null') || consent;

      await supabase.from('workspace_config').upsert({
        workspace_id: wsId,
        payload: { tiposProcesso: activeTipos, faseModelos: activeModelos, userProfile: activeProfile, consent: activeConsent },
        updated_at: new Date().toISOString(),
      });
      await salvarProcessosBatch(wsId, activeProcs);
      cloudProcs = activeProcs; cloudTipos = activeTipos; cloudModelos = activeModelos;
      cloudProfile = activeProfile; cloudConsent = activeConsent;
    } else {
      const configData = configSnap?.payload;
      if (configData) {
        if (configData.tiposProcesso) cloudTipos = configData.tiposProcesso;
        if (configData.faseModelos) cloudModelos = configData.faseModelos;
        if (configData.userProfile) { cloudProfile = configData.userProfile; if (email) cloudProfile.email = email; }
        if (configData.consent) cloudConsent = configData.consent;
      }
      if (pSnap && pSnap.length > 0) {
        cloudProcs = pSnap.map(row => row.payload as Processo);
        pSnap.forEach(row => updatedAtRef.current.set((row.payload as Processo).id, row.updated_at as string));
      }
    }

    setProcessos(cloudProcs);
    aplicarConfigNuvem({ tipos: cloudTipos, modelos: cloudModelos, profile: cloudProfile, consent: cloudConsent });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudProcs));
  }, []);

  // ── Gravação ─────────────────────────────────────────────────────────
  const limparColunaManual = (proc: Processo): Processo => {
    if (proc.colunaManual) {
      const novaColAuto = colunaKanbanAutomatica(proc);
      const idxManual = ORDEM_COLUNAS.indexOf(proc.colunaManual);
      const idxAuto = ORDEM_COLUNAS.indexOf(novaColAuto);
      if (idxAuto > idxManual) {
        return { ...proc, colunaManual: undefined };
      }
    }
    return proc;
  };

  /**
   * Atualiza (ou insere) UM processo no estado e agenda o upsert no
   * Supabase com debounce de 800ms por processo.
   */
  const updateProcesso = useCallback((procAtualizado: Processo) => {
    const { workspaceId, activeRole, showToast } = optsRef.current;
    const cleaned = limparColunaManual(procAtualizado);

    setProcessos(prev => {
      const existe = prev.some(p => p.id === cleaned.id);
      return existe ? prev.map(p => (p.id === cleaned.id ? cleaned : p)) : [cleaned, ...prev];
    });

    if (activeRole === 'visualizador') {
      showToast('Ação bloqueada! Perfil com permissão de Apenas Visualizar.', true);
      return;
    }

    const timers = saveTimersRef.current;
    const anterior = timers.get(cleaned.id);
    if (anterior) clearTimeout(anterior);
    timers.set(cleaned.id, setTimeout(async () => {
      timers.delete(cleaned.id);
      // localStorage é apenas cache de leitura otimista — gravado no mesmo debounce
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processosRef.current));
      if (!workspaceId) return;

      const conhecido = updatedAtRef.current.get(cleaned.id) ?? null;
      const resultado = await salvarProcessoComConflito(workspaceId, cleaned, conhecido);

      if (resultado.status === 'ok') {
        updatedAtRef.current.set(cleaned.id, resultado.updatedAt);
      } else if (resultado.status === 'conflito') {
        // Outro usuário gravou uma versão mais nova — aplica a do servidor
        updatedAtRef.current.set(cleaned.id, resultado.updatedAtServidor);
        setProcessos(prev => prev.map(p => (p.id === cleaned.id ? resultado.servidor : p)));
        optsRef.current.showToast('Este processo foi atualizado por outro usuário — recarregado.', true);
      }
    }, 800));
  }, []);

  /** Substitui a lista inteira (seed, importação) com UM upsert em lote. */
  const replaceProcessos = useCallback(async (lista: Processo[]) => {
    const { workspaceId, activeRole, showToast } = optsRef.current;
    const cleaned = lista.map(limparColunaManual);
    setProcessos(cleaned);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));

    if (activeRole === 'visualizador') {
      showToast('Ação bloqueada! Perfil com permissão de Apenas Visualizar.', true);
      return;
    }
    if (workspaceId) {
      await salvarProcessosBatch(workspaceId, cleaned);
    }
  }, []);

  /** Call sites que computam a lista via map: salva só o item alvo. */
  const updateProcessoDaLista = useCallback((lista: Processo[], id: string) => {
    const alvo = lista.find(p => p.id === id);
    if (alvo) updateProcesso(alvo);
  }, [updateProcesso]);

  // ── Handlers de domínio ──────────────────────────────────────────────
  const handleUpdateProcesso = useCallback((id: string, patch: Partial<Processo>) => {
    const updated = processosRef.current.map(p => {
      if (p.id === id) {
        return { ...p, ...patch, ultimaAtualizacao: new Date().toISOString().slice(0, 10) };
      }
      return p;
    });
    updateProcessoDaLista(updated, id);
  }, [updateProcessoDaLista]);

  const handleDeleteProcessoPermanently = useCallback(async (id: string) => {
    const { workspaceId, activeRole, tarefas, reloadTarefas, showToast } = optsRef.current;
    if (activeRole !== 'admin') {
      showToast('Ação restrita! Apenas Administradores podem excluir itens permanentemente da nuvem.', true);
      return;
    }
    const processos = processosRef.current;
    const procRemovido = processos.find(p => p.id === id);
    const updated = processos.filter(p => p.id !== id);
    setProcessos(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Limpa os anexos do processo no Storage
    for (const an of procRemovido?.anexos ?? []) {
      if (an.storagePath) {
        try { await removerAnexo(an.storagePath); } catch (e) { console.warn('Anexo não removido do Storage:', e); }
      }
    }

    if (workspaceId) {
      const linked = tarefas.filter(t => t.processoId === id);
      for (const t of linked) {
        await excluirTarefa(workspaceId, t.id);
      }
      await reloadTarefas();
      await excluirProcesso(workspaceId, id);
    }
    showToast('Processo destruído permanentemente da lixeira.');
  }, []);

  const handleRestoreProcessoFromLixeira = useCallback((id: string) => {
    const updated = processosRef.current.map(p => {
      if (p.id === id) {
        const historico = [...(p.historico || [])];
        historico.push(novaEntradaHistorico('Restaurado da lixeira corporativa (soft-delete).'));
        return {
          ...p,
          deletado: false,
          dataDelecao: undefined,
          historico,
          ultimaAtualizacao: new Date().toISOString().slice(0, 10)
        };
      }
      return p;
    });
    updateProcessoDaLista(updated, id);
    optsRef.current.showToast('Processo restaurado com sucesso!');
  }, [updateProcessoDaLista]);

  const handleAddAlarme = useCallback((procId: string, info: Omit<Alarme, 'id' | 'concluido' | 'criadoEm'>) => {
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const alarmes = [...(p.alarmes || [])];
        alarmes.push({
          id: 'alm_' + Date.now(),
          faseId: info.faseId,
          titulo: info.titulo,
          dataHora: info.dataHora,
          concluido: false,
          criadoEm: new Date().toISOString().slice(0, 10)
        });
        return { ...p, alarmes };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
    optsRef.current.showToast('Lembrete agendado!');
  }, [updateProcessoDaLista]);

  const handleToggleAlarme = useCallback((procId: string, alarmeId: string) => {
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const alarmes = (p.alarmes || []).map(a => a.id === alarmeId ? { ...a, concluido: !a.concluido } : a);
        return { ...p, alarmes };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
  }, [updateProcessoDaLista]);

  const handleDeleteAlarme = useCallback((procId: string, alarmeId: string) => {
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const alarmes = (p.alarmes || []).filter(a => a.id !== alarmeId);
        return { ...p, alarmes };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
    optsRef.current.showToast('Alarme removido.');
  }, [updateProcessoDaLista]);

  const handleAttachDocument = useCallback((procId: string, anexo: DocumentoAnexo) => {
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const anexos = [...(p.anexos || [])];
        anexos.push(anexo);

        // Also auto-toggle checklist item to checked when file is uploaded to it
        const phasesObj = { ...p.fases };
        if (!phasesObj[anexo.faseId]) {
          phasesObj[anexo.faseId] = { status: 'progress', checklist: {} };
        }
        phasesObj[anexo.faseId].checklist[anexo.itemKey] = true;

        return { ...p, anexos, fases: phasesObj };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
    optsRef.current.showToast('Arquivo anexado com sucesso!');
  }, [updateProcessoDaLista]);

  const handleRemoveDocument = useCallback((procId: string, anexoId: string) => {
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const anexos = (p.anexos || []).filter(a => a.id !== anexoId);
        return { ...p, anexos };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
    optsRef.current.showToast('Anexo excluído.');
  }, [updateProcessoDaLista]);

  const handleToggleCheckItem = useCallback(async (procId: string, faseId: string, key: string) => {
    const { workspaceId, reloadTarefas } = optsRef.current;
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const phasesObj = { ...p.fases };
        if (!phasesObj[faseId]) {
          phasesObj[faseId] = { status: 'pending', checklist: {} };
        }
        const currentChecked = !!phasesObj[faseId].checklist[key];
        const nextChecked = !currentChecked;
        phasesObj[faseId].checklist[key] = nextChecked;

        // --- Espelho Level 2 (Checklist to Task Mirror) ---
        if (workspaceId) {
          sincronizarItemNoBanco(workspaceId, procId, faseId, key, nextChecked).then(() => {
            reloadTarefas();
          });
        }

        // Automation logic: checking item can trigger progress status
        const items = checklistResolvido(p, faseId);
        const checkedCount = items.filter(it => {
          if (it.key === key) return nextChecked;
          return !!phasesObj[faseId].checklist[it.key];
        }).length;

        const targetItem = items.find(it => it.key === key);
        const itemText = targetItem ? targetItem.texto : 'Item';
        const phaseName = fasesAtivas(p).find(f => f.id === faseId)?.nome || faseId;

        let newStatus: 'pending' | 'progress' | 'done' | 'na' = 'pending';
        if (checkedCount === items.length) {
          newStatus = 'done';
        } else if (checkedCount > 0) {
          newStatus = 'progress';
        }

        const historico = [...(p.historico || [])];
        historico.push(novaEntradaHistorico(`${!currentChecked ? 'Concluiu' : 'Desmarcou'} a tarefa "${itemText}" na etapa ${phaseName}`));

        if (newStatus !== phasesObj[faseId].status) {
          const statusLabels = { pending: 'Pendente', progress: 'Em progresso', done: 'Concluída', na: 'N/A' };
          historico.push(novaEntradaHistorico(`[Sistema] Alteração automática: Etapa "${phaseName}" mudou para "${statusLabels[newStatus]}"`));
          phasesObj[faseId].status = newStatus;
        }

        if (newStatus === 'done') {
          // Auto advance to next stage
          const listAtivas = fasesAtivas(p);
          const currentIdx = listAtivas.findIndex(f => f.id === faseId);
          if (currentIdx >= 0 && currentIdx < listAtivas.length - 1) {
            const nextStageId = listAtivas[currentIdx + 1].id;
            const nextStageName = listAtivas[currentIdx + 1].nome;
            if (!phasesObj[nextStageId]) {
              phasesObj[nextStageId] = { status: 'progress', checklist: {} };
              historico.push(novaEntradaHistorico(`[Sistema] Fluxo automático: Etapa "${nextStageName}" iniciada`));
            } else if (phasesObj[nextStageId].status === 'pending') {
              phasesObj[nextStageId].status = 'progress';
              historico.push(novaEntradaHistorico(`[Sistema] Fluxo automático: Etapa "${nextStageName}" iniciada`));
            }
          }
        }

        return { ...p, fases: phasesObj, colunaManual: undefined, historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
  }, [updateProcessoDaLista]);

  const handleAddCheckItem = useCallback((procId: string, faseId: string, texto: string) => {
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const customObj = { ...(p.checklistCustom || {}) };
        if (!customObj[faseId]) {
          customObj[faseId] = { removidos: [], renomeados: {}, adicionados: [] };
        }
        customObj[faseId].adicionados.push(texto);

        const phaseName = fasesAtivas(p).find(f => f.id === faseId)?.nome || faseId;
        const historico = [...(p.historico || [])];
        historico.push(novaEntradaHistorico(`Adicionou a tarefa personalizada "${texto}" na etapa ${phaseName}`));

        return { ...p, checklistCustom: customObj, historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
  }, [updateProcessoDaLista]);

  const handleRemoveCheckItem = useCallback((procId: string, faseId: string, key: string) => {
    const { workspaceId, tarefas, reloadTarefas } = optsRef.current;
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const customObj = { ...(p.checklistCustom || {}) };
        if (!customObj[faseId]) {
          customObj[faseId] = { removidos: [], renomeados: {}, adicionados: [] };
        }

        let removedText = 'Tarefa';
        const items = checklistResolvido(p, faseId);
        const matchedItem = items.find(it => it.key === key);
        if (matchedItem) {
          removedText = matchedItem.texto;
        }

        if (key.startsWith('b')) {
          const idx = parseInt(key.slice(1));
          customObj[faseId].removidos.push(idx);
        } else {
          const idx = parseInt(key.slice(1));
          customObj[faseId].adicionados.splice(idx, 1);
        }

        // Also clean up check state
        const phasesObj = { ...p.fases };
        if (phasesObj[faseId]?.checklist) {
          delete phasesObj[faseId].checklist[key];
        }

        const phaseName = fasesAtivas(p).find(f => f.id === faseId)?.nome || faseId;
        const historico = [...(p.historico || [])];
        historico.push(novaEntradaHistorico(`Removeu a tarefa "${removedText}" da etapa ${phaseName}`));

        return { ...p, checklistCustom: customObj, fases: phasesObj, historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);

    // Delete associated task
    const linkedTask = tarefas.find(t => t.processoId === procId && (t as Tarefa & { faseId?: string }).faseId === faseId && (t as Tarefa & { itemKey?: string }).itemKey === key);
    if (linkedTask && workspaceId) {
      excluirTarefa(workspaceId, linkedTask.id).then(() => {
        reloadTarefas();
      });
    }
  }, [updateProcessoDaLista]);

  const handleAddTarefaVinculada = useCallback(async (titulo: string, faseId: string, itemKey: string, processo: Processo) => {
    const { workspaceId, reloadTarefas, showToast } = optsRef.current;
    if (!workspaceId) return;

    const novaTarefa: Tarefa = {
      id: crypto.randomUUID(),
      titulo: `${processo.razaoSocial || 'Processo'} - ${titulo}`,
      listaId: 'geral',
      prioridade: 'normal',
      status: processo.fases[faseId]?.checklist?.[itemKey] ? 'concluida' : 'pendente',
      subTarefas: [],
      estrela: false,
      meuDia: false,
      criadoEm: new Date().toISOString(),
      processoId: processo.id,
      processoNome: processo.razaoSocial,
      tipoProcesso: processo.tipoProcesso,
    };
    (novaTarefa as Tarefa & { faseId?: string }).faseId = faseId;
    (novaTarefa as Tarefa & { itemKey?: string }).itemKey = itemKey;

    await salvarTarefa(workspaceId, novaTarefa);
    await reloadTarefas();
    showToast(`Tarefa vinculada criada para "${titulo}"`);
  }, []);

  const handleSyncChecklistItem = useCallback((procId: string, faseId: string, key: string, isChecked: boolean) => {
    const processos = processosRef.current;
    const updated = processos.map(p => {
      if (p.id === procId) {
        const phasesObj = { ...p.fases };
        if (!phasesObj[faseId]) {
          phasesObj[faseId] = { status: 'pending', checklist: {} };
        }

        if (!!phasesObj[faseId].checklist[key] !== isChecked) {
          phasesObj[faseId].checklist[key] = isChecked;

          const items = checklistResolvido(p, faseId);
          const checkedCount = items.filter(it => {
            if (it.key === key) return isChecked;
            return !!phasesObj[faseId].checklist[it.key];
          }).length;

          const targetItem = items.find(it => it.key === key);
          const itemText = targetItem ? targetItem.texto : 'Item';
          const phaseName = fasesAtivas(p).find(f => f.id === faseId)?.nome || faseId;

          let newStatus: 'pending' | 'progress' | 'done' | 'na' = 'pending';
          if (checkedCount === items.length) {
            newStatus = 'done';
          } else if (checkedCount > 0) {
            newStatus = 'progress';
          }

          const historico = [...(p.historico || [])];
          historico.push(novaEntradaHistorico(`(Tarefa Espelhada) ${isChecked ? 'Concluiu' : 'Desmarcou'} "${itemText}" na etapa ${phaseName}`));

          if (newStatus !== phasesObj[faseId].status) {
            const statusLabels = { pending: 'Pendente', progress: 'Em progresso', done: 'Concluída', na: 'N/A' };
            historico.push(novaEntradaHistorico(`[Sistema] Alteração automática (Espelho): Etapa "${phaseName}" mudou para "${statusLabels[newStatus]}"`));
            phasesObj[faseId].status = newStatus;
          }

          if (newStatus === 'done') {
            const listAtivas = fasesAtivas(p);
            const currentIdx = listAtivas.findIndex(f => f.id === faseId);
            if (currentIdx >= 0 && currentIdx < listAtivas.length - 1) {
              const nextStageId = listAtivas[currentIdx + 1].id;
              const nextStageName = listAtivas[currentIdx + 1].nome;
              if (!phasesObj[nextStageId]) {
                phasesObj[nextStageId] = { status: 'progress', checklist: {} };
                historico.push(novaEntradaHistorico(`[Sistema] Fluxo automático (Espelho): Etapa "${nextStageName}" iniciada`));
              } else if (phasesObj[nextStageId].status === 'pending') {
                phasesObj[nextStageId].status = 'progress';
                historico.push(novaEntradaHistorico(`[Sistema] Fluxo automático (Espelho): Etapa "${nextStageName}" iniciada`));
              }
            }
          }

          return { ...p, fases: phasesObj, colunaManual: undefined, historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) };
        }
      }
      return p;
    });

    const isDifferent = JSON.stringify(updated) !== JSON.stringify(processos);
    if (isDifferent) {
      updateProcessoDaLista(updated, procId);
    }
  }, [updateProcessoDaLista]);

  const handleToggleTarefaVinculada = useCallback(async (t: Tarefa) => {
    const { workspaceId, reloadTarefas } = optsRef.current;
    if (!workspaceId) return;

    const nextStatus = t.status === 'concluida' ? 'pendente' : 'concluida';
    const nextChecked = nextStatus === 'concluida';
    const updatedTask: Tarefa = {
      ...t,
      status: nextStatus,
      concluidoEm: nextChecked ? new Date().toISOString() : undefined
    };

    await salvarTarefa(workspaceId, updatedTask);
    await reloadTarefas();

    // Sincronizar de volta para o processo (Tarefa -> Processo)
    const tExt = t as Tarefa & { faseId?: string; itemKey?: string };
    if (t.processoId && tExt.faseId && tExt.itemKey) {
      handleSyncChecklistItem(t.processoId, tExt.faseId, tExt.itemKey, nextChecked);
    }
  }, [handleSyncChecklistItem]);

  const handleGerarTarefas = useCallback(async (processoId: string) => {
    const { workspaceId, tarefas, reloadTarefas, showToast } = optsRef.current;
    if (!workspaceId) return;

    const p = processosRef.current.find(x => x.id === processoId);
    if (!p) return;

    const novasTarefas = gerarTarefasDeProcesso(p, tarefas);

    if (novasTarefas.length > 0) {
      await Promise.all(novasTarefas.map(t => salvarTarefa(workspaceId, t)));
      await reloadTarefas();
      showToast(`⚙️ Geradas ${novasTarefas.length} tarefa(s) para o processo!`);
    } else {
      showToast(`Todas as tarefas já existem para este processo.`);
    }
  }, []);

  const handleAddFase = useCallback((procId: string, nome: string, meta: string) => {
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const extras = [...(p.fasesExtras || [])];
        const newId = 'custom_' + Date.now();
        extras.push({ id: newId, nome, meta, checklist: [] });

        const fases = { ...p.fases };
        fases[newId] = { status: 'pending', checklist: {} };

        const historico = [...(p.historico || [])];
        historico.push(novaEntradaHistorico(`Adicionou a etapa personalizada "${nome}" (${meta})`));

        return { ...p, fasesExtras: extras, fases, historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
  }, [updateProcessoDaLista]);

  const handleRemoveFase = useCallback((procId: string, faseId: string) => {
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const removidas = [...(p.fasesRemovidas || [])];
        if (!removidas.includes(faseId)) {
          removidas.push(faseId);
        }

        let phaseName = faseId;
        const targetPhase = fasesAtivas(p).find(f => f.id === faseId);
        if (targetPhase) {
          phaseName = targetPhase.nome;
        }

        const extras = (p.fasesExtras || []).filter(e => e.id !== faseId);

        const fases = { ...p.fases };
        delete fases[faseId];

        const historico = [...(p.historico || [])];
        historico.push(novaEntradaHistorico(`Removeu a etapa "${phaseName}"`));

        return { ...p, fasesRemovidas: removidas, fasesExtras: extras, fases, historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
  }, [updateProcessoDaLista]);

  const handleCycleFaseStatus = useCallback((procId: string, faseId: string) => {
    const { workspaceId, tarefas, reloadTarefas, showToast } = optsRef.current;
    let blockDueToChecklist = false;
    const tasksToCreate: Tarefa[] = [];
    const tasksToUpdate: Tarefa[] = [];

    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const phasesObj = { ...p.fases };
        if (!phasesObj[faseId]) {
          phasesObj[faseId] = { status: 'pending', checklist: {} };
        }
        const cur = phasesObj[faseId].status;
        const next: 'pending' | 'progress' | 'done' | 'na' =
          cur === 'pending' ? 'progress' :
          cur === 'progress' ? 'done' :
          cur === 'done' ? 'na' : 'pending';

        // Check if gating is active and blocking is necessary
        if (p.exigirEtapasCompletas && next === 'done') {
          const items = checklistResolvido(p, faseId);
          const allChecked = items.every(it => !!phasesObj[faseId]?.checklist?.[it.key]);
          if (!allChecked) {
            blockDueToChecklist = true;
            return p; // return unchanged process
          }
        }

        phasesObj[faseId].status = next;

        const phaseName = fasesAtivas(p).find(f => f.id === faseId)?.nome || faseId;
        const statusLabels = { pending: 'Pendente', progress: 'Em progresso', done: 'Concluído', na: 'N/A' };
        const historico = [...(p.historico || [])];
        historico.push(novaEntradaHistorico(`Alterou o status de de "${phaseName}" para "${statusLabels[next]}"`));

        // Nível 3: Orquestração automática para a fase atual
        if (p.orquestracaoAtiva) {
          const { criar, atualizar } = orquestrarTarefasPorFase(p, faseId, next, tarefas);
          tasksToCreate.push(...criar);
          tasksToUpdate.push(...atualizar);
        }

        if (next === 'done') {
          // auto progress next
          const listAtivas = fasesAtivas(p);
          const currentIdx = listAtivas.findIndex(f => f.id === faseId);
          if (currentIdx >= 0 && currentIdx < listAtivas.length - 1) {
            const nextStageId = listAtivas[currentIdx + 1].id;
            const nextStageName = listAtivas[currentIdx + 1].nome;
            let progressed = false;
            if (!phasesObj[nextStageId]) {
              phasesObj[nextStageId] = { status: 'progress', checklist: {} };
              progressed = true;
            } else if (phasesObj[nextStageId].status === 'pending') {
              phasesObj[nextStageId].status = 'progress';
              progressed = true;
            }

            if (progressed) {
              historico.push(novaEntradaHistorico(`[Sistema] Fluxo automático: Etapa "${nextStageName}" iniciada`));

              // Nível 3: Orquestração automática para a etapa auto-avançada
              if (p.orquestracaoAtiva) {
                const tempProc = { ...p, fases: phasesObj };
                const nextOrc = orquestrarTarefasPorFase(tempProc, nextStageId, 'progress', tarefas);
                tasksToCreate.push(...nextOrc.criar);
                tasksToUpdate.push(...nextOrc.atualizar);
              }
            }
          }
        }

        return { ...p, fases: phasesObj, colunaManual: undefined, historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) };
      }
      return p;
    });

    if (blockDueToChecklist) {
      showToast('⚠️ Requisitos pendentes! Conclua todas as tarefas do checklist antes de dar a fase como Concluída.', true);
      return;
    }

    updateProcessoDaLista(updated, procId);

    // Salvar as tarefas da orquestração em lote
    if ((tasksToCreate.length > 0 || tasksToUpdate.length > 0) && workspaceId) {
      Promise.all([
        ...tasksToCreate.map(t => salvarTarefa(workspaceId, t)),
        ...tasksToUpdate.map(t => salvarTarefa(workspaceId, t))
      ]).then(() => {
        reloadTarefas();
        if (tasksToCreate.length > 0) {
          showToast(`⚙️ Orquestração: ${tasksToCreate.length} nova(s) tarefa(s) gerada(s) para a etapa!`);
        }
      });
    }
  }, [updateProcessoDaLista]);


  /**
   * Registra uma exigência JUCESP: entrada no histórico + dois alarmes
   * automáticos (5 dias antes do prazo e no dia do prazo final).
   */
  const handleAddExigencia = useCallback((procId: string, dados: Omit<Exigencia, 'id' | 'status'>) => {
    const { showToast } = optsRef.current;
    const exigencia: Exigencia = {
      ...dados,
      id: 'exg_' + Date.now(),
      status: 'pendente',
    };

    const cincoDiasAntes = (() => {
      const d = new Date(exigencia.prazoFinal + 'T09:00:00');
      d.setDate(d.getDate() - 5);
      return d.toISOString().slice(0, 16);
    })();
    const noPrazo = exigencia.prazoFinal + 'T09:00';

    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const exigencias = [...(p.exigencias || []), exigencia];

        const alarmes = [...(p.alarmes || [])];
        alarmes.push({
          id: 'alm_' + Date.now() + '_ex5',
          faseId: '',
          titulo: `⚠ Exigência JUCESP: faltam 5 dias — ${exigencia.fundamentoLegal}`,
          dataHora: cincoDiasAntes,
          concluido: false,
          criadoEm: new Date().toISOString().slice(0, 10),
        });
        alarmes.push({
          id: 'alm_' + Date.now() + '_exf',
          faseId: '',
          titulo: `🚨 PRAZO FINAL da exigência JUCESP — ${exigencia.fundamentoLegal}`,
          dataHora: noPrazo,
          concluido: false,
          criadoEm: new Date().toISOString().slice(0, 10),
        });

        const historico = [...(p.historico || [])];
        historico.push(novaEntradaHistorico(`Registrou exigência JUCESP (${exigencia.fundamentoLegal}) com prazo final em ${exigencia.prazoFinal}`));

        return { ...p, exigencias, alarmes, historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
    showToast('Exigência registrada! Alarmes de prazo criados automaticamente.');
  }, [updateProcessoDaLista]);

  /** Atualiza status/observações de uma exigência, com registro no histórico. */
  const handleUpdateExigencia = useCallback((procId: string, exigenciaId: string, patch: Partial<Exigencia>) => {
    const { showToast } = optsRef.current;
    const statusLabels: Record<string, string> = {
      pendente: 'Pendente', em_cumprimento: 'Em cumprimento',
      cumprida: 'Cumprida', reprotocolada: 'Reprotocolada',
    };
    const updated = processosRef.current.map(p => {
      if (p.id === procId) {
        const exigencias = (p.exigencias || []).map(e => {
          if (e.id !== exigenciaId) return e;
          const nova = { ...e, ...patch };
          if (patch.status === 'cumprida' && !nova.dataCumprimento) {
            nova.dataCumprimento = new Date().toISOString().slice(0, 10);
          }
          return nova;
        });

        const historico = [...(p.historico || [])];
        if (patch.status) {
          const alvo = (p.exigencias || []).find(e => e.id === exigenciaId);
          historico.push(novaEntradaHistorico(`Exigência JUCESP (${alvo?.fundamentoLegal || exigenciaId}) marcada como "${statusLabels[patch.status] || patch.status}"`));
        }

        return { ...p, exigencias, historico, ultimaAtualizacao: new Date().toISOString().slice(0, 10) };
      }
      return p;
    });
    updateProcessoDaLista(updated, procId);
    if (patch.status) showToast('Status da exigência atualizado.');
  }, [updateProcessoDaLista]);

  /** Move um processo para uma coluna do kanban, ajustando fases e checklists. */
  const executeDropToColumn = useCallback((id: string, colId: ColunaKanban) => {
    const { showToast } = optsRef.current;
    const processos = processosRef.current;
    const p = processos.find(x => x.id === id);
    if (!p) return;

    const phasesObj = { ...p.fases };
    const orderIndex = ORDEM_COLUNAS.indexOf(colId);
    const activeFases = fasesAtivas(p);

    const colunaOrigem = colunaKanban(p);
    const indexOrigem = ORDEM_COLUNAS.indexOf(colunaOrigem);

    // Update statuses for all active phases based on column order
    activeFases.forEach(f => {
      const col = resolveColuna(f);
      const fColIndex = ORDEM_COLUNAS.indexOf(col);
      const currentStatus = phasesObj[f.id]?.status || 'pending';

      if (currentStatus !== 'na') {
        if (fColIndex < orderIndex) {
          if (!phasesObj[f.id]) {
            phasesObj[f.id] = { status: 'done', checklist: {} };
          } else {
            phasesObj[f.id].status = 'done';
          }
        } else if (fColIndex > orderIndex) {
          if (!phasesObj[f.id]) {
            phasesObj[f.id] = { status: 'pending', checklist: {} };
          } else {
            phasesObj[f.id].status = 'pending';
          }
        }
      }
    });

    // Lógica para checklists integrada com a direção de movimentação
    if (orderIndex < indexOrigem) {
      // Arrastando para trás: limpa checklists das fases da coluna destino ou posteriores
      activeFases.forEach(f => {
        const col = resolveColuna(f);
        const fColIndex = ORDEM_COLUNAS.indexOf(col);
        if (fColIndex >= orderIndex) {
          if (!phasesObj[f.id]) {
            phasesObj[f.id] = { status: 'pending', checklist: {} };
          } else {
            phasesObj[f.id].checklist = {};
          }
        }
      });
    } else if (orderIndex > indexOrigem) {
      // Arrastando para frente: completa checklists das fases passadas e atual
      activeFases.forEach(f => {
        const col = resolveColuna(f);
        const fColIndex = ORDEM_COLUNAS.indexOf(col);
        if (fColIndex <= orderIndex) {
          if (!phasesObj[f.id]) {
            phasesObj[f.id] = { status: 'done', checklist: {} };
          }
          if (!phasesObj[f.id].checklist) {
            phasesObj[f.id].checklist = {};
          }
          const items = checklistResolvido(p, f.id);
          items.forEach(it => {
            phasesObj[f.id].checklist[it.key] = true;
          });
        }
      });
    }

    // Trata as fases da coluna destino
    const targetFases = activeFases.filter(f => resolveColuna(f) === colId);

    if (targetFases.length > 0) {
      const primeiraFasePendente = targetFases.find(f => {
        const st = phasesObj[f.id]?.status || 'pending';
        return st === 'pending';
      });

      if (primeiraFasePendente) {
        // Inicia a primeira pendente como progress; nunca regride fase done
        phasesObj[primeiraFasePendente.id] = {
          status: 'progress',
          checklist: phasesObj[primeiraFasePendente.id]?.checklist || {}
        };
      }
    }

    const isFinalized = colId === 'concluido';
    const colLabel = COLUNAS_KANBAN[colId]?.label || colId;

    const updated = processos.map(proc => {
      if (proc.id === id) {
        const historico = [...(proc.historico || []), novaEntradaHistorico(`Moveu o processo para a coluna "${colLabel}" no quadro Kanban`)];
        return {
          ...proc,
          finalizado: isFinalized,
          dataFinalizacao: isFinalized ? new Date().toISOString().slice(0, 10) : undefined,
          fases: phasesObj,
          colunaManual: colId,
          historico,
          ultimaAtualizacao: new Date().toISOString().slice(0, 10)
        };
      }
      return proc;
    });

    updateProcessoDaLista(updated, id);
    showToast(`Mapeamento atualizado: ${p.razaoSocial} movido para ${colLabel}.`);
  }, [updateProcessoDaLista]);

  return {
    processos, setProcessos,
    updateProcesso, replaceProcessos, updateProcessoDaLista,
    sincronizarComNuvem, cancelarSavesPendentes,
    handleUpdateProcesso, handleDeleteProcessoPermanently, handleRestoreProcessoFromLixeira,
    handleAddAlarme, handleToggleAlarme, handleDeleteAlarme,
    handleAttachDocument, handleRemoveDocument,
    handleToggleCheckItem, handleAddCheckItem, handleRemoveCheckItem,
    handleAddTarefaVinculada, handleSyncChecklistItem, handleToggleTarefaVinculada,
    handleGerarTarefas, handleAddFase, handleRemoveFase, handleCycleFaseStatus,
    handleAddExigencia, handleUpdateExigencia,
    executeDropToColumn,
  };
}
