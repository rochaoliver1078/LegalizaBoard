import React, { useState, useEffect, useRef } from 'react';
import { parseDate, todayStr, formatDue, dueStatus } from '../utils/storage';

interface DatePickerModalProps {
  anchorRect: DOMRect | null;
  currentDue?: string;
  onSelect: (dueDate: string) => void;
  onClose: () => void;
}

const DP_MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DP_WEEKDAYS = ["D","S","T","Q","Q","S","S"];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  anchorRect,
  currentDue,
  onSelect,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selected = currentDue ? parseDate(currentDue) : null;

  const [viewDate, setViewDate] = useState<Date>(
    () => new Date((selected || today).getFullYear(), (selected || today).getMonth(), 1)
  );
  const [showMonths, setShowMonths] = useState<boolean>(false);
  const [panelYear, setPanelYear] = useState<number>(() => viewDate.getFullYear());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Position calculation
  const getStyle = (): React.CSSProperties => {
    if (!anchorRect) return { top: 100, left: 100 };
    const w = 340;
    const h = 420;
    let left = anchorRect.left;
    if (left + w > window.innerWidth - 12) left = window.innerWidth - w - 12;
    left = Math.max(12, left);
    let top = anchorRect.bottom + 6;
    if (top + h > window.innerHeight - 12) top = Math.max(12, anchorRect.top - h - 6);
    return { top: `${top}px`, left: `${left}px` };
  };

  const dpISO = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const dpAddDays = (base: Date, days: number) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setDate(d.getDate() + days);
    return d;
  };

  const handleQuickSelect = (daysOffset: number) => {
    const target = dpAddDays(today, daysOffset);
    onSelect(dpISO(target));
  };

  const handleDayClick = (dayNum: number) => {
    const target = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum);
    onSelect(dpISO(target));
  };

  const renderQuickSelects = () => {
    const tomorrow = dpAddDays(today, 1);
    const nextWeek = dpAddDays(today, 7);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const wd = (d: Date) => cap(d.toLocaleDateString("pt-BR", { weekday: "long" }));
    const full = (d: Date) => cap(d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }));

    return (
      <div className="dp-quick">
        <button className="dp-quick-item" onClick={() => handleQuickSelect(0)}>
          <span className="dp-ico blue">
            <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2.5" fill="currentColor"/><path d="M3 9h18" stroke="#fff" strokeWidth="1.6"/><path d="M8 3v3M16 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </span>
          <span className="dp-quick-label">Hoje</span>
          <span className="dp-quick-hint">{wd(today)}</span>
        </button>
        <button className="dp-quick-item" onClick={() => handleQuickSelect(1)}>
          <span className="dp-ico yellow">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </span>
          <span className="dp-quick-label">Amanhã</span>
          <span className="dp-quick-hint">{wd(tomorrow)}</span>
        </button>
        <button className="dp-quick-item" onClick={() => handleQuickSelect(7)}>
          <span className="dp-ico green">
            <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2.5" fill="currentColor"/><path d="M3 9h18" stroke="#fff" strokeWidth="1.6"/><circle cx="8" cy="13.5" r="1.3" fill="#fff"/><circle cx="12" cy="13.5" r="1.3" fill="#fff"/><circle cx="16" cy="13.5" r="1.3" fill="#fff"/><path d="M8 3v3M16 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </span>
          <span className="dp-quick-label">Próxima semana</span>
          <span className="dp-quick-hint">{full(nextWeek)}</span>
        </button>
      </div>
    );
  };

  const renderCalendar = () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const firstDayIndex = new Date(y, m, 1).getDay();
    const totalDays = new Date(y, m + 1, 0).getDate();

    const emptyCells = Array.from({ length: firstDayIndex });
    const dayCells = Array.from({ length: totalDays }, (_, i) => i + 1);

    return (
      <div className="dp-cal">
        <div className="dp-cal-head">
          <button className="dp-month-btn" onClick={() => { setShowMonths(true); setPanelYear(y); }}>
            {DP_MONTHS[m]} de {y}{' '}
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="dp-nav">
            <button className="dp-nav-btn prev" onClick={() => setViewDate(new Date(y, m - 1, 1))}>
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="dp-nav-btn" onClick={() => setViewDate(new Date(y, m + 1, 1))}>
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
        <div className="dp-grid-head">
          {DP_WEEKDAYS.map((w, idx) => (
            <span key={idx}>{w}</span>
          ))}
        </div>
        <div className="dp-grid">
          {emptyCells.map((_, i) => (
            <span key={`empty-${i}`} className="dp-day empty"></span>
          ))}
          {dayCells.map((d) => {
            const date = new Date(y, m, d);
            const isToday = date.getTime() === today.getTime();
            const isSel = selected && date.getTime() === selected.getTime();
            const cls = "dp-day" + (isToday ? " today" : "") + (isSel ? " selected" : "");
            return (
              <button key={`day-${d}`} className={cls} onClick={() => handleDayClick(d)}>
                {d}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonths = () => {
    return (
      <div className="dp-cal">
        <div className="dp-cal-head">
          <button className="dp-month-btn" onClick={() => setShowMonths(false)}>
            {panelYear}{' '}
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="dp-nav">
            <button className="dp-nav-btn prev" onClick={() => setPanelYear((yr) => yr - 1)}>
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="dp-nav-btn" onClick={() => setPanelYear((yr) => yr + 1)}>
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
        <div className="dp-months">
          {DP_MONTHS.map((name, i) => {
            const isSel = i === viewDate.getMonth() && panelYear === viewDate.getFullYear();
            return (
              <button
                key={name}
                className={`dp-month${isSel ? ' selected' : ''}`}
                onClick={() => {
                  setViewDate(new Date(panelYear, i, 1));
                  setShowMonths(false);
                }}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="datepicker" style={getStyle()}>
      {renderQuickSelects()}
      {showMonths ? renderMonths() : renderCalendar()}
      {currentDue && (
        <div className="dp-footer">
          <button className="dp-clear" onClick={() => onSelect('')}>
            Remover data
          </button>
        </div>
      )}
    </div>
  );
};
