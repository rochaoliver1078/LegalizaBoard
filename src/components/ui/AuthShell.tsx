import React from 'react';

interface AuthShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950 overflow-y-auto p-4">
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-30"
        style={{ background: 'radial-gradient(circle, var(--primary), transparent 70%)' }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, var(--primary-dark), transparent 70%)' }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg mb-4"
            style={{ background: `linear-gradient(135deg, var(--primary), var(--primary-dark))` }}
          >
            OP
          </div>
          {title && <h1 className="text-xl font-semibold text-white text-center">{title}</h1>}
          {subtitle && <p className="text-sm text-[var(--text-3)] text-center mt-1">{subtitle}</p>}
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
