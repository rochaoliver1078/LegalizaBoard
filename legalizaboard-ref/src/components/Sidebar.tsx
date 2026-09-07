import React from 'react';
import { Board } from '../types';

interface SidebarProps {
  boards: Board[];
  activeBoardId: string;
  collapsed: boolean;
  onSelectBoard: (boardId: string) => void;
  onAddBoard: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  boards,
  activeBoardId,
  collapsed,
  onSelectBoard,
  onAddBoard,
}) => {
  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0];

  const totalTasks = activeBoard
    ? activeBoard.lists.reduce((acc, l) => acc + l.tasks.length, 0)
    : 0;

  const completedTasks = activeBoard
    ? activeBoard.lists.reduce(
        (acc, l) => acc + l.tasks.filter((t) => t.done).length,
        0
      )
    : 0;

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`} id="sidebar">
      <div className="sidebar-section-title">Meus quadros</div>
      <nav className="board-nav">
        {boards.map((board) => {
          const pendingCount = board.lists.reduce(
            (acc, l) => acc + l.tasks.filter((t) => !t.done).length,
            0
          );
          const isActive = board.id === activeBoardId;
          return (
            <div
              key={board.id}
              className={`board-nav-item${isActive ? ' active' : ''}`}
              onClick={() => onSelectBoard(board.id)}
            >
              <span
                className="board-dot"
                style={{ background: board.color || "#d93025" }}
              />
              <span className="board-name">{board.name}</span>
              <span className="board-count">{pendingCount}</span>
            </div>
          );
        })}
      </nav>

      <button className="sidebar-add-btn" onClick={onAddBoard}>
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Novo quadro
      </button>

      <div className="sidebar-footer">
        <div className="progress-card">
          <div className="progress-label">
            <span>{completedTasks} de {totalTasks} concluídas</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
