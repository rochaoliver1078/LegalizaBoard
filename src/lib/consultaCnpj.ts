import { apenasDigitos } from '../utils/documentos';

export interface SocioQSA {
  nome: string;
  qualificacao: string;
}

export interface DadosCnpj {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaeFiscal: string;
  cnaeDescricao: string;
  logradouro: string;
  numero: string;
  municipio: string;
  uf: string;
  situacaoCadastral: string;
  qsa: SocioQSA[];
}

interface BrasilApiQsa {
  nome_socio?: string;
  qualificacao_socio?: string;
}

interface BrasilApiCnpj {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
  logradouro?: string;
  numero?: string;
  municipio?: string;
  uf?: string;
  descricao_situacao_cadastral?: string;
  situacao_cadastral?: string;
  qsa?: BrasilApiQsa[];
}

const TIMEOUT_MS = 8000;

/**
 * Consulta pública de CNPJ na BrasilAPI. Timeout de 8s e erro silencioso:
 * devolve null em qualquer falha (rede, CNPJ inexistente, timeout) para
 * que o chamador apenas ignore o pré-preenchimento.
 */
export async function consultarCNPJ(cnpj: string): Promise<DadosCnpj | null> {
  const numeric = apenasDigitos(cnpj);
  if (numeric.length !== 14) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numeric}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data: BrasilApiCnpj = await res.json();

    return {
      cnpj: data.cnpj || numeric,
      razaoSocial: data.razao_social || '',
      nomeFantasia: data.nome_fantasia || '',
      cnaeFiscal: data.cnae_fiscal != null ? String(data.cnae_fiscal) : '',
      cnaeDescricao: data.cnae_fiscal_descricao || '',
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      municipio: data.municipio || '',
      uf: data.uf || '',
      situacaoCadastral: data.descricao_situacao_cadastral || String(data.situacao_cadastral || ''),
      qsa: (data.qsa || []).map(s => ({
        nome: s.nome_socio || '',
        qualificacao: s.qualificacao_socio || '',
      })),
    };
  } catch {
    // Erro silencioso — rede, abort/timeout ou JSON inválido
    return null;
  } finally {
    clearTimeout(timer);
  }
}
