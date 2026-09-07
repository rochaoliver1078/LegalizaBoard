import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Processo } from '../types';
import {
  fmtMoeda,
  fmtData,
  fmtDataHora,
  iniciais,
  diasEmAberto,
  estaAtrasado,
  diasRestantes,
  alarmeVencido,
  alarmeProximo,
  progressoProcesso,
  colunaKanban,
} from './helpers';

/**
 * Constrói um Processo válido mínimo para os testes, com todos os campos
 * obrigatórios preenchidos. Cada teste sobrescreve só o que precisa.
 */
function criarProcesso(overrides: Partial<Processo> = {}): Processo {
  return {
    id: 'proc-1',
    razaoSocial: 'Empresa Teste LTDA',
    documento: '00.000.000/0001-00',
    solicitante: 'Fulano de Tal',
    responsavelLegal: 'Fulano de Tal',
    // tipoProcesso propositalmente inexistente em FASE_MODELOS: assim os
    // testes de progresso/coluna ficam isolados dos dados reais de
    // src/data/fases.ts e controlam 100% via fasesExtras.
    tipoProcesso: 'tipo-inexistente-para-teste',
    tipoSocietario: 'LTDA',
    regimeTributario: 'Simples Nacional',
    valorProcesso: 0,
    inicio: '2026-01-01',
    duracaoPrevista: 30,
    cnaes: '',
    mudaEnderecoOuObjeto: false,
    trocaAdministrador: false,
    altoRisco: false,
    exigeLicencaAmbiental: false,
    fases: {},
    finalizado: false,
    ultimaAtualizacao: '2026-01-01T00:00:00.000Z',
    historico: [],
    ...overrides,
  };
}

describe('fmtMoeda', () => {
  it('formata valores em reais sem casas decimais', () => {
    expect(fmtMoeda(1500)).toBe('R$ 1.500');
  });

  it('trata zero/valores falsy como "R$ 0"', () => {
    expect(fmtMoeda(0)).toBe('R$ 0');
  });
});

describe('fmtData', () => {
  it('converte ISO (YYYY-MM-DD) para DD/MM/YYYY', () => {
    expect(fmtData('2026-03-05')).toBe('05/03/2026');
  });

  it('retorna "—" quando não há data', () => {
    expect(fmtData(undefined)).toBe('—');
  });

  it('devolve o valor original se não tiver o formato esperado', () => {
    expect(fmtData('não-é-uma-data')).toBe('não-é-uma-data');
  });
});

describe('fmtDataHora', () => {
  it('formata data-hora ISO para DD/MM/YYYY HH:mm', () => {
    expect(fmtDataHora('2026-03-05T14:30:00.000Z')).toMatch(/^\d{2}\/\d{2}\/2026 \d{2}:\d{2}$/);
  });

  it('retorna "—" para entrada inválida', () => {
    expect(fmtDataHora('não-é-uma-data')).toBe('—');
  });
});

describe('iniciais', () => {
  it('pega a primeira letra dos dois primeiros nomes', () => {
    expect(iniciais('Maria Clara Souza')).toBe('MC');
  });

  it('retorna "—" para nome vazio', () => {
    expect(iniciais('')).toBe('—');
  });
});

