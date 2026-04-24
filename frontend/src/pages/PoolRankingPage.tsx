// ============================================================
// Na Gaveta — Página de Tabela Completa (/pools/:id/ranking)
// Estatísticas detalhadas: ranking geral + por rodada + escudos
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, CheckCircle, Flame } from 'lucide-react';
import {
  getPoolRanking,
  getRoundRanking,
  getPoolMatches,
  getPoolRoundWinners,
  type RankingEntry,
  type RoundRankingEntry,
  type Round,
  type UserRoundWins,
} from '../services/match.service';
import { getPool, type Pool } from '../services/pool.service';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui';
import { ShieldList } from '../components/ShieldBadge';

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
      r.matches.some((m) => m.status === 'FINISHED')
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
      const winners = await getPoolRoundWinners(id);
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
  }> = filterRoundId === 'geral'
    ? ranking.map((e) => ({
        userId: e.userId,
        name: e.name,
        totalPoints: e.totalPoints,
        exactScores: e.exactScores ?? 0,
        correctOutcomes: e.correctOutcomes ?? 0,
      }))
    : roundRanking.map((e) => ({
        userId: e.userId,
        name: e.name,
        totalPoints: ranking.find((r) => r.userId === e.userId)?.totalPoints ?? 0,
        exactScores: ranking.find((r) => r.userId === e.userId)?.exactScores ?? 0,
        correctOutcomes: ranking.find((r) => r.userId === e.userId)?.correctOutcomes ?? 0,
        roundPoints: e.roundPoints,
        roundExacts: e.exactScores,
        roundOutcomes: e.correctOutcomes,
      }));

  const selectedRound = rounds.find((r) => r.id === filterRoundId);

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
          {finishedRounds.map((r) => (
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

      {/* Tabela */}
      <div
        className="rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(180deg, rgba(39,39,42,0.92), rgba(24,24,27,0.96))', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Cabeçalho */}
        <div
          className="grid gap-x-6 px-5 py-3 border-b border-zinc-800/70 bg-white/[0.02] backdrop-blur"
          style={{ gridTemplateColumns: filterRoundId === 'geral' ? '36px minmax(300px,1fr) 130px 130px 140px 170px' : '36px minmax(300px,1fr) 130px 130px 140px 170px 120px' }}
        >
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 text-center">#</span>
          <span className="text-[11px] uppercase tracking-wider text-zinc-400">Jogador</span>
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center" title="Pontos totais">Pontos Geral</span>
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center" title="Placares exatos">Acertos Exatos</span>
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center" title="Pontos nos jogos do time do coração">Time do Coração</span>
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center" title="Melhores da rodada">Melhor da Rodada</span>
          {filterRoundId !== 'geral' && (
            <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300 text-center">Pontos da Rodada</span>
          )}
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

              const gridCols = '32px 1.6fr 100px 90px 120px 120px';

return (
                <div
                  key={entry.userId}
                  className="px-5 py-4 transition-all hover:bg-white/[0.04] border-b border-white/[0.04]"
                  style={{
  background: isLeader
  ? 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
  : isCurrentUser
    ? 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))'
    : 'transparent',
  borderLeft: isCurrentUser ? '2px solid rgba(255,255,255,0.25)' : '2px solid transparent',
boxShadow: isLeader ? '0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.6)' : undefined
}}
                >
                  {/* Linha principal */}
                  <div
                    className="grid gap-x-6 items-center"
                    style={{ gridTemplateColumns: filterRoundId === 'geral' ? '36px minmax(300px,1fr) 130px 130px 140px 170px' : '36px minmax(300px,1fr) 130px 130px 140px 170px 120px' }}
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
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                        style={
                          isCurrentUser
                            ? { background: 'rgba(255,255,255,0.08)', color: '#D4D4D8' }
                            : { background: '#27272A', color: '#A1A1AA' }
                        }
                      >
                        {entry.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className="text-sm font-semibold tracking-tight truncate text-white"
                            style={{ color: '#FFFFFF' }}
                          >
                            {entry.name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs flex-shrink-0 text-zinc-300">você</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pontos totais */}
                    <div className="text-center">
                      <span
                        className="text-base font-black tracking-tight tabular-nums text-center"
                        style={{ color: '#FFFFFF' }}
                      >
                        {entry.totalPoints}
                      </span>
                    </div>

                    {/* Acertos exatos */}
                    <div className="text-center">
                      <span className="text-xs font-semibold text-zinc-300 tabular-nums text-center">
                        {filterRoundId === 'geral' ? (entry.exactScores ?? 0) : (entry.roundExacts ?? 0)}
                      </span>
                    </div>

                    {/* Time do coração */}
                    <div className="text-center">
                      <span className="text-xs font-semibold text-zinc-300 tabular-nums text-center">
                        {entry.heartTeamScore ?? 0}
                      </span>
                    </div>

                    {/* Melhor da rodada */}
                    <div className="flex items-center justify-center min-w-0">
                      {userWins && userWins.wins.length > 0 ? (
                        <ShieldList wins={userWins.wins} maxVisible={12} size={22} />
                      ) : (
                        <span className="text-xs text-zinc-800 opacity-60">0</span>
                      )}
                    </div>



                    {/* Pts rodada (apenas no filtro por rodada) */}
                    {filterRoundId !== 'geral' && (
                      <div className="text-center">
                        <span
                          className="text-base font-black tracking-tight tabular-nums text-center"
                          style={{ color: '#FFFFFF' }}
                        >
                          {entry.roundPoints ?? 0}
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé */}
        <div className="px-4 py-2.5 border-t border-zinc-800/40">
          <p className="text-xs text-zinc-700 text-center">
            {filterRoundId === 'geral'
              ? 'Desempate: pontos · acertos exatos · resultados certos · menos erros'
              : `${selectedRound?.name ?? 'Rodada'} — Desempate: pontos · acertos exatos`
            }
          </p>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1"><Target size={11} className="text-zinc-300" /> Placar exato</span>
        <span className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500" /> Resultado certo</span>
        <span className="flex items-center gap-1"><span className="text-xs">🛡️</span> Vitória de rodada (escudo do time do coração)</span>
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
                      {entry.name.split(' ')[0]}
                      {isCurrentUser && <span className="text-xs ml-1 opacity-50">você</span>}
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

      <div className="h-8" />
    </div>
  );
}
