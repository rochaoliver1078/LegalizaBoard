import { ListaTarefas } from '../types/tarefas';

export const LISTAS_PADRAO: ListaTarefas[] = [
  { id: 'abertura',             nome: 'Abertura',
    cor: '#B22234', ordem: 1 },
  { id: 'alteracao_contratual', nome: 'Alteração Contratual',
    cor: '#1C6E8C', ordem: 2 },
  { id: 'baixa',                nome: 'Baixa / Encerramento',
    cor: '#6D4C9C', ordem: 3 },
  { id: 'licenciamento',        nome: 'Licenciamento',
    cor: '#3F7D4F', ordem: 4 },
  { id: 'registro_ata',         nome: 'Registro de Ata',
    cor: '#9C7A3C', ordem: 5 },
  { id: 'transformacao',        nome: 'Transformação',
    cor: '#B8842A', ordem: 6 },
  { id: 'geral',                nome: 'Geral',
    cor: '#94A3B8', ordem: 7 },
];
