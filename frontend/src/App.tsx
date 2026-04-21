// ============================================================
// Na Gaveta — App Root com Roteamento v3
// CORREÇÃO: BrowserRouter envolve AuthProvider para que
// useNavigate() funcione dentro do AuthProvider
// ============================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Providers
import { AuthProvider } from './hooks/useAuth';

// Layouts
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Páginas
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import PoolsPage from './pages/PoolsPage';
import PoolDetailPage from './pages/PoolDetailPage';
import PoolRankingPage from './pages/PoolRankingPage';
import ProfilePage from './pages/ProfilePage';
import { AdminUsersPage } from './pages/AdminUsersPage';

// Configuração do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ── Rotas com layout principal ─────────────── */}
            <Route element={<MainLayout />}>
              {/* Públicas */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Bolões — públicos podem ver, mas precisam de login para palpitar */}
              <Route path="/pools" element={<PoolsPage />} />
              <Route path="/pools/:id" element={<PoolDetailPage />} />
              <Route path="/pools/:id/ranking" element={<PoolRankingPage />} />

              {/* Protegidas (requerem autenticação) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="/admin/users" element={<AdminUsersPage />} />
</Routes>
        </AuthProvider>
      </BrowserRouter>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181B',
            color: '#E5E7EB',
            border: '1px solid #27272A',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#22C55E', secondary: '#18181B' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#18181B' },
          },
        }}
      />
    </QueryClientProvider>
  );
}
