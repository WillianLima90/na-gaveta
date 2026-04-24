// ============================================================
// Na Gaveta — RankingBlock v10 — Competition perception
// Tabela esportiva estilo Bolão FC:
//   - Colunas: # | Jogador (escudo+nome+ShieldBall vitórias) | Pts | Rod | E | Res
//   - E = acertos exatos de placar
//   - Res = acertos de resultado (vencedor/empate)
//   - ShieldBall abaixo do nome para vitórias de rodada
//   - FIX CRÍTICO: finishedRounds memoizado com useMemo (evita loop infinito)
// ============================================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Trophy, Flame, Star, ChevronRight, Target, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getPoolRanking,
  getRoundRanking,
  getRoundHighlights,
  getPoolRoundWinners,
  type RankingEntry,
  type RoundHighlights,
  type Round,
  type UserRoundWins,
} from '../services/match.service';
import { Spinner } from './ui';
import { ShieldNormal, ShieldBallList } from './ShieldBadge';

interface RankingBlockProps {
  ownerId?: string;
  poolId: string;
  currentUserId?: string;
  rounds: Round[];
  isAuthenticated: boolean;
  isMember: boolean;
}

// Medalhas e cores
const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];
const MEDAL_BG = [
  'rgba(255,215,0,0.08)',
  'rgba(192,192,192,0.06)',
  'rgba(205,127,50,0.06)',
];
const MEDAL_TEXT = ['#FFD700', '#C0C0C0', '#CD7F32'];

interface RoundEntry {
  userId: string;
  name: string;
  favoriteTeam?: string | null;
  roundPoints: number;
  exactScores: number;
  correctOutcomes: number;
  wonRound: boolean;
}

