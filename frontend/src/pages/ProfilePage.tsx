// ============================================================
// Na Gaveta — Página de Perfil do Usuário (/profile)
// Estatísticas pessoais agregadas de todos os bolões
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Trophy, Target, Flame, Swords, Star,
  ChevronRight, ArrowLeft, TrendingUp, CheckCircle2,
  BarChart2, Calendar, Award
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Badge, Spinner } from '../components/ui';
import { myPools as getMyPools, type Pool } from '../services/pool.service';
import { getUserSummary, getUserHistory, type UserSummary, type UserPoolHistory } from '../services/match.service';

// ── Tipos locais ─────────────────────────────────────────────
interface PoolProfile {
  pool: Pool;
  summary?: UserSummary;
  history?: UserPoolHistory;
}

// ── Helpers ───────────────────────────────────────────────────
function ordinal(n: number) {
  if (n === 1) return '1º';
  if (n === 2) return '2º';
  if (n === 3) return '3º';
  return `${n}º`;
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-pink-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
  ];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[hash];
}

// ── Componente principal ──────────────────────────────────────
export default function ProfilePage() {
  const { user } = useAuth();
  const [pools, setPools] = useState<PoolProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  // Estatísticas agregadas
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalExact, setTotalExact] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [bestPosition, setBestPosition] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const myPools = await getMyPools();

      const enriched = await Promise.all(
        myPools.map(async (pool: Pool) => {
          try {
            const [summary, historyData] = await Promise.all([
              getUserSummary(pool.id, user.id),
              getUserHistory(pool.id, user.id).then(d => d.history).catch(() => undefined),
            ]);
            return { pool, summary, history: historyData } as PoolProfile;
          } catch {
            return { pool } as PoolProfile;
          }
        })
      );

      setPools(enriched);

      // Calcular agregados
      let pts = 0, exact = 0, correct = 0, predictions = 0, streak = 0;
      let best: number | null = null;
      for (const p of enriched) {
        if (p.summary) {
          pts += p.summary.totalPoints;
          exact += p.summary.exactScores;
          correct += p.summary.correctOutcomes;
          predictions += p.summary.totalPredictions;
          if (p.summary.streak > streak) streak = p.summary.streak;
          if (best === null || p.summary.position < best) best = p.summary.position;
        }
      }
      setTotalPoints(pts);
      setTotalExact(exact);
      setTotalCorrect(correct);
      setTotalPredictions(predictions);
      setMaxStreak(streak);
      setBestPosition(best);

      // Selecionar primeiro bolão por padrão
      if (enriched.length > 0) setSelectedPoolId(enriched[0].pool.id);
    } catch {
      setPools([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const selectedPool = pools.find(p => p.pool.id === selectedPoolId);
  const accuracy = totalPredictions > 0
    ? Math.round((totalCorrect / totalPredictions) * 100)
    : 0;
  const exactRate = totalPredictions > 0
    ? Math.round((totalExact / totalPredictions) * 100)
    : 0;

  const avatarColor = user ? getAvatarColor(user.name) : 'bg-brand';
  const initials = user ? getInitials(user.name) : '?';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">

      {/* ── Voltar ──────────────────────────────────────────── */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        Dashboard
      </Link>

      {/* ── CABEÇALHO DO PERFIL ─────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        {/* Avatar */}
        <div className={`w-16 h-16 rounded-2xl ${avatarColor} flex items-center justify-center flex-shrink-0 shadow-lg`}>
          <span className="text-2xl font-black text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white truncate">{user?.name}</h1>
          <p className="text-sm text-zinc-500 truncate">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="default">{pools.length} {pools.length === 1 ? 'bolão' : 'bolões'}</Badge>
            {bestPosition === 1 && <Badge variant="success">🏆 Líder em algum bolão</Badge>}
            {maxStreak >= 3 && (
              <Badge variant="brand">
                <Flame size={10} className="mr-1" />
                Sequência de {maxStreak}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── ESTATÍSTICAS GERAIS ─────────────────────────────── */}
      <div className="mb-6">
        <h2 className="font-bold text-white text-base mb-3 flex items-center gap-2">
          <BarChart2 size={16} className="text-brand" />
          Estatísticas gerais
        </h2>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-3xl font-black text-brand">{totalPoints}</p>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <Trophy size={10} />
              Pontos totais
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-3xl font-black text-live">{totalExact}</p>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <Target size={10} />
              Placares exatos
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-zinc-200">{accuracy}%</p>
            <p className="text-xs text-zinc-500 mt-0.5">Acertos</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-zinc-200">{exactRate}%</p>
            <p className="text-xs text-zinc-500 mt-0.5">Exatos</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-zinc-200">{maxStreak || '—'}</p>
            <p className="text-xs text-zinc-500 mt-0.5 flex items-center justify-center gap-0.5">
              <Flame size={9} />
              Sequência
            </p>
          </div>
        </div>
      </div>

      {/* ── MEUS BOLÕES ─────────────────────────────────────── */}
      {pools.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-white text-base mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-brand" />
            Meus bolões
          </h2>
          <div className="space-y-2">
            {pools.map(({ pool, summary }) => {
              const isLeader = summary?.position === 1;
              const isSelected = pool.id === selectedPoolId;
              return (
                <button
                  key={pool.id}
                  onClick={() => setSelectedPoolId(pool.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? 'bg-zinc-800 border-brand/50'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <Trophy size={18} className="text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-white text-sm truncate">{pool.name}</p>
                      {isLeader && <Badge variant="success">Líder</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <User size={9} />
                        {pool._count?.members ?? 0} membros
                      </span>
                      {summary && !isLeader && summary.rival && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Swords size={9} />
                          {summary.rival.diffToRival} pts atrás de {summary.rival.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {summary && (
                      <>
                        <p className="font-black text-brand text-base">{summary.totalPoints} pts</p>
                        <p className="text-xs text-zinc-500">{isLeader ? '🏆 Líder' : ordinal(summary.position)}</p>
                      </>
                    )}
                  </div>
                  <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${isSelected ? 'text-brand' : 'text-zinc-600'}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DETALHE DO BOLÃO SELECIONADO ────────────────────── */}
      {selectedPool && selectedPool.summary && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-brand" />
              {selectedPool.pool.name}
            </h2>
            <Link
              to={`/pools/${selectedPool.pool.id}`}
              className="text-xs text-brand hover:text-brand-light flex items-center gap-1 transition-colors"
            >
              Ver bolão <ChevronRight size={12} />
            </Link>
          </div>

          {/* Posição e rival */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award size={14} className="text-brand" />
                <span className="text-xs text-zinc-500">Posição</span>
              </div>
              <p className="text-2xl font-black text-white">
                {selectedPool.summary.position === 1 ? '🏆' : ordinal(selectedPool.summary.position)}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                de {selectedPool.summary.totalMembers} participantes
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Swords size={14} className="text-zinc-400" />
                <span className="text-xs text-zinc-500">Rival</span>
              </div>
              {selectedPool.summary.rival ? (
                <>
                  <p className="text-base font-black text-white truncate">
                    {selectedPool.summary.rival.name.split(' ')[0]}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {selectedPool.summary.rival.diffToRival} pts à frente
                  </p>
                </>
              ) : (
                <p className="text-sm text-zinc-400 mt-1">Você é o líder!</p>
              )}
            </div>
          </div>

          {/* Histórico por rodada */}
          {selectedPool.history && selectedPool.history.rounds.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                <Calendar size={14} className="text-zinc-400" />
                <span className="font-bold text-white text-sm">Histórico por rodada</span>
              </div>
              <div className="divide-y divide-zinc-800">
                {selectedPool.history.rounds.map((round) => (
                  <div key={round.roundId} className="flex items-center justify-between px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{round.roundName}</p>
                        {round.id === pool?.bonusRoundId && (
                          <Star size={10} className="text-brand flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {round.exactScores} exato{round.exactScores !== 1 ? 's' : ''} · {round.correctOutcomes} acerto{round.correctOutcomes !== 1 ? 's' : ''} · {round.totalPredictions} palpite{round.totalPredictions !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`font-black text-base ${round.points > 0 ? 'text-brand' : 'text-zinc-600'}`}>
                        {round.points} pts
                      </p>
                      {round.exactScores > 0 && (
                        <p className="text-xs text-live flex items-center justify-end gap-0.5">
                          <CheckCircle2 size={9} />
                          {round.exactScores} exato{round.exactScores !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Total */}
              <div className="px-4 py-3 bg-zinc-800/50 flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-300">Total</span>
                <span className="font-black text-brand text-lg">{selectedPool.history.totalPoints} pts</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ESTADO VAZIO ────────────────────────────────────── */}
      {pools.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-10 text-center">
          <Trophy size={36} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm mb-4">Você ainda não participa de nenhum bolão</p>
          <Link to="/pools">
            <button className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-brand hover:bg-brand-light text-white font-bold text-sm rounded-xl transition-colors">
              Explorar bolões
            </button>
          </Link>
        </div>
      )}

      {/* ── Espaço extra ────────────────────────────────────── */}
      <div className="h-8" />
    </div>
  );
}
