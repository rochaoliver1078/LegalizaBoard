import { Processo, Exigencia, ProcessoTipo } from '../types';

/** Trilhas que tramitam na JUCESP e podem receber exigências. */
const TIPOS_JUCESP: ProcessoTipo[] = ['abertura', 'alteracao', 'baixa', 'transformacao', 'ata'];

export function tramitaNaJucesp(tipo: ProcessoTipo): boolean {
  return TIPOS_JUCESP.includes(tipo);
}

/** dataExigencia + 30 dias corridos (prazo padrão da JUCESP). */
export function calcularPrazoFinal(dataExigencia: string): string {
  const d = new Date(dataExigencia + 'T12:00:00');
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

/** Dias corridos restantes até o prazo (negativo = vencido). */
export function diasRestantes(prazoFinal: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazo = new Date(prazoFinal + 'T00:00:00');
  return Math.round((prazo.getTime() - hoje.getTime()) / 86_400_000);
}

export function exigenciaAberta(e: Exigencia): boolean {
  return e.status === 'pendente' || e.status === 'em_cumprimento';
}

export function exigenciasAbertas(p: Processo): Exigencia[] {
  return (p.exigencias || []).filter(exigenciaAberta);
}

/** Menor número de dias restantes entre as exigências abertas (null se não houver). */
export function menorPrazoAberto(p: Processo): number | null {
  const abertas = exigenciasAbertas(p);
  if (abertas.length === 0) return null;
  return Math.min(...abertas.map(e => diasRestantes(e.prazoFinal)));
}

export interface ExigenciaComProcesso {
  proc: Processo;
  exigencia: Exigencia;
  dias: number;
}

/** Todas as exigências abertas do portfólio, ordenadas do prazo mais crítico ao mais folgado. */
export function listarExigenciasAbertas(processos: Processo[]): ExigenciaComProcesso[] {
  const lista: ExigenciaComProcesso[] = [];
  processos.filter(p => !p.deletado).forEach(proc => {
    exigenciasAbertas(proc).forEach(exigencia => {
      lista.push({ proc, exigencia, dias: diasRestantes(exigencia.prazoFinal) });
    });
  });
  return lista.sort((a, b) => a.dias - b.dias);
}
