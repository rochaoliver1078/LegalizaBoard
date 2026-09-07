import React from 'react';
import { Bell, ShieldCheck, Landmark } from 'lucide-react';
import { ExigenciaComProcesso } from '../utils/exigencias';
import { gerarAlertas } from '../utils/helpers';
import { TIPOS_PROCESSO } from '../data/fases';
import { TiposProcessoMap } from '../lib/localCache';

type Alerta = ReturnType<typeof gerarAlertas>[number];

interface AlertasPanelProps {
  alertas: Alerta[];
  /** Exigências JUCESP abertas, já ordenadas por prazo (mais crítico primeiro). */
  exigencias?: ExigenciaComProcesso[];
  tiposProcesso: TiposProcessoMap;
  onOpenProcesso: (id: string) => void;
  /** 'resumo': cartão compacto do painel geral | 'completo': aba de alertas */
  modo: 'resumo' | 'completo';
  onVerTodos?: () => void;
}

export const AlertasPanel: React.FC<AlertasPanelProps> = ({
  alertas, exigencias = [], tiposProcesso, onOpenProcesso, modo, onVerTodos,
}) => {
  const renderExigencia = ({ proc, exigencia, dias }: ExigenciaComProcesso) => {
    const critico = dias <= 7;
    return (
      <div
        key={exigencia.id}
        onClick={() => onOpenProcesso(proc.id)}
        className={`flex items-start gap-3 p-4 rounded-xl border border-l-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 ${
          critico ? 'bg-red-50 border-red-200 border-l-[var(--primary)] text-red-950' : 'bg-amber-50 border-amber-200 border-l-amber-500 text-amber-950'
        }`}
      >
        <div className={`p-2 rounded-full ${critico ? 'bg-[var(--primary)]' : 'bg-amber-500'}`}>
          <Landmark className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs leading-relaxed">
            <strong>Exigência JUCESP</strong> em <strong>{proc.razaoSocial}</strong> ({exigencia.fundamentoLegal}) —{' '}
            {dias < 0 ? <strong className="text-[var(--primary)]">prazo VENCIDO há {Math.abs(dias)} dia(s)</strong>
              : dias === 0 ? <strong className="text-[var(--primary)]">vence HOJE</strong>
              : <>faltam <strong>{dias} dia(s)</strong> para o prazo final</>}
          </p>
          <span className="text-[10px] mt-1 text-[var(--text-3)] block">Prazo: {exigencia.prazoFinal} · Clique para acompanhar</span>
        </div>
      </div>
    );
  };
  if (modo === 'resumo') {
    if (alertas.length === 0 && exigencias.length === 0) return null;
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3 shadow-sm select-none">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text)] uppercase">
          <Bell className="h-4 w-4 text-red-600" /> Alertas operacionais ativos ({alertas.length + exigencias.length})
        </div>
        {exigencias.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exigencias.slice(0, 2).map(({ proc, exigencia, dias }) => (
              <div
                key={exigencia.id}
                onClick={() => onOpenProcesso(proc.id)}
                className="p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer hover:shadow-xs transition bg-red-50 border-red-200 text-red-900"
              >
                <Landmark className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed flex-1">
                  <strong>Exigência JUCESP</strong> em <strong>{proc.razaoSocial}</strong> — {dias < 0 ? `vencida há ${Math.abs(dias)} dia(s)` : `${dias} dia(s) restantes`}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alertas.slice(0, 4).map((al, idx) => (
            <div
              key={idx}
              onClick={() => onOpenProcesso(al.proc.id)}
              className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer hover:shadow-xs transition ${
                al.tipo === 'crit'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <span className="mt-0.5 font-bold">•</span>
              <p className="text-xs leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: al.texto }}></p>
            </div>
          ))}
        </div>
        {alertas.length > 4 && (
          <button
            onClick={onVerTodos}
            className="text-xs text-[var(--primary)] hover:underline font-semibold"
          >
            Ver todos os {alertas.length} alertas →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none">
      <h3 className="font-sans text-lg font-bold text-[var(--text)]">Alertas e Riscos Ativos</h3>
      {exigencias.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wide flex items-center gap-1.5">
            <Landmark className="h-4 w-4 text-[var(--primary)]" /> Exigências JUCESP por prazo ({exigencias.length})
          </h4>
          {exigencias.map(renderExigencia)}
        </div>
      )}
      {alertas.length === 0 && exigencias.length === 0 ? (
        <div className="bg-[var(--surface)] border rounded-2xl p-10 text-center text-[var(--text-3)]">
          <ShieldCheck className="h-12 w-12 text-[var(--green)] mx-auto mb-3" />
          <p className="font-semibold text-[var(--text)]">Parabéns! Tudo em ordem.</p>
          <p className="text-xs mt-1">Nenhum processo com atraso ou risco de licenciamento detectado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((al, idx) => (
            <div
              key={idx}
              onClick={() => onOpenProcesso(al.proc.id)}
              className={`flex items-start gap-3 p-4 rounded-xl border border-l-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 ${al.tipo === 'crit' ? 'bg-red-50 border-red-200 border-l-[var(--primary)] text-red-950' : 'bg-amber-50 border-amber-200 border-l-amber-500 text-amber-950'}`}
            >
              <div className={`p-2 rounded-full ${al.tipo === 'crit' ? 'bg-[var(--primary)]' : 'bg-amber-500'}`}>
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: al.texto }}></p>
                <span className="text-[10px] mt-1 text-[var(--text-3)] block">Tipo: {(tiposProcesso && tiposProcesso[al.proc.tipoProcesso])?.label || TIPOS_PROCESSO[al.proc.tipoProcesso]?.label} · Clique para acompanhar</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
