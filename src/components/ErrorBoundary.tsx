import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Barreira de erro global: evita tela branca quando um erro de runtime
 * escapa — mostra um fallback amigável com opção de recarregar.
 */
interface ErrorBoundaryProps {
  children?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // O projeto não possui @types/react; declaramos os membros herdados
  // para o TypeScript sem alterar o comportamento em runtime.
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[LegalizaBoard] Erro não tratado na interface:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-200 shadow-2xl">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl text-white font-extrabold text-2xl shadow-lg mb-4">
            OP
          </div>
          <h1 className="text-lg font-bold text-white mb-2">Algo deu errado</h1>
          <p className="text-xs text-[var(--text-3)] leading-relaxed mb-1">
            Ocorreu um erro inesperado na aplicação. Seus dados estão seguros na nuvem —
            nada foi perdido.
          </p>
          {this.state.errorMessage && (
            <p className="text-[10px] font-mono text-[var(--text-3)] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 mt-3 mb-4 break-all">
              {this.state.errorMessage}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-2.5 px-6 rounded-lg text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
