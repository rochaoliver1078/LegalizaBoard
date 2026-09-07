import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, LgpdConsent, UserRole } from '../types';
import {
  lerCacheLocal, SEEDS, TIPOS_KEY, MODELOS_KEY, PROFILE_KEY, CONSENT_KEY,
  TiposProcessoMap, FaseModelosMap,
} from '../lib/localCache';

const PROFILE_PADRAO: UserProfile = {
  nome: 'Fábio da Silva Carvalho',
  crc: 'CRC 1SP256625/O-7',
};

interface UseWorkspaceConfigOpts {
  workspaceId: string | null;
  activeRole: UserRole;
  showToast: (msg: string, isError?: boolean) => void;
}

/**
 * Configuração do workspace (tipos de processo, modelos de fases, perfil
 * e consentimento LGPD): estado local otimista + persistência na tabela
 * workspace_config, com guards de papel idênticos ao comportamento original.
 */
export function useWorkspaceConfig({ workspaceId, activeRole, showToast }: UseWorkspaceConfigOpts) {
  const cache = useRef(lerCacheLocal()).current;

  const [tiposProcesso, setTiposProcesso] = useState<TiposProcessoMap>(() => {
    if (cache.tipos) return cache.tipos;
    localStorage.setItem(TIPOS_KEY, JSON.stringify(SEEDS.tipos));
    return SEEDS.tipos;
  });
  const [faseModelos, setFaseModelos] = useState<FaseModelosMap>(() => {
    if (cache.modelos) return cache.modelos;
    localStorage.setItem(MODELOS_KEY, JSON.stringify(SEEDS.modelos));
    return SEEDS.modelos;
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => cache.profile ?? PROFILE_PADRAO);
  const [consent, setConsent] = useState<LgpdConsent>(() => cache.consent ?? { aceito: false });

  const saveSupabaseConfigField = useCallback(async (targetWsId: string, fieldName: string, value: unknown) => {
    try {
      const { data: existing } = await supabase
        .from('workspace_config')
        .select('payload')
        .eq('workspace_id', targetWsId)
        .maybeSingle();

      const payload = existing?.payload ? { ...existing.payload, [fieldName]: value } : { [fieldName]: value };
      await supabase.from('workspace_config').upsert({ workspace_id: targetWsId, payload, updated_at: new Date().toISOString() });
    } catch (e) {
      console.error(`Erro ao salvar campo ${fieldName} no Supabase:`, e);
    }
  }, []);

  const saveTiposProcesso = useCallback(async (updated: TiposProcessoMap) => {
    if (activeRole !== 'admin') {
      showToast('Ação bloqueada! Modificar modelos de processos requer perfil de Administrador.', true);
      return;
    }
    setTiposProcesso(updated);
    localStorage.setItem(TIPOS_KEY, JSON.stringify(updated));
    if (workspaceId) await saveSupabaseConfigField(workspaceId, 'tiposProcesso', updated);
  }, [activeRole, workspaceId, showToast, saveSupabaseConfigField]);

  const saveFaseModelos = useCallback(async (updated: FaseModelosMap) => {
    if (activeRole !== 'admin') {
      showToast('Ação bloqueada! Modificar trilhas em massa requer perfil de Administrador.', true);
      return;
    }
    setFaseModelos(updated);
    localStorage.setItem(MODELOS_KEY, JSON.stringify(updated));
    if (workspaceId) await saveSupabaseConfigField(workspaceId, 'faseModelos', updated);
  }, [activeRole, workspaceId, showToast, saveSupabaseConfigField]);

  const saveProfile = useCallback(async (profile: UserProfile) => {
    if (activeRole === 'visualizador') {
      showToast('Ação bloqueada! Perfil de visualizador não pode fazer modificações no perfil do responsável técnico.', true);
      return;
    }
    setUserProfile(profile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    showToast('Perfil de responsável técnico atualizado!');
    if (workspaceId) await saveSupabaseConfigField(workspaceId, 'userProfile', profile);
  }, [activeRole, workspaceId, showToast, saveSupabaseConfigField]);

  const saveConsent = useCallback(async (acceptedConsent: LgpdConsent) => {
    setConsent(acceptedConsent);
    localStorage.setItem(CONSENT_KEY, JSON.stringify(acceptedConsent));
    showToast('Consentimento LGPD gravado!');
    if (workspaceId) await saveSupabaseConfigField(workspaceId, 'consent', acceptedConsent);
  }, [workspaceId, showToast, saveSupabaseConfigField]);

  /** Aplica o snapshot de configuração vindo da nuvem (login/seed). */
  const aplicarConfigNuvem = useCallback((cfg: {
    tipos: TiposProcessoMap;
    modelos: FaseModelosMap;
    profile: UserProfile;
    consent: LgpdConsent;
  }) => {
    setTiposProcesso(cfg.tipos);
    setFaseModelos(cfg.modelos);
    setUserProfile(cfg.profile);
    setConsent(cfg.consent);
    localStorage.setItem(TIPOS_KEY, JSON.stringify(cfg.tipos));
    localStorage.setItem(MODELOS_KEY, JSON.stringify(cfg.modelos));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(cfg.profile));
    localStorage.setItem(CONSENT_KEY, JSON.stringify(cfg.consent));
  }, []);

  return {
    tiposProcesso, faseModelos, userProfile, consent,
    saveTiposProcesso, saveFaseModelos, saveProfile, saveConsent,
    aplicarConfigNuvem,
  };
}
