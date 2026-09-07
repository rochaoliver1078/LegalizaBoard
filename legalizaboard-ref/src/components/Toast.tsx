import React from 'react';

interface ToastProps {
  message: string | null;
  withUndo?: boolean;
  onUndo?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, withUndo, onUndo }) => {
  if (!message) return null;

  return (
    <div className="toast">
      <span>{message}</span>
      {withUndo && onUndo && (
        <button className="toast-action" onClick={onUndo}>
          Desfazer
        </button>
      )}
    </div>
  );
};
