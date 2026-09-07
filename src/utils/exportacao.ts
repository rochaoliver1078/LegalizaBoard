import * as XLSX from 'xlsx';
import { Processo } from '../types';
import { TiposProcessoMap } from '../lib/localCache';
import { TIPOS_PROCESSO, COLUNAS_KANBAN } from '../data/fases';
import { faseAtualProcesso, progressoProcesso, estaAtrasado, diasEmAberto, colunaKanban } from './helpers';
import { exigenciasAbertas } from './exigencias';

interface LinhaProcesso {
  'Razão Social': string;
  'CNPJ/CPF': string;
  'Tipo de Processo': string;
  'Tipo Societário': string;
  'Regime Tributário': string;
  'Fase Atual': string;
  'Coluna Kanban': string;
  'Progresso %': number;
  'Protocolo JUCESP': string;
  'Exigências Abertas': number;
  'Valor (R$)': number;
  'Início': string;
  'Prazo Previsto': string;
  'Dias em Atraso': number;
  'Responsável Legal': string;
  'Solicitante': string;
}

/** Data de início + duração prevista → data prevista de conclusão (YYYY-MM-DD). */
function prazoPrevisto(p: Processo): string {
  if (!p.inicio || !p.duracaoPrevista) return '';
  const d = new Date(p.inicio + 'T00:00:00');
  d.setDate(d.getDate() + Number(p.duracaoPrevista));
  return d.toISOString().slice(0, 10);
}

function diasAtraso(p: Processo): number {
  if (!estaAtrasado(p)) return 0;
  return diasEmAberto(p) - Number(p.duracaoPrevista);
}

function labelTipo(tipo: string, tiposProcesso: TiposProcessoMap): string {
  return (tiposProcesso && tiposProcesso[tipo])?.label || TIPOS_PROCESSO[tipo]?.label || tipo;
}

function montarLinha(p: Processo, tiposProcesso: TiposProcessoMap): LinhaProcesso {
  const fase = faseAtualProcesso(p);
  const col = COLUNAS_KANBAN[colunaKanban(p)];
  return {
    'Razão Social': p.razaoSocial || '',
    'CNPJ/CPF': p.documento || '',
    'Tipo de Processo': labelTipo(p.tipoProcesso, tiposProcesso),
    'Tipo Societário': p.tipoSocietario || '',
    'Regime Tributário': p.regimeTributario || '',
    'Fase Atual': fase ? fase.nome : 'Protocolo final',
    'Coluna Kanban': col?.label || colunaKanban(p),
    'Progresso %': progressoProcesso(p),
    'Protocolo JUCESP': p.protocoloJucesp || '',
    'Exigências Abertas': exigenciasAbertas(p).length,
    'Valor (R$)': Number(p.valorProcesso) || 0,
    'Início': p.inicio || '',
    'Prazo Previsto': prazoPrevisto(p),
    'Dias em Atraso': diasAtraso(p),
    'Responsável Legal': p.responsavelLegal || '',
    'Solicitante': p.solicitante || '',
  };
}

const LARGURAS = [
  34, 20, 20, 16, 18, 26, 20, 12, 18, 16, 14, 12, 14, 14, 24, 22,
];

function aplicarEstiloCabecalho(ws: XLSX.WorkSheet, colunas: number) {
  ws['!cols'] = LARGURAS.slice(0, colunas).map(w => ({ wch: w }));
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[addr];
    if (cell) cell.s = { font: { bold: true } };
  }
}

function baixar(wb: XLSX.WorkBook, nome: string) {
  XLSX.writeFile(wb, nome, { compression: true });
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Planilha "Processos" (.xlsx) com o dataset completo por linha. */
export function exportarProcessosXLSX(processos: Processo[], tiposProcesso: TiposProcessoMap): void {
  const linhas = processos.map(p => montarLinha(p, tiposProcesso));
  const ws = XLSX.utils.json_to_sheet(linhas);
  aplicarEstiloCabecalho(ws, 16);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Processos');
  baixar(wb, `processos-${timestamp()}.xlsx`);
}

export interface ResumoTipo {
  tipo: string;
  label: string;
  quantidade: number;
  valorTotal: number;
  emAtraso: number;
  comExigencia: number;
}

/** Agrupa por tipo de processo com contagem, soma de valor, atrasos e exigências abertas. */
export function resumoPorTipo(processos: Processo[], tiposProcesso: TiposProcessoMap): ResumoTipo[] {
  const mapa = new Map<string, ResumoTipo>();
  processos.forEach(p => {
    const tipo = p.tipoProcesso;
    if (!mapa.has(tipo)) {
      mapa.set(tipo, {
        tipo,
        label: labelTipo(tipo, tiposProcesso),
        quantidade: 0,
        valorTotal: 0,
        emAtraso: 0,
        comExigencia: 0,
      });
    }
    const r = mapa.get(tipo)!;
    r.quantidade += 1;
    r.valorTotal += Number(p.valorProcesso) || 0;
    if (estaAtrasado(p)) r.emAtraso += 1;
    if (exigenciasAbertas(p).length > 0) r.comExigencia += 1;
  });
  return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade);
}

/** .xlsx com aba "Processos" (detalhe) + aba "Resumo" (agrupamento por tipo). */
export function exportarRelatorioXLSX(processos: Processo[], tiposProcesso: TiposProcessoMap): void {
  const wb = XLSX.utils.book_new();

  const wsProc = XLSX.utils.json_to_sheet(processos.map(p => montarLinha(p, tiposProcesso)));
  aplicarEstiloCabecalho(wsProc, 16);
  XLSX.utils.book_append_sheet(wb, wsProc, 'Processos');

  const resumo = resumoPorTipo(processos, tiposProcesso).map(r => ({
    'Tipo de Processo': r.label,
    'Quantidade': r.quantidade,
    'Valor Total (R$)': r.valorTotal,
    'Em Atraso': r.emAtraso,
    'Com Exigência Aberta': r.comExigencia,
  }));
  const wsResumo = XLSX.utils.json_to_sheet(resumo);
  wsResumo['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 20 }];
  const rangeR = XLSX.utils.decode_range(wsResumo['!ref'] || 'A1');
  for (let c = rangeR.s.c; c <= rangeR.e.c; c++) {
    const cell = wsResumo[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) cell.s = { font: { bold: true } };
  }
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  baixar(wb, `relatorio-processos-${timestamp()}.xlsx`);
}

/** CSV separado por ';' com BOM UTF-8 (padrão Excel Brasil). */
export function exportarProcessosCSV(processos: Processo[], tiposProcesso: TiposProcessoMap = {}): void {
  const linhas = processos.map(p => montarLinha(p, tiposProcesso));
  const ws = XLSX.utils.json_to_sheet(linhas);
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `processos-${timestamp()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
