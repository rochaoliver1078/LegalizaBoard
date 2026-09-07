import React, { useState } from 'react';
import { 
  Plus, Trash2, Edit, ArrowUp, ArrowDown, Sparkles,
  PlusCircle, Archive, Shuffle, ListChecks, Shield, Building, Grid, Info, ChevronRight,
  Bell, Clock
} from 'lucide-react';
import { TIPOS_PROCESSO, FASE_MODELOS } from '../data/fases';
import { Processo } from '../types';

interface TrilhasManagerProps {
  tiposProcesso: Record<string, { label: string; color: string; wash: string; icon: string }>;
  saveTiposProcesso: (updated: Record<string, { label: string; color: string; wash: string; icon: string }>) => void;
  faseModelos: Record<string, Array<{ id: string; nome: string; meta: string; checklist: string[] }>>;
  saveFaseModelos: (updated: Record<string, Array<{ id: string; nome: string; meta: string; checklist: string[] }>>) => void;
  showToast: (msg: string, isError?: boolean) => void;
  processos: Processo[];
}

const PRESET_COLORS = [
  { name: 'Verde Floresta', color: 'var(--green)', wash: 'var(--green-wash)' },
  { name: 'Ouro Âmbar', color: 'var(--yellow)', wash: 'var(--surface-2)' },
  { name: 'Vermelho Carmesim', color: 'var(--primary)', wash: '#FBEAE9' },
  { name: 'Roxo Violeta', color: '#6D4C9C', wash: '#EFE9F6' },
  { name: 'Azul Ardósia', color: '#1C6E8C', wash: '#E5F1F5' },
  { name: 'Esmeralda Escura', color: '#1F5C6B', wash: '#E3EFF1' },
  { name: 'Dourado Escuro', color: 'var(--yellow)', wash: 'var(--surface-2)' },
  { name: 'Índigo Vibrante', color: '#4F46E5', wash: '#EEF2FF' },
  { name: 'Rosa Choque', color: '#DB2777', wash: '#FDF2F8' },
  { name: 'Cinza Carvão', color: '#475569', wash: '#F1F5F9' },
];

const AVAILABLE_ICONS = [
  { key: 'plus-circle', label: 'Adição / Entrada' },
  { key: 'edit', label: 'Lápis / Alteração' },
  { key: 'archive', label: 'Pasta / Baixa' },
  { key: 'shuffle', label: 'Setas / Troca' },
  { key: 'list-checks', label: 'Lista / Concatenação' },
  { key: 'shield', label: 'Escudo / Licença' },
  { key: 'building', label: 'Prédio / Prefeitura' },
  { key: 'grid', label: 'Grade Geral' },
];

