// @ts-nocheck
// ============================================================
// Na Gaveta — Página de Tabela Completa (/pools/:id/ranking)
// Estatísticas detalhadas: ranking geral + por rodada + escudos
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, CheckCircle, Flame, Share2 } from 'lucide-react';
import {
  getPoolRanking,
  getRoundRanking,
  getPoolMatches,
  getPoolRoundWinners,
  computePoolRoundWinners,
  type RankingEntry,
  type RoundRankingEntry,
  type Round,
  type UserRoundWins,
} from '../services/match.service';
import { getPool, type Pool } from '../services/pool.service';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui';
import { ShieldList } from '../components/ShieldBadge';
import { getTeamLogo } from '../utils/teamDisplay';

const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];
const MEDAL_TEXT_COLOR = ['#FFD700', '#C0C0C0', '#CD7F32'];

type RoundPointsMap = Map<string, { points: number; exactScores: number; correctOutcomes: number }>;

export default function PoolRankingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pool, setPool] = useState<Pool | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de rodada
  const [filterRoundId, setFilterRoundId] = useState<string>('geral');
  const [roundRanking, setRoundRanking] = useState<RoundRankingEntry[]>([]);
  const [roundLoading, setRoundLoading] = useState(false);

  // Vencedores de rodada com escudos
  const [roundWinners, setRoundWinners] = useState<UserRoundWins[]>([]);
  const [roundPointsData, setRoundPointsData] = useState<Map<string, RoundPointsMap>>(new Map());
  const [roundDataLoading, setRoundDataLoading] = useState(false);
  const [biggestScoresSort, setBiggestScoresSort] = useState<{ key: 'round' | 'player' | 'points'; direction: 'asc' | 'desc' }>({
    key: 'round',
    direction: 'asc',
  });

  function handleBiggestScoresSort(key: 'round' | 'player' | 'points') {
    setBiggestScoresSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  async function handleShareBiggestScores() {
    const text = [
      'TOP Maiores pontuações — Na Gaveta',
      '',
      ...sortedBiggestRoundScores.slice(0, 5).map((score, index) => {
        const medal = [`#${index + 1}`][0];

        return `${medal} ${score.playerName} — ${score.points} pts (Rodada ${score.roundNumber})`;
      }),
      '',
      'https://nagaveta.com',
    ].join('\n');

    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (navigator.share && isMobile) {
        await navigator.share({
          title: 'Maiores pontuações — Na Gaveta',
          text,
        });

        return;
      }

      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        '_blank'
      );
    } catch {
      // ignorar cancelamento
    }
  }

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [poolData, roundsData, rankingData] = await Promise.all([
        getPool(id),
        getPoolMatches(id),
        getPoolRanking(id),
      ]);
      setPool(poolData);
      setRounds(roundsData);
      setRanking(rankingData.ranking);
    } catch {
      navigate(`/pools/${id}`);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadRoundsData = useCallback(async () => {
    if (!id) return;
    const finishedRounds = rounds.filter((r) =>
      r.matches.some((m) => m.status === 'FINISHED' || m.status === 'LIVE')
    );
    if (finishedRounds.length === 0) return;

    setRoundDataLoading(true);
    const allRoundPoints = new Map<string, RoundPointsMap>();

    try {
      await Promise.all(
        finishedRounds.map(async (r) => {
          try {
            const data = await getRoundRanking(id, r.id);
            if (data.ranking.length > 0) {
              const roundMap = new Map<string, { points: number; exactScores: number; correctOutcomes: number }>();
              data.ranking.forEach((e) => {
                roundMap.set(e.userId, {
                  points: e.roundPoints,
                  exactScores: e.exactScores ?? 0,
                  correctOutcomes: e.correctOutcomes ?? 0,
                });
              });
              allRoundPoints.set(r.id, roundMap);
            }
          } catch {
            // ignorar
          }
        })
      );
    } finally {
      setRoundPointsData(allRoundPoints);
      setRoundDataLoading(false);
    }
  }, [id, rounds]);

  const loadRoundWinners = useCallback(async () => {
    if (!id) return;
    const finishedRounds = rounds.filter((r) =>
      r.matches.some((m) => m.status === 'FINISHED')
    );
    if (finishedRounds.length === 0) return;
    try {
      let winners = await getPoolRoundWinners(id);

      if (!winners || winners.length === 0) {
        const computed = await computePoolRoundWinners(id);
        winners = computed.winners;
      }

      setRoundWinners(winners);
    } catch {
      setRoundWinners([]);
    }
  }, [id, rounds]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (rounds.length > 0) {
      loadRoundsData();
      loadRoundWinners();
    }
  }, [rounds, loadRoundsData, loadRoundWinners]);

  async function handleSelectRound(roundId: string) {
    setFilterRoundId(roundId);
    if (roundId === 'geral') return;
    setRoundLoading(true);
    try {
      const data = await getRoundRanking(id!, roundId);
      setRoundRanking(data.ranking);
    } catch {
      setRoundRanking([]);
    } finally {
      setRoundLoading(false);
    }
  }

  if (loading) {
    const gridCols = '32px 1.6fr 100px 90px 120px 120px';

return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!pool) return null;

  const finishedRounds = rounds.filter((r) =>
    r.matches.some((m) => m.status === 'FINISHED')
  );

  // Mapa userId → wins
  const winsMap = new Map<string, UserRoundWins>();
  roundWinners.forEach((w) => winsMap.set(w.userId, w));

  const startingRound = rounds.find((round) => round.id === pool.startingRoundId);
  const validFinishedRounds = (
    startingRound
      ? finishedRounds.filter((round) => round.number >= startingRound.number)
      : finishedRounds
  ).sort((a, b) => b.number - a.number);

  const currentRound =
    validFinishedRounds.find((round) => round.matches.some((m) => m.status === 'LIVE')) ??
    [...validFinishedRounds].sort((a, b) => b.number - a.number)[0];

  const currentRoundPoints = currentRound ? roundPointsData.get(currentRound.id) : null;

  const selectedRound = validFinishedRounds.find((round) => round.id === filterRoundId);

  // Ranking para exibição
  const displayRanking: Array<{
    userId: string;
    name: string;
    totalPoints: number;
    exactScores: number;
    correctOutcomes: number;
    roundPoints?: number;
    roundExacts?: number;
    roundOutcomes?: number;
    favoriteTeam?: string | null;
    heartTeamScore?: number;
  }> = ranking
    .map((e) => {
      const selectedRoundMap = selectedRound ? roundPointsData.get(selectedRound.id) : null;
      const currentRoundStats = currentRoundPoints?.get(e.userId);

      if (filterRoundId === 'geral' || !selectedRound) {
        return {
          userId: e.userId,
          name: e.name,
          totalPoints: e.totalPoints,
          exactScores: e.exactScores ?? 0,
          correctOutcomes: e.correctOutcomes ?? 0,
          roundPoints: currentRoundStats?.points ?? 0,
          roundExacts: currentRoundStats?.exactScores ?? 0,
          roundOutcomes: currentRoundStats?.correctOutcomes ?? 0,
          favoriteTeam: e.favoriteTeam ?? null,
          heartTeamScore: e.heartTeamScore ?? 0,
        };
      }

      const laterRounds = validFinishedRounds.filter((round) => round.number > selectedRound.number);

      const laterTotals = laterRounds.reduce(
        (acc, round) => {
          const stats = roundPointsData.get(round.id)?.get(e.userId);

          return {
            points: acc.points + (stats?.points ?? 0),
            exactScores: acc.exactScores + (stats?.exactScores ?? 0),
            correctOutcomes: acc.correctOutcomes + (stats?.correctOutcomes ?? 0),
          };
        },
        { points: 0, exactScores: 0, correctOutcomes: 0 }
      );

      const selectedStats = selectedRoundMap?.get(e.userId);

      return {
        userId: e.userId,
        name: e.name,
        totalPoints: e.totalPoints - laterTotals.points,
        exactScores: (e.exactScores ?? 0) - laterTotals.exactScores,
        correctOutcomes: (e.correctOutcomes ?? 0) - laterTotals.correctOutcomes,
        roundPoints: selectedStats?.points ?? 0,
        roundExacts: selectedStats?.exactScores ?? 0,
        roundOutcomes: selectedStats?.correctOutcomes ?? 0,
        favoriteTeam: e.favoriteTeam ?? null,
        heartTeamScore: e.heartTeamScore ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      if ((b.heartTeamScore ?? 0) !== (a.heartTeamScore ?? 0)) return (b.heartTeamScore ?? 0) - (a.heartTeamScore ?? 0);
      return b.correctOutcomes - a.correctOutcomes;
    });

  const biggestRoundScores = validFinishedRounds
    .map((round) => {
      const roundMap = roundPointsData.get(round.id);

      if (!roundMap) return null;

      const bestScore = [...roundMap.entries()]
        .map(([userId, stats]) => {
          const rankingEntry = ranking.find((r) => r.userId === userId);
          const normalizedPoints = round.isBonus ? stats.points / 2 : stats.points;

          return {
            roundNumber: round.number,
            roundName: round.name,
            userId,
            playerName: rankingEntry?.name ?? 'Jogador',
            points: normalizedPoints,
            exactScores: stats.exactScores ?? 0,
            heartTeamScore: rankingEntry?.heartTeamScore ?? 0,
            correctOutcomes: stats.correctOutcomes ?? 0,
          };
        })
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
          if (b.heartTeamScore !== a.heartTeamScore) return b.heartTeamScore - a.heartTeamScore;
          if (b.correctOutcomes !== a.correctOutcomes) return b.correctOutcomes - a.correctOutcomes;
          return a.playerName.localeCompare(b.playerName, 'pt-BR');
        })[0];

      return bestScore ?? null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.playerName.localeCompare(b.playerName, 'pt-BR');
    })
    .slice(0, 15);

  const highestBiggestRoundScore = Math.max(...biggestRoundScores.map((score) => score.points), 0);

  const sortedBiggestRoundScores = [...biggestRoundScores].sort((a, b) => {
    const direction = biggestScoresSort.direction === 'asc' ? 1 : -1;

    if (biggestScoresSort.key === 'round') {
      return (a.roundNumber - b.roundNumber) * direction;
    }

    if (biggestScoresSort.key === 'player') {
      return a.playerName.localeCompare(b.playerName, 'pt-BR') * direction;
    }

    return (a.points - b.points) * direction;
  });

  const previousPositions = new Map<string, number>();

  if (finishedRounds.length > 1 && filterRoundId === 'geral') {
    const latestFinishedRound = [...finishedRounds].sort((a, b) => b.number - a.number)[0];
    const latestRoundPoints = latestFinishedRound ? roundPointsData.get(latestFinishedRound.id) : null;

    if (latestRoundPoints) {
      const previousRanking = ranking
        .map((entry) => {
          const roundData = latestRoundPoints.get(entry.userId);

          return {
            ...entry,
            previousTotalPoints: entry.totalPoints - (roundData?.points ?? 0),
            previousExactScores: (entry.exactScores ?? 0) - (roundData?.exactScores ?? 0),
            previousCorrectOutcomes: (entry.correctOutcomes ?? 0) - (roundData?.correctOutcomes ?? 0),
          };
        })
        .sort((a, b) => {
          if (b.previousTotalPoints !== a.previousTotalPoints) return b.previousTotalPoints - a.previousTotalPoints;
          if (b.previousExactScores !== a.previousExactScores) return b.previousExactScores - a.previousExactScores;
          if ((b.heartTeamScore ?? 0) !== (a.heartTeamScore ?? 0)) return (b.heartTeamScore ?? 0) - (a.heartTeamScore ?? 0);
          return b.previousCorrectOutcomes - a.previousCorrectOutcomes;
        });

      previousRanking.forEach((entry, idx) => {
        previousPositions.set(entry.userId, idx + 1);
      });
    }
  }

  const getPositionChange = (currentIndex: number, userId: string) => {
    const prev = previousPositions.get(userId);
    if (!prev) return null;

    const current = currentIndex + 1;
    const diff = prev - current;

    if (diff > 0) {
      return { type: 'up', value: diff };
    }

    if (diff < 0) {
      return { type: 'down', value: Math.abs(diff) };
    }

    return null;
  };

  const gridCols = '32px 1.6fr 100px 90px 120px 120px';

