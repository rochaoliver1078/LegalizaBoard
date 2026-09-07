import React, { useState } from 'react';
import { LgpdConsent, Processo } from '../types';
import { Shield, Check, Landmark, Download, ArrowRight } from 'lucide-react';

interface LgpdConsentModalProps {
  consent: LgpdConsent;
  onAccept: (consent: LgpdConsent) => void;
  processos: Processo[];
  onClose?: () => void;
  forcingView?: boolean;
}

export const LgpdConsentModal: React.FC<LgpdConsentModalProps> = ({
  consent,
  onAccept,
  processos,
  onClose,
  forcingView = false
}) => {
  const [showFullTerms, setShowFullTerms] = useState(false);

  const handleAcceptConsent = () => {
    onAccept({
      aceito: true,
      dataHora: new Date().toLocaleString('pt-BR'),
      ipSimulado: '189.124.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255)
    });
  };

  const handleExportDataForPortability = () => {
    // Portabilidade LGPD (Art 18) - export active processes as JSON
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(processos, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `portabilidade_lgpd_socio_legalizaboard_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // If already consented and we are not forcing a view, do not display full block overlay
  if (consent.aceito && !forcingView) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {onClose && consent.aceito && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--text-3)] hover:text-[var(--text)] font-bold"
          >
            ✕
          </button>
        )}

        {/* Top Header */}
        <div className="flex items-center gap-3 mb-4 select-none">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-sans text-lg font-bold text-[var(--text)] leading-tight">Consentimento e Transparência LGPD</h3>
            <span className="text-[10px] text-[var(--primary)] font-semibold tracking-wide uppercase">Lei Geral de Proteção de Dados (Lei nº 13.709/18)</span>
          </div>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto pr-1 text-xs text-[var(--text-2)] space-y-4">
          
          <div className="p-4 bg-[var(--bg)] rounded-xl border border-[var(--border)] space-y-2 select-none">
            <p className="font-sans font-semibold text-[var(--text)] flex items-center gap-1">
              <Landmark className="h-4 w-4 text-[var(--primary)]" /> Declaração de Tratamento de Dados Pessoais
            </p>
            <p className="leading-relaxed">
              Como prestador de consultoria e legalização tributária no estado de São Paulo, o escritório 
              <b> LegalizaBoard</b> processa dados sensíveis (CNPJ, CPF, dados de sócios, endereços e certidões governamentais).
            </p>
            <p className="leading-relaxed text-[11px] text-[var(--text-3)]">
              Utilizamos esses dados exclusivamente para protocolo de viabilidades, solicitações de alvará fáceis, elaborações de contratos societários e registros junto à JUCESP, postos fiscais SEFAZ e prefeituras.
            </p>
          </div>

          {!showFullTerms ? (
            <div className="space-y-3">
              <h4 className="font-bold text-[var(--text)]">Seus Direitos Corporativos (Art. 18):</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Confirmação e Acesso:</b> Obter relatórios e conferir quais sócios estão cadastrados no escritório.</li>
                <li><b>Portabilidade de Informações:</b> Exportar o cadastro em formato estruturado (JSON/CSV).</li>
                <li><b>Exclusão / Purga de Dados:</b> Exercer o direito ao esquecimento após a conclusão ou purga do contrato societário.</li>
                <li><b>Encarregado de Dados (DPO):</b> contato direto via email <span className="font-semibold text-[var(--text)]">dpo@legalizaboard.com.br</span>.</li>
              </ul>
              
              <button 
                onClick={() => setShowFullTerms(true)}
                className="text-[var(--primary)] hover:underline font-semibold flex items-center gap-1 text-left"
              >
                Ler Política de Privacidade completa e Termos de Uso <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3 bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)] text-[11px] leading-relaxed select-all">
              <h4 className="font-bold text-[var(--text)]">TERMOS DE SERVIÇOS DO PORTAL</h4>
              <p><b>1. OBJETO:</b> Ferramenta destinada exclusivamente à equipe interna e parceiros integrados para organizar fluxos societários, datas de início de atividade, licenciamento COVISA e certidões governamentais.</p>
              <p><b>2. SEGURANÇA E PII:</b> Senhas de CCM e e-CNPJ devem ser codificadas e mantidas restritas à equipe credenciada pela LegalizaBoard.</p>
              <p><b>3. RETENÇÃO:</b> Conforme o Art. 16 da LGPD, os termos são mantidos pelo período necessário para cumprimento de obrigações legais fiscais (prazo de 5 anos para fins tributários).</p>
              <button 
                onClick={() => setShowFullTerms(false)}
                className="text-[var(--text-3)] hover:text-black font-semibold mt-1 inline-block"
              >
                ← Voltar aos direitos rápidos
              </button>
            </div>
          )}

          {consent.aceito ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-850 space-y-1 select-none text-[11.5px]">
              <div className="font-bold flex items-center gap-1 text-emerald-800"><Check className="h-4 w-4 text-emerald-600" /> Termo Aceito e Registrado</div>
              <div>Gravação de consentimento efetuada: <span className="font-mono font-semibold">{consent.dataHora}</span></div>
              <div>Endereço de IP Registrado: <span className="font-mono font-semibold">{consent.ipSimulado}</span></div>
              <div className="text-[var(--text-3)] text-[10px] mt-2 leading-tight">
                Esse registro serve como comprovação formal de que o escritório está credenciado e seus titulares consentiram com o tratamento de dados pessoais no sistema.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-850 text-[11px]">
              <b>Atenção:</b> ao clicar em "Entrar e Confirmar Consentimento", você atesta em nome de sua organização o aceite dos termos e autorização operacional para armazenamento em banco de dados privado.
            </div>
          )}
        </div>

        {/* Actions Bottom Bar */}
        <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-wrap justify-between items-center gap-3">
          
          <button 
            type="button"
            onClick={handleExportDataForPortability}
            className="flex items-center gap-1 text-[11px] text-[var(--text-2)] hover:text-[var(--text)] border border-slate-350 rounded-lg px-2.5 py-1.5 bg-[var(--surface)] font-medium"
            title="Exportação de dados para portabilidade (JSON)"
          >
            <Download className="h-3.5 w-3.5" /> Portabilidade LGPD (Exportar JSON)
          </button>

          {!consent.aceito ? (
            <button 
              onClick={handleAcceptConsent}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-5 rounded-lg transition"
            >
              Entrar e Confirmar Consentimento
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs py-2 px-5 rounded-lg transition"
            >
              Ciente / Confirmar
            </button>
          )}

        </div>

      </div>
    </div>
  );
};
