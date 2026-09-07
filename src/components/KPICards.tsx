import React, { useMemo, useState, useEffect } from 'react';
import { calcularKPIs, fmtMoeda } from '../utils/helpers';
import { Processo } from '../types';
import { TrendingUp, Folder, AlertTriangle, DollarSign, Layers, Landmark } from 'lucide-react';
import { listarExigenciasAbertas } from '../utils/exigencias';

interface KPICardsProps {
  processos: Processo[];
  onNavigate: (aba: string) => void;
}

/** Número com animação de contagem (0 → valor) usando easeOutCubic. */
const AnimatedNumber: React.FC<{ value: number; format?: (n: number) => string }> = ({ value, format }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 650;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format ? format(display) : Math.round(display).toLocaleString('pt-BR')}</>;
};

const KPICardsBase: React.FC<KPICardsProps> = ({ processos, onNavigate }) => {
  const k = useMemo(() => calcularKPIs(processos), [processos]);
  const exigenciasAbertas = useMemo(() => listarExigenciasAbertas(processos), [processos]);
  const exigenciaCritica = exigenciasAbertas.length > 0 ? exigenciasAbertas[0].dias : null;

  const cardBase = 'bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 relative overflow-hidden transition-all hover:shadow-md animate-fade-in';
  const numClass = 'font-sans text-3xl font-semibold mt-2 text-[#1f2937]';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 select-none">

      {/* Total Ativos — vermelho institucional */}
      <button
        onClick={() => onNavigate('processos')}
        className={`text-left border-t-4 border-t-[var(--primary)] hover:border-[var(--border)] hover:-translate-y-0.5 ${cardBase}`}
      >
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">Ativos</span>
          <div className="p-2 rounded-full bg-red-50">
            <Folder className="h-4 w-4 text-[var(--primary)]" />
          </div>
        </div>
        <div className={numClass}><AnimatedNumber value={k.totalAtivos} /></div>
        <div className="text-[11px] mt-1 text-[var(--text-3)]">em andamento agora</div>
      </button>

      {/* Concluídos no Mês — verde */}
      <div className={`border-t-4 border-t-emerald-500 ${cardBase}`}>
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">Concluídos (Mês)</span>
          <div className="p-2 rounded-full bg-emerald-100">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <div className={numClass}><AnimatedNumber value={k.finalizadosMes} /></div>
        <div className="text-[11px] mt-1 text-emerald-600 font-medium font-sans">concluídos com sucesso</div>
      </div>

      {/* Vencidos/Atrasados — vermelho quando há atraso, cinza quando ok */}
      <button
        onClick={() => onNavigate('alertas')}
        className={`text-left hover:border-[var(--border)] hover:-translate-y-0.5 border-t-4 ${k.atrasados > 0 ? 'border-t-red-500' : 'border-t-slate-300'} ${cardBase}`}
      >
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">Atrasados</span>
          <div className={`p-2 rounded-full ${k.atrasados > 0 ? 'bg-red-100' : 'bg-[var(--surface-2)]'}`}>
            <AlertTriangle className={`h-4 w-4 ${k.atrasados > 0 ? 'text-[var(--primary)]' : 'text-[var(--text-3)]'}`} />
          </div>
        </div>
        <div className={numClass}><AnimatedNumber value={k.atrasados} /></div>
        <div className={`text-[11px] mt-1 ${k.atrasados > 0 ? 'text-[var(--primary)] font-medium' : 'text-[var(--text-3)]'}`}>
          {k.atrasados > 0 ? 'requer atenção imediata' : 'tudo em ordem'}
        </div>
      </button>

      {/* Valor em aberto — dourado */}
      <div className={`border-t-4 border-t-amber-500 ${cardBase}`}>
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">Carteira Ativa</span>
          <div className="p-2 rounded-full bg-amber-100">
            <DollarSign className="h-4 w-4 text-amber-600" />
          </div>
        </div>
        <div className="font-sans text-2xl font-semibold mt-2 text-[#1f2937]">
          <AnimatedNumber value={k.valorEmAberto} format={fmtMoeda} />
        </div>
        <div className="text-[11px] mt-1 text-[var(--text-3)]">processos em andamento</div>
      </div>

      {/* Exigências JUCESP abertas — vermelho quando há apontamento */}
      <button
        onClick={() => onNavigate('alertas')}
        className={`text-left hover:border-[var(--border)] hover:-translate-y-0.5 border-t-4 ${exigenciasAbertas.length > 0 ? 'border-t-red-500' : 'border-t-slate-300'} ${cardBase}`}
      >
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">Exigências Abertas</span>
          <div className={`p-2 rounded-full ${exigenciasAbertas.length > 0 ? 'bg-red-100' : 'bg-[var(--surface-2)]'}`}>
            <Landmark className={`h-4 w-4 ${exigenciasAbertas.length > 0 ? 'text-[var(--primary)]' : 'text-[var(--text-3)]'}`} />
          </div>
        </div>
        <div className={numClass}><AnimatedNumber value={exigenciasAbertas.length} /></div>
        <div className={`text-[11px] mt-1 ${exigenciaCritica !== null && exigenciaCritica <= 7 ? 'text-[var(--primary)] font-medium' : 'text-[var(--text-3)]'}`}>
          {exigenciasAbertas.length === 0
            ? 'nenhum apontamento JUCESP'
            : exigenciaCritica !== null && exigenciaCritica < 0
              ? 'há prazo VENCIDO!'
              : `prazo mais crítico: ${exigenciaCritica} dia(s)`}
        </div>
      </button>

      {/* Progresso Médio — azul */}
      <div className={`border-t-4 border-t-blue-500 ${cardBase}`}>
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">Progresso Médio</span>
          <div className="p-2 rounded-full bg-blue-50">
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
        </div>
        <div className={numClass}><AnimatedNumber value={k.progressoMedio} />%</div>
        <div className="text-[11px] mt-1 text-[var(--text-3)]">conclusão de fases</div>
      </div>

    </div>
  );
};

// Memoizado: KPIs só recalculam quando a lista de processos muda
export const KPICards = React.memo(KPICardsBase);
