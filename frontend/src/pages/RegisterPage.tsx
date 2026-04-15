// ============================================================
// Na Gaveta — Página de Cadastro
// ============================================================

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, User, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, Divider } from '../components/ui';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name || name.trim().length < 2) newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    if (!email) newErrors.email = 'E-mail é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'E-mail inválido';
    if (!password || password.length < 6) newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    if (password !== confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register({ name: name.trim(), email, password });
      toast.success('Conta criada! Bem-vindo ao Na Gaveta!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Indicador de força da senha
  const passwordStrength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : 3;

  const strengthColors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-live'];
  const strengthLabels = ['', 'Fraca', 'Média', 'Forte'];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">

        {/* ── Logo ─────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 mb-4">
            <Trophy className="w-7 h-7 text-brand" />
          </div>
          <h1 className="text-2xl font-black text-text-primary">Criar conta grátis</h1>
          <p className="text-text-secondary text-sm mt-2">
            Junte-se a milhares de boleiros brasileiros.
          </p>
        </div>

        {/* ── Benefícios rápidos ───────────────────────────── */}
        <div className="flex justify-center gap-6 mb-6">
          {['Grátis para sempre', 'Sem cartão', 'Sem anúncios'].map((benefit) => (
            <div key={benefit} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <CheckCircle className="w-3.5 h-3.5 text-live flex-shrink-0" />
              {benefit}
            </div>
          ))}
        </div>

        {/* ── Formulário ───────────────────────────────────── */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-elevated">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            <Input
              label="Nome completo"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              leftIcon={<User className="w-4 h-4" />}
              autoComplete="name"
              autoFocus
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />

            <div>
              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  leftIcon={<Lock className="w-4 h-4" />}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Indicador de força */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          level <= passwordStrength ? strengthColors[passwordStrength] : 'bg-border-default'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-text-muted">{strengthLabels[passwordStrength]}</span>
                </div>
              )}
            </div>

            <Input
              label="Confirmar senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="new-password"
            />

            <Divider />

            <Button type="submit" fullWidth isLoading={isLoading}>
              Criar conta grátis
            </Button>

            <p className="text-center text-xs text-text-muted">
              Ao criar uma conta, você concorda com nossos{' '}
              <button type="button" className="text-brand hover:underline">Termos de Uso</button>
              {' '}e{' '}
              <button type="button" className="text-brand hover:underline">Política de Privacidade</button>.
            </p>
          </form>
        </div>

        {/* ── Link para login ──────────────────────────────── */}
        <p className="text-center text-text-secondary text-sm mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand hover:text-brand-light font-semibold transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
