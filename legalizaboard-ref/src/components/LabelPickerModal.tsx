import React, { useState, useEffect, useRef } from 'react';
import { Label } from '../types';
import { COLORS, labelHex, uid } from '../utils/storage';

interface LabelPickerModalProps {
  anchorRect: DOMRect | null;
  selectedLabels: string[];
  allLabels: Label[];
  onToggleLabel: (labelId: string) => void;
  onCreateLabel: (name: string) => void;
  onUpdateLabel: (updatedLabel: Label) => void;
  onDeleteLabel: (labelId: string) => void;
  onClose: () => void;
}

export const LabelPickerModal: React.FC<LabelPickerModalProps> = ({
  anchorRect,
  selectedLabels,
  allLabels,
  onToggleLabel,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [manageMode, setManageMode] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const getStyle = (): React.CSSProperties => {
    if (!anchorRect) return { top: 100, left: 100 };
    const w = 300;
    const h = 340;
    let left = Math.max(12, Math.min(anchorRect.left, window.innerWidth - w - 12));
    let top = anchorRect.bottom + 6;
    if (top + h > window.innerHeight - 12) top = Math.max(12, anchorRect.top - h - 6);
    return { top: `${top}px`, left: `${left}px` };
  };

  const q = query.trim().toLowerCase();
  const hits = allLabels.filter((l) => !q || l.name.toLowerCase().includes(q));
  const exact = allLabels.some((l) => l.name.toLowerCase() === q);

  const handleCycleColor = (label: Label) => {
    const pal = COLORS.filter((c) => c.value);
    const idx = pal.findIndex((c) => c.id === label.color);
    const nextColor = pal[(idx + 1) % pal.length].id;
    onUpdateLabel({ ...label, color: nextColor });
  };

  const handleAddNewLabel = () => {
    const used = allLabels.map((l) => l.color);
    const free = COLORS.filter((c) => c.value && !used.includes(c.id))[0] || COLORS[1];
    const newLbl: Label = { id: uid(), emoji: "🏷", name: "Nova etiqueta", color: free.id };
    onCreateLabel(newLbl.name);
  };

  return (
    <div ref={containerRef} className="labelpicker" style={getStyle()}>
      {!manageMode ? (
        <>
          <div className="lp-search-wrap">
            <input
              className="lp-search"
              type="text"
              placeholder="Pesquisar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const term = query.trim();
                  if (!term) return;
                  const hit = allLabels.find((l) => l.name.toLowerCase() === term.toLowerCase());
                  if (hit) onToggleLabel(hit.id);
                  else {
                    onCreateLabel(term);
                    setQuery("");
                  }
                }
              }}
              autoFocus
            />
          </div>
          <div className="lp-list">
            {hits.map((l) => {
              const on = selectedLabels.includes(l.id);
              const c = labelHex(l);
              return (
                <button
                  key={l.id}
                  className={`lp-item${on ? ' on' : ''}`}
                  onClick={() => onToggleLabel(l.id)}
                >
                  <span className="label-pill" style={{ background: `${c}${on ? "33" : "22"}`, color: c }}>
                    {l.emoji} {l.name}
                  </span>
                  <span className="lp-check">
                    {on && (
                      <svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </span>
                </button>
              );
            })}
            {q && !exact && (
              <button
                className="lp-item lp-create"
                onClick={() => {
                  onCreateLabel(query.trim());
                  setQuery("");
                }}
              >
                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <span>Criar "{query.trim()}"</span>
              </button>
            )}
            {!hits.length && !q && <div className="lp-empty">Nenhuma etiqueta</div>}
          </div>
          <div className="lp-footer">
            <button className="lp-foot-btn" onClick={() => setManageMode(true)}>
              <svg viewBox="0 0 24 24"><path d="M4 20h4L20 8l-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round"/></svg>
              <span>Gerenciar etiquetas</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="lp-head">
            <button className="lp-back" onClick={() => setManageMode(false)}>
              <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span>Gerenciar etiquetas</span>
          </div>
          <div className="lp-manage">
            {allLabels.map((l) => (
              <div key={l.id} className="lp-row">
                <input
                  className="lp-emoji"
                  maxLength={2}
                  value={l.emoji}
                  onChange={(e) => onUpdateLabel({ ...l, emoji: e.target.value || "🏷" })}
                />
                <input
                  className="lp-name"
                  value={l.name}
                  onChange={(e) => onUpdateLabel({ ...l, name: e.target.value })}
                />
                <button
                  className="lp-color"
                  style={{ background: labelHex(l) }}
                  title="Trocar cor"
                  onClick={() => handleCycleColor(l)}
                />
                <button
                  className="lp-del"
                  title="Excluir"
                  onClick={() => onDeleteLabel(l.id)}
                >
                  <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="lp-footer">
            <button className="lp-foot-btn" onClick={handleAddNewLabel}>
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>Nova etiqueta</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
