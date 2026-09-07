import React, { useMemo } from 'react';
import { Processo } from '../types';
import { TiposProcessoMap } from '../lib/localCache';
import { fmtMoeda } from '../utils/helpers';
import { resumoPorTipo, exportarRelatorioXLSX } from '../utils/exportacao';
import { FileSpreadsheet, AlertTriangle, Landmark } from 'lucide-react';

interface RelatorioViewProps {
  processos: Processo[];
  tiposProcesso: TiposProcessoMap;
}

/** Relatório resumido por tipo de processo, exportável em .xlsx (Processos + Resumo). */
export const RelatorioView: React.FC<RelatorioViewProps> = ({ processos, tiposProcesso }) => {
  // Considera apenas processos ativos (exclui lixeira)
  const ativos = useMemo(() => processos.filter(p => !p.deletado), [processos]);
  const resumo = useMemo(() => resumoPorTipo(ativos, tiposProcesso), [ativos, tiposProcesso]);

  const totais = useMemo(() => resumo.reduce(
    (acc, r) => ({
      quantidade: acc.quantidade + r.quantidade,
      valorTotal: acc.valorTotal + r.valorTotal,
      emAtraso: acc.emAtraso + r.emAtraso,
      comExigencia: acc.comExigencia + r.comExigencia,
    }),
    { quantidade: 0, valorTotal: 0, emAtraso: 0, comExigencia: 0 },
  ), [resumo]);

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-lg font-bold text-[var(--text)]">Relatório por Tipo de Processo</h3>
        <button
          onClick={() => exportarRelatorioXLSX(ativos, tiposProcesso)}
          disabled={ativos.length === 0}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
          title="Exportar relatório (abas Processos + Resumo)"
        >
          <FileSpreadsheet className="h-4 w-4" /> Exportar Resumo (.xlsx)
        </button>
      </div>

      {resumo.length === 0 ? (
        <div className="bg-[var(--surface)] border rounded-2xl p-10 text-center text-[var(--text-3)]">
          <p className="font-semibold text-[var(--text)]">Nenhum processo ativo para relatar.</p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1C1F26] text-[var(--surface-2)] font-sans text-[10.5px] uppercase tracking-wider">
                <th className="p-4 pl-6 font-semibold">Tipo de Processo</th>
                <th className="p-4 font-semibold text-center">Quantidade</th>
                <th className="p-4 font-semibold text-right">Valor Total</th>
                <th className="p-4 font-semibold text-center">Em Atraso</th>
                <th className="p-4 pr-6 font-semibold text-center">Com Exigência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[var(--text-2)]">
              {resumo.map((r) => (
                <tr key={r.tipo} className="hover:bg-gray-50/70 transition">
                  <td className="p-4 pl-6 font-semibold text-gray-950">{r.label}</td>
                  <td className="p-4 text-center font-mono font-bold">{r.quantidade}</td>
                  <td className="p-4 text-right font-sans font-bold text-[var(--text)]">{fmtMoeda(r.valorTotal)}</td>
                  <td className="p-4 text-center">
                    {r.emAtraso > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold">
                        <AlertTriangle className="h-3 w-3" /> {r.emAtraso}
                      </span>
                    ) : <span className="text-[var(--text-3)]">0</span>}
                  </td>
                  <td className="p-4 pr-6 text-center">
                    {r.comExigencia > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-[var(--surface-2)] text-[var(--yellow)] px-2 py-0.5 rounded font-bold">
                        <Landmark className="h-3 w-3" /> {r.comExigencia}
                      </span>
                    ) : <span className="text-[var(--text-3)]">0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--bg)] border-t-2 border-[var(--border)] font-bold text-[var(--text)]">
                <td className="p-4 pl-6">Total ({resumo.length} tipo(s))</td>
                <td className="p-4 text-center font-mono">{totais.quantidade}</td>
                <td className="p-4 text-right font-sans">{fmtMoeda(totais.valorTotal)}</td>
                <td className="p-4 text-center font-mono text-red-600">{totais.emAtraso}</td>
                <td className="p-4 pr-6 text-center font-mono text-[var(--yellow)]">{totais.comExigencia}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
