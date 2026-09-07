import React, { useRef } from 'react';
import { MAX_FILE_BYTES, formatBytes } from '../utils/storage';

interface FileUploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  onShowToast: (msg: string) => void;
  label?: string;
  hint?: string;
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  onFilesSelected,
  onShowToast,
  label = "Escolher arquivos",
  hint,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    if (!files.length) return;

    const validFiles: File[] = [];
    files.forEach((file) => {
      if (file.size > MAX_FILE_BYTES) {
        onShowToast(`"${file.name}" tem ${formatBytes(file.size)} — limite de ${formatBytes(MAX_FILE_BYTES)}`);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length) {
      onFilesSelected(validFiles);
    }
    e.target.value = "";
  };

  return (
    <>
      <input
        type="file"
        multiple
        className="hidden"
        ref={inputRef}
        onChange={handleChange}
      />
      <button
        type="button"
        className="editor-chip"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
          <path d="M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {label}
      </button>
      {hint && <div className="editor-hint">{hint}</div>}
    </>
  );
};
