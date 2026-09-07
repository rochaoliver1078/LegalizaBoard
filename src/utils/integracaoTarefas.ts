import { Processo } from '../types';
import { Tarefa } from '../types/tarefas';
import { checklistResolvido, fasesAtivas } from './helpers';

/**
 * Verifica se já existe uma tarefa vinculada àquele item específico de uma fase do processo.
 */
export function jaExisteTarefaParaItem(
  tarefasExistentes: Tarefa[],
  processoId: string,
  faseId: string,
  itemKey: string
): boolean {
  return tarefasExistentes.some(
    t => t.processoId === processoId && t.faseId === faseId && t.itemKey === itemKey
  );
}

/**
 * NÍVEL 1 — GERAÇÃO DE TAREFAS
 * Gera tarefas para as fases pendentes do processo de acordo com o mapeamento e prazos proporcionais.
 */
export function gerarTarefasDeProcesso(
  p: Processo,
  tarefasExistentes: Tarefa[]
): Tarefa[] {
  const ativas = fasesAtivas(p);
  const novasTarefas: Tarefa[] = [];

  // Calcular prazo estimado proporcional
  const numAtivas = ativas.length || 1;
  const duracaoTotal = Number(p.duracaoPrevista) || 30;
  const prazoFase = Math.round(duracaoTotal / numAtivas);

  // Calcular data de vencimento
  const dataVenc = new Date();
  dataVenc.setDate(dataVenc.getDate() + prazoFase);
  const dataVencStr = dataVenc.toISOString().slice(0, 10);

  const meuDia = prazoFase <= 2;

  // Mapeamento tipoProcesso → listaId
  const tipoToListaMap: Record<string, string> = {
    abertura: 'geral',
    alteracao: 'geral',
    baixa: 'geral',
    certidao: 'geral',
    regularizacao: 'geral'
  };

  for (const fase of ativas) {
    const items = checklistResolvido(p, fase.id);
    
    const trilha = fase.trilha || 'A';
    const respMap: Record<string, string> = { A: 'Rocha', B: 'Nicolly', C: 'Alexsander' };
    const responsavel = respMap[trilha] || 'Rocha';

    for (const item of items) {
      if (!jaExisteTarefaParaItem(tarefasExistentes, p.id, fase.id, item.key)) {
        const isItemChecked = !!p.fases[fase.id]?.checklist?.[item.key];
        const novaTarefa: Tarefa = {
          id: crypto.randomUUID(),
          titulo: `${p.razaoSocial || 'Processo'} - ${item.texto}`,
          listaId: tipoToListaMap[p.tipoProcesso] || 'geral',
          prioridade: 'alta',
          status: isItemChecked ? 'concluida' : 'pendente',
          dataVencimento: dataVencStr,
          responsavel,
          subTarefas: [],
          estrela: false,
          meuDia,
          criadoEm: new Date().toISOString(),
          processoId: p.id,
          processoNome: p.razaoSocial,
          tipoProcesso: p.tipoProcesso,
        };
        novaTarefa.faseId = fase.id;
        novaTarefa.itemKey = item.key;
        novasTarefas.push(novaTarefa);
      }
    }
  }

  return novasTarefas;
}

/**
 * Sentido TAREFA → PROCESSO
 * Só age se tarefa tiver faseId e itemKey.
 * Marca p.fases[faseId].checklist[itemKey] = (tarefa.status === 'concluida')
 * Recalcula se todos os itens estão concluídos para ajustar status da fase.
 */
export function aplicarConclusaoTarefaNoProcesso(
  p: Processo,
  tarefa: Tarefa
): Processo {
  const faseId = tarefa.faseId;
  const itemKey = tarefa.itemKey;

  if (!faseId || !itemKey) return p;

  const fases = { ...p.fases };
  if (!fases[faseId]) {
    fases[faseId] = { status: 'pending', checklist: {} };
  } else {
    fases[faseId] = {
      ...fases[faseId],
      checklist: { ...fases[faseId].checklist }
    };
  }

  const isChecked = tarefa.status === 'concluida';
  fases[faseId].checklist[itemKey] = isChecked;

  // Recalcula se TODOS os itens resolvidos da fase (checklistResolvido) estão concluídos
  const items = checklistResolvido(p, faseId);
  const checkedCount = items.filter(it => {
    if (it.key === itemKey) return isChecked;
    return !!fases[faseId].checklist[it.key];
  }).length;

  let newStatus: 'pending' | 'progress' | 'done' | 'na' = fases[faseId].status;
  if (items.length > 0) {
    if (checkedCount === items.length) {
      newStatus = 'done';
    } else if (checkedCount > 0) {
      newStatus = 'progress';
    } else {
      newStatus = 'pending';
    }
  }

  // Se o status mudou para 'done', podemos registrar ou mudar no objeto de fases
  fases[faseId].status = newStatus;

  return {
    ...p,
    fases,
    ultimaAtualizacao: new Date().toISOString().slice(0, 10)
  };
}

