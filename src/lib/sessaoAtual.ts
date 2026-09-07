/**
 * Cache leve do autor da sessão atual, alimentado pelo useAuthSession a
 * partir de supabase.auth.getUser(). Permite que helpers puros (fora do
 * React, como registrarHistorico) carimbem autoria sem prop drilling.
 */
export interface AutorSessao {
  email: string | null;
  nome: string | null;
}

let autorAtual: AutorSessao = { email: null, nome: null };

/** Deriva um nome curto de exibição a partir do e-mail (ex.: adilson.oliveira@… → Adilson). */
export function nomeExibicaoDeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const prefixo = email.split('@')[0];
  const primeiro = prefixo.split(/[._-]/)[0] || prefixo;
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1);
}

export function setAutorAtual(autor: AutorSessao): void {
  autorAtual = autor;
}

export function limparAutorAtual(): void {
  autorAtual = { email: null, nome: null };
}

export function getAutorAtual(): AutorSessao {
  return autorAtual;
}
