import React from 'react';
import { Search, Plus, Menu, Download, X } from 'lucide-react';
import { TIPOS_PROCESSO } from '../data/fases';
import { TiposProcessoMap } from '../lib/localCache';

interface HeaderBarProps {
  abaAtiva: string;
  tiposProcesso: TiposProcessoMap;
  filtroBusca: string;
  onChangeBusca: (valor: string) => void;
  onOpenMobileSidebar: () => void;
  onDownloadShortcut: () => void;
  onNovoProcesso: () => void;
  /** Quando false (perfil visualizador), oculta o botão de criar processo. */
  podeCriar?: boolean;
}

const TITULOS: Record<string, string> = {
  painel: 'Painel Geral',
  processos: 'Diretório de Processos',
  alertas: 'Central de Riscos & Alertas',
  alarmes: 'Agendas de Lembretes',
  lixeira: 'Lixeira Corporativa',
  trilhas: 'Modelos de Trilhas & Processos',
  'controle-acesso': 'Controle de Acesso & Membros',
  relatorio: 'Relatório Gerencial',
};

const SUBTITULOS: Record<string, string> = {
  painel: 'Consolidação de faturamento societário, trâmites JUCESP e metas',
  processos: 'Filtro detalhado de deferimentos, certidões e viabilidades de prefeitura',
  alertas: 'Prazos excedidos, ausências de IE/alvarás e notificações sensíveis',
  alarmes: 'Próximos compromissos e alarmes vinculados às etapas',
  lixeira: 'Registros de processos em soft-delete por 30 dias para fins de conformidade',
  trilhas: 'Crie novas categorias de processos e personalize as etapas padrão das trilhas societárias',
  'controle-acesso': 'Gerencie cargos de acesso por e-mail, libere visualização ou controle permissões de gravação',
  relatorio: 'Resumo por tipo de processo com valores, atrasos e exigências — exportável em Excel',
};

export const HeaderBar: React.FC<HeaderBarProps> = ({
  abaAtiva, tiposProcesso, filtroBusca, onChangeBusca,
  onOpenMobileSidebar, onDownloadShortcut, onNovoProcesso,
  podeCriar = true,
}) => {
  const tituloCategoria = abaAtiva.startsWith('tipo:')
    ? `Categoria: ${(tiposProcesso && tiposProcesso[abaAtiva.split(':')[1]])?.label || TIPOS_PROCESSO[abaAtiva.split(':')[1]]?.label || abaAtiva.split(':')[1]}`
    : null;

  return (
    <header className="topbar bg-[var(--bg)] border-b border-[var(--border)] !h-auto !py-4 !px-6 flex-shrink-0 select-none">
      <div className="topbar-left min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="icon-btn lg:hidden !w-9 !h-9"
          aria-label="Abrir menu lateral"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg lg:text-xl font-bold tracking-tight text-[var(--text)] truncate">
            {tituloCategoria ?? TITULOS[abaAtiva] ?? ''}
          </h1>
          <p className="text-[11px] text-[var(--text-3)] truncate">
            {SUBTITULOS[abaAtiva] ?? ''}
          </p>
        </div>
      </div>

      <div className="topbar-right flex-shrink-0">
        {/* Busca */}
        <div className="search-wrap hidden md:flex !w-64">
          <Search className="h-[18px] w-[18px]" />
          <input
            id="search-bar"
            type="text"
            placeholder="Busca rápida (CNPJ, nome)..."
            value={filtroBusca}
            onChange={(e) => onChangeBusca(e.target.value)}
          />
          {filtroBusca ? (
            <button className="icon-btn !w-7 !h-7" onClick={() => onChangeBusca('')} title="Limpar" aria-label="Limpar busca">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-[9px] font-mono text-[var(--text-3)] border border-[var(--border)] rounded px-1 mr-1 select-none">ctrl k</span>
          )}
        </div>

        <button
          onClick={onDownloadShortcut}
          className="chip-btn"
          title="Baixar Atalho (.url) para Área de Trabalho"
        >
          <Download className="h-4 w-4" />
          <span className="hidden md:inline">Instalar Atalho Desktop</span>
        </button>

        {podeCriar && (
          <button
            onClick={onNovoProcesso}
            className="btn btn-primary !text-[13px] !px-4 !py-2"
          >
            <Plus className="h-4 w-4" /> Novo Processo
          </button>
        )}
      </div>
    </header>
  );
};