export const TrilhasManager: React.FC<TrilhasManagerProps> = ({
  tiposProcesso,
  saveTiposProcesso,
  faseModelos,
  saveFaseModelos,
  showToast,
  processos,
}) => {
  // Combine native standard kinds + custom edited kinds
  const activeTipos: Record<string, { label: string; color: string; wash: string; icon: string }> = { ...TIPOS_PROCESSO, ...tiposProcesso };
  const baseModelos: Record<string, Array<{ id: string; nome: string; meta: string; checklist: string[]; alarmesEtapa?: Array<{ id: string; titulo: string; diasOffset: number }>; alarmesTarefas?: Array<{ id: string; tarefaText: string; titulo: string; diasOffset: number }> }>> = { ...FASE_MODELOS, ...faseModelos };

  const [selectedTipoId, setSelectedTipoId] = useState<string>(Object.keys(activeTipos)[0] || 'abertura');

  // New Category form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newColorIdx, setNewColorIdx] = useState(0);
  const [newIcon, setNewIcon] = useState('plus-circle');
  const [copyFromPreset, setCopyFromPreset] = useState<string>('vazio');

  // Edit Category detail state (for custom ones mostly, but can customize labels)
  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColorIdx, setEditColorIdx] = useState(0);
  const [editIcon, setEditIcon] = useState('plus-circle');

  // Active Phase Templates being customized
  const activePhasesOfSelected = baseModelos[selectedTipoId] || [];

  // Add new phase template to selected trail
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseMeta, setNewPhaseMeta] = useState('');
  const [newPhaseChecklistText, setNewPhaseChecklistText] = useState('');

  // Local inline inputs for editing phase details
  const [editingPhaseIndex, setEditingPhaseIndex] = useState<number | null>(null);
  const [editPhaseName, setEditPhaseName] = useState('');
  const [editPhaseMeta, setEditPhaseMeta] = useState('');

  // Add checklist item to selected phase
  const [newCheckItemText, setNewCheckItemText] = useState<Record<number, string>>({});

  // Manage Stage-level Alarm Templates
  const [newStageAlarmTitle, setNewStageAlarmTitle] = useState<Record<number, string>>({});
  const [newStageAlarmOffset, setNewStageAlarmOffset] = useState<Record<number, string>>({});

  const handleAddStageAlarm = (phaseIdx: number) => {
    const title = newStageAlarmTitle[phaseIdx] || '';
    const offsetStr = newStageAlarmOffset[phaseIdx] || '';
    if (!title.trim()) {
      showToast('Digite o título para o alarme da etapa!', true);
      return;
    }
    const daysOffset = parseInt(offsetStr, 10);
    if (isNaN(daysOffset) || daysOffset < 0) {
      showToast('Digite uma quantidade de dias válida (maior ou igual a 0)!', true);
      return;
    }

    const nextPhases = [...activePhasesOfSelected];
    const targetPhase = nextPhases[phaseIdx];
    const alarmesEtapa = [...(targetPhase.alarmesEtapa || [])];
    alarmesEtapa.push({
      id: 'alm_etapa_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      titulo: title.trim(),
      diasOffset: daysOffset
    });

    nextPhases[phaseIdx] = {
      ...targetPhase,
      alarmesEtapa
    };

    writePhases(nextPhases);
    setNewStageAlarmTitle({ ...newStageAlarmTitle, [phaseIdx]: '' });
    setNewStageAlarmOffset({ ...newStageAlarmOffset, [phaseIdx]: '' });
    showToast('Alarme de etapa adicionado!');
  };

  const handleRemoveStageAlarm = (phaseIdx: number, alarmId: string) => {
    const nextPhases = [...activePhasesOfSelected];
    const targetPhase = nextPhases[phaseIdx];
    const alarmesEtapa = (targetPhase.alarmesEtapa || []).filter(a => a.id !== alarmId);

    nextPhases[phaseIdx] = {
      ...targetPhase,
      alarmesEtapa
    };

    writePhases(nextPhases);
    showToast('Alarme de etapa removido.');
  };

  // Manage Task-level Alarm Templates
  const [activeTaskAlarmForm, setActiveTaskAlarmForm] = useState<string | null>(null); // "phaseIdx-taskIdx"
  const [taskAlarmTitle, setTaskAlarmTitle] = useState('');
  const [taskAlarmOffset, setTaskAlarmOffset] = useState<number>(0);

  const handleToggleTaskAlarmForm = (phaseIdx: number, taskIdx: number) => {
    const formKey = `${phaseIdx}-${taskIdx}`;
    if (activeTaskAlarmForm === formKey) {
      setActiveTaskAlarmForm(null);
    } else {
      setActiveTaskAlarmForm(formKey);
      setTaskAlarmTitle(`Confirmar: ${activePhasesOfSelected[phaseIdx].checklist[taskIdx]}`);
      setTaskAlarmOffset(2);
    }
  };

  const handleAddTaskAlarm = (phaseIdx: number, taskText: string) => {
    if (!taskAlarmTitle.trim()) {
      showToast('Digite o título para o alarme da tarefa!', true);
      return;
    }
    if (taskAlarmOffset < 0) {
      showToast('A quantidade de dias deve ser maior ou igual a 0!', true);
      return;
    }

    const nextPhases = [...activePhasesOfSelected];
    const targetPhase = nextPhases[phaseIdx];
    const alarmesTarefas = [...(targetPhase.alarmesTarefas || [])];
    
    alarmesTarefas.push({
      id: 'alm_tarefa_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      tarefaText: taskText,
      titulo: taskAlarmTitle.trim(),
      diasOffset: taskAlarmOffset
    });

    nextPhases[phaseIdx] = {
      ...targetPhase,
      alarmesTarefas
    };

    writePhases(nextPhases);
    setActiveTaskAlarmForm(null);
    setTaskAlarmTitle('');
    setTaskAlarmOffset(0);
    showToast('Alarme configurado para a tarefa!');
  };

  const handleRemoveTaskAlarm = (phaseIdx: number, alarmId: string) => {
    const nextPhases = [...activePhasesOfSelected];
    const targetPhase = nextPhases[phaseIdx];
    const alarmesTarefas = (targetPhase.alarmesTarefas || []).filter(a => a.id !== alarmId);

    nextPhases[phaseIdx] = {
      ...targetPhase,
      alarmesTarefas
    };

    writePhases(nextPhases);
    showToast('Alarme da tarefa removido.');
  };

  const getIconComponent = (iconName: string, className = "h-[18px] w-[18px]") => {
    switch (iconName) {
      case 'plus-circle': return <PlusCircle className={className} />;
      case 'edit': return <Edit className={className} />;
      case 'archive': return <Archive className={className} />;
      case 'shuffle': return <Shuffle className={className} />;
      case 'list-checks': return <ListChecks className={className} />;
      case 'shield': return <Shield className={className} />;
      case 'building': return <Building className={className} />;
      default: return <Grid className={className} />;
    }
  };

  // Keep slug helper
  const handleLabelChange = (val: string) => {
    setNewLabel(val);
    // Suggest slugified code
    const slug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    setNewCode(slug);
  };

  // 1. CREATE NEW CATEGORY
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      showToast('O nome da categoria é obrigatório!', true);
      return;
    }
    if (!newCode.trim()) {
      showToast('O código identificador é obrigatório!', true);
      return;
    }

    if (activeTipos[newCode]) {
      showToast('Uma categoria com esse código ou slug já existe!', true);
      return;
    }

    const colObj = PRESET_COLORS[newColorIdx];

    // Create the process type metadata
    const updatedTipos = {
      ...tiposProcesso,
      [newCode]: {
        label: newLabel.trim(),
        color: colObj.color,
        wash: colObj.wash,
        icon: newIcon,
      }
    };

    // Determine initial phases
    let copiedPhases: Array<{ id: string; nome: string; meta: string; checklist: string[] }>;
    if (copyFromPreset !== 'vazio' && baseModelos[copyFromPreset]) {
      // Deep copy preset phases (ignore conditions which are function objects)
      copiedPhases = baseModelos[copyFromPreset].map(f => ({
        id: f.id,
        nome: f.nome,
        meta: f.meta,
        checklist: [...f.checklist]
      }));
    } else {
      // Standard minimal steps so it's not totally empty on start
      copiedPhases = [
        { id: 'planejamento', nome: 'Planejamento Inicial', meta: 'Definir escopo da transação', checklist: ['Alinhamento prévio com cliente', 'Coleta de credenciais e poderes'] },
        { id: 'registro', nome: 'Trâmite Registral', meta: 'Processamento em órgãos externos', checklist: ['Protocolo de petição/minuta', 'Acompanhamento do deferimento'] },
        { id: 'conclusao', nome: 'Conclusão e Arquivo', meta: 'Finalizar pastas organizadas', checklist: ['Atualizar registros de controle', 'Notificar cliente do encerramento'] }
      ];
    }

    const updatedModelos = {
      ...faseModelos,
      [newCode]: copiedPhases
    };

    saveTiposProcesso(updatedTipos);
    saveFaseModelos(updatedModelos);

    setSelectedTipoId(newCode);
    setNewLabel('');
    setNewCode('');
    setCopyFromPreset('vazio');
    setShowCreateModal(false);
    showToast(`Trilha "${newLabel}" criada com sucesso!`);
  };

  // 2. DELETE PROCESS TYPE (Only if customized / not actively used)
  const handleDeleteCategory = (idToDelete: string) => {
    // Check if standard helper
    const isStandard = !!TIPOS_PROCESSO[idToDelete];
    if (isStandard) {
      showToast('Não é permitido remover categorias padrões do sistema.', true);
      return;
    }

    // Check if actively used
    const inUse = processos.some(p => p.tipoProcesso === idToDelete && !p.deletado);
    if (inUse) {
      showToast('Incapaz de deletar: Esta categoria possui processos ativos atribuídos a ela.', true);
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir permanentemente a trilha "${activeTipos[idToDelete]?.label}"?`)) {
      const updatedTipos = { ...tiposProcesso };
      delete updatedTipos[idToDelete];

      const updatedModelos = { ...faseModelos };
      delete updatedModelos[idToDelete];

      saveTiposProcesso(updatedTipos);
      saveFaseModelos(updatedModelos);

      if (selectedTipoId === idToDelete) {
        setSelectedTipoId(Object.keys({ ...TIPOS_PROCESSO, ...updatedTipos })[0] || 'abertura');
      }
      showToast('Categoria personalizada removida.');
    }
  };

  // 3. EDIT CATEGORY TITLE, ICON, AND COLOR
  const handleStartEditingCategory = (id: string) => {
    setEditingTipoId(id);
    const item = activeTipos[id];
    setEditLabel(item.label);
    setEditIcon(item.icon);
    
    // Find color preset index
    const colIdx = PRESET_COLORS.findIndex(c => c.color === item.color);
    setEditColorIdx(colIdx !== -1 ? colIdx : 0);
  };

  const handleSaveCategoryEdit = (id: string) => {
    if (!editLabel.trim()) {
      showToast('Nome não pode ser vazio', true);
      return;
    }

    const colObj = PRESET_COLORS[editColorIdx];
    const updatedTipos = { ...tiposProcesso };
    
    updatedTipos[id] = {
      label: editLabel.trim(),
      color: colObj.color,
      wash: colObj.wash,
      icon: editIcon
    };

    saveTiposProcesso(updatedTipos);
    setEditingTipoId(null);
    showToast('Aparência da trilha atualizada!');
  };

  // 4. RESET ALL TO DEFAULT
  const handleResetToDefaults = () => {
    if (window.confirm('Atenção: Isso irá excluir todas as categorias personalizadas e restaurar as etapas originais do sistema. Confirmar?')) {
      saveTiposProcesso({});
      saveFaseModelos({});
      setSelectedTipoId('abertura');
      showToast('Configurações de trilhas redefinidas para o padrão original!');
    }
  };

  // 5. UPDATE PHASES OF Trail
  const writePhases = (updatedPhases: typeof activePhasesOfSelected) => {
    const updatedModelos = {
      ...faseModelos,
      [selectedTipoId]: updatedPhases
    };
    saveFaseModelos(updatedModelos);
  };

  // Add Phase to Active Trail
  const handleAddPhaseToTrail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseName.trim()) {
      showToast('Informe o nome para o novo estágio!', true);
      return;
    }

    const fId = 'fase_' + Date.now();
    const chk = newPhaseChecklistText
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const newFaseObj = {
      id: fId,
      nome: newPhaseName.trim(),
      meta: newPhaseMeta.trim() || 'Sem descrição cadastrada',
      checklist: chk
    };

    const nextPhases = [...activePhasesOfSelected, newFaseObj];
    writePhases(nextPhases);

    setNewPhaseName('');
    setNewPhaseMeta('');
    setNewPhaseChecklistText('');
    showToast(`Fase "${newFaseObj.nome}" adicionada à trilha!`);
  };

  // Reorder phase
  const handleMovePhase = (idx: number, direction: 'up' | 'down') => {
    const nextPhases = [...activePhasesOfSelected];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= nextPhases.length) return;

    // Swap elements
    const temp = nextPhases[idx];
    nextPhases[idx] = nextPhases[targetIdx];
    nextPhases[targetIdx] = temp;

    writePhases(nextPhases);
    showToast('Ordem das etapas reorganizada!');
  };

  // Delete phase step
  const handleDeletePhase = (idx: number) => {
    const phaseName = activePhasesOfSelected[idx]?.nome;
    if (window.confirm(`Quer remover a etapa "${phaseName}" desta trilha? Isso afetará novos fluxos societários criados doravante.`)) {
      const nextPhases = activePhasesOfSelected.filter((_, i) => i !== idx);
      writePhases(nextPhases);
      showToast('Fase excluída do modelo.');
    }
  };

  // Edit current phase metadata
  const handleStartEditingPhase = (idx: number) => {
    setEditingPhaseIndex(idx);
    const p = activePhasesOfSelected[idx];
    setEditPhaseName(p.nome);
    setEditPhaseMeta(p.meta);
  };

  const handleSavePhaseEdit = (idx: number) => {
    if (!editPhaseName.trim()) {
      showToast('Nome do estágio não pode ser vazio!', true);
      return;
    }
    const nextPhases = [...activePhasesOfSelected];
    nextPhases[idx] = {
      ...nextPhases[idx],
      nome: editPhaseName.trim(),
      meta: editPhaseMeta.trim(),
    };
    writePhases(nextPhases);
    setEditingPhaseIndex(null);
    showToast('Etapa atualizada!');
  };

  // Add individual checklist task to phase index
  const handleAddChecklistTask = (phaseIdx: number) => {
    const txt = newCheckItemText[phaseIdx] || '';
    if (!txt.trim()) return;

    const nextPhases = [...activePhasesOfSelected];
    nextPhases[phaseIdx] = {
      ...nextPhases[phaseIdx],
      checklist: [...nextPhases[phaseIdx].checklist, txt.trim()]
    };

    writePhases(nextPhases);
    setNewCheckItemText({
      ...newCheckItemText,
      [phaseIdx]: ''
    });
    showToast('Item de verificação incorporado à fase!');
  };

  // Remove individual checklist task
  const handleRemoveChecklistTask = (phaseIdx: number, taskIdx: number) => {
    const nextPhases = [...activePhasesOfSelected];
    const filteredTasks = nextPhases[phaseIdx].checklist.filter((_, i) => i !== taskIdx);
    nextPhases[phaseIdx] = {
      ...nextPhases[phaseIdx],
      checklist: filteredTasks
    };
    writePhases(nextPhases);
    showToast('Tarefa padrão removida da lista.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none animate-fade-in">
      
      {/* LEFT LIST PANEL: CATEGORIES AND CREATE TRIGGERS */}
      <div className="lg:col-span-5 space-y-4">
        
        <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-150">
            <div>
              <h3 className="font-sans text-sm font-bold text-[var(--text)] uppercase tracking-wide">Categorias de Processo</h3>
              <p className="text-[10px] text-[var(--text-3)] mt-1 font-medium">Selecione uma trilha para editar suas etapas</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Nova Categoria
            </button>
          </div>

          {/* Quick Creator Modal Inline */}
          {showCreateModal && (
            <div className="bg-[var(--bg)] border border-blue-200 p-4 rounded-xl space-y-3 animate-fade-in relative">
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-2 right-2 text-[var(--text-3)] hover:text-[var(--text-2)] font-bold"
              >
                ✕
              </button>
              <h4 className="text-[11px] font-bold text-red-950 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" /> Nova categoria societária
              </h4>

              <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase block mb-1">Nome de Exibição (Label)</label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="Ex: Regularização Estatutária"
                    className="w-full bg-[var(--surface)] border border-[var(--border)] p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[var(--text-3)] uppercase block mb-1">Slug / Código Interno (Único)</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Ex: reg_estatutaria"
                    disabled={!newLabel}
                    className="w-full bg-[var(--surface)] disabled:bg-[var(--surface-2)] border border-[var(--border)] p-2.5 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-3)] uppercase block mb-1">Ícone</label>
                    <select
                      value={newIcon}
                      onChange={(e) => setNewIcon(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                    >
                      {AVAILABLE_ICONS.map(i => (
                        <option key={i.key} value={i.key}>{i.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-3)] uppercase block mb-1">Copiar Etapas de</label>
                    <select
                      value={copyFromPreset}
                      onChange={(e) => setCopyFromPreset(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] p-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30">
                      <option value="vazio">⭐ Trilha básica padrão</option>
                      {Object.entries(activeTipos).map(([id, t]) => (
                        <option key={id} value={id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[var(--text-3)] block mb-1 uppercase">Cor de Destaque</label>
                  <div className="grid grid-cols-5 gap-2.5 pt-1">
                    {PRESET_COLORS.map((color, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewColorIdx(idx)}
                        style={{ backgroundColor: color.color }}
                        className={`w-6 h-6 rounded-full cursor-pointer border-2 transition ${newColorIdx === idx ? 'border-black scale-110 shadow-sm' : 'border-transparent opacity-85 hover:opacity-100'}`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-2)] px-3 py-2 rounded-lg border font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg font-bold"
                  >
                    Gravar Categoria
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of categories */}
          <div className="space-y-2.5">
            {Object.entries(activeTipos).map(([id, t]) => {
              const isSelected = selectedTipoId === id;
              const isCustom = !TIPOS_PROCESSO[id];
              const pCount = processos.filter(p => p.tipoProcesso === id && !p.deletado).length;
              const stepsCount = (baseModelos[id] || []).length;
              const isEditing = editingTipoId === id;

              return (
                <div
                  key={id}
                  onClick={() => !isEditing && setSelectedTipoId(id)}
                  className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col gap-3 select-none ${
                    isSelected 
                      ? 'border-[var(--primary)] bg-red-50/30 shadow-xs' 
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg)] cursor-pointer'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-550 uppercase">
                        <Edit className="h-3 w-3 text-amber-600" /> Editando Metadados
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-[var(--text-3)] block uppercase mb-0.5">Nome do Trâmite</label>
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="w-full bg-[var(--surface)] border border-slate-350 p-2 rounded text-xs px-2.5 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30 font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-3)] block uppercase mb-0.5">Ícone</label>
                          <select
                            value={editIcon}
                            onChange={(e) => setEditIcon(e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] p-1.5 rounded text-xs text-[var(--text-2)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                          >
                            {AVAILABLE_ICONS.map(i => (
                              <option key={i.key} value={i.key}>{i.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-3)] block uppercase mb-0.5">Preset de Cor</label>
                          <select
                            value={editColorIdx}
                            onChange={(e) => setEditColorIdx(Number(e.target.value))}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] p-1.5 rounded text-xs select-none"
                          >
                            {PRESET_COLORS.map((c, i) => (
                              <option key={i} value={i}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingTipoId(null)}
                          className="bg-[var(--surface)] border p-1 rounded px-2.5 font-semibold text-[10px] border-[var(--border)]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCategoryEdit(id)}
                          className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white p-1 rounded px-3 font-bold text-[10px]"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span 
                          style={{ backgroundColor: t.wash, color: t.color }} 
                          className="p-2 sm:p-2.5 rounded-xl flex items-center justify-center flex-shrink-0"
                        >
                          {getIconComponent(t.icon, "h-5 w-5")}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-950 truncate flex items-center gap-1.5 leading-none text-xs">
                            {t.label}
                            {isCustom && (
                              <span className="bg-[var(--surface-2)] text-[var(--text-2)] text-[9px] font-bold px-1.5 py-0.2 rounded">Custom</span>
                            )}
                          </h4>
                          <p className="text-[10px] text-[var(--text-3)] font-semibold mt-1 font-mono tracking-wide">
                            {stepsCount} {stepsCount === 1 ? 'etapa' : 'etapas'} · {pCount} {pCount === 1 ? 'processo' : 'processos'}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons (Trash/Edit) */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {isSelected && (
                          <ChevronRight className="h-[18px] w-[18px] text-[var(--primary)] animate-pulse lg:block hidden mr-1" />
                        )}
                        {isCustom && (
                          <>
                            <button
                              onClick={() => handleStartEditingCategory(id)}
                              className="p-1.5 hover:bg-[var(--surface-2)] rounded text-[var(--text-3)] hover:text-[var(--text)] transition flex cursor-pointer"
                              title="Editar Metadados (Nome, ícone, cor)"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(id)}
                              disabled={pCount > 0}
                              className={`p-1.5 rounded transition flex ${pCount > 0 ? 'opacity-30 cursor-not-allowed text-[var(--text-3)]' : 'hover:bg-red-50 text-[var(--text-3)] hover:text-red-700 cursor-pointer'}`}
                              title={pCount > 0 ? "Impossível apagar: possui processos criados" : "Excluir Categoria"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex justify-between select-none p-1 bg-amber-50/40 rounded-xl px-3 border border-amber-200/50">
            <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-amber-650" /> Precisa reiniciar tudo?
            </span>
            <button
              onClick={handleResetToDefaults}
              className="text-[10px] text-red-700 hover:underline font-mono font-bold transition flex cursor-pointer"
            >
              Resetar para o Padrão
            </button>
          </div>

        </div>

      </div>

      {/* RIGHT WORKFLOW CUSTOMIZER PANEL */}
      <div className="lg:col-span-7 space-y-4">
        
        <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--border)]/60">
            <div>
              <h3 className="font-sans text-sm font-bold text-[var(--text)] uppercase tracking-wide">
                Configurador de Roteiro: <span className="text-[var(--primary)]">"{activeTipos[selectedTipoId]?.label}"</span>
              </h3>
              <p className="text-[10px] text-[var(--text-3)] mt-1 font-semibold leading-none">Novos fluxos societários criados herdarão os passos editados abaixo</p>
            </div>
            
            <span style={{ backgroundColor: activeTipos[selectedTipoId]?.wash, color: activeTipos[selectedTipoId]?.color }} className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-black/5">
              {getIconComponent(activeTipos[selectedTipoId]?.icon || 'grid', 'h-3.5 w-3.5')}
              Ativa
            </span>
          </div>

          {/* Workflow phases timeline */}
          <div className="space-y-4">
            {activePhasesOfSelected.length === 0 ? (
              <div className="text-center p-12 border border-dashed rounded-xl bg-[var(--bg)] text-[var(--text-3)] font-medium">
                Esta trilha não possui etapas padrão cadastradas. Use o formulário abaixo para adicionar a primeira etapa!
              </div>
            ) : (
              <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-205">
                {activePhasesOfSelected.map((phase, idx) => {
                  const isEditingPhase = editingPhaseIndex === idx;

                  return (
                    <div key={phase.id} className="relative select-none text-xs">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[20px] top-1.5 w-3 h-3 rounded-full bg-[var(--primary)] border border-white ring-4 ring-red-50"></span>

                      <div className="bg-[var(--bg)]/85 p-4 rounded-xl border border-[var(--border)]/70 hover:border-[var(--primary)]/50 transition-colors shadow-xs space-y-3">
                        
                        {isEditingPhase ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-[var(--text-3)] uppercase block mb-0.5">Título da Etapa</label>
                                <input
                                  type="text"
                                  value={editPhaseName}
                                  onChange={(e) => setEditPhaseName(e.target.value)}
                                  className="w-full bg-[var(--surface)] border border-slate-350 p-2 rounded text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-[var(--text-3)] uppercase block mb-0.5">Meta / SLA (Descrição Rápida)</label>
                                <input
                                  type="text"
                                  value={editPhaseMeta}
                                  onChange={(e) => setEditPhaseMeta(e.target.value)}
                                  className="w-full bg-[var(--surface)] border border-slate-350 p-2 rounded text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                                />
                              </div>
                            </div>
                            <div className="flex gap-1.5 justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingPhaseIndex(null)}
                                className="bg-[var(--surface)] border p-1 rounded px-2.5 font-semibold text-[10px]"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSavePhaseEdit(idx)}
                                className="bg-[#1C1F26] text-white p-1 rounded px-3 font-bold text-[10px]"
                              >
                                Gravar Parâmetros
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-[var(--text-3)] uppercase tracking-wider block">Etapa {idx + 1}</span>
                                <span className="font-semibold text-[10px] bg-slate-150 text-[var(--text)] px-1.5 py-0.1 rounded font-mono">ID: {phase.id}</span>
                              </div>
                              <h4 className="font-bold text-[var(--text)] text-sm mt-0.5">{phase.nome}</h4>
                              <p className="text-[11px] text-[var(--text-3)] font-semibold mt-1">🎯 Meta/Enfoque: <span className="text-[var(--text-2)]">{phase.meta}</span></p>
                            </div>

                            {/* Phase Step actions */}
                            <div className="flex items-center gap-1">
                              <button
                                disabled={idx === 0}
                                onClick={() => handleMovePhase(idx, 'up')}
                                className="p-1 hover:bg-slate-200/50 rounded disabled:opacity-20 cursor-pointer"
                                title="Mover para Cima"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                disabled={idx === activePhasesOfSelected.length - 1}
                                onClick={() => handleMovePhase(idx, 'down')}
                                className="p-1 hover:bg-slate-200/50 rounded disabled:opacity-20 cursor-pointer"
                                title="Mover para Baixo"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleStartEditingPhase(idx)}
                                className="p-1 hover:bg-slate-200/50 rounded text-[var(--text-3)] hover:text-[var(--text)] cursor-pointer"
                                title="Editar Metas"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePhase(idx)}
                                className="p-1 hover:bg-red-50 rounded text-[var(--text-3)] hover:text-red-700 cursor-pointer"
                                title="Remover Etapa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Standard Checklist inside phase */}
                        <div className="border-t border-slate-200/60 pt-2 bg-white/50 p-2.5 rounded-lg border">
                          <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest block mb-2">Checklist de Requisitos padrão ({phase.checklist?.length || 0})</span>
                          
                          <div className="space-y-1.5 max-h-56 overflow-y-auto mb-3">
                            {(phase.checklist || []).length === 0 ? (
                              <p className="text-[10px] text-[var(--text-3)] font-medium italic p-1">Sem itens no roteiro. Adicione uma tarefa obrigatória abaixo.</p>
                            ) : (
                              (phase.checklist || []).map((task, order) => {
                                const taskAlarms = (phase.alarmesTarefas || []).filter(ta => ta.tarefaText === task);
                                return (
                                  <div key={order} className="flex flex-col gap-1.5 bg-[var(--bg)] border p-2.5 rounded-lg hover:bg-[var(--surface-2)] transition text-xs">
                                    <div className="flex justify-between items-center gap-2">
                                      <span className="truncate pr-1 text-slate-750 font-semibold leading-tight">{task}</span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleTaskAlarmForm(idx, order)}
                                          className="text-amber-600 hover:text-amber-850 transition p-1 hover:bg-amber-100 rounded cursor-pointer"
                                          title="Agendar alarme para esta tarefa"
                                        >
                                          <Bell className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => handleRemoveChecklistTask(idx, order)}
                                          className="text-[var(--text-3)] hover:text-red-700 transition cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>

                                    {/* Display task alarms */}
                                    {taskAlarms.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {taskAlarms.map((ta) => (
                                          <span key={ta.id} className="inline-flex items-center gap-1 text-[9px] bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-medium leading-none">
                                            <Clock className="h-2.5 w-2.5 text-amber-600" />
                                            <span>{ta.titulo} (+{ta.diasOffset}d)</span>
                                            <button 
                                              onClick={() => handleRemoveTaskAlarm(idx, ta.id)}
                                              className="hover:text-red-700 font-bold ml-1 text-[11px] cursor-pointer"
                                              title="Excluir alarme da tarefa"
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Task Alarm Form */}
                                    {activeTaskAlarmForm === `${idx}-${order}` && (
                                      <div className="bg-amber-50/40 p-2 rounded-lg border border-amber-200 mt-1 space-y-1.5 animate-fade-in text-[10px]">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-amber-850 uppercase tracking-wider">Criar Alarme para esta Tarefa</span>
                                          <button 
                                            type="button" 
                                            onClick={() => setActiveTaskAlarmForm(null)}
                                            className="text-[10px] text-[var(--text-3)] font-bold hover:text-[var(--text-2)]"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                          <input 
                                            type="text"
                                            required
                                            placeholder="Título do lembrete"
                                            value={taskAlarmTitle}
                                            onChange={(e) => setTaskAlarmTitle(e.target.value)}
                                            className="w-full bg-[var(--surface)] border border-[var(--border)] p-1 rounded focus:outline-none"
                                          />
                                          <div className="flex gap-1.5">
                                            <input 
                                              type="number"
                                              min="0"
                                              placeholder="Dias"
                                              title="Offset em dias a partir da criação"
                                              value={taskAlarmOffset}
                                              onChange={(e) => setTaskAlarmOffset(Number(e.target.value))}
                                              className="w-14 bg-[var(--surface)] border border-[var(--border)] p-1 rounded text-center focus:outline-none font-semibold text-xs"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleAddTaskAlarm(idx, task)}
                                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold p-1 rounded text-[9px] flex-1 cursor-pointer"
                                            >
                                              Gravar
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Quick checklist addition inline */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newCheckItemText[idx] || ''}
                              onChange={(e) => setNewCheckItemText({ ...newCheckItemText, [idx]: e.target.value })}
                              placeholder="Adicionar tarefa para esta etapa..."
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistTask(idx))}
                              className="bg-[var(--surface)] border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] flex-1 max-w-sm font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddChecklistTask(idx)}
                              className="bg-[#1C1F26] hover:bg-slate-800 text-white p-1 rounded-lg px-3 flex items-center gap-1 font-bold cursor-pointer"
                            >
                              Adicionar item
                            </button>
                          </div>

                        </div>

                        {/* Stage-Level Alarms inside phase */}
                        <div className="border-t border-slate-200/60 pt-2.5 bg-white/50 p-2.5 rounded-lg border mt-2">
                          <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest block mb-1.5">Alarmes da Etapa ({phase.alarmesEtapa?.length || 0})</span>
                          
                          <div className="space-y-1.5 max-h-32 overflow-y-auto mb-2.5">
                            {(phase.alarmesEtapa || []).length === 0 ? (
                              <p className="text-[10px] text-[var(--text-3)] font-medium italic p-1">Sem alarmes criados para a etapa geral.</p>
                            ) : (
                              (phase.alarmesEtapa || []).map((alm) => (
                                <div key={alm.id} className="flex justify-between items-center gap-2 bg-red-50/50 border border-red-100 p-1.5 px-2.5 rounded-lg hover:bg-red-50 transition text-xs">
                                  <span className="font-semibold text-[var(--text-2)] flex items-center gap-1.5">
                                    <Bell className="h-3 w-3 text-[var(--primary)]" />
                                    <span>{alm.titulo}</span>
                                    <span className="text-slate-405 font-normal">({alm.diasOffset} {alm.diasOffset === 1 ? 'dia' : 'dias'} após início)</span>
                                  </span>
                                  <button
                                    onClick={() => handleRemoveStageAlarm(idx, alm.id)}
                                    className="text-[var(--text-3)] hover:text-red-700 transition cursor-pointer font-bold"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Quick stage-level alarm addition inline */}
                          <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                            <input
                              type="text"
                              value={newStageAlarmTitle[idx] || ''}
                              onChange={(e) => setNewStageAlarmTitle({ ...newStageAlarmTitle, [idx]: e.target.value })}
                              placeholder="Título do alarme da etapa..."
                              className="bg-[var(--surface)] border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] flex-1 min-w-[150px] font-semibold"
                            />
                            <div className="flex gap-1.5 items-center flex-shrink-0 w-full sm:w-auto">
                              <input
                                type="number"
                                min="0"
                                value={newStageAlarmOffset[idx] || ''}
                                placeholder="Dias"
                                onChange={(e) => setNewStageAlarmOffset({ ...newStageAlarmOffset, [idx]: e.target.value })}
                                className="w-16 bg-[var(--surface)] border rounded-lg px-1.5 py-1 text-center text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] font-semibold"
                                title="Número de dias após o início do processo"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddStageAlarm(idx)}
                                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white p-1 rounded-lg px-3 flex items-center gap-1 font-bold cursor-pointer text-xs w-full sm:w-auto justify-center"
                              >
                                Lembrete
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick inline Phase creator trigger */}
          <div className="pt-4 border-t border-[var(--border)]/60 bg-[var(--bg)] p-4.5 rounded-xl border border-dashed border-[var(--border)]">
            <h4 className="text-xs font-bold text-[var(--text)] uppercase flex items-center gap-1.5 mb-3">
              <PlusCircle className="h-4 w-4 text-[var(--primary)]" /> Acrescentar nova etapa à trilha
            </h4>
            
            <form onSubmit={handleAddPhaseToTrail} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase block mb-1">Título do Estágio</label>
                <input
                  type="text"
                  value={newPhaseName}
                  onChange={(e) => setNewPhaseName(e.target.value)}
                  placeholder="Ex: Obtenção de CNPJ"
                  className="w-full bg-[var(--surface)] border border-slate-350 p-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase block mb-1">Meta / Descrição SLA da Atividade</label>
                <input
                  type="text"
                  value={newPhaseMeta}
                  onChange={(e) => setNewPhaseMeta(e.target.value)}
                  placeholder="Ex: Deferimento na Receita Federal via DBE"
                  className="w-full bg-[var(--surface)] border border-slate-350 p-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-[var(--text-3)] uppercase block mb-1">Checklist de Itens Iniciais (Um por linha)</label>
                <textarea
                  value={newPhaseChecklistText}
                  onChange={(e) => setNewPhaseChecklistText(e.target.value)}
                  placeholder="Ex: Coletar DBE assinado&#10;Consultar deferimento no Coletor Nacional&#10;Imprimir CNPJ e enviar cópia"
                  rows={2}
                  className="w-full bg-[var(--surface)] border border-slate-350 p-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] placeholder-slate-400 leading-relaxed block font-semibold"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold p-2.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Registrar Estágio no Modelo
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};
