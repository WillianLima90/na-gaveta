// ============================================================
// Na Gaveta — Página de Login
// ============================================================

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button, Input } from '../components/ui';
import toast from 'react-hot-toast';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Redirecionar para a rota de origem após login
  const stateFrom = (location.state as { from?: string | { pathname?: string; search?: string; hash?: string } } | null)?.from;
  const from = typeof stateFrom === 'string'
    ? stateFrom
    : stateFrom?.pathname
      ? `${stateFrom.pathname}${stateFrom.search || ''}${stateFrom.hash || ''}`
      : '/dashboard';

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'E-mail é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'E-mail inválido';
    if (!password) newErrors.password = 'Senha é obrigatória';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await login({ email, password });
      toast.success('Bem-vindo de volta!');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'E-mail ou senha incorretos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100svh-3.5rem)] flex items-start justify-center px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:items-start sm:pt-10">
      <div className="w-full max-w-sm animate-slide-up">

        {/* ── Logo ─────────────────────────────────────────── */}
        <div className="text-center mb-5">
          <img
            src="/logo.png"
            alt="Na Gaveta"
            className="mx-auto h-20 w-20 object-contain mb-3"
          />
          <h1 className="text-2xl font-black text-text-primary">Entrar na conta</h1>
          <p className="text-text-secondary text-sm mt-1">
            Bem-vindo de volta! Acesse seus bolões.
          </p>
        </div>

        {/* ── Formulário ───────────────────────────────────── */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-elevated">
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>

            <Input
              name="email"
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              autoFocus
            />

            <div className="relative">
              <Input
                name="password"
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                leftIcon={<Lock className="w-4 h-4" />}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* TODO: implementar "Esqueci a senha" */}
            <div className="flex justify-end -mt-1">
              <button type="button" className="text-xs text-brand hover:text-brand-light transition-colors">
                Esqueci minha senha
              </button>
            </div>

            <Button type="submit" fullWidth isLoading={isLoading} className="mt-2">
              Entrar
            </Button>
          </form>

        </div>

        {/* ── Link para cadastro ───────────────────────────── */}
        <p className="text-center text-text-secondary text-sm mt-4 pb-1">
          Não tem conta?{' '}
          <Link
            to="/register"
            state={{ from: location.state ? (location.state as { from?: { pathname: string } }).from : undefined }}
            className="text-brand hover:text-brand-light font-semibold transition-colors"
          >
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
