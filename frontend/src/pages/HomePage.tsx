// ============================================================
// Na Gaveta — Página Home (pública)
// Se usuário estiver logado → redireciona automaticamente para /dashboard
// ============================================================

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Users, Zap, TrendingUp, ArrowRight, Star } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

// Dados mock para exibição na home pública
const FEATURED_POOLS = [
  { id: '1', name: 'Bolão da Copa do Mundo 2026', championship: 'Copa do Mundo FIFA 2026', members: 32, isLive: true },
  { id: '2', name: 'Bolão da família', championship: 'Copa do Mundo FIFA 2026', members: 18, isLive: false },
  { id: '3', name: 'Bolão da firma', championship: 'Copa do Mundo FIFA 2026', members: 24, isLive: false },
];

const FEATURES = [
  {
    icon: <Trophy className="w-6 h-6 text-brand" />,
    title: 'Crie seu bolão',
    description: 'Crie um bolão da Copa em segundos e compartilhe o convite pelo WhatsApp.',
  },
  {
    icon: <Zap className="w-6 h-6 text-brand" />,
    title: 'Palpites em tempo real',
    description: 'Cada jogador faz seus palpites antes dos jogos e acompanha a disputa rodada a rodada.',
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-brand" />,
    title: 'Ranking dinâmico',
    description: 'Ranking atualizado para todo mundo saber quem está liderando o bolão.',
  },
  {
    icon: <Users className="w-6 h-6 text-brand" />,
    title: 'Para toda a galera',
    description: 'Bolões públicos ou privados para amigos, família, trabalho, bar ou comunidade.',
  },
];

export function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirecionar automaticamente usuários logados para o dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Enquanto verifica autenticação, não renderiza nada para evitar flash
  if (isLoading) return null;

  // Usuário autenticado já foi redirecionado — renderiza apenas para visitantes
  return (
    <div className="animate-fade-in">

      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249,115,22,0.15) 0%, transparent 70%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <div className="flex justify-center mb-6">
            <Badge variant="brand">
              <Star className="w-3 h-3" />
              Copa do Mundo 2026 disponível
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6">
            <span className="text-text-primary">Crie seu bolão</span>
            <br />
            <span className="text-gradient-brand">da Copa 2026.</span>
            <br />
            <span className="text-text-primary">Convide a galera.</span>
          </h1>

          <p className="text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Monte seu bolão da Copa do Mundo FIFA 2026, convide amigos pelo WhatsApp,
            receba palpites, acompanhe ranking e deixe a disputa muito mais divertida.
          </p>

          {/* CTAs para visitantes */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="shadow-brand">
                Criar bolão grátis
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">
                Já tenho conta
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 max-w-xl mx-auto text-sm text-zinc-300">
            <div>✓ Convites por WhatsApp</div>
            <div>✓ Ranking automático</div>
            <div>✓ Bolões públicos e privados</div>
            <div>✓ Premiação personalizada</div>
          </div>

          <p className="mt-6 text-text-muted text-sm">
            Crie grátis seu primeiro bolão. Upgrade PRO anual disponível para organizar mais grupos.
          </p>
        </div>
      </section>

      {/* ── Ideias de bolões para a Copa ───────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Bolões em destaque</h2>
            <p className="text-text-secondary text-sm mt-1">Crie o seu e convide amigos, família ou trabalho</p>
          </div>
          <Link to="/pools" className="text-brand text-sm font-medium hover:text-brand-light flex items-center gap-1">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_POOLS.map((pool) => (
            <Card key={pool.id} hoverable className="group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-brand" />
                </div>
                {pool.isLive && <Badge variant="live">Ao vivo</Badge>}
              </div>
              <h3 className="font-semibold text-text-primary mb-1 group-hover:text-brand transition-colors">
                {pool.name}
              </h3>
              <p className="text-text-muted text-xs mb-4">{pool.championship}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-text-secondary text-xs">
                  <Users className="w-3.5 h-3.5" />
                  {pool.members} participantes
                </div>
                <Link to="/register">
                  <button className="text-brand text-xs font-medium hover:text-brand-light flex items-center gap-1">
                    Participar <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t border-border-subtle">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
            Tudo pronto para o bolão da Copa 2026
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Convite, palpites, ranking, coringa e premiação em uma experiência simples.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature, i) => (
            <Card key={i} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-text-primary mb-2">{feature.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA Final ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div
          className="rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 100%)',
            border: '1px solid rgba(249,115,22,0.2)',
          }}
        >
          <h2 className="text-2xl sm:text-3xl font-black text-text-primary mb-4">
            Pronto para criar seu bolão da Copa?
          </h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Comece grátis, convide a galera e teste o Na Gaveta antes da bola rolar.
          </p>
          <Link to="/register">
            <Button size="lg" className="shadow-brand">
              Começar agora — é grátis
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
