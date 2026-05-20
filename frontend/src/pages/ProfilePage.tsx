// @ts-nocheck
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
import { authService } from '../services/auth.service';

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
  const { user, updateUser } = useAuth();
  const [pools, setPools] = useState<PoolProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [avatarScale, setAvatarScale] = useState(1);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

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

  useEffect(() => {
    setDisplayNameInput(user?.displayName || '');
    setAvatarPreview(user?.avatarUrl || '');
  }, [user?.displayName, user?.avatarUrl]);


  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';

      setAvatarPreview(result);

      try {
        const updatedUser = await authService.updateProfile({
          avatarUrl: result,
        });

        updateUser(updatedUser);
      } catch {
        // noop
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user || savingProfile) return;
    setSavingProfile(true);
    setProfileSaved(false);

    try {
      const updatedUser = await authService.updateProfile({
        displayName: displayNameInput.trim() || null,
      });
      updateUser(updatedUser);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 1800);
    } finally {
      setSavingProfile(false);
    }
  };

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

  const publicName = user?.displayName || user?.name || 'Jogador';
  const avatarColor = user ? getAvatarColor(publicName) : 'bg-brand';
  const initials = getInitials(publicName);

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 overflow-x-hidden animate-fade-in">

      {/* ── Voltar ──────────────────────────────────────────── */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        Dashboard
      </Link>

      {/* ── CABEÇALHO DO PERFIL ─────────────────────────────── */}
      <div className="mb-6 p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <label className="relative cursor-pointer group">
              {avatarPreview ? (
                <div className="w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-2xl overflow-hidden shadow-lg ring-2 ring-white/10 bg-zinc-900">
                  <img
                    src={avatarPreview}
                    alt={publicName}
                    className="w-full h-full object-cover"
                    style={{
                      transform: `scale(${avatarScale}) translateY(${avatarOffsetY}px)`,
                      transformOrigin: 'center',
                    }}
                  />
                </div>
              ) : (
                <div className={`w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-2xl ${avatarColor} flex items-center justify-center shadow-lg ring-2 ring-white/10`}>
                  <span className="text-2xl font-black text-white">
                    {initials}
                  </span>
                </div>
              )}

              <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/45 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-1">
                    <span className="text-white text-xs">📷</span>
                  </div>

                  <span className="text-[10px] font-bold text-white">
                    Trocar
                  </span>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </label>
            {avatarPreview && (
              <button
                type="button"
                onClick={async () => {
                  const updatedUser = await authService.updateProfile({
                    avatarUrl: null,
                  });

                  updateUser(updatedUser);
                  setAvatarPreview('');
                }}
                className="mt-2 text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
              >
                Remover foto
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate">{publicName}</h1>
              {user?.displayName && (
                <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                  Nome de jogo
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 truncate">{user?.name}</p>
            <p className="text-xs text-zinc-600 truncate">{user?.email}</p>
          </div>
        </div>

        <div className="mt-4">

          <div className="flex flex-col gap-2">
            

            <div className="flex items-center gap-2">
              <input
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value.slice(0, 22))}
                placeholder="Seu nome no jogo"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-brand"
              />

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white shadow-lg shadow-brand/20 transition-opacity disabled:opacity-60"
              >
                {savingProfile ? '...' : 'Salvar'}
              </button>
            </div>

            {profileSaved && (
              <span className="text-[11px] font-semibold text-green-400">
                Nome atualizado
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge variant="default">
              {pools.length} {pools.length === 1 ? 'bolão' : 'bolões'}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── MEUS BOLÕES ─────────────────────────────────────── */}

      {pools.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-white text-base mb-2 flex items-center gap-2">
            <Trophy size={16} className="text-brand" />
            Meus bolões
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {pools.map(({ pool, summary }) => {
              const isLeader = summary?.position === 1;
              const isSelected = pool.id === selectedPoolId;
              return (
                <button
                  key={pool.id}
                  onClick={() => setSelectedPoolId(pool.id)}
                  className={`w-full sm:min-w-[260px] flex items-center gap-3 p-3 rounded-2xl border transition-all text-left flex-shrink-0 ${
                    isSelected
                      ? 'bg-brand/15 border-brand shadow-xl shadow-brand/10'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
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
                          {summary.rival.diffToRival} pts atrás de {summary.rival.displayName?.split(' ')[0] || summary.rival.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isSelected && (
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-brand">
                        Selecionado
                      </div>
                    )}

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
        <>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />

            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 whitespace-nowrap">
              Bolão selecionado
            </span>

            <div className="h-px flex-1 bg-zinc-800" />
          </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
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
          <div className="grid grid-cols-2 gap-2 mb-2">
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
                    {selectedPool.summary.rival.displayName?.split(' ')[0] || selectedPool.summary.rival.name.split(' ')[0]}
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

          {/* Métricas do bolão */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
              <p className="text-2xl font-black text-brand">
                {selectedPool.summary.totalPoints}
              </p>

              <p className="text-xs text-zinc-500 mt-1">
                Pontos
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
              <p className="text-2xl font-black text-live">
                {selectedPool.summary.exactScores}
              </p>

              <p className="text-xs text-zinc-500 mt-1">
                Exatos
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
              <p className="text-2xl font-black text-white">
                {Math.round((selectedPool.summary.correctOutcomes / Math.max(selectedPool.summary.totalPredictions, 1)) * 100)}%
              </p>

              <p className="text-xs text-zinc-500 mt-1">
                Aproveitamento
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
              <p className="text-2xl font-black text-orange-400">
                {selectedPool.summary.streak || '—'}
              </p>

              <p className="text-xs text-zinc-500 mt-1">
                Sequência
              </p>
            </div>

          </div>

          {/* Histórico por rodada */}
          {selectedPool.history && selectedPool.history.rounds.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                <Calendar size={14} className="text-zinc-400" />
                <span className="font-bold text-white text-sm">Últimas rodadas</span>
              </div>
              <div className="divide-y divide-zinc-800">
                {selectedPool.history.rounds
                  .filter((round) =>
                    round.points > 0 ||
                    round.totalPredictions > 0 ||
                    round.correctOutcomes > 0 ||
                    round.exactScores > 0
                  )
                  .sort((a, b) => b.roundNumber - a.roundNumber)
                  .map((round) => (
                  <div key={round.roundId} className="flex items-center justify-between px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{round.roundName}</p>
                        {round.id === selectedPool.pool?.bonusRoundId && (
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
        </>
      )}

      {/* ── ESTADO VAZIO ────────────────────────────────────── */}
      {pools.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-10 text-center">
          <Trophy size={36} className="text-zinc-600 mx-auto mb-2" />
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