describe('datas e prazos (relógio fixo em 2026-06-15)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('diasEmAberto conta a partir do início até hoje quando não finalizado', () => {
    const p = criarProcesso({ inicio: '2026-06-05' });
    expect(diasEmAberto(p)).toBe(10);
  });

  it('diasEmAberto usa dataFinalizacao (não "hoje") quando o processo já foi finalizado', () => {
    const p = criarProcesso({
      inicio: '2026-01-01',
      finalizado: true,
      dataFinalizacao: '2026-01-11',
    });
    expect(diasEmAberto(p)).toBe(10);
  });

  it('estaAtrasado é true quando os dias em aberto passam da duração prevista', () => {
    const p = criarProcesso({ inicio: '2026-06-01', duracaoPrevista: 10 }); // 14 dias em aberto
    expect(estaAtrasado(p)).toBe(true);
  });

  it('estaAtrasado é false para processo finalizado, mesmo que tenha passado do prazo', () => {
    const p = criarProcesso({
      inicio: '2026-01-01',
      duracaoPrevista: 5,
      finalizado: true,
      dataFinalizacao: '2026-06-01',
    });
    expect(estaAtrasado(p)).toBe(false);
  });

  it('estaAtrasado é false para processo deletado (lixeira não conta como atrasado)', () => {
    const p = criarProcesso({ inicio: '2026-01-01', duracaoPrevista: 5, deletado: true });
    expect(estaAtrasado(p)).toBe(false);
  });

  it('diasRestantes é negativo quando o prazo já passou', () => {
    const p = criarProcesso({ inicio: '2026-06-01', duracaoPrevista: 10 }); // 14 dias em aberto
    expect(diasRestantes(p)).toBe(-4);
  });

  it('alarmeVencido é true para data no passado e alarme não concluído', () => {
    const alarme = { id: 'a1', faseId: 'f1', titulo: 'Teste', dataHora: '2026-06-01T00:00:00.000Z', concluido: false, criadoEm: '2026-01-01T00:00:00.000Z' };
    expect(alarmeVencido(alarme)).toBe(true);
  });

  it('alarmeVencido é false quando o alarme já foi concluído', () => {
    const alarme = { id: 'a1', faseId: 'f1', titulo: 'Teste', dataHora: '2026-06-01T00:00:00.000Z', concluido: true, criadoEm: '2026-01-01T00:00:00.000Z' };
    expect(alarmeVencido(alarme)).toBe(false);
  });

  it('alarmeProximo é true dentro da janela de horas configurada', () => {
    const alarme = { id: 'a1', faseId: 'f1', titulo: 'Teste', dataHora: '2026-06-16T00:00:00.000Z', concluido: false, criadoEm: '2026-01-01T00:00:00.000Z' };
    expect(alarmeProximo(alarme, 24)).toBe(true);
  });

  it('alarmeProximo é false fora da janela de horas configurada', () => {
    const alarme = { id: 'a1', faseId: 'f1', titulo: 'Teste', dataHora: '2026-06-20T00:00:00.000Z', concluido: false, criadoEm: '2026-01-01T00:00:00.000Z' };
    expect(alarmeProximo(alarme, 24)).toBe(false);
  });
});

describe('progressoProcesso', () => {
  it('calcula a porcentagem de fases concluídas entre as fases ativas', () => {
    const p = criarProcesso({
      fasesExtras: [
        { id: 'f1', nome: 'Fase 1', meta: '', checklist: [], coluna: 'elaboracao' },
        { id: 'f2', nome: 'Fase 2', meta: '', checklist: [], coluna: 'protocolado' },
      ],
      fases: {
        f1: { status: 'done', checklist: {} },
        f2: { status: 'pending', checklist: {} },
      },
    });
    expect(progressoProcesso(p)).toBe(50);
  });

  it('retorna 0 quando não há fases ativas', () => {
    const p = criarProcesso({ fasesExtras: [] });
    expect(progressoProcesso(p)).toBe(0);
  });
});

describe('colunaKanban', () => {
  it('processo finalizado sempre cai em "concluido"', () => {
    const p = criarProcesso({ finalizado: true });
    expect(colunaKanban(p)).toBe('concluido');
  });

  it('fica na primeira coluna cuja fase ainda não foi concluída', () => {
    const p = criarProcesso({
      fasesExtras: [
        { id: 'f1', nome: 'Fase 1', meta: '', checklist: [], coluna: 'aguardando_cliente' },
        { id: 'f2', nome: 'Fase 2', meta: '', checklist: [], coluna: 'elaboracao' },
      ],
      fases: {
        f1: { status: 'done', checklist: {} },
        f2: { status: 'pending', checklist: {} },
      },
    });
    expect(colunaKanban(p)).toBe('elaboracao');
  });

  it('respeita a coluna manual quando o usuário adiantou o card e as fases ainda não chegaram lá', () => {
    const p = criarProcesso({
      fasesExtras: [
        { id: 'f1', nome: 'Fase 1', meta: '', checklist: [], coluna: 'aguardando_cliente' },
      ],
      fases: {
        f1: { status: 'pending', checklist: {} },
      },
      colunaManual: 'protocolado',
    });
    expect(colunaKanban(p)).toBe('protocolado');
  });

  it('ignora a coluna manual quando as fases já avançaram além dela', () => {
    const p = criarProcesso({
      fasesExtras: [
        { id: 'f1', nome: 'Fase 1', meta: '', checklist: [], coluna: 'pos_aprovacao' },
      ],
      fases: {
        f1: { status: 'pending', checklist: {} },
      },
      colunaManual: 'aguardando_cliente',
    });
    expect(colunaKanban(p)).toBe('pos_aprovacao');
  });
});
