import { Processo, Fase, Alarme, ColunaKanban, FaseExtras, HistoricoItem } from '../types';
import { FASE_MODELOS, ORDEM_COLUNAS } from '../data/fases';
import { getAutorAtual } from '../lib/sessaoAtual';

/** Cria uma entrada de histórico carimbada com data-hora ISO e autor da sessão atual. */
export function novaEntradaHistorico(texto: string): HistoricoItem {
  const autor = getAutorAtual();
  return {
    data: new Date().toISOString(),
    texto,
    autorEmail: autor.email ?? undefined,
    autorNome: autor.nome ?? undefined,
  };
}

/** Retorna um novo array de histórico do processo com a entrada acrescentada. */
export function registrarHistorico(processo: Processo, texto: string): HistoricoItem[] {
  return [...(processo.historico || []), novaEntradaHistorico(texto)];
}

/** Formata a coluna de data do histórico: data-hora para ISO completo, só data para legado. */
export function fmtHistoricoData(iso: string | undefined): string {
  if (!iso) return '—';
  if (iso.length > 10 && iso.includes('T')) return fmtDataHora(iso);
  return fmtData(iso);
}

export function modeloFasesBase(p: Processo): Fase[] {
  try {
    const localModelosObj = localStorage.getItem('osc-legalizacao:fase-modelos');
    if (localModelosObj) {
      const parsed = JSON.parse(localModelosObj);
      if (parsed && parsed[p.tipoProcesso]) {
        return parsed[p.tipoProcesso] as Fase[];
      }
    }
  } catch {
    // fallback
  }
  return (FASE_MODELOS[p.tipoProcesso] || []) as Fase[];
}

export function fasesAtivas(p: Processo): Fase[] {
  const base = modeloFasesBase(p).filter(f => !f.condicional || f.condicional(p));
  const removidas = p.fasesRemovidas || [];
  const baseFiltrada = base.filter(f => !removidas.includes(f.id));
  const extras = (p.fasesExtras || []).map(f => ({ ...f, extra: true } as Fase));
  return [...baseFiltrada, ...extras];
}

export function statusFase(p: Processo, faseId: string): 'pending' | 'progress' | 'done' | 'na' {
  const f = p.fases && p.fases[faseId];
  return f ? f.status : 'pending';
}

export function checklistResolvido(p: Processo, faseId: string) {
  const modeloFase = modeloFasesBase(p).find(f => f.id === faseId);
  const extra = (p.fasesExtras || []).find(f => f.id === faseId);
  const baseList = modeloFase ? modeloFase.checklist.slice() : (extra ? extra.checklist.slice() : []);
  const custom = (p.checklistCustom && p.checklistCustom[faseId]) || { removidos: [], renomeados: {}, adicionados: [] };
  const removidos = custom.removidos || [];
  const renomeados = custom.renomeados || {};
  const adicionados = custom.adicionados || [];

  const itens: Array<{ key: string; texto: string; origem: 'base' | 'extra'; origemIdx: number }> = baseList.map((texto, idx) => ({
    key: 'b' + idx,
    texto: renomeados[idx] !== undefined ? renomeados[idx] : texto,
    origem: 'base' as const,
    origemIdx: idx,
  })).filter(item => !removidos.includes(item.origemIdx));

  adicionados.forEach((texto, idx) => {
    itens.push({ key: 'a' + idx, texto, origem: 'extra' as const, origemIdx: idx });
  });

  return itens;
}

export function progressoProcesso(p: Processo): number {
  const ativas = fasesAtivas(p);
  if (ativas.length === 0) return 0;
  const concluidas = ativas.filter(f => statusFase(p, f.id) === 'done').length;
  return Math.round((concluidas / ativas.length) * 100);
}

export function faseAtualProcesso(p: Processo): Fase | null {
  const ativas = fasesAtivas(p);
  const emAndamento = ativas.find(f => statusFase(p, f.id) === 'progress');
  if (emAndamento) return emAndamento;
  const pendente = ativas.find(f => statusFase(p, f.id) === 'pending');
  if (pendente) return pendente;
  return ativas[ativas.length - 1] || null;
}

export function diasEmAberto(p: Processo): number {
  if (!p.inicio) return 0;
  const inicioTime = new Date(p.inicio + 'T00:00:00').getTime();
  const endTime = p.finalizado && p.dataFinalizacao
    ? new Date(p.dataFinalizacao + 'T00:00:00').getTime()
    : new Date().getTime();
  return Math.max(0, Math.round((endTime - inicioTime) / (1000 * 60 * 60 * 24)));
}

export function estaAtrasado(p: Processo): boolean {
  if (p.finalizado || p.deletado) return false;
  if (!p.duracaoPrevista) return false;
  return diasEmAberto(p) > Number(p.duracaoPrevista);
}

export function diasRestantes(p: Processo): number | null {
  if (!p.duracaoPrevista) return null;
  return Number(p.duracaoPrevista) - diasEmAberto(p);
}

export function resolveColuna(f: Fase | FaseExtras): ColunaKanban {
  if (!f.coluna) {
    console.warn(
      `[LegalizaBoard Kanban] Fase "${f.id}" sem coluna definida.` +
      ` Fallback: 'elaboracao'.`
    );
    return 'elaboracao';
  }
  return f.coluna;
}

