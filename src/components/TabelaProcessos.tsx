import React, { useState, useRef, useEffect } from 'react';
import { Processo } from '../types';
import { TIPOS_PROCESSO } from '../data/fases';
import { faseAtualProcesso, progressoProcesso, estaAtrasado, fmtMoeda } from '../utils/helpers';
import { TiposProcessoMap } from '../lib/localCache';
import { exportarProcessosXLSX, exportarProcessosCSV } from '../utils/exportacao';
import { Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';

interface TabelaProcessosProps {
  processos: Processo[];
  tiposProcesso: TiposProcessoMap;
  onOpenProcesso: (id: string) => void;
}

/** Grade em tabela do diretório de processos, com exportação do conjunto filtrado. */
export const TabelaProcessos: React.FC<TabelaProcessosProps> = ({ processos, tiposProcesso, onOpenProcesso }) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            disabled={processos.length === 0}
            className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm hover:bg-[var(--bg)] transition disabled:opacity-50 cursor-pointer"
            title="Exportar o conjunto filtrado"
          >
            <Download className="h-4 w-4 text-[var(--text-3)]" />
            Exportar ({processos.length})
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menuAberto && (
            <div className="absolute right-0 mt-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-20 overflow-hidden">
              <button
                onClick={() => { exportarProcessosXLSX(processos, tiposProcesso); setMenuAberto(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--bg)] transition text-left cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
              </button>
              <button
                onClick={() => { exportarProcessosCSV(processos, tiposProcesso); setMenuAberto(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--bg)] transition text-left cursor-pointer border-t border-[var(--border)]"
              >
                <FileText className="h-4 w-4 text-[var(--text-3)]" /> CSV
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-x-auto shadow-sm select-none">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#1C1F26] text-[var(--surface-2)] font-sans text-[10.5px] uppercase tracking-wider">
              <th className="p-4 pl-6 font-semibold">Cliente / Razão Social</th>
              <th className="p-4 font-semibold">Docto Responsável</th>
              <th className="p-4 font-semibold">Responsável Designado</th>
              <th className="p-4 font-semibold text-center">Tipo de Operação</th>
              <th className="p-4 font-semibold text-right">Faturamento</th>
              <th className="p-4 font-semibold text-center">Progresso</th>
              <th className="p-4 font-semibold">Fase do Trâmite</th>
              <th className="p-4 pr-6 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-[var(--text-2)]">
            {processos.map((p) => {
              const tipoObj = (tiposProcesso && tiposProcesso[p.tipoProcesso]) || TIPOS_PROCESSO[p.tipoProcesso] || { label: p.tipoProcesso, color: '#475569', wash: '#f1f5f9' };
              const fase = faseAtualProcesso(p);
              const pct = progressoProcesso(p);
              const atrasado = estaAtrasado(p);

              return (
                <tr
                  key={p.id}
                  onClick={() => onOpenProcesso(p.id)}
                  className="hover:bg-gray-50/70 cursor-pointer transition border-b border-[var(--border)] last:border-b-0"
                >
                  <td className="p-4 pl-6 font-semibold text-gray-950 truncate max-w-[220px]">{p.razaoSocial}</td>
                  <td className="p-4 font-mono text-[var(--text-3)]">{p.documento || '—'}</td>
                  <td className="p-4 text-[var(--text-2)] font-sans">{p.responsavelLegal || 'Não atribuído'}</td>
                  <td className="p-4 text-center">
                    <span
                      style={{ backgroundColor: tipoObj.wash, color: tipoObj.color }}
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                    >
                      {tipoObj.label}
                    </span>
                  </td>
                  <td className="p-4 text-right font-sans font-bold text-[var(--text)]">{fmtMoeda(p.valorProcesso || 0)}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-mono">
                      <span className="font-bold">{pct}%</span>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-[var(--text)]">Trilha: {tipoObj.label} — Fase: {fase ? fase.nome : 'Protocolo final'}</td>
                  <td className="p-4 pr-6">
                    {p.finalizado ? (
                      <span className="text-[10px] bg-[var(--green-wash)] text-[var(--green)] px-2 py-0.5 rounded font-bold">Concluído</span>
                    ) : atrasado ? (
                      <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold">Excedido</span>
                    ) : (
                      <span className="text-[10px] bg-[var(--surface-2)] text-[var(--yellow)] px-2 py-0.5 rounded font-bold">Andamento</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
