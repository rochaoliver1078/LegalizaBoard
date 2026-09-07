import React, { useState } from 'react';
import { Processo, ProcessoTipo, Alarme, HistoricoItem } from '../types';
import { novaEntradaHistorico } from '../utils/helpers';
import { FASE_MODELOS, TIPOS_PROCESSO } from '../data/fases';
import { TiposProcessoMap, FaseModelosMap } from '../lib/localCache';
import { mascaraDocumento, mascaraCPF, apenasDigitos, validarDocumento, validarCPF } from '../utils/documentos';
import { consultarCNPJ, DadosCnpj } from '../lib/consultaCnpj';
import { Search, Loader2, ChevronDown, ChevronUp, AlertCircle, Users, MapPin } from 'lucide-react';

interface NovoProcessoModalProps {
  aberto: boolean;
  onClose: () => void;
  onCreate: (processo: Processo) => void;
  tiposProcesso: TiposProcessoMap;
  faseModelos: FaseModelosMap;
  responsavelPadrao: string;
  showToast: (msg: string, isError?: boolean) => void;
}

interface FormNovoProcesso {
  razaoSocial: string;
  documento: string;
  cpfResponsavel: string;
  cnaes: string;
  responsavelLegal: string;
  solicitante: string;
  valorProcesso: number;
  duracaoPrevista: number;
  tipo: ProcessoTipo;
  exigirEtapasCompletas: boolean;
  orquestracaoAtiva: boolean;
}

const FORM_INICIAL: FormNovoProcesso = {
  razaoSocial: '',
  documento: '',
  cpfResponsavel: '',
  cnaes: '',
  responsavelLegal: '',
  solicitante: '',
  valorProcesso: 1200,
  duracaoPrevista: 30,
  tipo: 'abertura',
  exigirEtapasCompletas: false,
  orquestracaoAtiva: true,
};

