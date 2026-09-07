import { Processo, UserProfile, LgpdConsent } from '../types';
import { SEED_PROCESSOS, TIPOS_PROCESSO, FASE_MODELOS } from '../data/fases';

export const STORAGE_KEY = 'osc-legalizacao:processos';
export const PROFILE_KEY = 'osc-legalizacao:user-profile';
export const CONSENT_KEY = 'osc-legalizacao:consent';
export const TIPOS_KEY = 'osc-legalizacao:tipos-processo';
export const MODELOS_KEY = 'osc-legalizacao:fase-modelos';

export type TiposProcessoMap = Record<string, { label: string; color: string; wash: string; icon: string }>;
export type FaseModelosMap = Record<string, Array<{ id: string; nome: string; meta: string; checklist: string[] }>>;

interface CacheLocal {
  processos: Processo[] | null;
  tipos: TiposProcessoMap | null;
  modelos: FaseModelosMap | null;
  profile: UserProfile | null;
  consent: LgpdConsent | null;
  /** true quando o cache local segue um modelo de fases desatualizado */
  modeloAntigo: boolean;
}

/**
 * Leitura otimista do cache local enquanto a autenticação resolve.
 * Se os modelos locais forem de uma versão antiga do app (sem a fase
 * minuta_contrato), descarta processos/tipos/modelos e usa os seeds.
 */
export function lerCacheLocal(): CacheLocal {
  const localProcs = localStorage.getItem(STORAGE_KEY);
  const localProfile = localStorage.getItem(PROFILE_KEY);
  const localConsent = localStorage.getItem(CONSENT_KEY);
  const localTipos = localStorage.getItem(TIPOS_KEY);
  const localModelos = localStorage.getItem(MODELOS_KEY);

  let modeloAntigo = false;
  if (localModelos) {
    try {
      const parsed = JSON.parse(localModelos);
      if (!parsed.abertura || !parsed.abertura.some((f: { id: string }) => f.id === 'minuta_contrato')) {
        modeloAntigo = true;
      }
    } catch {
      modeloAntigo = true;
    }
  }

  const parseOuNull = <T,>(raw: string | null): T | null => {
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  };

  return {
    processos: modeloAntigo ? null : parseOuNull<Processo[]>(localProcs),
    tipos: modeloAntigo ? null : parseOuNull<TiposProcessoMap>(localTipos),
    modelos: modeloAntigo ? null : parseOuNull<FaseModelosMap>(localModelos),
    profile: parseOuNull<UserProfile>(localProfile),
    consent: parseOuNull<LgpdConsent>(localConsent),
    modeloAntigo,
  };
}

/** Valores de seed usados quando o cache local está vazio ou obsoleto. */
export const SEEDS = {
  processos: SEED_PROCESSOS,
  tipos: TIPOS_PROCESSO,
  modelos: FASE_MODELOS,
};