export function colunaKanbanAutomatica(p: Processo): ColunaKanban {
  if (p.finalizado) return 'concluido';

  const fases = fasesAtivas(p);

  // Percorre as colunas em ordem
  for (const coluna of ORDEM_COLUNAS) {
    // Pega só as fases que pertencem a esta coluna
    const fasesNaColuna = fases.filter(f => resolveColuna(f) === coluna);

    // Verifica se todas estão concluídas ou não aplicáveis
    const todasResolvidas = fasesNaColuna.every(f => {
      const st = statusFase(p, f.id);
      return st === 'done' || st === 'na';
    });

    // Se alguma fase desta coluna não está resolvida,
    // o processo fica aqui
    if (!todasResolvidas) return coluna;
  }

  // Todas as colunas resolvidas
  return 'concluido';
}

export function colunaKanban(p: Processo): ColunaKanban {
  // Processo marcado como finalizado → concluido
  if (p.finalizado) return 'concluido';

  const colunaAutomatica = colunaKanbanAutomatica(p);

  // Respeita colunaManual APENAS se ela for >= coluna automática
  // (ou seja, o usuário adiantou o card mas as fases ainda
  // não chegaram lá — mantém o manual)
  // Se as fases já passaram da colunaManual, usa o automático
  if (p.colunaManual) {
    const idxManual = ORDEM_COLUNAS.indexOf(p.colunaManual);
    const idxAuto = ORDEM_COLUNAS.indexOf(colunaAutomatica);
    if (idxManual >= idxAuto) {
      return p.colunaManual;
    }
  }

  return colunaAutomatica;
}

export function calcularKPIs(processos: Processo[]) {
  const ativos = processos.filter(p => !p.finalizado && !p.deletado);
  const finalizados = processos.filter(p => p.finalizado && !p.deletado);
  const finalizadosMes = finalizados.filter(p => {
    if (!p.dataFinalizacao) return false;
    const d = new Date(p.dataFinalizacao + 'T00:00:00');
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const atrasados = ativos.filter(estaAtrasado);
  const valorEmAberto = ativos.reduce((s, p) => s + (Number(p.valorProcesso) || 0), 0);
  const progressoMedio = ativos.length ? Math.round(ativos.reduce((s, p) => s + progressoProcesso(p), 0) / ativos.length) : 0;
  return {
    totalAtivos: ativos.length,
    finalizadosMes: finalizadosMes.length,
    atrasados: atrasados.length,
    valorEmAberto,
    progressoMedio,
    totalLixeira: processos.filter(p => p.deletado).length
  };
}

export function alarmeVencido(alarme: Alarme): boolean {
  if (alarme.concluido) return false;
  return new Date(alarme.dataHora) < new Date();
}

export function alarmeProximo(alarme: Alarme, horasJanela = 24): boolean {
  if (alarme.concluido) return false;
  const diffMs = new Date(alarme.dataHora).getTime() - new Date().getTime();
  return diffMs >= 0 && diffMs <= horasJanela * 60 * 60 * 1000;
}

export function gerarAlertas(processos: Processo[]) {
  const alertas: Array<{ tipo: 'crit' | 'warn'; proc: Processo; texto: string; alarmeId?: string }> = [];
  processos.filter(p => !p.finalizado && !p.deletado).forEach(p => {
    if (estaAtrasado(p)) {
      alertas.push({ tipo: 'crit', proc: p, texto: `<b>${p.razaoSocial}</b> está ${diasEmAberto(p) - Number(p.duracaoPrevista)} dia(s) além da duração prevista.` });
    } else {
      const restantes = diasRestantes(p);
      if (restantes !== null && restantes <= 3 && restantes >= 0) {
        alertas.push({ tipo: 'warn', proc: p, texto: `<b>${p.razaoSocial}</b> vence o prazo previsto em ${restantes} dia(s).` });
      }
    }
    if (p.trocaAdministrador && p.fases.certificado_digital && p.fases.certificado_digital.status !== 'done') {
      alertas.push({ tipo: 'warn', proc: p, texto: `<b>${p.razaoSocial}</b> tem troca de administrador — Certificado Digital ainda pendente.` });
    }
    if (p.tipoProcesso === 'licenciamento' && p.altoRisco && p.fases.dca && p.fases.dca.status !== 'done') {
      alertas.push({ tipo: 'warn', proc: p, texto: `<b>${p.razaoSocial}</b> é alto risco sanitário — DCA ainda não protocolada.` });
    }
    (p.alarmes || []).forEach(a => {
      if (!a.concluido) {
        if (alarmeVencido(a)) {
          alertas.push({ tipo: 'crit', proc: p, texto: `<b>${p.razaoSocial}</b> — alarme vencido: "${a.titulo}" (${fmtDataHora(a.dataHora)}) na etapa ${p.fasesExtras?.find(e => e.id === a.faseId)?.nome || a.faseId}.`, alarmeId: a.id });
        } else if (alarmeProximo(a)) {
          alertas.push({ tipo: 'warn', proc: p, texto: `<b>${p.razaoSocial}</b> — alarme próximo: "${a.titulo}" (${fmtDataHora(a.dataHora)}) na etapa ${p.fasesExtras?.find(e => e.id === a.faseId)?.nome || a.faseId}.`, alarmeId: a.id });
        }
      }
    });
  });
  return alertas;
}

export function fmtMoeda(v: number): string {
  if (!v) return 'R$ 0';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtData(iso: string | undefined): string {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function fmtDataHora(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

export function iniciais(nome: string): string {
  if (!nome) return '—';
  return nome.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
