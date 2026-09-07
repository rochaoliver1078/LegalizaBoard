import React, { useState } from 'react';
import { Processo, Exigencia, ExigenciaStatus } from '../types';
import { calcularPrazoFinal, diasRestantes, exigenciaAberta } from '../utils/exigencias';
import { fmtData } from '../utils/helpers';
import { Landmark, Copy, Check, Plus, Loader2 } from 'lucide-react';

interface ExigenciasSectionProps {
  p: Processo;
  onUpdate: (id: string, patch: Partial<Processo>) => void;
  onAddExigencia: (procId: string, dados: Omit<Exigencia, 'id' | 'status'>) => void;
  onUpdateExigencia: (procId: string, exigenciaId: string, patch: Partial<Exigencia>) => void;
  showToast?: (msg: string, isError?: boolean) => void;
}

const STATUS_BADGE: Record<ExigenciaStatus, { label: string; cls: string }> = {
  pendente:        { label: 'Pendente',        cls: 'bg-red-50 text-red-700 border-red-200' },
  em_cumprimento:  { label: 'Em cumprimento',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  cumprida:        { label: 'Cumprida',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  reprotocolada:   { label: 'Reprotocolada',   cls: 'bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border)]' },
};

/** Seção "Exigências JUCESP" do drawer: protocolo, lista e cadastro. */
export const ExigenciasSection: React.FC<ExigenciasSectionProps> = ({
  p, onUpdate, onAddExigencia, onUpdateExigencia, showToast,
}) => {
  const [copiado, setCopiado] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    dataExigencia: new Date().toISOString().slice(0, 10),
    prazoFinal: calcularPrazoFinal(new Date().toISOString().slice(0, 10)),
    fundamentoLegal: '',
    descricao: '',
    observacoes: '',
  });

  const exigencias = p.exigencias || [];

  const handleCopiarProtocolo = async () => {
    if (!p.protocoloJucesp) return;
    try {
      await navigator.clipboard.writeText(p.protocoloJucesp);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      showToast?.('Número de protocolo copiado!');
    } catch {
      showToast?.('Não foi possível copiar o protocolo.', true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fundamentoLegal.trim() || !form.descricao.trim()) {
      showToast?.('Informe o fundamento legal e a descrição da exigência.', true);
      return;
    }
    setSalvando(true);
    onAddExigencia(p.id, {
      dataExigencia: form.dataExigencia,
      prazoFinal: form.prazoFinal,
      fundamentoLegal: form.fundamentoLegal.trim(),
      descricao: form.descricao.trim(),
      observacoes: form.observacoes.trim() || undefined,
    });
    setSalvando(false);
    setMostrarForm(false);
    setForm({
      dataExigencia: new Date().toISOString().slice(0, 10),
      prazoFinal: calcularPrazoFinal(new Date().toISOString().slice(0, 10)),
      fundamentoLegal: '',
      descricao: '',
      observacoes: '',
    });
  };

  return (
    <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-[var(--yellow)]" />
          <h4 className="text-xs font-extrabold text-[var(--text)] uppercase tracking-wide">Exigências JUCESP</h4>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="text-[10px] bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
        >
          <Plus className="h-3 w-3" /> Nova Exigência
        </button>
      </div>

      {/* Protocolo JUCESP */}
      <div>
        <label className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Nº do Protocolo JUCESP</label>
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="Ex: 1.234.567/26-0"
            value={p.protocoloJucesp || ''}
            onChange={(e) => onUpdate(p.id, { protocoloJucesp: e.target.value })}
            className="flex-1 bg-[var(--surface)] border border-[var(--border)] p-2 rounded-lg text-xs font-mono focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <button
            type="button"
            onClick={handleCopiarProtocolo}
            disabled={!p.protocoloJucesp}
            className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] px-2.5 rounded-lg hover:bg-[var(--bg)] transition cursor-pointer disabled:opacity-40"
            title="Copiar número do protocolo"
          >
            {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Formulário de nova exigência */}
      {mostrarForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Data da Exigência</label>
              <input
                type="date"
                value={form.dataExigencia}
                onChange={(e) => setForm({
                  ...form,
                  dataExigencia: e.target.value,
                  // Prazo recalculado automaticamente (30 dias corridos), mas segue editável
                  prazoFinal: e.target.value ? calcularPrazoFinal(e.target.value) : form.prazoFinal,
                })}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Prazo Final (30 dias)</label>
              <input
                type="date"
                value={form.prazoFinal}
                onChange={(e) => setForm({ ...form, prazoFinal: e.target.value })}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Fundamento Legal</label>
            <input
              type="text"
              placeholder="Ex: Art. 35, I, Lei 8.934/94"
              value={form.fundamentoLegal}
              onChange={(e) => setForm({ ...form, fundamentoLegal: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Descrição do Apontamento</label>
            <textarea
              rows={2}
              placeholder="Descreva a exigência apontada pelo analista da JUCESP"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Observações (opcional)</label>
            <input
              type="text"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="text-[10px] bg-[var(--surface)] border text-[var(--text-2)] font-semibold py-1.5 px-3 rounded-lg hover:bg-[var(--bg)] transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="text-[10px] bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold py-1.5 px-4 rounded-lg transition flex items-center gap-1 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Registrar Exigência
            </button>
          </div>
        </form>
      )}

      {/* Lista de exigências */}
      {exigencias.length === 0 ? (
        <p className="text-[10px] text-[var(--text-3)] text-center py-2">Nenhuma exigência registrada para este protocolo.</p>
      ) : (
        <div className="space-y-2">
          {exigencias.map(ex => {
            const dias = diasRestantes(ex.prazoFinal);
            const aberta = exigenciaAberta(ex);
            const critico = aberta && dias <= 7;
            const badge = STATUS_BADGE[ex.status];
            return (
              <div key={ex.id} className={`bg-[var(--surface)] border rounded-xl p-3 space-y-1.5 ${critico ? 'border-red-300 ring-1 ring-red-200' : 'border-[var(--border)]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                  {aberta && (
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      critico ? 'bg-red-600 text-white animate-pulse' : 'bg-[var(--surface-2)] text-[var(--yellow)]'
                    }`}>
                      {dias < 0 ? `VENCIDA há ${Math.abs(dias)} dia(s)` : dias === 0 ? 'VENCE HOJE' : `${dias} dia(s) restante(s)`}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-[var(--text)]">{ex.fundamentoLegal}</p>
                <p className="text-[11px] text-[var(--text-2)] leading-relaxed">{ex.descricao}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-[var(--text-3)] font-mono">
                  <span>Exigida: {fmtData(ex.dataExigencia)}</span>
                  <span>Prazo: {fmtData(ex.prazoFinal)}</span>
                  {ex.dataCumprimento && <span className="text-emerald-600">Cumprida: {fmtData(ex.dataCumprimento)}</span>}
                </div>
                {ex.observacoes && <p className="text-[10px] text-[var(--text-3)] italic">Obs: {ex.observacoes}</p>}
                {aberta && (
                  <div className="flex gap-1.5 pt-1">
                    {ex.status === 'pendente' && (
                      <button
                        onClick={() => onUpdateExigencia(p.id, ex.id, { status: 'em_cumprimento' })}
                        className="text-[9px] bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded hover:bg-amber-100 transition cursor-pointer"
                      >
                        Iniciar Cumprimento
                      </button>
                    )}
                    <button
                      onClick={() => onUpdateExigencia(p.id, ex.id, { status: 'cumprida' })}
                      className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Marcar Cumprida
                    </button>
                    <button
                      onClick={() => onUpdateExigencia(p.id, ex.id, { status: 'reprotocolada' })}
                      className="text-[9px] bg-[var(--bg)] border border-[var(--border)] text-[var(--text-2)] font-bold px-2 py-0.5 rounded hover:bg-[var(--surface-2)] transition cursor-pointer"
                    >
                      Reprotocolar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
