// ============================================================
// Na Gaveta — Página 404
// ============================================================

import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand/10 border border-brand/20 mb-6">
          <Trophy className="w-10 h-10 text-brand" />
        </div>
        <h1 className="text-6xl font-black text-brand mb-4">404</h1>
        <h2 className="text-2xl font-bold text-text-primary mb-3">Página não encontrada</h2>
        <p className="text-text-secondary mb-8 max-w-sm mx-auto">
          Essa página saiu de campo. Volte para o jogo principal.
        </p>
        <Link to="/">
          <Button>
            <ArrowLeft className="w-4 h-4" />
            Voltar para o início
          </Button>
        </Link>
      </div>
    </div>
  );
}
