import { Processo, ProcessoTipo, Fase, ColunaKanban } from '../types';

export const TIPOS_PROCESSO: Record<ProcessoTipo, {
  label: string;
  color: string;
  wash: string;
  icon: string;
}> = {
  abertura: { label: 'Abertura', color: '#3F7D4F', wash: '#E9F3EA', icon: 'plus-circle' },
  alteracao: { label: 'Alteração', color: '#B8842A', wash: '#FBF1E0', icon: 'edit' },
  baixa: { label: 'Baixa', color: '#B22234', wash: '#FBEAE9', icon: 'archive' },
  transformacao: { label: 'Transformação', color: '#6D4C9C', wash: '#EFE9F6', icon: 'shuffle' },
  ata: { label: 'Ata / Deliberação', color: '#1F5C6B', wash: '#E3EFF1', icon: 'list-checks' },
  licenciamento: { label: 'Licenciamento', color: '#1C6E8C', wash: '#E5F1F5', icon: 'shield' },
  inscricao_municipal: { label: 'Inscrição Municipal', color: '#9C7A3C', wash: '#F6EFE0', icon: 'building' },
};

export const COLUNAS_KANBAN: Record<ColunaKanban, {
  label: string;
  descricao: string;
  cor: string;
}> = {
  aguardando_cliente: {
    label: 'Aguardando Cliente',
    descricao: 'Aguardando dados, documentos ou confirmações do cliente',
    cor: '#94A3B8'
  },
  elaboracao: {
    label: 'Elaboração',
    descricao: 'Documento em elaboração — minuta, ata, distrato, DBE',
    cor: '#B8842A'
  },
  protocolado: {
    label: 'Protocolado',
    descricao: 'Protocolo enviado — SPN gerado, DBE transmitido',
    cor: '#1C6E8C'
  },
  aguardando_deferimento: {
    label: 'Aguardando Deferimento',
    descricao: 'Em análise na Junta, Receita ou órgão competente',
    cor: '#6D4C9C'
  },
  pos_aprovacao: {
    label: 'Pós-Aprovação',
    descricao: 'Etapas administrativas após o deferimento',
    cor: '#3F7D4F'
  },
  concluido: {
    label: 'Concluído',
    descricao: 'Processo finalizado e entregue ao cliente',
    cor: '#1C1F26'
  }
};

export const ORDEM_COLUNAS: ColunaKanban[] = [
  'aguardando_cliente',
  'elaboracao',
  'protocolado',
  'aguardando_deferimento',
  'pos_aprovacao',
  'concluido'
];

export const TIPOS_SOCIETARIOS = ['SLU', 'LTDA', 'S/A', 'MEI', 'Sociedade Simples', 'Associação'];
export const REGIMES_TRIBUTARIOS = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'Isento (Associação)'];
export const FINALIDADES_ATA = [
  'Eleição/destituição de administrador (sem alteração contratual)',
  'Aprovação de contas e balanço',
  'Distribuição de lucros',
  'Constituição de Associação (Assembleia de Fundação)',
  'Alteração de Estatuto de Associação',
  'Dissolução de Associação',
  'Deliberação semipresencial/digital',
  'Outra deliberação societária',
];

export function temCnaeComercio(p: Processo): boolean {
  if (!p.cnaes) return false;
  return /com[eé]rcio|ind[uú]stria/i.test(p.cnaes);
}