export function RankingBlock({
  ownerId,
  poolId,
  currentUserId,
  rounds,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isAuthenticated: _isAuthenticated,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isMember: _isMember,
}: RankingBlockProps) {
  const navigate = useNavigate();

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [highlights, setHighlights] = useState<RoundHighlights | null>(null);
  const [roundWinners, setRoundWinners] = useState<UserRoundWins[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('geral');
  const [sortBy, setSortBy] = useState<'pts' | 'exact' | 'heart' | 'rod'>('pts');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [roundDataMap, setRoundDataMap] = useState<Map<string, RoundEntry[]>>(new Map());
  const [roundDataLoading, setRoundDataLoading] = useState(false);

  // FIX CRÍTICO: memoizar finishedRounds para evitar loop infinito
  const finishedRounds = useMemo(
    () => rounds.filter((r) => r.matches.some((m) => m.status === 'FINISHED')),
    [rounds]
  );

  const loadRanking = useCallback(async () => {
    setRankingLoading(true);
    try {
      const data = await getPoolRanking(poolId);
      setRanking(data.ranking);
    } catch {
      setRanking([]);
    } finally {
      setRankingLoading(false);
    }
  }, [poolId]);

  const loadRoundsData = useCallback(async () => {
    if (finishedRounds.length === 0) return;
    setRoundDataLoading(true);
    const rdMap = new Map<string, RoundEntry[]>();
    try {
      await Promise.all(
        finishedRounds.map(async (r) => {
          try {
            const data = await getRoundRanking(poolId, r.id);
            if (data.ranking.length > 0) {
              const maxPts = data.ranking[0].roundPoints;
              const entries: RoundEntry[] = data.ranking.map((e) => ({
                userId: e.userId,
                name: e.name,
                favoriteTeam: e.favoriteTeam ?? null,
                roundPoints: e.roundPoints ?? 0,
                exactScores: e.exactScores ?? 0,
                correctOutcomes: e.correctOutcomes ?? 0,
                wonRound: maxPts > 0 && (e.roundPoints ?? 0) === maxPts,
              }));
              rdMap.set(r.id, entries);
            }
          } catch {
            // ignorar erros individuais de rodada
          }
        })
      );
    } finally {
      setRoundDataMap(rdMap);
      setRoundDataLoading(false);
    }
  }, [poolId, finishedRounds]);

  const loadHighlights = useCallback(async () => {
    if (finishedRounds.length === 0) return;
    const richest = finishedRounds.reduce((best, r) => {
      const fc = r.matches.filter((m) => m.status === 'FINISHED').length;
      const bc = best.matches.filter((m) => m.status === 'FINISHED').length;
      return fc >= bc ? r : best;
    }, finishedRounds[0]);
    try {
      const data = await getRoundHighlights(poolId, richest.id);
      setHighlights(data.highlights);
    } catch {
      setHighlights(null);
    }
  }, [poolId, finishedRounds]);

  const loadRoundWinners = useCallback(async () => {
    if (finishedRounds.length === 0) return;
    try {
      const winners = await getPoolRoundWinners(poolId);
      setRoundWinners(winners);
    } catch {
      setRoundWinners([]);
    }
  }, [poolId, finishedRounds]);

  useEffect(() => { loadRanking(); }, [loadRanking]);
  useEffect(() => {
    if (rounds.length > 0) {
      loadRoundsData();
      loadHighlights();
      loadRoundWinners();
    }
  }, [rounds, loadRoundsData, loadHighlights, loadRoundWinners]);

  // Mapa userId → wins (ShieldBall)
  const winsMap = useMemo(() => {
    const m = new Map<string, UserRoundWins>();
    roundWinners.forEach((w) => m.set(w.userId, w));
    return m;
  }, [roundWinners]);

  const isRoundFilter = selectedRound !== 'geral';

  interface DisplayRow {
    userId: string;
    name: string;
    favoriteTeam?: string | null;
    pts: number;
    heart: number;
    exact: number;
    correct: number;
    wonThisRound: boolean;
  }

  const displayRows: DisplayRow[] = useMemo(() => {
    if (selectedRound === 'geral') {
      return ranking.map((e) => ({
        userId: e.userId,
        name: e.name,
        favoriteTeam: e.favoriteTeam ?? null,
        pts: e.totalPoints,
        heart: e.heartTeamScore ?? 0,
        exact: e.exactScores ?? 0,
        correct: e.correctOutcomes ?? 0,
        wonThisRound: false,
      }));
    }
    const rdEntries = roundDataMap.get(selectedRound) ?? [];
    const sorted = [...rdEntries].sort((a, b) => b.roundPoints - a.roundPoints);
    return sorted.map((e) => ({
      userId: e.userId,
      name: e.name,
      favoriteTeam: e.favoriteTeam ?? null,
      pts: e.roundPoints,
      heart: 0,
      exact: e.exactScores,
      correct: e.correctOutcomes,
      wonThisRound: e.wonRound,
    }));
  }, [selectedRound, ranking, roundDataMap]);

  function handleSort(column: 'pts' | 'exact' | 'heart' | 'rod') {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortBy(column);
    setSortDir('desc');
  }

  useEffect(() => {
    if (selectedRound === 'geral') {
      setSortBy('pts');
      setSortDir('desc');
    } else {
      setSortBy('rod');
      setSortDir('desc');
    }
  }, [selectedRound]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'desc' ? -1 : 1;
    return [...displayRows].sort((a, b) => {
      const aValue = sortBy === 'rod' ? a.pts : a[sortBy];
      const bValue = sortBy === 'rod' ? b.pts : b[sortBy];

      if (aValue !== bValue) return aValue > bValue ? dir : -dir;

      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.exact !== a.exact) return b.exact - a.exact;
      if (b.heart !== a.heart) return b.heart - a.heart;
      return b.correct - a.correct;
    });
  }, [displayRows, sortBy, sortDir]);

  function SortLabel({ column, children, title }: { column: 'pts' | 'exact' | 'heart' | 'rod'; children: React.ReactNode; title: string }) {
    const active = sortBy === column;
    return (
      <button
        type="button"
        onClick={() => handleSort(column)}
        title={title}
        className={`text-xs font-semibold text-right transition flex items-center justify-end gap-0.5 ${
          active ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'
        }`}
      >
        <span>{children}</span>
        <span className={`text-[9px] ${active ? 'opacity-100' : 'opacity-0'}`}>
          {sortDir === 'desc' ? '↓' : '↑'}
        </span>
      </button>
    );
  }

  const maxWins = useMemo(() => {
    let max = 0;
    displayRows.forEach((row) => {
      const w = winsMap.get(row.userId)?.wins.length ?? 0;
      if (w > max) max = w;
    });
    return max;
  }, [displayRows, winsMap]);

  if (rankingLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="sm" />
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center mb-4">
        <Trophy size={28} className="text-zinc-600 mx-auto mb-2" />
        <p className="text-zinc-400 text-sm">Ranking aparece após os primeiros resultados</p>
      </div>
    );
  }

  const recordHolder = ranking[0];
  const userRankPos = displayRows.findIndex((e) => e.userId === currentUserId);
  const userRow = userRankPos >= 0 ? displayRows[userRankPos] : null;

  // Grid: # | Jogador | Pts | Rod | Exatos | Resultados
  const gridCols = '24px minmax(120px,1fr) 48px 44px 44px 44px';

  // ── Métricas de competição ────────────────────────────────
  const leaderPts = displayRows[0]?.pts ?? 1;
  // Threshold de "disputa": diferença ≤ 20% dos pontos do líder
  const disputeThreshold = Math.max(10, Math.round(leaderPts * 0.20));

  // Opacidade por distância: 1.0 para 1º, decai até 0.55 para o último
  const opacityForPos = (pos: number, total: number): number => {
    if (total <= 1) return 1;
    const decay = 0.45; // total de queda
    return 1 - (decay * (pos - 1)) / (total - 1);
  };

  return (
    <div className="mb-3">
      {/* ── TABELA DO BOLÃO ─────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-yellow-400" />
            <span className="font-black text-white text-sm">Tabela do bolão</span>
            <span className="text-xs text-zinc-600">
              {ranking.length} participante{ranking.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Filtros de rodada */}
        {finishedRounds.length > 0 && (
          <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-none">
            <FilterBtn
              label="Geral"
              active={selectedRound === 'geral'}
              onClick={() => setSelectedRound('geral')}
            />
            {finishedRounds.map((r) => (
              <FilterBtn
                key={r.id}
                label={r.name.replace(/^Rodada\s+/i, 'R')}
                active={selectedRound === r.id}
                onClick={() => setSelectedRound(r.id)}
              />
            ))}
          </div>
        )}

        {/* Cabeçalho da tabela */}
        <div
          className="grid items-center gap-x-2 px-3 py-1.5 border-b border-zinc-800/60"
          style={{ gridTemplateColumns: gridCols }}
        >
          <span className="text-xs font-semibold text-zinc-600 text-center">#</span>
          <span className="text-xs font-semibold text-zinc-600 pl-1">Jogador</span>
          <SortLabel column="pts" title="Pontos totais">
            Pts
          </SortLabel>
          <SortLabel column="exact" title="Acertos exatos de placar">
            <Target size={9} className="text-yellow-500 flex-shrink-0" />
            <span>Ex</span>
          </SortLabel>
          <SortLabel column="heart" title="Pontos nos jogos do time do coração">
            ❤️
          </SortLabel>
          <SortLabel column="rod" title="Pontos da rodada">
            Rod
          </SortLabel>


        </div>

        {/* Linhas */}
        <div className="divide-y divide-zinc-800/30">
          {isRoundFilter && roundDataLoading && !roundDataMap.has(selectedRound) ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            sortedRows.map((row, i) => {
              const isCurrentUser = row.userId === currentUserId;
              const pos = i + 1;
              const medalEmoji = pos <= 3 ? MEDAL_EMOJI[pos - 1] : null;
              const medalTextColor = pos <= 3 ? MEDAL_TEXT[pos - 1] : undefined;
              const medalBg = pos <= 3 ? MEDAL_BG[pos - 1] : undefined;
              const userWins = winsMap.get(row.userId);

              // Pontos da rodada mais recente (coluna Rod no modo Geral)
              const roundPts: number | null = isRoundFilter
                ? null
                : (() => {
                    if (finishedRounds.length === 0) return null;
                    const lastRound = finishedRounds[finishedRounds.length - 1];
                    const rdEntries = roundDataMap.get(lastRound.id);
                    if (!rdEntries) return null;
                    const entry = rdEntries.find((e) => e.userId === row.userId);
                    return entry ? entry.roundPoints : null;
                  })();

              // No modo rodada, Pts já é o roundPoints
              const displayRodPts = isRoundFilter ? row.pts : roundPts;

              // ── Métricas de competição por linha ───────────
              // Barra de progresso relativa ao líder
              const progressPct = leaderPts > 0 ? Math.round((row.pts / leaderPts) * 100) : 0;
              // Disputa com o jogador acima
              const prevPts = i > 0 ? sortedRows[i - 1].pts : null;
              const isDispute = prevPts !== null && (prevPts - row.pts) <= disputeThreshold && (prevPts - row.pts) >= 0;
              // Opacidade por distância
              const rowOpacity = isCurrentUser ? 1 : opacityForPos(pos, sortedRows.length);
              // ShieldBall tamanho proporcional às vitórias
              const userWinCount = userWins?.wins.length ?? 0;
              const shieldSize = maxWins > 0 ? Math.round(13 + (userWinCount / maxWins) * 5) : 15;

              return (
                <div key={row.userId}>
                  {/* Badge de disputa entre linhas */}
                  {isDispute && i > 0 && (
                    <div className="flex items-center justify-center py-0.5">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(249,115,22,0.12)',
                          color: '#F97316',
                          fontSize: '9px',
                          letterSpacing: '0.05em',
                        }}
                      >
                        ⚡ {prevPts! - row.pts === 0 ? 'EMPATE' : `${prevPts! - row.pts} pts de diferença`}
                      </span>
                    </div>
                  )}

                  <div
                    className="transition-all"
                    style={{
                      background: isCurrentUser
                        ? 'rgba(249,115,22,0.07)'
                        : medalBg,
                      opacity: rowOpacity,
                      ...(pos === 1 ? { boxShadow: 'inset 0 0 0 1px rgba(255,215,0,0.22)' } : {}),
                    }}
                  >
                    <div
                      className="grid items-center gap-x-2 px-3 pt-2 pb-1"
                      style={{ gridTemplateColumns: gridCols }}
                    >
                      {/* Posição */}
                      <div className="flex items-center justify-center">
                        {medalEmoji ? (
                          <span className={pos === 1 ? 'text-base leading-none' : 'text-sm leading-none'}>{medalEmoji}</span>
                        ) : (
                          <span className="text-xs text-zinc-500 font-medium tabular-nums">{pos}º</span>
                        )}
                      </div>

                      {/* Jogador: escudo + nome + ShieldBall vitórias */}
                      <div className="flex items-center gap-1.5 min-w-0 pl-1">
                        <ShieldNormal teamName={row.favoriteTeam} size={pos === 1 ? 22 : 18} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={`${pos === 1 ? 'text-sm' : 'text-xs'} font-semibold truncate`}
                              style={{ color: isCurrentUser ? '#F97316' : medalTextColor ?? '#E5E7EB' }}
                            >
                              {row.name.split(' ')[0]}
                            </span>
                            {isCurrentUser && (
                              <span className="text-xs flex-shrink-0" style={{ color: 'rgba(249,115,22,0.45)' }}>
                                você
                              </span>
                            )}
                            {row.wonThisRound && (
                              <span className="text-xs flex-shrink-0" style={{ color: '#FFD700' }}>★</span>
                            )}
                          </div>
                          {/* ShieldBall vitórias — tamanho proporcional às vitórias */}
                          {/* ShieldBall vitórias — tamanho proporcional às vitórias */}
                          {!isRoundFilter && userWins && userWins.wins.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <ShieldBallList wins={userWins.wins} maxVisible={5} size={shieldSize} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pontos totais — líder maior */}
                      <div className="text-right">
                        <span
                          className={`${pos === 1 ? 'text-sm' : 'text-xs'} font-black tabular-nums`}
                          style={{ color: isCurrentUser ? '#F97316' : medalTextColor ?? '#A1A1AA' }}
                        >
                          {row.pts}
                        </span>
                      </div>

                      {/* Acertos exatos */}
                      <div className="text-right">
                        {row.exact > 0 ? (
                          <span className="text-xs font-bold tabular-nums text-yellow-500">
                            {row.exact}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-700">—</span>
                        )}
                      </div>

                      {/* ❤️ Pontos do time do coração */}
                      <div className="text-right">
                        <span className="text-xs font-bold tabular-nums text-pink-500">
                          {row.heart}
                        </span>
                      </div>

                      {/* Pontos da rodada */}
                      <div className="text-right">
                        {displayRodPts !== null && displayRodPts !== undefined ? (
                          <span
                            className="text-xs font-semibold tabular-nums"
                            style={{
                              color: displayRodPts > 0 ? '#71717A' : 'transparent',
                              textShadow: displayRodPts === 0 ? 'none' : undefined,
                              opacity: displayRodPts === 0 ? 0 : 1,
                            }}
                          >
                            {displayRodPts > 0 ? displayRodPts : '0'}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-700">—</span>
                        )}
                      </div>


                  </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="px-4 py-2 border-t border-zinc-800/40 flex items-center justify-between gap-2">
          {userRow && userRankPos >= 3 ? (
            <span className="text-xs text-zinc-500">
              Você: <span className="text-brand font-bold">{userRankPos + 1}º</span>
              <span className="text-zinc-600 mx-1">·</span>
              <span className="font-bold text-zinc-400">{userRow.pts} pts</span>
            </span>
          ) : (
            <span className="text-xs text-zinc-600 flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <Target size={9} className="text-yellow-500" /> Exatos
              </span>
              <span className="flex items-center gap-0.5">
                <CheckCircle size={9} className="text-blue-500" /> Resultados
              </span>
              <span>· escudos = vitórias</span>
            </span>
          )}
          <button
            onClick={() => navigate(`/pools/${poolId}/ranking`)}
            className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-light transition-colors flex-shrink-0"
          >
            Ver completo <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* ── MELHOR DA RODADA + RECORDE ───────────────────────── */}
      {(highlights?.bestUser || recordHolder) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {highlights?.bestUser && (
            <div
              className="rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.15)' }}
            >
              <div className="flex items-center gap-1 mb-1">
                <Flame size={11} className="text-brand" />
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Melhor rodada</span>
              </div>
              <p className="font-bold text-white text-xs truncate">{highlights.bestUser.name.split(' ')[0]}</p>
              <p className="text-sm font-black text-brand tabular-nums">
                {highlights.bestUser.roundPoints}
                <span className="text-xs font-normal text-zinc-600 ml-1">pts</span>
              </p>
            </div>
          )}
          {recordHolder && (
            <div
              className="rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.12)' }}
            >
              <div className="flex items-center gap-1 mb-1">
                <Star size={11} style={{ color: '#FFD700' }} />
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Recorde</span>
              </div>
              <p className="font-bold text-white text-xs truncate">{recordHolder.name.split(' ')[0]}</p>
              <p className="text-sm font-black tabular-nums" style={{ color: '#FFD700' }}>
                {recordHolder.totalPoints}
                <span className="text-xs font-normal text-zinc-600 ml-1">pts</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Botão de filtro de rodada ──────────────────────────────────────────
function FilterBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
      style={
        active
          ? { background: 'rgba(249,115,22,0.18)', color: '#F97316', border: '1px solid rgba(249,115,22,0.35)' }
          : { background: 'transparent', color: '#71717A', border: '1px solid rgba(255,255,255,0.06)' }
      }
    >
      {label}
    </button>
  );
}