return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Voltar */}
      <Link
        to={`/pools/${id}`}
        className="inline-flex items-center gap-2 text-zinc-300 hover:text-white text-sm mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar ao bolão
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
          <Trophy size={20} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-lg font-black text-white leading-tight">Tabela completa</h1>
          <p className="text-xs text-zinc-300">{pool.name}</p>
        </div>
      </div>

      {/* Filtro de rodadas */}
      {finishedRounds.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          <button
            onClick={() => handleSelectRound('geral')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
              filterRoundId === 'geral'
                ? 'bg-brand text-white'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            Geral
          </button>
          {validFinishedRounds.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelectRound(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                filterRoundId === r.id
                  ? 'bg-brand text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      {/* Tabela mobile */}
      <div
        className="md:hidden rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(180deg, rgba(39,39,42,0.92), rgba(24,24,27,0.96))', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex">
          <div className="w-[158px] flex-shrink-0 border-r border-zinc-800/70 bg-zinc-950/30">
            <div className="grid grid-cols-[34px_1fr] items-center gap-2 px-2 py-3 h-[54px] border-b border-zinc-800/70 bg-white/[0.02]">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 text-center">#</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-400">Jogador</span>
            </div>

            {(roundLoading || roundDataLoading) ? (
              <div className="flex justify-center py-6"><Spinner size="sm" /></div>
            ) : (
              <div className="divide-y divide-zinc-800/30">
                {displayRanking.map((entry, i) => {
                  const isCurrentUser = entry.userId === user?.id;
                  const pos = i + 1;
                  const medalEmoji = pos <= 3 ? MEDAL_EMOJI[pos - 1] : null;

                  return (
                    <div
                      key={`mobile-left-${entry.userId}`}
                      className="grid grid-cols-[34px_1fr] items-center gap-2 px-2 h-[62px]"
                      style={{
                        background: pos === 1
                          ? 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
                          : isCurrentUser
                            ? 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))'
                            : 'transparent',
                      }}
                    >
                      <div className="flex items-center justify-center">
                        {medalEmoji ? (
                          <span className="text-sm leading-none">{medalEmoji}</span>
                        ) : (
                          <span className="text-[11px] text-zinc-300 font-medium">{pos}º</span>
                        )}
                      </div>

                      <div className="min-w-0 flex items-center gap-1.5">
                        {entry.favoriteTeam && getTeamLogo(entry.favoriteTeam) ? (
                          <img
                            src={getTeamLogo(entry.favoriteTeam)!}
                            alt={entry.favoriteTeam}
                            className="w-5 h-5 object-contain flex-shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-300 flex-shrink-0">
                            {(entry.displayName || entry.name).charAt(0).toUpperCase()}
                          </div>
                        )}

                        <span className="text-xs font-semibold text-white truncate">
                          {(entry.displayName || entry.name).split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <div className="min-w-[470px]">
              <div
                className="grid items-center gap-2 px-2 py-3 h-[54px] border-b border-zinc-800/70 bg-white/[0.02]"
                style={{ gridTemplateColumns: filterRoundId === 'geral' ? '80px 80px 80px 90px 150px' : '80px 80px 90px 150px 90px' }}
              >
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300 text-center"><span className="block">Pontos</span><span className="block">Geral</span></span>
                {filterRoundId === 'geral' && currentRoundPoints && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300 text-center"><span className="block">Rodada</span><span className="block">Atual</span></span>
                )}
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300 text-center"><span className="block">Acertos</span><span className="block">Exatos</span></span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300 text-center"><span className="block">Time do</span><span className="block">Coração</span></span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300 text-center"><span className="block">Melhor da</span><span className="block">Rodada</span></span>
              </div>

              {(roundLoading || roundDataLoading) ? null : (
                <div className="divide-y divide-zinc-800/30">
                  {displayRanking.map((entry, i) => {
                    const userWins = winsMap.get(entry.userId);
                    const pos = i + 1;
                    const isCurrentUser = entry.userId === user?.id;

                    return (
                      <div
                        key={`mobile-stats-${entry.userId}`}
                        className="grid items-center gap-2 px-2 h-[62px]"
                        style={{
                          gridTemplateColumns: filterRoundId === 'geral' ? '80px 80px 90px 150px' : '80px 80px 90px 150px 90px',
                          background: pos === 1
                            ? 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
                            : isCurrentUser
                              ? 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))'
                              : 'transparent',
                        }}
                      >
                        <span className="text-center text-sm font-black text-white tabular-nums">{entry.totalPoints}</span>

                        {filterRoundId === 'geral' && currentRoundPoints && (
                          <span className="text-center text-sm font-black text-brand tabular-nums">{entry.roundPoints ?? 0}</span>
                        )}

                        <span className="text-center text-xs font-semibold text-zinc-300 tabular-nums">{filterRoundId === 'geral' ? (entry.exactScores ?? 0) : (entry.roundExacts ?? 0)}</span>
                        <span className="text-center text-xs font-semibold text-zinc-300 tabular-nums">{entry.heartTeamScore ?? 0}</span>

                        <div className="flex items-center justify-center min-w-0">
                          {userWins && userWins.wins.length > 0 ? (
                            <div className="inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-400/5 px-1.5 py-1">
                              <ShieldList wins={userWins.wins} maxVisible={5} size={20} />
                              <span className="text-[10px] font-black text-yellow-300 tabular-nums">
                                {userWins.wins.length}x
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-700">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <details className="md:hidden mt-3 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-2xl">
        <summary className="cursor-pointer list-none text-[11px] font-bold text-zinc-400 flex items-center justify-between">
          <span>Critérios de desempate</span>
          <span className="text-zinc-500">⌄</span>
        </summary>
        <div className="mt-2 space-y-1 text-[11px] leading-5 text-left">
          <div className="flex items-center gap-2 text-white"><span className="font-black text-zinc-500">1.</span><span>Mais pontos</span></div>
          <div className="flex items-center gap-2 text-zinc-300"><span className="font-black text-zinc-500">2.</span><span>Mais acertos exatos</span></div>
          <div className="flex items-center gap-2 text-zinc-300"><span className="font-black text-zinc-500">3.</span><span>Mais pontos do time do coração</span></div>
          <div className="flex items-center gap-2 text-zinc-300"><span className="font-black text-zinc-500">4.</span><span>Mais resultados certos</span></div>
          <div className="flex items-center gap-2 text-zinc-300"><span className="font-black text-zinc-500">5.</span><span>Menos erros</span></div>
        </div>
      </details>

      {/* Tabela desktop */}
      <div className="hidden md:block overflow-x-auto pb-2">
        <div
          className="rounded-3xl overflow-hidden shadow-2xl min-w-[900px]"
          style={{ background: 'linear-gradient(180deg, rgba(39,39,42,0.92), rgba(24,24,27,0.96))', border: '1px solid rgba(255,255,255,0.08)' }}
        >
        {/* Cabeçalho */}
        <div
          className="grid gap-x-2 px-3 py-3 border-b border-zinc-800/70 bg-white/[0.02] backdrop-blur"
          style={{
            gridTemplateColumns:
              window.innerWidth < 768
                ? (filterRoundId === 'geral'
                    ? '36px 120px 80px 80px 90px 150px 80px'
                    : '36px 120px 90px 90px 100px 150px 90px')
                : (filterRoundId === 'geral'
                    ? '36px 280px 120px 120px 140px 155px 210px'
                    : '36px 280px 140px 140px 120px 140px 155px 210px')
          }}
        >
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 text-center">#</span>
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 text-center">Jogador</span>
          {filterRoundId === 'geral' ? (
            <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center" title="Pontos totais">
              <span className="block">Pontos</span>
              <span className="block">Geral</span>
            </span>
          ) : (
            <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center">
              <span className="block">Geral até</span>
              <span className="block">{selectedRound?.name.replace('Rodada ', 'R') ?? ''}</span>
            </span>
          )}
          {filterRoundId === 'geral' && currentRoundPoints && (
            <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center"><span className="block">Rodada</span><span className="block">Atual</span></span>
          )}

          {filterRoundId !== 'geral' && (
            <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center">
              <span className="block">Pontos</span>
              <span className="block">{selectedRound?.name ?? 'Rodada'}</span>
            </span>
          )}

          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center" title="Placares exatos"><span className="block">Acertos</span><span className="block">Exatos</span></span>
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center" title="Pontos nos jogos do time do coração"><span className="block">Time do</span><span className="block">Coração</span></span>
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center" title="Melhores da rodada"><span className="block">Melhor da</span><span className="block">Rodada</span></span>
        </div>

        {/* Linhas */}
        {(roundLoading || roundDataLoading) ? (
          <div className="flex justify-center py-6"><Spinner size="sm" /></div>
        ) : (
          <div className="divide-y divide-zinc-800/30">
            {displayRanking.map((entry, i) => {
              const isCurrentUser = entry.userId === user?.id;
              const userWins = winsMap.get(entry.userId);
              const pos = i + 1;
              const isLeader = pos === 1;
              const medalColor = pos <= 3 ? MEDAL_TEXT_COLOR[pos - 1] : undefined;
              const medalEmoji = pos <= 3 ? MEDAL_EMOJI[pos - 1] : null;


              return (
                <div
                  key={entry.userId}
                  className="px-3 md:px-5 py-4 transition-all hover:bg-white/[0.04] border-b border-white/[0.04] text-sm md:text-base"
                  style={{
                    background: isLeader
                      ? 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
                      : isCurrentUser
                        ? 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))'
                        : 'transparent',
                    borderLeft: isCurrentUser ? '2px solid rgba(255,255,255,0.25)' : '2px solid transparent',
                    boxShadow: isLeader ? '0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.6)' : undefined,
                  }}
                >
                  {/* Linha principal */}
                  <div
                    className="grid gap-x-2 items-center"
                    style={{
                      gridTemplateColumns:
                        window.innerWidth < 768
                          ? (filterRoundId === 'geral'
                              ? '36px 120px 80px 80px 90px 150px 80px'
                              : '36px 120px 90px 90px 100px 150px 90px')
                          : (filterRoundId === 'geral'
                              ? '36px 280px 120px 120px 140px 155px 210px'
                              : '36px 280px 140px 140px 120px 140px 155px 210px')
                    }}
                  >
                    {/* Posição */}
                    <div className="flex items-center justify-center">
                      {medalEmoji ? (
                        <span className="text-base leading-none">{medalEmoji}</span>
                      ) : (
                        <span className="text-xs text-zinc-300 font-medium">{pos}º</span>
                      )}
                    </div>

                    {/* Avatar + Nome */}
                    <div className="min-w-0 flex items-center gap-1.5">
                      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                        {entry.favoriteTeam && getTeamLogo(entry.favoriteTeam) ? (
                          <img
                            src={getTeamLogo(entry.favoriteTeam)!}
                            alt={entry.favoriteTeam}
                            className="w-6 h-6 object-contain"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                            style={
                              isCurrentUser
                                ? { background: 'rgba(255,255,255,0.08)', color: '#D4D4D8' }
                                : { background: '#27272A', color: '#A1A1AA' }
                            }
                          >
                            {(entry.displayName || entry.name).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className="text-sm font-semibold tracking-tight truncate text-white"
                            style={{ color: '#FFFFFF' }}
                          >
                            {window.innerWidth < 768 ? (entry.displayName || entry.name).split(' ')[0] : (entry.displayName || entry.name)}
                          </span>

                          {(() => {
                            const change = getPositionChange(i, entry.userId);

                            if (!change) return null;

                            return (
                              <span
                                className="text-[10px] font-bold flex items-center gap-0.5"
                                style={{
                                  color: change.type === 'up' ? '#22C55E' : '#EF4444'
                                }}
                              >
                                {change.type === 'up' ? '↑' : '↓'}
                                {change.value}
                              </span>
                            );
                          })()}
                          {isCurrentUser && (
                            <span className="text-xs flex-shrink-0 text-zinc-300">você</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pontos totais */}
                    <div className="flex items-center justify-center text-center w-full">
                      <span
                        className="text-base font-black tracking-tight tabular-nums text-center mx-auto"
                        style={{ color: '#FFFFFF' }}
                      >
                        {entry.totalPoints}
                      </span>
                    </div>

                    {/* Rodada atual */}
                    {filterRoundId === 'geral' && currentRoundPoints && (
                      <div className="flex items-center justify-center text-center w-full">
                        <span
                          className="text-base font-black tracking-tight tabular-nums text-center mx-auto text-brand"
                        >
                          {entry.roundPoints ?? 0}
                        </span>
                      </div>
                    )}

                    {/* Pontos da rodada */}
                    {filterRoundId !== 'geral' && (
                      <div className="flex items-center justify-center text-center w-full">
                        <span className="text-base font-black tracking-tight tabular-nums text-brand">
                          {entry.roundPoints ?? 0}
                        </span>
                      </div>
                    )}

                    {/* Acertos exatos */}
                    <div className="flex items-center justify-center text-center w-full">
                      <span className="text-xs font-semibold text-zinc-300 tabular-nums text-center mx-auto">
                        {filterRoundId === 'geral' ? (entry.exactScores ?? 0) : (entry.roundExacts ?? 0)}
                      </span>
                    </div>

                    {/* Time do coração */}
                    <div className="flex items-center justify-center text-center w-full">
                      <span className="text-xs font-semibold text-zinc-300 tabular-nums text-center mx-auto">
                        {entry.heartTeamScore ?? 0}
                      </span>
                    </div>

                    {/* Melhor da rodada */}
                    <div className="flex items-center justify-center min-w-0">
                      {userWins && userWins.wins.length > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-400/5 px-1.5 py-1">
                          <ShieldList wins={userWins.wins} maxVisible={8} size={22} />
                          <span className="text-[11px] font-black text-yellow-300 tabular-nums">
                            {userWins.wins.length}x
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-700">—</span>
                      )}
                    </div>



                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé */}
        <div className="px-4 py-2.5 border-t border-zinc-800/40">
          <div className="flex justify-center">
            <div className="group relative inline-flex items-center gap-1 text-xs text-zinc-500 cursor-help">
            <span className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center text-[10px]">
              i
            </span>

            <span>Critérios de desempate</span>

            <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-2xl backdrop-blur whitespace-nowrap">
                <div className="space-y-1 text-[11px] leading-5">
                  <div className="flex items-center gap-2 text-white">
                    <span className="font-black text-zinc-500">1.</span>
                    <span>Mais pontos</span>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="font-black text-zinc-500">2.</span>
                    <span>Mais acertos exatos</span>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="font-black text-zinc-500">3.</span>
                    <span>Mais pontos do time do coração</span>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="font-black text-zinc-500">4.</span>
                    <span>Mais resultados certos</span>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="font-black text-zinc-500">5.</span>
                    <span>Menos erros</span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-2xl md:hidden">
            <div className="space-y-1 text-[11px] leading-5 text-left">
              <div className="flex items-center gap-2 text-white"><span className="font-black text-zinc-500">1.</span><span>Mais pontos</span></div>
              <div className="flex items-center gap-2 text-zinc-300"><span className="font-black text-zinc-500">2.</span><span>Mais acertos exatos</span></div>
              <div className="flex items-center gap-2 text-zinc-300"><span className="font-black text-zinc-500">3.</span><span>Mais pontos do time do coração</span></div>
              <div className="flex items-center gap-2 text-zinc-300"><span className="font-black text-zinc-500">4.</span><span>Mais resultados certos</span></div>
              <div className="flex items-center gap-2 text-zinc-300"><span className="font-black text-zinc-500">5.</span><span>Menos erros</span></div>
            </div>
          </div>
        </div>
        </div>
      </div>


      {/* Resumo de vitórias de rodada com escudos */}
      {roundWinners.length > 0 && (
        <div
          className="mt-4 rounded-2xl p-4"
          style={{ background: 'linear-gradient(180deg, rgba(39,39,42,0.92), rgba(24,24,27,0.96))', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Flame size={14} className="text-brand" />
            <span className="font-black text-white text-sm">Vitórias de rodada</span>
          </div>
          <div className="space-y-3">
            {[...roundWinners]
              .sort((a, b) => b.wins.length - a.wins.length)
              .map((winner) => {
                const entry = ranking.find((e) => e.userId === winner.userId);
                if (!entry) return null;
                const isCurrentUser = winner.userId === user?.id;
                const gridCols = '32px 1.6fr 100px 90px 120px 120px';

return (
                  <div key={winner.userId} className="flex items-center justify-between gap-3">
                    <span
                      className="text-sm font-semibold flex-shrink-0"
                      style={{ color: isCurrentUser ? '#FFFFFF' : '#E5E7EB' }}
                    >
                      <span className="flex items-center gap-2">
                        {entry.favoriteTeam && getTeamLogo(entry.favoriteTeam) && (
                          <img
                            src={getTeamLogo(entry.favoriteTeam)!}
                            alt={entry.favoriteTeam}
                            className="w-4 h-4 object-contain flex-shrink-0"
                          />
                        )}

                        <span className="truncate">
                          {window.innerWidth < 768 ? (entry.displayName || entry.name).split(' ')[0] : (entry.displayName || entry.name)}
                        </span>

                        {isCurrentUser && <span className="text-xs opacity-50">você</span>}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <ShieldList wins={winner.wins} maxVisible={6} size={22} />
                      <span className="text-xs text-zinc-300 flex-shrink-0">
                        {winner.wins.length} vitória{winner.wins.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Maiores pontuações em rodada */}
      {biggestRoundScores.length > 0 && (
        <div
          className="mt-4 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg, rgba(39,39,42,0.92), rgba(24,24,27,0.96))', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-brand" />
              <span className="font-black text-white text-sm">Maiores pontuações em rodada</span>
            </div>

            <button
              type="button"
              onClick={handleShareBiggestScores}
              className="flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              <Share2 size={12} />
              Compartilhar
            </button>
          </div>

          <div
            className="grid items-center gap-3 px-4 py-3 border-b border-zinc-700/70 text-xs font-black uppercase tracking-wide text-zinc-300"
            style={{ gridTemplateColumns: '64px 1fr 72px' }}
          >
            <button type="button" onClick={() => handleBiggestScoresSort('round')} className="text-left hover:text-white transition-colors">
              Rodada {biggestScoresSort.key === 'round' ? (biggestScoresSort.direction === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button type="button" onClick={() => handleBiggestScoresSort('player')} className="text-left hover:text-white transition-colors">
              Jogador {biggestScoresSort.key === 'player' ? (biggestScoresSort.direction === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button type="button" onClick={() => handleBiggestScoresSort('points')} className="text-right hover:text-white transition-colors">
              Pontos {biggestScoresSort.key === 'points' ? (biggestScoresSort.direction === 'asc' ? '↑' : '↓') : ''}
            </button>
          </div>

          <div className="divide-y divide-zinc-800/50">
            {sortedBiggestRoundScores.map((score, index) => (
              <div
                key={`${score.roundNumber}-${score.userId}-${index}`}
                className="grid items-center gap-3 px-4 py-3"
                style={{ gridTemplateColumns: '64px 1fr 72px' }}
              >
                <span className="text-xs font-bold text-zinc-400">
                  Rod. {score.roundNumber}
                </span>

                <div className="flex items-center gap-2 min-w-0">
                  {score.points === highestBiggestRoundScore && (
                    <Trophy size={14} className="text-yellow-400 flex-shrink-0" />
                  )}

                  <div className="flex items-center gap-2 min-w-0">
                    {ranking.find((r) => r.userId === score.userId)?.favoriteTeam &&
                      getTeamLogo(ranking.find((r) => r.userId === score.userId)?.favoriteTeam || '') && (
                      <img
                        src={getTeamLogo(ranking.find((r) => r.userId === score.userId)?.favoriteTeam || '')!}
                        alt=""
                        className="w-4 h-4 object-contain flex-shrink-0"
                      />
                    )}

                    <span className="text-sm font-semibold text-white truncate">
                      {score.playerName}
                    </span>
                  </div>
                </div>

                <span className="text-right text-sm font-black text-brand tabular-nums">
                  {score.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
