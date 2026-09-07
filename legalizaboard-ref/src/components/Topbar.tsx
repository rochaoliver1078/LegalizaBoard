import React, { useState, useRef } from 'react';

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleSidebar: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onClearBoardCompleted: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const Topbar: React.FC<TopbarProps> = ({
  searchQuery,
  onSearchChange,
  onToggleSidebar,
  theme,
  onToggleTheme,
  onExportData,
  onImportData,
  onClearBoardCompleted,
  searchInputRef,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const getMenuPositionStyle = (): React.CSSProperties => {
    if (!menuBtnRef.current) return { top: 0, left: 0 };
    const rect = menuBtnRef.current.getBoundingClientRect();
    let left = Math.min(rect.left, window.innerWidth - 250);
    let top = rect.bottom + 6;
    return { top: `${top}px`, left: `${left}px` };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
      e.target.value = "";
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" onClick={onToggleSidebar} title="Menu">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 100 100" aria-label="LegalizaBoard">
              <rect x="14" y="8" width="30" height="84" rx="9" fill="#d93025"/>
              <rect x="54" y="62" width="30" height="30" rx="9" fill="#d93025"/>
            </svg>
          </div>
          <span className="logo-text">
            LegalizaBoard <span className="premium-badge">PREMIUM</span>
          </span>
        </div>
      </div>

      <div className="topbar-center">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" className="search-icon"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Pesquisar tarefas... (pressione /)"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="icon-btn search-clear"
              title="Limpar"
              onClick={() => onSearchChange("")}
            >
              <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="topbar-right">
        <button className="icon-btn" onClick={onToggleTheme} title="Alternar tema">
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" className="icon-sun"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="icon-moon"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/></svg>
          )}
        </button>

        <button
          ref={menuBtnRef}
          className="icon-btn"
          title="Mais opções"
          onClick={() => setShowMenu((prev) => !prev)}
        >
          <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>
        </button>

        {showMenu && (
          <div className="dropdown" style={getMenuPositionStyle()} onClick={(e) => e.stopPropagation()}>
            <button
              className="dropdown-item"
              onClick={() => {
                setShowMenu(false);
                onExportData();
              }}
            >
              <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Exportar dados (JSON)
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                setShowMenu(false);
                fileInputRef.current?.click();
              }}
            >
              <svg viewBox="0 0 24 24"><path d="M12 15V3m0 0L8 7m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Importar dados
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                setShowMenu(false);
                onClearBoardCompleted();
              }}
            >
              <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
              Limpar concluídas do quadro
            </button>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="avatar" title="rochaoliver1078@gmail.com">
          R
        </div>
      </div>
    </header>
  );
};