export function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const FASE_MODELOS: Record<ProcessoTipo, Array<Fase>> = {
  abertura: [
    {
      id: 'planejamento',
      nome: 'Planejamento',
      meta: 'Tipo societário, CNAEs, regime tributário',
      coluna: 'aguardando_cliente',
      trilha: 'A',
      checklist: [
        'Definir tipo societário (SLU ou LTDA)',
        'Levantar CNAEs principal e secundários',
        'Definir regime tributário',
        'Confirmar dados completos dos sócios/responsável legal',
        'Verificar necessidade de habilitação profissional'
      ]
    },
    {
      id: 'viabilidade',
      nome: 'Viabilidade (Facilita SP / REDESIM)',
      meta: 'Consultar nome, endereço, restrições e termos vedados',
      coluna: 'elaboracao',
      trilha: 'A',
      checklist: [
        'Consultar viabilidade de nome empresarial',
        'Consultar viabilidade de endereço',
        'Verificar restrição de CNAE no endereço pretendido',
        'Checar termos vedados na razão social (GRUPO, HOLDING, BANCO)',
        'Confirmar aprovação antes de prosseguir'
      ]
    },
    {
      id: 'ato_constitutivo',
      nome: 'Contrato Social / Ato Constitutivo',
      meta: 'Minuta conforme Manual LTDA (Anexo IV)',
      coluna: 'elaboracao',
      trilha: 'A',
      checklist: [
        'Redigir preâmbulo com qualificação completa dos sócios',
        'Inserir cláusulas obrigatórias: objeto, capital, administração, sede',
        '⚠️ Se sócio PJ: qualificar representante legal no preâmbulo e no fecho',
        'Revisar contra IN DREI 81/2020 (Anexo IV)',
        'Colher assinatura digital de todos os sócios (ICP-Brasil)'
      ]
    },
    {
      id: 'dbe_cnpj',
      nome: 'DBE / CNPJ (Receita Federal)',
      meta: 'Preencher DBE, qualificação de sócio PJ e confirmar CNPJ',
      coluna: 'elaboracao',
      trilha: 'B',
      checklist: [
        'Preencher DBE/FCPJ no Coletor Nacional — evento abertura',
        'Sócio PJ: usar qualificação código 22 (nunca 49 ou 05)',
        'Gerar e transmitir documento básico de entrada',
        'Anotar número do protocolo DBE',
        'Confirmar CNPJ ativo após aprovação'
      ]
    },
    {
      id: 'registro_junta',
      nome: 'Registro (Junta / RCPJ)',
      meta: 'JUCESP ou Cartório RCPJ conforme natureza jurídica',
      coluna: 'protocolado',
      trilha: 'A',
      checklist: [
        'Selecionar sistema: VRE Digital (regra) ou VRE1 (transformação e paralisação)',
        'Anexar contrato social assinado',
        'Pagar D.A.R.E. (taxa JUCESP)',
        'Protocolar e anotar número SPN',
        'Acompanhar exigências — prazo máximo: 20 dias'
      ]
    },
    {
      id: 'aguardo_junta',
      nome: 'Aguardo Junta',
      meta: 'Acompanhar deferimento na Junta',
      coluna: 'aguardando_deferimento',
      trilha: 'A',
      checklist: [
        'Acompanhar análise da JUCESP',
        'Responder exigência se aberta (prazo máximo: 20 dias)',
        'Confirmar deferimento e data de aprovação',
        'Verificar NIRE atribuído',
        'Baixar certidão/espelho do ato registrado'
      ]
    },
    {
      id: 'solicitacao_simples',
      nome: 'Solicitação Simples Nacional',
      meta: 'Enquadramento e solicitação no Portal (prazo: 30 dias pós-abertura)',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      condicional: (p) => p.regimeTributario === 'Simples Nacional',
      checklist: [
        'Verificar enquadramento e ausência de impedimentos',
        'Solicitar opção no Portal do Simples Nacional',
        'PRAZO: até 30 dias após a data de abertura',
        'Anotar código de acesso Simples Nacional'
      ]
    },
    {
      id: 'certificado_digital',
      nome: 'Certificado Digital (e-CNPJ)',
      meta: 'Agendar, emitir e entregar certificado e-CNPJ pós-CNPJ ativo',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Confirmar CNPJ ativo na Receita Federal',
        'Agendar emissão (videoconferência ou presencial na AC)',
        'Vincular ao CPF do administrador responsável',
        'Entregar certificado ao cliente e orientar sobre uso'
      ]
    },
    {
      id: 'im_ccm',
      nome: 'Inscrição Municipal / CCM (Prefeitura SP)',
      meta: 'Solicitar CCM via SF.gov.br, Senha Web e Nota do Milhão',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Solicitar CCM via SF.gov.br',
        'Gerar Senha Web para emissão de NFS-e',
        'Vincular ao programa Nota do Milhão'
      ]
    },
    {
      id: 'ie',
      nome: 'Inscrição Estadual (SEFAZ-SP)',
      meta: 'Verificar e solicitar IE para CNAE de comércio/indústria',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      condicional: (p) => temCnaeComercio(p),
      checklist: [
        'Verificar exigibilidade pelo CNAE principal',
        'Solicitar IE no Posto Fiscal Eletrônico (PFE)',
        'Acompanhar deferimento e registrar número da IE'
      ]
    },
    {
      id: 'licenciamento',
      nome: 'Licenciamento',
      meta: 'ALF/CLI conforme classificação de risco do CNAE',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Classificar risco COVISA pelo CNAE (Portaria SMS.G 266/2025)',
        'Baixo/médio risco: emitir ALF via VRE automaticamente',
        'Alto risco: protocolar DCA com documentação técnica',
        'Verificar exigência de AVCB ou CLCB'
      ]
    },
    {
      id: 'tfe',
      nome: 'TFE — Taxa de Fiscalização de Estabelecimentos (Prefeitura SP)',
      meta: 'Verificar lançamento, gerar guia anual e enviar ao cliente',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Verificar lançamento da TFE no SF.gov.br pelo CNPJ ou CCM após emissão do alvará/CCM',
        'A TFE é taxa anual da Prefeitura — não é taxa do escritório',
        'Gerar guia de pagamento',
        'Enviar guia ao cliente com orientação de prazo',
        'Confirmar pagamento realizado pelo cliente',
        'Arquivar comprovante na pasta do Drive'
      ]
    },
    {
      id: 'finalizacao',
      nome: 'Finalização',
      meta: 'Entrega final ao cliente e encerramento de pendências',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Atualizar pasta completa no Google Drive',
        'Procuração e-CAC (representação perante Receita Federal)',
        'Verificar necessidade de domínio/e-mail corporativo',
        'Comunicado interno para a equipe',
        'Enviar e-mail de conclusão ao cliente',
        'Enviar e-mail de cobrança com boleto ao cliente',
        'Gerar boleto de honorários',
        'Registrar data de finalização'
      ]
    }
  ],

  alteracao: [
    {
      id: 'documento_alteracao',
      nome: 'Documento de Alteração',
      meta: 'Alteração contratual simples ou consolidação',
      coluna: 'elaboracao',
      trilha: 'A',
      checklist: [
        'Identificar todas as cláusulas afetadas pela mudança',
        'Redigir alteração simples ou com consolidação',
        'Se mudança de administrador: redigir cláusula dedicada na Parte I (Das Alterações) ANTES da consolidação — nunca apenas dentro do texto consolidado (ref. Anexo IV, Cap. II, Seção IV, Item 3 III)',
        'Se sócio PJ entrando: qualificar representante legal no preâmbulo e no fecho',
        'Revisar contra Manual LTDA (IN DREI 81/2020, Anexo IV)',
        'Colher assinatura digital de todos os sócios'
      ]
    },
    {
      id: 'viabilidade',
      nome: 'Viabilidade',
      meta: 'Somente se houver mudança de endereço ou objeto/CNAE',
      coluna: 'elaboracao',
      trilha: 'A',
      condicional: (p) => p.mudaEnderecoOuObjeto === true,
      checklist: [
        'Consultar viabilidade do novo endereço no Facilita SP / REDESIM',
        'Verificar compatibilidade do CNAE no novo local'
      ]
    },
    {
      id: 'dbe',
      nome: 'DBE (Receita Federal)',
      meta: 'Coleta Online para alteração no CNPJ',
      coluna: 'elaboracao',
      trilha: 'B',
      checklist: [
        'Identificar evento correto no Coletor Nacional: Evento 220 para alteração de QSA',
        'Sócio PJ: usar qualificação código 22 (nunca 49 ou 05)',
        'Incluir CPF/CNPJ de TODOS os que saem do QSA',
        'Preencher, transmitir e anotar número do protocolo DBE',
        'Confirmar atualização no CNPJ após aprovação'
      ]
    },
    {
      id: 'registro_junta',
      nome: 'Registro (Junta / RCPJ)',
      meta: 'Protocolo da alteração societária',
      coluna: 'protocolado',
      trilha: 'A',
      checklist: [
        'Selecionar sistema correto (VRE Digital ou VRE1)',
        'Anexar alteração contratual assinada',
        'Pagar D.A.R.E.',
        'Protocolar e anotar número SPN',
        'Acompanhar e responder exigências dentro do prazo'
      ]
    },
    {
      id: 'aguardo_junta',
      nome: 'Aguardo Junta',
      meta: 'Acompanhar deferimento na Junta',
      coluna: 'aguardando_deferimento',
      trilha: 'A',
      checklist: [
        'Acompanhar análise da JUCESP',
        'Responder exigência se aberta (prazo máximo: 20 dias)',
        'Confirmar deferimento e data de aprovação',
        'Baixar certidão do ato registrado'
      ]
    },
    {
      id: 'certificado_digital',
      nome: 'Certificado Digital',
      meta: 'Obrigatório se ocorrer troca de administrador',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      condicional: (p) => p.trocaAdministrador === true,
      checklist: [
        'Emitir novo e-CNPJ para o novo administrador',
        'Providenciar imediatamente após deferimento do registro'
      ]
    },
    {
      id: 'im_ccm',
      nome: 'Alteração Inscrição Municipal',
      meta: 'CCM — se aplicável',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      condicional: (p) => p.mudaEnderecoOuObjeto === true,
      checklist: [
        'Atualizar CCM via SF.gov.br com os dados alterados',
        'Gerar nova Senha Web se necessário'
      ]
    },
    {
      id: 'ie',
      nome: 'Alteração Inscrição Estadual',
      meta: 'SEFAZ — se houver atividade comercial/industrial',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      condicional: (p) => temCnaeComercio(p),
      checklist: [
        'Verificar impacto da alteração na IE',
        'Atualizar cadastro no SEFAZ-SP'
      ]
    },
    {
      id: 'tfe',
      nome: 'Verificação de TFE de Alteração',
      meta: 'Análise de lançamento de nova TFE',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'GERA nova TFE: mudança de endereço, inclusão ou alteração de CNAE, mudança de porte/regime',
        'NÃO gera nova TFE: alteração apenas de QSA, capital social ou razão social sem mudar endereço',
        'Se gerou: verificar lançamento no SF.gov.br pelo CNPJ ou CCM',
        'Gerar guia e enviar ao cliente com prazo',
        'Confirmar pagamento e arquivar comprovante no Drive'
      ]
    },
    {
      id: 'finalizacao',
      nome: 'Finalização',
      meta: 'Fechamento do processo e entrega ao cliente',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Atualizar pasta completa no Google Drive',
        'Comunicado interno para a equipe',
        'Enviar e-mail de conclusão ao cliente',
        'Enviar e-mail de cobrança com boleto ao cliente',
        'Gerar boleto de honorários',
        'Registrar data de finalização'
      ]
    }
  ],

  baixa: [
    {
      id: 'distrato',
      nome: 'Distrato / Dissolução',
      meta: 'Elaboração do distrato ou ata de dissolução',
      coluna: 'elaboracao',
      trilha: 'A',
      checklist: [
        'LTDA/SLU: redigir distrato social com cláusula de dissolução e liquidação',
        'Associação: redigir ata de dissolução e assembleia de liquidação',
        'Verificar quitação de todas as obrigações entre sócios',
        'Confirmar inexistência de débitos fiscais impeditivos',
        'Colher assinatura de todos os sócios/associados'
      ]
    },
    {
      id: 'dbe_baixa',
      nome: 'DBE Evento de Baixa',
      meta: 'Solicitação de baixa do CNPJ',
      coluna: 'elaboracao',
      trilha: 'B',
      checklist: [
        'Selecionar evento de baixa correto no Coletor Nacional',
        '⚠️ Evento 505 (baixa de matriz): encerra todos os CNPJs vinculados automaticamente — não é necessário DBE separado por filial',
        '⚠️ Incluir CPF/CNPJ de TODOS os sócios e administradores que saem',
        'Transmitir e anotar número do protocolo DBE'
      ]
    },
    {
      id: 'registro_junta',
      nome: 'Registro Baixa (Junta / RCPJ)',
      meta: 'Arquivamento do distrato',
      coluna: 'protocolado',
      trilha: 'A',
      checklist: [
        'Protocolar distrato/ata de dissolução via VRE',
        'Baixa da matriz encerra todas as filiais no mesmo protocolo — não é necessário protocolo separado por filial na JUCESP',
        'Pagar D.A.R.E.',
        'Anotar número SPN'
      ]
    },
    {
      id: 'aguardo_junta',
      nome: 'Aguardo Deferimento Baixa',
      meta: 'Acompanhar análise do distrato',
      coluna: 'aguardando_deferimento',
      trilha: 'A',
      checklist: [
        'Acompanhar análise da JUCESP',
        'Responder exigência se aberta',
        'Confirmar deferimento e data de aprovação',
        'Baixar certidão de baixa'
      ]
    },
    {
      id: 'cancelamento_ie',
      nome: 'Cancelamento Inscrição Estadual',
      meta: 'Baixa na SEFAZ SP',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      condicional: (p) => p.possuiIE === true,
      checklist: [
        'Solicitar cancelamento da IE na SEFAZ-SP',
        'Confirmar baixa no cadastro estadual',
        'Se havia filiais: cancelar IE de cada filial individualmente na SEFAZ do estado respectivo'
      ]
    },
    {
      id: 'cancelamento_im',
      nome: 'Cancelamento Inscrição Municipal / Alvará',
      meta: 'Baixa no CCM e alvarás municipais',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Cancelar CCM da matriz',
        'Cancelar alvará de funcionamento (ALF/CLI) da matriz',
        'Se havia filiais: cancelar CCM e alvará de cada filial individualmente na Prefeitura respectiva'
      ]
    },
    {
      id: 'finalizacao',
      nome: 'Finalização Baixa',
      meta: 'Conclusão e entrega ao cliente',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Atualizar pasta completa no Google Drive',
        'Comunicado interno para a equipe',
        'Enviar e-mail de conclusão ao cliente',
        'Enviar e-mail de cobrança com boleto ao cliente',
        'Gerar boleto de honorários',
        'Registrar data de finalização'
      ]
    }
  ],

  transformacao: [
    {
      id: 'documento_transformacao',
      nome: 'Ato de Transformação',
      meta: 'Redação da alteração para alteração de tipo jurídico via VRE1',
      coluna: 'elaboracao',
      trilha: 'A',
      checklist: [
        'Confirmar tipo jurídico de origem e destino',
        'OBRIGATÓRIO: usar VRE1 — VRE Digital não suporta transformação',
        'Redigir alteração com cláusula expressa de transformação de tipo jurídico',
        'Elaborar novo contrato social ou estatuto conforme tipo jurídico de destino',
        'Colher assinatura digital de todos os sócios'
      ]
    },
    {
      id: 'viabilidade',
      nome: 'Viabilidade',
      meta: 'Se houver endereço/CNAE alterado',
      coluna: 'elaboracao',
      trilha: 'A',
      condicional: (p) => p.mudaEnderecoOuObjeto === true,
      checklist: [
        'Consultar viabilidade do novo endereço no Facilita SP',
        'Verificar compatibilidade do CNAE no novo local'
      ]
    },
    {
      id: 'dbe',
      nome: 'DBE Natureza Jurídica',
      meta: 'Atualização cadastral no CNPJ',
      coluna: 'elaboracao',
      trilha: 'B',
      checklist: [
        'Preparar DBE para atualização de natureza jurídica',
        'Transmitir e anotar número do protocolo'
      ]
    },
    {
      id: 'registro_junta',
      nome: 'Registro Transformação (JUCESP — VRE1)',
      meta: 'Processada obrigatoriamente pelo sistema VRE1',
      coluna: 'protocolado',
      trilha: 'A',
      checklist: [
        'OBRIGATÓRIO: acessar VRE1 (não VRE Digital)',
        'Selecionar: Constitution → Transformação de Tipo Jurídico',
        'Anexar ato de transformação assinado',
        'Data de início de atividade = data original do CNPJ (não a data da transformação)',
        'Pagar D.A.R.E.',
        'Protocolar e anotar número SPN'
      ]
    },
    {
      id: 'aguardo_junta',
      nome: 'Aguardo Junta',
      meta: 'Acompanhar deferimento da transformação',
      coluna: 'aguardando_deferimento',
      trilha: 'A',
      checklist: [
        'Acompanhar análise da JUCESP',
        'Responder exigência se aberta',
        'Confirmar deferimento e data de aprovação',
        'Baixar certidão do ato registrado'
      ]
    },
    {
      id: 'ie_im',
      nome: 'Atualização de IE / Inscrição Municipal',
      meta: 'Atualizar cadastros pós-transformação',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Atualizar natureza jurídica no CNPJ confirmada',
        'Verificar impacto da transformação na IE',
        'Atualizar CCM na Prefeitura SP se necessário'
      ]
    },
    {
      id: 'tfe',
      nome: 'TFE Transformação',
      meta: 'Análise de nova TFE pós-transformação',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'A transformação pode gerar novo lançamento de TFE se houver mudança de atividade ou porte',
        'Verificar lançamento no SF.gov.br após atualização do CCM',
        'Gerar guia e enviar ao cliente se houver lançamento',
        'Confirmar pagamento e arquivar comprovante no Drive'
      ]
    },
    {
      id: 'certificado_digital',
      nome: 'Certificado Digital',
      meta: 'Obrigatório se houver troca de administrador',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      condicional: (p) => p.trocaAdministrador === true,
      checklist: [
        'Emitir novo e-CNPJ para o novo administrador',
        'Providenciar imediatamente após deferimento'
      ]
    },
    {
      id: 'finalizacao',
      nome: 'Finalização',
      meta: 'Conclusão e entrega ao cliente',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Atualizar pasta completa no Google Drive',
        'Verificar se a procuração e-CAC precisa ser reemitida após a transformação',
        'Comunicado interno para a equipe',
        'Enviar e-mail de conclusão ao cliente',
        'Enviar e-mail de cobrança com boleto ao cliente',
        'Gerar boleto de honorários',
        'Registrar data de finalização'
      ]
    }
  ],

  ata: [
    {
      id: 'convocacao',
      nome: 'Convocação / Dispensa',
      meta: 'Edital ou dispensa formal de formalidades',
      coluna: 'aguardando_cliente',
      trilha: 'A',
      checklist: [
        'Definir finalidade e pauta da deliberação',
        'Verificar quórum exigido (estatuto, contrato ou lei)',
        'Opção A: 3 publicações em jornal de grande circulação',
        'Opção B: colher ciência por escrito de 100% dos sócios/associados',
        'Confirmar prazo mínimo (8 dias 1ª convocação / 5 dias 2ª convocação)',
        'Se deliberação digital: verificar previsão no estatuto/contrato social'
      ]
    },
    {
      id: 'redacao_ata',
      nome: 'Redação da Ata',
      meta: 'Elemento obrigatório conforme manual',
      coluna: 'elaboracao',
      trilha: 'A',
      checklist: [
        'Título identificando o tipo (AGO, AGE, Reunião de Sócios, Assembleia de Fundação etc.)',
        'Preâmbulo: data, hora, local e composição da mesa',
        'Declaração expressa de cumprimento das formalidades',
        'Ordem do dia com todas as pautas descritas',
        'Deliberações com resultado da votação e quórum obtido',
        'Fecho com nome e assinatura de todos os presentes',
        'Se digital: declaração de cumprimento dos requisitos (art. 48 CC / IN DREI 81)'
      ]
    },
    {
      id: 'assinatura',
      nome: 'Assinatura',
      meta: 'Coleta de assinaturas físicas ou digitais',
      coluna: 'elaboracao',
      trilha: 'A',
      checklist: [
        'Presidente e secretário da mesa (mínimo obrigatório)',
        'Todos os sócios/associados presentes',
        'Assinatura física ou certificado digital ICP-Brasil',
        'Se por procurador: confirmar habilitação (sócio, advogado ou previsão contratual)',
        'Autenticar cópia para protocolo'
      ]
    },
    {
      id: 'alteracao_vinculada',
      nome: 'Alteração Vinculada',
      meta: 'Arquivamento concomitante se houver',
      coluna: 'elaboracao',
      trilha: 'A',
      condicional: (p) => p.geraAlteracaoContratual === true,
      checklist: [
        'Redigir alteração contratual correspondente',
        'Arquivar concomitantemente com a ata — não pode ser protocolado em datas diferentes',
        'Se mudança de administrador: cláusula dedicada na Parte I antes da consolidação'
      ]
    },
    {
      id: 'registro_rcpj_junta',
      nome: 'Registro Ata (Junta ou RCPJ)',
      meta: 'Protocolo legal da ata',
      coluna: 'protocolado',
      trilha: 'A',
      checklist: [
        'LTDA/S.A.: protocolar via VRE Digital ou VRE1 na JUCESP',
        'Associação/Sociedade Simples: protocolar no Cartório RCPJ competente',
        'Pagar taxas de registro',
        'Anotar número do protocolo SPN'
      ]
    },
    {
      id: 'aguardo_registro',
      nome: 'Aguardo Registro',
      meta: 'Acompanhar deferimento da ata',
      coluna: 'aguardando_deferimento',
      trilha: 'A',
      checklist: [
        'Acompanhar análise da JUCESP ou Cartório RCPJ',
        'Responder exigência se aberta',
        'Confirmar deferimento e data de aprovação',
        'Baixar certidão do ato registrado'
      ]
    },
    {
      id: 'dbe',
      nome: 'Atualização CNPJ via DBE',
      meta: 'Apenas se impactar CPF/CNPJ ou administração no CNPJ',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      condicional: (p) => p.impactaCnpj === true,
      checklist: [
        'Identificar evento de DBE aplicável',
        'Preencher e transmitir no Coletor Nacional',
        'Confirmar atualização refletida no CNPJ'
      ]
    },
    {
      id: 'certificado_digital',
      nome: 'Certificado Digital',
      meta: 'Se houver troca do administrador responsável',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      condicional: (p) => p.trocaAdministrador === true,
      checklist: [
        'Emitir novo e-CNPJ para o novo administrador',
        'Providenciar imediatamente após deferimento'
      ]
    },
    {
      id: 'finalizacao',
      nome: 'Finalização Ata',
      meta: 'Entrega final ao cliente',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Atualizar pasta completa no Google Drive',
        'Comunicado interno para a equipe',
        'Enviar e-mail de conclusão ao cliente',
        'Enviar e-mail de cobrança com boleto ao cliente',
        'Gerar boleto de honorários',
        'Registrar data de finalização'
      ]
    }
  ],

  licenciamento: [
    {
      id: 'analise_risco',
      nome: 'Análise de Risco (CNAE)',
      meta: 'Determinar risco COVISA (Portaria SMS.G 266/2025)',
      coluna: 'aguardando_cliente',
      trilha: 'B',
      checklist: [
        'Coletar CNAE principal e secundários do cliente',
        'Coletar endereço completo do estabelecimento',
        'Consultar Portaria SMS.G 266/2025 para classificação de risco sanitário',
        'Verificar se atividade exige CLI da COVISA',
        'Confirmar se atividade exige controle ambiental (CETESB/SVMA)',
        'Documentar classificação de risco obtida'
      ]
    },
    {
      id: 'bombeiros',
      nome: 'Corpo de Bombeiros (AVCB / CLCB)',
      meta: 'Contratação de engenharia e protocolo',
      coluna: 'elaboracao',
      trilha: 'B',
      condicional: (p) => p.altoRisco === true,
      checklist: [
        'Verificar exigência conforme área e atividade (Dec. Estadual 63.911/2018)',
        'AVCB: edificações de alto risco ou grande porte',
        'CLCB: edificações de baixo risco ou pequeno porte',
        'Contratar ART/RRT de responsável técnico habilitado',
        'Elaborar PPCI se necessário',
        'Protocolar requerimento no Corpo de Bombeiros SP',
        'Acompanhar vistoria e emissão do certificado'
      ]
    },
    {
      id: 'alf',
      nome: 'ALF (Alvará de Funcionamento)',
      meta: 'Emissão eletrônica ou presencial',
      coluna: 'protocolado',
      trilha: 'B',
      checklist: [
        'Baixo/médio risco: emitir ALF via VRE automaticamente',
        'Verificar pendências cadastrais no imóvel (IPTU, zoneamento)',
        'Confirmar validade do alvará emitido'
      ]
    },
    {
      id: 'cli_sanitario',
      nome: 'CLI Sanitário',
      meta: 'Atividades sob vigilância COVISA',
      coluna: 'protocolado',
      trilha: 'B',
      condicional: (p) => p.altoRisco === true,
      checklist: [
        'Protocolar requerimento de CLI no sistema COVISA',
        'Apresentar documentação técnica (planta, responsável técnico, ART/RRT)',
        'Acompanhar vistoria sanitária'
      ]
    },
    {
      id: 'dca',
      nome: 'DCA (Declaração de Conformidade do Alvará)',
      meta: 'Obrigatório se houver alto risco',
      coluna: 'protocolado',
      trilha: 'B',
      condicional: (p) => p.altoRisco === true,
      checklist: [
        'Preparar documentação: planta baixa, AVCB/CLCB, laudos, ART/RRT',
        'Protocolar DCA na SMUL',
        'Acompanhar análise técnica e confirmar deferimento'
      ]
    },
    {
      id: 'licenca_ambiental',
      nome: 'Licença Ambiental',
      meta: 'SVMA/CETESB dependendo da atividade',
      coluna: 'protocolado',
      trilha: 'B',
      condicional: (p) => p.exigeLicencaAmbiental === true,
      checklist: [
        'Verificar exigência junto à CETESB e SVMA',
        'Protocolar licença conforme fase (prévia/instalação/operação)',
        'Acompanhar análise e emissão'
      ]
    },
    {
      id: 'aguardo_orgao',
      nome: 'Aguardo Órgão Regulador',
      meta: 'Análise integrada da SMUL, COVISA ou Bombeiros',
      coluna: 'aguardando_deferimento',
      trilha: 'B',
      checklist: [
        'Acompanhar análise da SMUL / COVISA / Bombeiros',
        'Vistoria agendada e realizada',
        'Responder pendência técnica se houver',
        'Confirmar deferimento de todos os órgãos'
      ]
    },
    {
      id: 'tfe',
      nome: 'TFE Licenciamento',
      meta: 'Verificação pós-alvará',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Verificar lançamento da TFE no SF.gov.br após emissão do alvará',
        'A TFE é taxa anual da Prefeitura — não é taxa do escritório',
        'Gerar guia e enviar ao cliente com prazo',
        'Confirmar pagamento e arquivar comprovante no Drive'
      ]
    },
    {
      id: 'finalizacao',
      nome: 'Finalização',
      meta: 'Entrega das licenças e cobranças',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: [
        'Organizar todos os documentos na pasta do Drive: ALF, CLI, DCA, AVCB/CLCB, licença ambiental',
        'Comunicado interno para a equipe',
        'Enviar e-mail de conclusão ao cliente',
        'Enviar e-mail de cobrança com boleto ao cliente',
        'Gerar boleto de honorários',
        'Registrar data de finalização'
      ]
    }
  ],

  inscricao_municipal: [
    {
      id: 'ccm',
      nome: 'CCM',
      meta: 'Cadastro de Contribuintes Mobiliários',
      coluna: 'elaboracao',
      trilha: 'B',
      checklist: ['Solicitar CCM na Prefeitura', 'Confirmar vínculo com CNPJ ativo']
    },
    {
      id: 'senha_web',
      nome: 'Senha Web',
      meta: 'Acesso ao portal da Prefeitura',
      coluna: 'elaboracao',
      trilha: 'B',
      checklist: ['Gerar Senha Web', 'Entregar credenciais ao cliente']
    },
    {
      id: 'nota_milhao',
      nome: 'Nota do Milhão (NFS-e)',
      meta: 'Habilitação para emissão de notas fiscais de serviço',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: ['Habilitar emissão de NFS-e', 'Cadastrar certificado digital se necessário']
    },
    {
      id: 'tfe',
      nome: 'TFE',
      meta: 'Taxa de Fiscalização de Estabelecimento',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: ['Verificar TFE de abertura/alteração', 'Confirmar pagamento']
    },
    {
      id: 'finalizacao',
      nome: 'Finalização',
      meta: 'Entrega ao cliente',
      coluna: 'pos_aprovacao',
      trilha: 'B',
      checklist: ['Comunicado interno', 'E-mail de conclusão ao cliente']
    }
  ]
};

