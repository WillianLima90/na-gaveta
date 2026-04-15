// ============================================================
// Na Gaveta — Componentes UI Base
// Biblioteca interna de componentes reutilizáveis
// ============================================================

import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

// ── Button ───────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary: 'bg-brand hover:bg-brand-dark text-white shadow-brand/20',
    secondary: 'bg-bg-card border border-border-default hover:border-brand text-text-primary hover:bg-bg-elevated',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
    danger: 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

// ── Input ────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, error, leftIcon, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={clsx(
            'w-full px-4 py-3 rounded-xl text-sm text-text-primary',
            'bg-bg-elevated border transition-all duration-150',
            'placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent',
            error ? 'border-red-500/50 focus:ring-red-500' : 'border-border-default',
            leftIcon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className, onClick, hoverable = false }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-card',
        hoverable && 'hover:border-border-default hover:shadow-elevated transition-all duration-200 cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'live' | 'brand' | 'success' | 'warning';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-bg-elevated text-text-secondary border-border-subtle',
    live: 'bg-live/10 text-live border-live/20',
    brand: 'bg-brand/10 text-brand border-brand/20',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
    >
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
      )}
      {children}
    </span>
  );
}

// ── Spinner ──────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return <Loader2 className={clsx(sizes[size], 'animate-spin text-brand')} />;
}

// ── Divider ──────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-border-subtle my-4" />;

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border-subtle" />
      <span className="text-xs text-text-muted font-medium">{label}</span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  );
}
