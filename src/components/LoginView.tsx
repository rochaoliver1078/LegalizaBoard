import React, { useState } from 'react';
import { signIn, signUp, resetPassword } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight,
  CheckCircle2, AlertCircle, KeyRound,
} from 'lucide-react';

interface LoginViewProps {
  onSuccess: (session: Session) => void;
  showToast: (msg: string, isError?: boolean) => void;
}

type Modo = 'login' | 'cadastro' | 'recuperar';

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, showToast }) => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modo, setModo]                 = useState<Modo>('login');
  const [isLoading, setIsLoading]       = useState(false);
  const [localToast, setLocalToast]     = useState<{ msg: string; isError: boolean } | null>(null);

  const triggerToast = (msg: string, isError = false) => {
    setLocalToast({ msg, isError });
    showToast(msg, isError);
    setTimeout(() => setLocalToast(null), 4500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (modo !== 'recuperar' && !password)) {
      triggerToast('Por favor, preencha todos os campos.', true);
      return;
    }

    setIsLoading(true);
    try {
      if (modo === 'recuperar') {
        await resetPassword(email);
        triggerToast('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
        setModo('login');
      } else if (modo === 'cadastro') {
        const session = await signUp(email, password);
        if (!session) {
          triggerToast('Conta criada! Confirme seu e-mail antes de entrar.');
          setModo('login');
        } else {
          triggerToast('Conta criada com sucesso! Carregando painel…');
          onSuccess(session);
        }
      } else {
        const session = await signIn(email, password);
        triggerToast('Login efetuado com sucesso! Carregando painel…');
        onSuccess(session);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado na operação.';
      triggerToast(msg, true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#1e3a8a,transparent_45%)] opacity-30 select-none pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,#065f46,transparent_45%)] opacity-20 select-none pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] opacity-50 select-none pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-3xl text-slate-200 relative z-10 transition-all duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl shadow-lg mb-4">
            <svg viewBox="0 0 100 100" className="w-7 h-7" aria-label="LegalizaBoard">
              <rect x="14" y="8" width="30" height="84" rx="9" fill="#FFFFFF" />
              <rect x="54" y="62" width="30" height="30" rx="9" fill="#FFFFFF" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">LegalizaBoard</h1>
          <p className="text-xs text-[var(--text-3)] mt-1 uppercase tracking-widest font-semibold text-center">
            Gestão Societária &amp; Trâmites de Fases
          </p>
        </div>

        {modo !== 'recuperar' && (
          <div className="flex bg-slate-950 p-1.5 rounded-xl mb-6 border border-slate-800/80">
            <button
              type="button"
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${modo === 'login' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-3)] hover:text-white'}`}
              onClick={() => setModo('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${modo === 'cadastro' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-3)] hover:text-white'}`}
              onClick={() => setModo('cadastro')}
            >
              Cadastrar
            </button>
          </div>
        )}

        {modo === 'recuperar' && (
          <div className="mb-6 flex items-center gap-2 text-xs text-[var(--text-3)] bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3">
            <KeyRound className="h-4 w-4 text-[var(--yellow)] shrink-0" />
            <span>Informe seu e-mail para receber o link de redefinição de senha.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] text-[var(--text-3)] uppercase tracking-wider mb-1 font-bold">
              E-mail Profissional
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-[var(--text-3)]" />
              <input
                type="email"
                required
                placeholder="seu.email@legalizaboard.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/35 rounded-lg text-xs pl-10 pr-4 py-2.5 text-slate-100 transition-all placeholder:text-[var(--text-2)]"
              />
            </div>
          </div>

          {modo !== 'recuperar' && (
            <div>
              <label className="block text-[10px] text-[var(--text-3)] uppercase tracking-wider mb-1 font-bold">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-[var(--text-3)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Digite sua senha de acesso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/35 rounded-lg text-xs pl-10 pr-10 py-2.5 text-slate-100 transition-all placeholder:text-[var(--text-2)]"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-[var(--text-3)] hover:text-[var(--text-3)] cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] active:bg-[var(--primary-dark)] text-white py-2.5 rounded-lg text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
                <span>{modo === 'recuperar' ? 'Enviando…' : 'Autenticando…'}</span>
              </>
            ) : (
              <>
                <span>
                  {modo === 'recuperar'
                    ? 'Enviar Link de Redefinição'
                    : modo === 'cadastro'
                      ? 'Criar Conta de Acesso'
                      : 'Entrar no Painel Societário'}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          {modo === 'recuperar' ? (
            <button
              type="button"
              onClick={() => setModo('login')}
              className="text-[11px] text-[var(--text-3)] hover:text-white font-semibold cursor-pointer transition-colors"
            >
              ← Voltar para o login
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModo('recuperar')}
              className="text-[11px] text-[var(--yellow)] hover:text-[var(--primary-dark)] font-semibold cursor-pointer transition-colors"
            >
              Esqueci minha senha
            </button>
          )}
        </div>
      </div>

      {localToast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 text-xs font-medium tracking-wide text-white border ${
            localToast.isError
              ? 'bg-red-950/90 border-red-800/80 text-red-100'
              : 'bg-emerald-950/90 border-emerald-800/80 text-emerald-100'
          }`}
        >
          {localToast.isError ? (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          )}
          <span>{localToast.msg}</span>
        </div>
      )}
    </div>
  );
};
