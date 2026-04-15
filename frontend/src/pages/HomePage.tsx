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
  { id: '1', name: 'Bolão do Brasileirão 2026', championship: 'Brasileirão Série A', members: 247, isLive: true },
  { id: '2', name: 'Copa do Brasil — Galera do Bar', championship: 'Copa do Brasil', members: 18, isLive: false },
  { id: '3', name: 'Libertadores dos Amigos', championship: 'Copa Libertadores', members: 32, isLive: true },
];

const FEATURES = [
  {
    icon: <Trophy className="w-6 h-6 text-brand" />,
    title: 'Crie seu bolão',
    description: 'Monte um bolão em segundos e convide seus amigos com um código único.',
  },
  {
    icon: <Zap className="w-6 h-6 text-brand" />,
    title: 'Palpites em tempo real',
    description: 'Dê seus palpites antes dos jogos e acompanhe o placar ao vivo.',
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-brand" />,
    title: 'Ranking dinâmico',
    description: 'Tabela de classificação atualizada automaticamente após cada rodada.',
  },
  {
    icon: <Users className="w-6 h-6 text-brand" />,
    title: 'Para toda a galera',
    description: 'Bolões públicos ou privados. Jogue com amigos, família ou colegas de trabalho.',
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
              Temporada 2026 aberta
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6">
            <span className="text-text-primary">Seu bolão.</span>
            <br />
            <span className="text-gradient-brand">Suas regras.</span>
            <br />
            <span className="text-text-primary">Sua glória.</span>
          </h1>

          <p className="text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Crie bolões esportivos, dê seus palpites e dispute com amigos em tempo real.
            A plataforma definitiva para quem vive o futebol brasileiro.
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

          <p className="mt-8 text-text-muted text-sm">
            Mais de <span className="text-brand font-semibold">10.000</span> palpites registrados essa temporada
          </p>
        </div>
      </section>

      {/* ── Bolões em destaque ───────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Bolões em destaque</h2>
            <p className="text-text-secondary text-sm mt-1">Participe agora mesmo</p>
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
            Tudo que você precisa para o bolão perfeito
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Simples de criar, divertido de jogar, impossível de parar.
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
            Pronto para entrar no jogo?
          </h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Crie sua conta grátis e comece a criar bolões agora mesmo.
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
