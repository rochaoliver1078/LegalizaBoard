import React, { useState, useEffect, useRef } from 'react';
import { Board } from '../types';
import { COLORS } from '../utils/storage';

interface BoardMenuModalProps {
  anchorRect: DOMRect | null;
  board: Board;
  onRename: () => void;
  onShare: () => void;
  onChangeColor: (color: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const BoardMenuModal: React.FC<BoardMenuModalProps> = ({
  anchorRect,
  board,
  onRename,
  onShare,
  onChangeColor,
  onDelete,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

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
    const w = 240;
    let left = Math.min(anchorRect.left, window.innerWidth - w - 12);
    let top = anchorRect.bottom + 4;
    return { top: `${top}px`, left: `${left}px` };
  };

  if (showColorPicker) {
    return (
      <div ref={containerRef} className="dropdown board-bg-picker" style={getStyle()}>
        <div className="board-bg-label">Cor do quadro</div>
        <div className="board-bg-row">
          {COLORS.filter((c) => c.value).map((c) => {
            const isSelected = (board.color || "#d93025") === c.value;
            return (
              <button
                key={c.id}
                className={`color-swatch${isSelected ? ' selected' : ''}`}
                style={{ background: c.value }}
                title={c.label || c.id}
                onClick={() => {
                  onChangeColor(c.value);
                  onClose();
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="dropdown" style={getStyle()}>
      <button className="dropdown-item" onClick={onRename}>
        <svg viewBox="0 0 24 24"><path d="M4 20h4L20 8l-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round"/></svg>
        Renomear quadro
      </button>
      <button className="dropdown-item" onClick={onShare}>
        <svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" fill="none"/><circle cx="17" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.8" fill="none"/><circle cx="17" cy="18" r="2.4" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6" stroke="currentColor" strokeWidth="1.8"/></svg>
        Compartilhar quadro
      </button>
      <button className="dropdown-item" onClick={() => setShowColorPicker(true)}>
        <svg viewBox="0 0 24 24"><path d="M4 20h4L20 8l-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round"/><circle cx="17.5" cy="6.5" r="1.4" fill="currentColor"/></svg>
        Alterar fundo
      </button>
      <button className="dropdown-item danger" onClick={onDelete}>
        <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
        Excluir quadro
      </button>
    </div>
  );
};
