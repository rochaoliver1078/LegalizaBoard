export type TarefaPrioridade = 'alta' | 'media' | 'normal';
export type TarefaStatus = 'pendente' | 'andamento' | 'concluida';

export interface SubTarefa {
  id: string;
  texto: string;
  concluida: boolean;
}

export interface Tarefa {
  id: string;
  titulo: string;
  anotacao?: string;
  processoId?: string;      // vínculo com processo existente
  processoNome?: string;    // cache do nome para exibição rápida
  tipoProcesso?: string;    // cache do tipo (abertura, alteracao etc)
  listaId: string;          // qual lista pertence
  faseId?: string;          // id da fase vinculada
  itemKey?: string;         // chave do item de checklist vinculado
  origem?: string;          // origem da tarefa (ex: 'manual' ou 'fase')
  prioridade: TarefaPrioridade;
  status: TarefaStatus;
  dataVencimento?: string;  // YYYY-MM-DD
  responsavel?: string;     // 'Rocha' | 'Nicolly' | 'Alexsander'
  subTarefas: SubTarefa[];
  estrela: boolean;         // favorito / importante
  meuDia: boolean;          // adicionado a Meu Dia
  criadoEm: string;
  concluidoEm?: string;
  repetir?: 'diario' | 'semanal' | 'mensal' | null;
  arquivo?: string;         // nome do arquivo anexado (mock)
}

export interface ListaTarefas {
  id: string;
  nome: string;
  cor: string;              // hex color
  icone?: string;           // emoji ou lucide icon name
  ordem: number;
}
