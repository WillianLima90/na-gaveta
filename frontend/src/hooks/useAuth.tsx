// ============================================================
// Na Gaveta — Hook e Context de Autenticação v5
// Estado global de auth sem biblioteca externa
//
// DESIGN DE SESSÃO:
// 1. Na montagem: token e user são lidos do localStorage de forma SÍNCRONA
//    via lazy initial state do useState — sem useEffect, sem isLoading=true
// 2. Validação: acontece naturalmente na primeira requisição real via interceptor
//    401 do Axios (api.ts). Se o token expirou, o backend retorna 401 →
//    interceptor limpa localStorage + dispara 'ng:unauthorized' → logout + redirect
// 3. Sem getProfile() automático — evita re-renders e ciclos de loading
// 4. Context value memoizado com useMemo — evita re-renders em consumers
//    quando o provider re-renderiza por razões externas
//
// CORREÇÃO v5:
// - Substituído useEffect de restauração por lazy initial state do useState
// - Isso elimina o ciclo: isLoading=true → Spinner global → isLoading=false →
//   DashboardPage monta → loading interno → dados carregam → dashboard visível
// - O isLoading agora é sempre false (não há estado de carregamento global)
// - O ProtectedRoute não precisa mais aguardar isLoading
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import type { User, LoginPayload, RegisterPayload } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ── Lazy initial state: lê localStorage de forma SÍNCRONA na montagem ──
  // Não há useEffect de restauração. Não há isLoading=true inicial.
  // O estado já está correto desde o primeiro render.
  const [token, setToken] = useState<string | null>(() => authService.getStoredToken());
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());

  // isLoading é sempre false — não há carregamento global de sessão
  // Mantido na interface para compatibilidade com ProtectedRoute
  const isLoading = false;

  const navigate = useNavigate();
  const isRedirecting = useRef(false);

  const logout = useCallback(() => {
    authService.clearSession();
    setToken(null);
    setUser(null);
  }, []);

  // ── Listener de 401 do interceptor Axios ─────────────────
  // Soft redirect via React Router — não destrói o estado do React
  // isRedirecting evita que múltiplos 401 simultâneos disparem vários redirects
  useEffect(() => {
    const handleUnauthorized = () => {
      if (isRedirecting.current) return;
      isRedirecting.current = true;
      logout();
      navigate('/login', { replace: true });
      setTimeout(() => { isRedirecting.current = false; }, 1000);
    };

    window.addEventListener('ng:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('ng:unauthorized', handleUnauthorized);
  }, [logout, navigate]);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authService.login(payload);
    authService.saveSession(response.token, response.user);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await authService.register(payload);
    authService.saveSession(response.token, response.user);
    setToken(response.token);
    setUser(response.user);
  }, []);

  // ── Context value memoizado ──────────────────────────────
  // Memoizar o value evita que todos os consumers re-renderizem quando o
  // AuthProvider re-renderiza por razões externas (ex: navigate, router updates).
  // O value só muda quando user, token, login, register ou logout mudam de fato.
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para consumir o contexto
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return ctx;
}