/** Modal de criação de processo com consulta pública de CNPJ e instanciação de alarmes/fases da trilha. */
export const NovoProcessoModal: React.FC<NovoProcessoModalProps> = ({
  aberto, onClose, onCreate, tiposProcesso, faseModelos, responsavelPadrao, showToast,
}) => {
  const [novoProcesso, setNovoProcesso] = useState<FormNovoProcesso>(FORM_INICIAL);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [dadosCnpj, setDadosCnpj] = useState<DadosCnpj | null>(null);
  const [cardAberto, setCardAberto] = useState(false);
  // Campos que o usuário digitou manualmente — não são sobrescritos sem confirmação
  const [camposEditados, setCamposEditados] = useState<Set<'razaoSocial' | 'cnaes'>>(new Set());
  const [consultaFeita, setConsultaFeita] = useState(false);

  if (!aberto) return null;

  const docDigitos = apenasDigitos(novoProcesso.documento);
  const documentoValido = validarDocumento(novoProcesso.documento);
  const cpfValido = novoProcesso.cpfResponsavel.trim() === '' || validarCPF(novoProcesso.cpfResponsavel);
  const cnpjCompleto = docDigitos.length === 14 && documentoValido;

  const marcarEditado = (campo: 'razaoSocial' | 'cnaes') => {
    setCamposEditados(prev => {
      if (prev.has(campo)) return prev;
      const next = new Set(prev);
      next.add(campo);
      return next;
    });
  };

  const handleConsultarCnpj = async () => {
    if (!cnpjCompleto) {
      showToast('Informe um CNPJ válido de 14 dígitos para consultar a Receita.', true);
      return;
    }
    setLoadingCnpj(true);
    const dados = await consultarCNPJ(novoProcesso.documento);
    setLoadingCnpj(false);

    if (!dados) {
      showToast('Não foi possível consultar o CNPJ (indisponível ou inexistente).', true);
      return;
    }

    setDadosCnpj(dados);
    setCardAberto(true);
    setConsultaFeita(true);

    // Pré-preenche apenas campos ainda não editados manualmente
    setNovoProcesso(prev => {
      const razaoEditada = camposEditados.has('razaoSocial') && prev.razaoSocial.trim() !== '';
      const cnaesEditado = camposEditados.has('cnaes') && prev.cnaes.trim() !== '';
      const cnaeStr = dados.cnaeFiscal
        ? `${dados.cnaeFiscal}${dados.cnaeDescricao ? ' — ' + dados.cnaeDescricao : ''}`
        : prev.cnaes;
      return {
        ...prev,
        razaoSocial: razaoEditada ? prev.razaoSocial : (dados.razaoSocial || dados.nomeFantasia || prev.razaoSocial),
        cnaes: cnaesEditado ? prev.cnaes : cnaeStr,
      };
    });

    const sobrescritos = [
      camposEditados.has('razaoSocial') ? null : 'Razão Social',
      camposEditados.has('cnaes') ? null : 'CNAE',
    ].filter(Boolean);
    showToast(
      sobrescritos.length > 0
        ? `Dados da Receita carregados (${sobrescritos.join(', ')} pré-preenchido).`
        : 'Dados da Receita carregados para conferência.',
    );
  };

  const handleCreateNovoProcesso = () => {
    if (!novoProcesso.razaoSocial.trim()) {
      showToast('Por favor, informe a Razão Social ou Nome do Cliente!', true);
      return;
    }
    if (!documentoValido) {
      showToast('CNPJ/CPF inválido — verifique os dígitos verificadores.', true);
      return;
    }
    if (!cpfValido) {
      showToast('CPF do responsável inválido — verifique os dígitos verificadores.', true);
      return;
    }

    const defaultFases: Record<string, { status: 'pending' | 'progress' | 'done' | 'na'; checklist: Record<string, boolean> }> = {};
    const baseModelList = (faseModelos && faseModelos[novoProcesso.tipo]) || FASE_MODELOS[novoProcesso.tipo] || [];
    defaultFases[baseModelList[0]?.id] = {
      status: 'progress',
      checklist: {}
    };
    baseModelList.forEach((f, idx) => {
      if (idx > 0) {
        defaultFases[f.id] = {
          status: 'pending',
          checklist: {}
        };
      }
    });

    const alarmesInstanciados: Alarme[] = [];
    const addDays = (baseDateStr: string, days: number): string => {
      const d = new Date(baseDateStr + 'T09:00:00');
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 16);
    };

    type FaseModeloExt = (typeof baseModelList)[number] & {
      alarmesEtapa?: Array<{ titulo: string; diasOffset: number }>;
      alarmesTarefas?: Array<{ titulo: string; diasOffset: number; tarefaText: string }>;
    };

    baseModelList.forEach((f) => {
      const fx = f as FaseModeloExt;
      // 1. Stage alarms
      if (fx.alarmesEtapa && Array.isArray(fx.alarmesEtapa)) {
        fx.alarmesEtapa.forEach((ae) => {
          alarmesInstanciados.push({
            id: 'alm_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            faseId: f.id,
            titulo: ae.titulo,
            dataHora: addDays(new Date().toISOString().slice(0, 10), ae.diasOffset),
            concluido: false,
            criadoEm: new Date().toISOString().slice(0, 10)
          });
        });
      }
      // 2. Task alarms
      if (fx.alarmesTarefas && Array.isArray(fx.alarmesTarefas)) {
        fx.alarmesTarefas.forEach((at) => {
          if (f.checklist.includes(at.tarefaText)) {
            alarmesInstanciados.push({
              id: 'alm_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
              faseId: f.id,
              titulo: at.titulo,
              dataHora: addDays(new Date().toISOString().slice(0, 10), at.diasOffset),
              concluido: false,
              criadoEm: new Date().toISOString().slice(0, 10)
            });
          }
        });
      }
    });

    const historico: HistoricoItem[] = [
      novaEntradaHistorico('Processo societário criado com etapas templates e alarmes integrados.')
    ];
    if (consultaFeita) {
      historico.push(novaEntradaHistorico('Dados pré-preenchidos via consulta pública de CNPJ (BrasilAPI)'));
    }

    const created: Processo = {
      id: 'p_' + Date.now(),
      razaoSocial: novoProcesso.razaoSocial.trim(),
      documento: novoProcesso.documento.trim(),
      cpfResponsavel: novoProcesso.cpfResponsavel.trim() || undefined,
      solicitante: novoProcesso.solicitante.trim() || 'Equipe Interna',
      responsavelLegal: novoProcesso.responsavelLegal,
      tipoProcesso: novoProcesso.tipo,
      tipoSocietario: 'LTDA',
      regimeTributario: 'Simples Nacional',
      valorProcesso: Number(novoProcesso.valorProcesso) || 0,
      inicio: new Date().toISOString().slice(0, 10),
      duracaoPrevista: Number(novoProcesso.duracaoPrevista) || 30,
      cnaes: novoProcesso.cnaes.trim(),
      mudaEnderecoOuObjeto: false,
      trocaAdministrador: false,
      altoRisco: false,
      exigeLicencaAmbiental: false,
      fases: defaultFases,
      alarmes: alarmesInstanciados,
      exigirEtapasCompletas: novoProcesso.exigirEtapasCompletas,
      orquestracaoAtiva: novoProcesso.orquestracaoAtiva,
      finalizado: false,
      ultimaAtualizacao: new Date().toISOString().slice(0, 10),
      historico,
    };

    onCreate(created);

    // reset form and state
    setNovoProcesso({ ...FORM_INICIAL, responsavelLegal: responsavelPadrao });
    setDadosCnpj(null);
    setCardAberto(false);
    setCamposEditados(new Set());
    setConsultaFeita(false);
    showToast('Novo processo registrado!');
  };

  const inputBorda = (valido: boolean) =>
    valido ? 'border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]/30' : 'border-red-400 focus:border-red-500 focus:ring-red-200';

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-3)] hover:text-[var(--text)]"
        >
          ✕
        </button>

        <h3 className="font-sans text-lg font-bold text-[var(--text)] border-b border-[var(--border)] pb-2 mb-4">Novo Fluxo Societário</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Tipo de Processo (Trilha)</label>
            <select
              value={novoProcesso.tipo}
              onChange={(e) => setNovoProcesso({ ...novoProcesso, tipo: e.target.value as ProcessoTipo })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
            >
              {(Object.entries((tiposProcesso && Object.keys(tiposProcesso).length > 0) ? tiposProcesso : TIPOS_PROCESSO) as Array<[string, { label: string; color: string; wash: string; icon: string }]>).map(([id, t]) => (
                <option key={id} value={id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Razão Social / Cliente</label>
              <input
                type="text"
                placeholder="Ex: SILVA COMÉRCIO ALIMENTOS"
                value={novoProcesso.razaoSocial}
                onChange={(e) => { marcarEditado('razaoSocial'); setNovoProcesso({ ...novoProcesso, razaoSocial: e.target.value }); }}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">CNPJ / CPF</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 00.000.000/0001-00"
                  value={novoProcesso.documento}
                  onChange={(e) => setNovoProcesso({ ...novoProcesso, documento: mascaraDocumento(e.target.value) })}
                  className={`flex-1 bg-[var(--bg)] border p-2.5 rounded-lg text-xs focus:outline-none focus:ring-2 ${inputBorda(documentoValido)}`}
                />
                {cnpjCompleto && (
                  <button
                    type="button"
                    disabled={loadingCnpj}
                    onClick={handleConsultarCnpj}
                    className="bg-red-50 border border-red-200 text-[var(--primary)] px-2.5 rounded-lg text-[10px] font-bold hover:bg-red-100 transition whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Buscar dados cadastrais na Receita (BrasilAPI)"
                  >
                    {loadingCnpj ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                    {loadingCnpj ? 'Buscando' : 'Buscar na Receita'}
                  </button>
                )}
              </div>
              {!documentoValido && (
                <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Documento inválido (dígito verificador não confere).
                </p>
              )}
            </div>
          </div>

          {/* Card de conferência da Receita (QSA + endereço) */}
          {dadosCnpj && (
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setCardAberto(!cardAberto)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100/50 transition"
              >
                <span className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" /> Dados da Receita — conferência
                  {dadosCnpj.situacaoCadastral && (
                    <span className="ml-1 font-mono text-[9px] bg-[var(--surface)] border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-700">
                      {dadosCnpj.situacaoCadastral}
                    </span>
                  )}
                </span>
                {cardAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {cardAberto && (
                <div className="px-3 pb-3 space-y-2.5 text-[11px] text-[var(--text-2)]">
                  {dadosCnpj.nomeFantasia && (
                    <p><span className="text-[var(--text-3)]">Nome fantasia:</span> <strong>{dadosCnpj.nomeFantasia}</strong></p>
                  )}
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[var(--text-3)] mt-0.5 shrink-0" />
                    <span>
                      {[dadosCnpj.logradouro, dadosCnpj.numero].filter(Boolean).join(', ')}
                      {(dadosCnpj.municipio || dadosCnpj.uf) && ` — ${dadosCnpj.municipio}/${dadosCnpj.uf}`}
                      {!dadosCnpj.logradouro && !dadosCnpj.municipio && 'Endereço não informado'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[var(--text-3)] mb-1">
                      <Users className="h-3.5 w-3.5" /> Quadro societário (QSA)
                    </div>
                    {dadosCnpj.qsa.length === 0 ? (
                      <p className="text-[var(--text-3)] pl-5">Nenhum sócio retornado.</p>
                    ) : (
                      <ul className="pl-5 space-y-0.5 list-disc">
                        {dadosCnpj.qsa.map((s, i) => (
                          <li key={i}><strong>{s.nome}</strong>{s.qualificacao ? ` — ${s.qualificacao}` : ''}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Solicitante</label>
              <input
                type="text"
                placeholder="Ex: Mariana Soluções"
                value={novoProcesso.solicitante}
                onChange={(e) => setNovoProcesso({ ...novoProcesso, solicitante: e.target.value })}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Responsável Técnico</label>
              <input
                type="text"
                placeholder="Ex: nome do responsável legal"
                value={novoProcesso.responsavelLegal}
                onChange={(e) => setNovoProcesso({ ...novoProcesso, responsavelLegal: e.target.value })}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">CPF do Responsável</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 000.000.000-00"
                value={novoProcesso.cpfResponsavel}
                onChange={(e) => setNovoProcesso({ ...novoProcesso, cpfResponsavel: mascaraCPF(e.target.value) })}
                className={`w-full bg-[var(--bg)] border p-2.5 rounded-lg text-xs focus:outline-none focus:ring-2 ${inputBorda(cpfValido)}`}
              />
              {!cpfValido && (
                <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> CPF inválido.
                </p>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">CNAE(s)</label>
              <input
                type="text"
                placeholder="Ex: 4712-1/00 — Comércio varejista"
                value={novoProcesso.cnaes}
                onChange={(e) => { marcarEditado('cnaes'); setNovoProcesso({ ...novoProcesso, cnaes: e.target.value }); }}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Honorário Estimado (R$)</label>
              <input
                type="number"
                placeholder="Honorários"
                value={novoProcesso.valorProcesso}
                onChange={(e) => setNovoProcesso({ ...novoProcesso, valorProcesso: Number(e.target.value) || 0 })}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-1">Duração Prevista (dias)</label>
              <input
                type="number"
                placeholder="Número de dias"
                value={novoProcesso.duracaoPrevista}
                onChange={(e) => setNovoProcesso({ ...novoProcesso, duracaoPrevista: Number(e.target.value) || 30 })}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2.5 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
          </div>

          {/* Step Gating Option */}
          <div className="p-3.5 bg-blue-50/55 rounded-xl border border-blue-100 flex items-start gap-2.5 select-none my-1">
            <input
              type="checkbox"
              id="modal-gating-cb"
              checked={novoProcesso.exigirEtapasCompletas}
              onChange={(e) => setNovoProcesso({ ...novoProcesso, exigirEtapasCompletas: e.target.checked })}
              className="rounded text-[var(--primary)] focus:ring-red-300 mt-0.5"
            />
            <label htmlFor="modal-gating-cb" className="text-xs text-[var(--text-2)] cursor-pointer text-[11px] leading-tight flex-1">
              <span className="font-bold text-[var(--text)] block">Exigir checklist completo antes de avançar</span>
              O sistema de conformidade legal bloqueará trâmites de fases caso hajam pendências de documentação penduradas na etapa ativa.
            </label>
          </div>

          {/* Task Orchestration Option */}
          <div className="p-3.5 bg-blue-50/55 rounded-xl border border-blue-100 flex items-start gap-2.5 select-none my-1">
            <input
              type="checkbox"
              id="modal-orchestration-cb"
              checked={novoProcesso.orquestracaoAtiva}
              onChange={(e) => setNovoProcesso({ ...novoProcesso, orquestracaoAtiva: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-300 mt-0.5"
            />
            <label htmlFor="modal-orchestration-cb" className="text-xs text-[var(--text-2)] cursor-pointer text-[11px] leading-tight flex-1">
              <span className="font-bold text-[var(--text)] block">Automatizar tarefas por fase (Orquestração)</span>
              Ao entrar em uma etapa, o sistema criará e agendará tarefas automaticamente para cada membro da equipe.
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <button
            onClick={onClose}
            className="text-xs bg-[var(--surface)] border text-[var(--text-2)] font-semibold py-2 px-4 rounded-lg hover:bg-[var(--bg)] transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateNovoProcesso}
            className="text-xs bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold py-2 px-5 rounded-lg transition"
          >
            Iniciar Trâmite de Fases
          </button>
        </div>
      </div>
    </div>
  );
};