export const SEED_PROCESSOS: Processo[] = [
  {
    id: 'p1',
    razaoSocial: 'PORTUGAL SUSHI LTDA',
    documento: '99.999.999/0001-99',
    nire: '35230044556',
    solicitante: 'KELLI AIRIN',
    responsavelLegal: 'JANIO JOSÉ DA SILVA',
    cpfResponsavel: '001.795.738-96',
    whatsapp: '11988887777',
    email: 'contato@portugalsushi.com',
    tipoProcesso: 'abertura',
    tipoSocietario: 'LTDA',
    regimeTributario: 'Simples Nacional',
    valorProcesso: 1800,
    inicio: isoDaysAgo(12),
    duracaoPrevista: 30,
    cnaes: '5611-2/03 — Lanchonetes, casas de chá, de sucos e similares',
    mudaEnderecoOuObjeto: false,
    trocaAdministrador: false,
    altoRisco: true,
    exigeLicencaAmbiental: false,
    fases: {
      planejamento: { status: 'done', checklist: { b0: true, b1: true, b2: true, b3: true, b4: true } },
      viabilidade: { status: 'done', checklist: { b0: true, b1: true, b2: true, b3: true, b4: true } },
      ato_constitutivo: { status: 'done', checklist: { b0: true, b1: true, b2: true, b3: true, b4: true } },
      dbe_cnpj: { status: 'done', checklist: { b0: true, b1: true, b2: true, b3: true, b4: true } },
      registro_junta: { status: 'progress', checklist: { b0: true, b1: false, b2: true, b3: false, b4: false } },
      aguardo_junta: { status: 'pending', checklist: {} },
      solicitacao_simples: { status: 'pending', checklist: {} },
      certificado_digital: { status: 'pending', checklist: {} },
      im_ccm: { status: 'pending', checklist: {} },
      ie: { status: 'pending', checklist: {} },
      licenciamento: { status: 'pending', checklist: {} },
      tfe: { status: 'pending', checklist: {} },
      finalizacao: { status: 'pending', checklist: {} },
    },
    finalizado: false,
    ultimaAtualizacao: isoDaysAgo(0),
    historico: [
      { data: isoDaysAgo(12), texto: 'Processo de abertura iniciado a partir do planejamento societário.' },
      { data: isoDaysAgo(9), texto: 'Viabilidade de nome e endereço deferida.' },
      { data: isoDaysAgo(5), texto: 'Ato constitutivo elaborado e assinado digitalmente.' },
      { data: isoDaysAgo(2), texto: 'Processo protocolado na JUCESP via VRE Digital.' },
    ],
    alarmes: [
      {
        id: 'alm_1',
        faseId: 'registro_junta',
        titulo: 'Cobrar andamento do protocolo JUCESP',
        dataHora: isoDaysAgo(-2) + 'T09:00',
        concluido: false,
        criadoEm: isoDaysAgo(2),
      }
    ]
  },
  {
    id: 'p2',
    razaoSocial: 'FLORINDA BISTRÔ E EVENTOS LTDA',
    documento: '17.159.337/0001-49',
    nire: '35240212398',
    solicitante: 'ROCHA',
    responsavelLegal: 'LUDMILLA MAXIMIUC FIRMEZA',
    cpfResponsavel: '111.222.333-44',
    whatsapp: '11977776666',
    email: 'ludmilla@florindabistro.com.br',
    tipoProcesso: 'ata',
    tipoSocietario: 'LTDA',
    regimeTributario: 'Simples Nacional',
    valorProcesso: 600,
    inicio: isoDaysAgo(24),
    duracaoPrevista: 15,
    cnaes: '5611-2/01 — Restaurantes e similares',
    mudaEnderecoOuObjeto: false,
    trocaAdministrador: false,
    altoRisco: false,
    exigeLicencaAmbiental: false,
    finalidadeAta: 'Eleição/destituição de administrador (sem alteração contratual)',
    geraAlteracaoContratual: true,
    impactaCnpj: true,
    fases: {
      convocacao: { status: 'done', checklist: { b0: true, b1: true, b2: true, b3: true, b4: true, b5: true } },
      redacao_ata: { status: 'done', checklist: { b0: true, b1: true, b2: true, b3: true, b4: true, b5: true, b6: true } },
      assinatura: { status: 'progress', checklist: { b0: true, b1: false, b2: false, b3: false, b4: false } },
      alteracao_vinculada: { status: 'pending', checklist: {} },
      registro_rcpj_junta: { status: 'pending', checklist: {} },
      aguardo_registro: { status: 'pending', checklist: {} },
      dbe: { status: 'pending', checklist: {} },
      certificado_digital: { status: 'pending', checklist: {} },
      finalizacao: { status: 'pending', checklist: {} },
    },
    finalizado: false,
    ultimaAtualizacao: isoDaysAgo(0),
    historico: [
      { data: isoDaysAgo(24), texto: 'Deliberação de troca de diretoria iniciada.' },
      { data: isoDaysAgo(15), texto: 'Minuta de ata enviada para revisão prévia.' },
    ],
  },
];
