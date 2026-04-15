// ============================================================
// Na Gaveta — Dashboard v4
// PRINCÍPIO: 1 tela = 1 ação principal
// Ação principal → meus bolões → destaques pessoais
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Users, Target, Plus, ArrowRight,
  Star, Zap, ChevronRight, Flame, Swords,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Badge, Spinner } from '../components/ui';
import { myPools as getMyPools, type Pool } from '../services/pool.service';
import { getUserSummary, type UserSummary } from '../services/match.service';

// ── Tipos locais ─────────────────────────────────────────────
interface PoolWithSummary extends Pool {
  summary?: UserSummary;
}

// ── Helpers ───────────────────────────────────────────────────
function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function ordinal(n: number) {
  if (n === 1) return '1º';
  if (n === 2) return '2º';
  if (n === 3) return '3º';
  return `${n}º`;
}

// ── Componente principal ──────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Extrair userId como primitivo estável para evitar re-renders por mudança de referência do objeto user
  const userId = user?.id ?? null;

  const [pools, setPools] = useState<PoolWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalExact, setTotalExact] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  // ESTABILIDADE: useCallback depende de userId (string primitiva), não de user (objeto).
  // Isso evita que a recriação do objeto user após login/restauração de sessão
  // cause re-disparo desnecessário do useEffect e ciclo de loading.
  const loadDashboard = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const myPools = await getMyPools();

      const enriched = await Promise.all(
        myPools.map(async (pool: Pool) => {
          try {
            const summary = await getUserSummary(pool.id, userId);
            return { ...pool, summary } as PoolWithSummary;
          } catch {
            return { ...pool } as PoolWithSummary;
          }
        })
      );

      setPools(enriched);

      let pts = 0, pending = 0, exact = 0, streak = 0;
      for (const p of enriched) {
        if (p.summary) {
          pts += p.summary.totalPoints;
          pending += p.summary.pendingMatches;
          exact += p.summary.exactScores;
          if (p.summary.streak > streak) streak = p.summary.streak;
        }
      }
      setTotalPoints(pts);
      setTotalPending(pending);
      setTotalExact(exact);
      setMaxStreak(streak);
    } catch {
      setPools([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Bolão com mais palpites pendentes (destino do CTA principal)
  const firstPoolWithPending = pools.find((p) => (p.summary?.pendingMatches ?? 0) > 0);
  const ctaPoolId = firstPoolWithPending?.id ?? pools[0]?.id;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">

      {/* ── Header compacto ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-sm">{greeting()},</p>
          <h1 className="text-2xl font-black text-white">
            {user?.name.split(' ')[0]} 👋
          </h1>
        </div>
        <Link to="/pools">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus size={15} />
            Novo bolão
          </button>
        </Link>
      </div>

      {/* ── 1. AÇÃO PRINCIPAL ────────────────────────────────── */}
      {pools.length > 0 && (
        <div className="mb-6">
          {totalPending > 0 ? (
            // Há palpites pendentes — CTA dominante
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0.06) 100%)',
                border: '1px solid rgba(249,115,22,0.40)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-brand/20 flex items-center justify-center flex-shrink-0">
                  <Target size={22} className="text-brand" />
                </div>
                <div>
                  <p className="font-black text-white text-lg leading-tight">
                    {totalPending === 1
                      ? '1 jogo esperando seu palpite'
                      : `${totalPending} jogos esperando seus palpites`}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Os palpites fecham no início de cada partida
                  </p>
                </div>
              </div>
              <button
                onClick={() => ctaPoolId && navigate(`/pools/${ctaPoolId}`)}
                className="w-full flex items-center justify-center gap-3 py-4 bg-brand hover:bg-brand-light text-white font-black text-xl rounded-xl transition-all shadow-lg shadow-brand/30 active:scale-[0.98]"
              >
                <Zap size={22} />
                PALPITAR AGORA
              </button>
              {/* Streak badge */}
              {maxStreak >= 2 && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-zinc-400">
                  <Flame size={14} className="text-brand-light" />
                  <span>Sequência de <strong className="text-white">{maxStreak}</strong> acertos — não perca o ritmo!</span>
                </div>
              )}
            </div>
          ) : (
            // Tudo em dia — estado positivo
            <div
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)',
                border: '1px solid rgba(34,197,94,0.25)',
              }}
            >
              <div className="w-11 h-11 rounded-xl bg-live/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={22} className="text-live" />
              </div>
              <div className="flex-1">
                <p className="font-black text-white text-base">Tudo em dia! 🎉</p>
                <p className="text-sm text-zinc-400">Nenhum palpite pendente. Fique de olho nos próximos jogos.</p>
              </div>
              <Link to="/pools" className="flex-shrink-0">
                <button className="flex items-center gap-1 text-sm text-live font-semibold hover:opacity-80">
                  Ver bolões <ArrowRight size={14} />
                </button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── 2. MEUS BOLÕES ───────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white text-base">Meus Bolões</h2>
          <Link to="/pools" className="text-brand text-sm hover:text-brand-light flex items-center gap-1">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {pools.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
            <Trophy size={32} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm mb-4">Você ainda não participa de nenhum bolão</p>
            <Link to="/pools">
              <button className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-brand hover:bg-brand-light text-white font-bold text-sm rounded-xl transition-colors">
                <Plus size={16} />
                Criar ou entrar em um bolão
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {pools.map((pool) => {
              const s = pool.summary;
              const isLeader = s?.position === 1;
              const hasPending = (s?.pendingMatches ?? 0) > 0;

              return (
                <Link key={pool.id} to={`/pools/${pool.id}`}>
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all hover:border-zinc-600 active:scale-[0.99] ${
                    hasPending
                      ? 'bg-zinc-900 border-brand/30'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}>
                    {/* Ícone */}
                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                      <Trophy size={18} className="text-brand" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-white text-sm truncate">{pool.name}</p>
                                                {hasPending && <Badge variant="brand">{s!.pendingMatches} pendente{s!.pendingMatches > 1 ? 's' : ''}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          {pool._count?.members ?? 0}
                        </span>
                        {s && !isLeader && s.rival && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Swords size={10} />
                            {s.rival.diffToRival} pts atrás de {s.rival.name.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pontos e posição */}
                    <div className="text-right flex-shrink-0">
                      {s && (
                        <>
                          <p className="font-black text-brand text-base">{s.totalPoints} pts</p>
                          <p className="text-xs text-zinc-500">
                            {ordinal(s.position)}
                          </p>
                        </>
                      )}
                    </div>

                    <ChevronRight size={16} className="text-zinc-600 flex-shrink-0" />
                  </div>
                </Link>
              );
            })}

            {/* Adicionar novo bolão */}
            <Link to="/pools">
              <div className="flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-zinc-700 hover:border-zinc-600 text-zinc-500 hover:text-zinc-400 text-sm transition-colors">
                <Plus size={14} />
                Criar ou entrar em um bolão
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* ── 3. DESTAQUES PESSOAIS (se tiver dados) ───────────── */}
      {(totalPoints > 0 || totalExact > 0) && (
        <div className="mb-6">
          <h2 className="font-bold text-white text-base mb-3 flex items-center gap-2">
            <Star size={16} className="text-brand" />
            Seus destaques
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-brand">{totalPoints}</p>
              <p className="text-xs text-zinc-500 mt-1">Pontos totais</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-live">{totalExact}</p>
              <p className="text-xs text-zinc-500 mt-1">Placares exatos</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-zinc-300">{maxStreak || '—'}</p>
              <p className="text-xs text-zinc-500 mt-1">Sequência</p>
            </div>
          </div>

          {/* Melhor rodada por bolão */}
          {pools.some((p) => p.summary && p.summary.bestRoundPoints > 0) && (
            <div className="mt-2 space-y-1">
              {pools.map((pool) => {
                const s = pool.summary;
                if (!s || s.bestRoundPoints === 0) return null;
                return (
                  <Link key={pool.id} to={`/pools/${pool.id}`}>
                    <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                      <div>
                        <p className="text-xs text-zinc-500">{pool.name}</p>
                        <p className="text-sm text-zinc-300 font-medium">
                          Melhor rodada: {s.bestRoundName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-brand font-black">{s.bestRoundPoints} pts</span>
                        <ChevronRight size={14} className="text-zinc-600" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Espaço extra para mobile ─────────────────────────── */}
      <div className="h-8" />
    </div>
  );
}