/**
 * Sentido PROCESSO → TAREFA
 * Encontra tarefas correspondentes ao itemKey da fase e atualiza status.
 */
export function sincronizarTarefasDoItem(
  tarefas: Tarefa[],
  processoId: string,
  faseId: string,
  itemKey: string,
  marcado: boolean
): Tarefa[] {
  return tarefas.map(t => {
    const tFaseId = t.faseId;
    const tItemKey = t.itemKey;

    if (t.processoId === processoId && tFaseId === faseId && tItemKey === itemKey) {
      return {
        ...t,
        status: marcado ? 'concluida' : 'pendente',
        concluidoEm: marcado ? new Date().toISOString() : undefined
      } as Tarefa;
    }
    return t;
  });
}

/**
 * NÍVEL 3 — ORQUESTRAÇÃO
 * Quando a fase entra em 'progress', cria tarefas pendentes com prazo, responsável e Meu Dia.
 * Quando vira 'done' ou 'na', conclui todas as tarefas vinculadas à fase.
 */
export function orquestrarTarefasPorFase(
  p: Processo,
  faseId: string,
  novoStatus: 'pending' | 'progress' | 'done' | 'na',
  tarefasExistentes: Tarefa[]
): { criar: Tarefa[]; atualizar: Tarefa[] } {
  const criar: Tarefa[] = [];
  const atualizar: Tarefa[] = [];

  const ativas = fasesAtivas(p);
  const faseObj = ativas.find(f => f.id === faseId);
  if (!faseObj) return { criar, atualizar };

  if (novoStatus === 'progress') {
    const items = checklistResolvido(p, faseId);
    
    // Calcular prazo estimado proporcional
    const numAtivas = ativas.length || 1;
    const duracaoTotal = Number(p.duracaoPrevista) || 30;
    const prazoFase = Math.round(duracaoTotal / numAtivas);

    // Calcular data de vencimento
    const dataVenc = new Date();
    dataVenc.setDate(dataVenc.getDate() + prazoFase);
    const dataVencStr = dataVenc.toISOString().slice(0, 10);

    // meuDia = true se vence em até 48h (prazoFase <= 2)
    const meuDia = prazoFase <= 2;

    // responsavel pela trilha da fase (A→Rocha, B→Nicolly, C→Alexsander)
    const trilha = faseObj.trilha || 'A';
    const respMap: Record<string, string> = { A: 'Rocha', B: 'Nicolly', C: 'Alexsander' };
    const responsavel = respMap[trilha] || 'Rocha';

    for (const item of items) {
      const isItemChecked = !!p.fases[faseId]?.checklist?.[item.key];
      if (isItemChecked) continue;

      const jaExiste = tarefasExistentes.some(
        t => t.processoId === p.id && t.faseId === faseId && t.itemKey === item.key
      );

      if (!jaExiste) {
        const novaTarefa: Tarefa = {
          id: crypto.randomUUID(),
          titulo: `${p.razaoSocial || 'Processo'} - ${item.texto}`,
          listaId: 'geral',
          prioridade: 'alta',
          status: 'pendente',
          dataVencimento: dataVencStr,
          responsavel,
          subTarefas: [],
          estrela: false,
          meuDia,
          criadoEm: new Date().toISOString(),
          processoId: p.id,
          processoNome: p.razaoSocial,
          tipoProcesso: p.tipoProcesso,
        };
        novaTarefa.faseId = faseId;
        novaTarefa.itemKey = item.key;
        criar.push(novaTarefa);
      }
    }
  } else if (novoStatus === 'done' || novoStatus === 'na') {
    const tarefasFase = tarefasExistentes.filter(
      t => t.processoId === p.id && t.faseId === faseId
    );

    for (const t of tarefasFase) {
      if (t.status !== 'concluida') {
        atualizar.push({
          ...t,
          status: 'concluida',
          concluidoEm: new Date().toISOString()
        });
      }
    }
  }

  return { criar, atualizar };
}
