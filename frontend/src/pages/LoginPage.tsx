// ============================================================
// Na Gaveta — Página de Login
// ============================================================

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Mail, Lock, Eye, EyeOff } from 'lucide-react';
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
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">

        {/* ── Logo ─────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 mb-4">
            <Trophy className="w-7 h-7 text-brand" />
          </div>
          <h1 className="text-2xl font-black text-text-primary">Entrar na conta</h1>
          <p className="text-text-secondary text-sm mt-2">
            Bem-vindo de volta! Acesse seus bolões.
          </p>
        </div>

        {/* ── Formulário ───────────────────────────────────── */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-elevated">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            <Input
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
            <div className="flex justify-end">
              <button type="button" className="text-xs text-brand hover:text-brand-light transition-colors">
                Esqueci minha senha
              </button>
            </div>

            <Button type="submit" fullWidth isLoading={isLoading} className="mt-2">
              Entrar
            </Button>
          </form>

          {/* ── Credenciais de teste (apenas em dev) ─────────── */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-3 rounded-xl bg-bg-elevated border border-border-subtle">
              <p className="text-xs text-text-muted font-medium mb-2">🧪 Credenciais de teste:</p>
              <button
                type="button"
                onClick={() => { setEmail('admin@nagaveta.com'); setPassword('senha123'); }}
                className="text-xs text-brand hover:underline block"
              >
                admin@nagaveta.com / senha123
              </button>
            </div>
          )}
        </div>

        {/* ── Link para cadastro ───────────────────────────── */}
        <p className="text-center text-text-secondary text-sm mt-6">
          Não tem conta?{' '}
          <Link to="/register" className="text-brand hover:text-brand-light font-semibold transition-colors">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
