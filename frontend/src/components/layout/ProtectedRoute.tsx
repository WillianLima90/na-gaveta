// ============================================================
// Na Gaveta — Rota Protegida v2
// Redireciona para /login se o usuário não estiver autenticado
//
// DESIGN:
// - O token é lido do localStorage de forma síncrona no useState inicial
//   (lazy initial state no AuthProvider) — não há isLoading=true
// - Verifica apenas a presença do token — primitivo estável
// - NÃO depende do objeto user (que pode mudar de referência)
// - Se token inválido: o interceptor 401 trata na próxima requisição real
//
// CORREÇÃO v2:
// - Removido o bloco if (isLoading) — isLoading é sempre false agora
// - Sem Spinner global — o dashboard tem seu próprio loading interno
// ============================================================
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute() {
  const { token } = useAuth();
  const location = useLocation();

  // Verificar presença do token (primitivo string — estável)
  // Se o token estiver expirado, o backend retornará 401 na primeira requisição
  // real e o interceptor Axios tratará via evento ng:unauthorized → logout → /login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
