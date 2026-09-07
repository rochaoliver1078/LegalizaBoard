import React, { useState, useRef } from 'react';
import { Board } from '../types';
import { FILTERS } from '../utils/storage';
import { BoardMenuModal } from './BoardMenuModal';

interface BoardHeaderProps {
  board: Board;
  currentFilter: string;
  onUpdateBoardName: (newName: string) => void;
  onChangeFilter: (filterId: string) => void;
  onShareBoard: () => void;
  onChangeBoardColor: (color: string) => void;
  onDeleteBoard: () => void;
  titleInputRef?: React.RefObject<HTMLHeadingElement | null>;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  board,
  currentFilter,
  onUpdateBoardName,
  onChangeFilter,
  onShareBoard,
  onChangeBoardColor,
  onDeleteBoard,
  titleInputRef,
}) => {
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [boardMenuAnchor, setBoardMenuAnchor] = useState<DOMRect | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const filterLabel = FILTERS.find((f) => f.id === currentFilter)?.label || "Todas";

  const handleOpenBoardMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setBoardMenuAnchor(rect);
    setShowBoardMenu(true);
  };

  const getFilterMenuPositionStyle = (): React.CSSProperties => {
    if (!filterBtnRef.current) return { top: 0, left: 0 };
    const rect = filterBtnRef.current.getBoundingClientRect();
    let left = Math.min(rect.left, window.innerWidth - 180);
    let top = rect.bottom + 6;
    return { top: `${top}px`, left: `${left}px` };
  };

  return (
    <div className="board-header">
      <div className="board-title-wrap">
        <h1
          ref={titleInputRef}
          className="board-title"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onBlur={(e) => {
            const val = e.currentTarget.textContent?.trim();
            if (val) onUpdateBoardName(val);
            else e.currentTarget.textContent = board.name;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLElement).blur();
            }
          }}
        >
          {board.name}
        </h1>
        <button
          className={`board-menu-btn${showBoardMenu ? ' open' : ''}`}
          title="Mais opções"
          onClick={handleOpenBoardMenu}
        >
          <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/></svg>
        </button>
      </div>

      <div className="board-actions">
        <button
          ref={filterBtnRef}
          className="chip-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowFilterMenu((p) => !p);
          }}
        >
          <svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <span>{filterLabel}</span>
        </button>

        <button
          className="chip-btn danger-hover"
          title="Excluir quadro"
          onClick={onDeleteBoard}
        >
          <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
        </button>
      </div>

      {showBoardMenu && (
        <BoardMenuModal
          anchorRect={boardMenuAnchor}
          board={board}
          onRename={() => {
            setShowBoardMenu(false);
            if (titleInputRef?.current) {
              titleInputRef.current.focus();
              const sel = window.getSelection();
              sel?.selectAllChildren(titleInputRef.current);
            }
          }}
          onShare={() => {
            setShowBoardMenu(false);
            onShareBoard();
          }}
          onChangeColor={(col) => {
            setShowBoardMenu(false);
            onChangeBoardColor(col);
          }}
          onDelete={() => {
            setShowBoardMenu(false);
            onDeleteBoard();
          }}
          onClose={() => setShowBoardMenu(false)}
        />
      )}

      {showFilterMenu && (
        <div className="dropdown" style={getFilterMenuPositionStyle()} onClick={(e) => e.stopPropagation()}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className="dropdown-item"
              onClick={() => {
                setShowFilterMenu(false);
                onChangeFilter(f.id);
              }}
            >
              {f.id === currentFilter ? "✓ " : ""}{f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
