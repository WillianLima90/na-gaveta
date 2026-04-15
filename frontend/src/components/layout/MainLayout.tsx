// ============================================================
// Na Gaveta — Layout Principal
// Wrapper com Navbar e footer para páginas públicas e privadas
// ============================================================

import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Navbar />

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border-subtle py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-text-muted text-sm">
            © {new Date().getFullYear()} Na Gaveta. Todos os direitos reservados.
          </p>
          <p className="text-text-muted text-xs">
            Feito com ❤️ para o futebol brasileiro
          </p>
        </div>
      </footer>
    </div>
  );
}
