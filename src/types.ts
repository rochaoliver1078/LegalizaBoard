export type ProcessoTipo = string;

export type ColunaKanban =
  | 'aguardando_cliente'
  | 'elaboracao'
  | 'protocolado'
  | 'aguardando_deferimento'
  | 'pos_aprovacao'
  | 'concluido';

export interface Fase {
  id: string;
  nome: string;
  meta: string;
  checklist: string[];
  coluna: ColunaKanban;           // NOVO — obrigatório
  trilha: 'A' | 'B' | 'C';       // NOVO — obrigatório
  condicional?: (p: Processo) => boolean;
  extra?: boolean;
  alarmesEtapa?: Array<{ id: string; titulo: string; diasOffset: number }>;
  alarmesTarefas?: Array<{ id: string; tarefaText: string; titulo: string; diasOffset: number }>;
}

export interface HistoricoItem {
  data: string;   // ISO — data (legado YYYY-MM-DD) ou data-hora completa
  texto: string;
  autorEmail?: string;
  autorNome?: string;
}

export interface Alarme {
  id: string;
  faseId: string;
  titulo: string;
  dataHora: string;
  concluido: boolean;
  criadoEm: string;
}

export interface FaseExtras {
  id: string;
  nome: string;
  meta: string;
  checklist: string[];
  coluna?: ColunaKanban;
  trilha?: 'A' | 'B' | 'C';
}

export interface ChecklistCustom {
  removidos: number[];          // index of base item that was removed
  renomeados: Record<number, string>; // base index -> new name
  adicionados: string[];        // array of added strings
}

export interface DocumentoAnexo {
  id: string;
  faseId: string;
  itemKey: string;
  nomeArquivo: string;
  tamanho: string;
  dataUpload: string;
  /** Path no bucket 'anexos' do Supabase Storage. */
  storagePath?: string;
  /** Legado: anexos antigos gravados como DataURL base64 (somente leitura). */
  conteudoUrl?: string;
}

export type ExigenciaStatus = 'pendente' | 'em_cumprimento' | 'cumprida' | 'reprotocolada';

/**
 * Exigência da JUCESP: apontamento com fundamento legal que deve ser
 * cumprido em até 30 dias corridos, sob pena de perda do protocolo.
 */
export interface Exigencia {
  id: string;
  dataExigencia: string;   // YYYY-MM-DD
  prazoFinal: string;      // YYYY-MM-DD — auto: dataExigencia + 30 dias corridos (editável)
  fundamentoLegal: string;
  descricao: string;
  status: ExigenciaStatus;
  dataCumprimento?: string;
  observacoes?: string;
}

export interface Processo {
  id: string;
  protocoloJucesp?: string;
  exigencias?: Exigencia[];
  razaoSocial: string;
  documento: string;
  nire?: string;
  solicitante: string;
  responsavelLegal: string;
  cpfResponsavel?: string;
  whatsapp?: string;
  email?: string;
  tipoProcesso: ProcessoTipo;
  tipoSocietario: string;
  regimeTributario: string;
  valorProcesso: number;
  inicio: string; // YYYY-MM-DD
  duracaoPrevista: number; // days
  cnaes: string;
  mudaEnderecoOuObjeto: boolean;
  trocaAdministrador: boolean;
  altoRisco: boolean;
  exigeLicencaAmbiental: boolean;
  finalidadeAta?: string;
  geraAlteracaoContratual?: boolean;
  impactaCnpj?: boolean;
  possuiIE?: boolean;
  fases: Record<string, {
    status: 'pending' | 'progress' | 'done' | 'na';
    checklist: Record<string, boolean>;
  }>;
  fasesExtras?: FaseExtras[];
  fasesRemovidas?: string[];
  checklistCustom?: Record<string, ChecklistCustom>;
  alarmes?: Alarme[];
  anexos?: DocumentoAnexo[];
  exigirEtapasCompletas?: boolean;
  orquestracaoAtiva?: boolean;
  finalizado: boolean;
  dataFinalizacao?: string;
  ultimaAtualizacao: string;
  historico: HistoricoItem[];
  deletado?: boolean;
  dataDelecao?: string;
  colunaManual?: ColunaKanban;
}

export interface UserProfile {
  nome: string;
  crc: string;
  email?: string;
}

// Papéis alinhados com o CHECK constraint de workspace_members no banco.
// A segurança real está nas policies RLS; aqui é só UX.
export type UserRole = 'admin' | 'editor' | 'visualizador';

export interface WorkspaceMemberInfo {
  userId: string;
  email: string | null;
  role: UserRole;
  createdAt: string | null;
}

export interface ConvitePendente {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string | null;
}

export interface LgpdConsent {
  aceito: boolean;
  dataHora?: string;
  ipSimulado?: string;
}
