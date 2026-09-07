import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  maxWidthClassName?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  maxWidthClassName = 'max-w-lg',
  children,
}) => {
  if (!open) return null;

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`modal-shell w-full ${maxWidthClassName} max-h-[92vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
            <button
              className="btn btn-ghost !p-1.5"
              onClick={onClose}
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className={title ? 'p-6' : ''}>{children}</div>
      </div>
    </div>
  );
};
