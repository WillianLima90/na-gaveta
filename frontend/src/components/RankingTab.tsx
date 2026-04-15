// ============================================================
// Na Gaveta — RankingTab v2
// Ranking geral com desempate em 4 critérios + ranking por rodada
// ============================================================

import { useState, useEffect } from 'react';
import { Trophy, Target, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getPoolRanking,
  getRoundRanking,
  type RankingEntry,
  type RoundRankingEntry,
  type Round,
} from '../services/match.service';
import { Spinner } from './ui';

interface RankingTabProps {
  poolId: string;
  rounds?: Round[];
}

const POSITION_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-zinc-300',
  3: 'text-amber-600',
};

const POSITION_ICONS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function RankingTab({ poolId, rounds = [] }: RankingTabProps) {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [roundRanking, setRoundRanking] = useState<RoundRankingEntry[]>([]);
  const [roundLoading, setRoundLoading] = useState(false);
  const [showRoundPicker, setShowRoundPicker] = useState(false);

  useEffect(() => {
    loadRanking();
  }, [poolId]);

  useEffect(() => {
    if (selectedRoundId) {
      loadRoundRanking(selectedRoundId);
    }
  }, [selectedRoundId]);

  async function loadRanking() {
    setLoading(true);
    setError(null);
    try {
      const data = await getPoolRanking(poolId);
      setRanking(data.ranking);
    } catch {
      setError('Erro ao carregar ranking');
    } finally {
      setLoading(false);
    }
  }

  async function loadRoundRanking(roundId: string) {
    setRoundLoading(true);
    try {
      const data = await getRoundRanking(poolId, roundId);
      setRoundRanking(data.ranking);
    } catch {
      setRoundRanking([]);
    } finally {
      setRoundLoading(false);
    }
  }

  const selectedRound = rounds.find((r) => r.id === selectedRoundId);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-400 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Seletor de rodada */}
      {rounds.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowRoundPicker(!showRoundPicker)}
            className="w-full flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white hover:border-brand/50 transition-colors"
          >
            <span className="font-medium">
              {selectedRound ? selectedRound.name : 'Ranking Geral'}
            </span>
            {showRoundPicker ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {showRoundPicker && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-10 shadow-xl">
              <button
                onClick={() => { setSelectedRoundId(null); setShowRoundPicker(false); }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-zinc-700 transition-colors ${!selectedRoundId ? 'text-brand font-semibold' : 'text-white'}`}
              >
                Ranking Geral
              </button>
              {rounds.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setSelectedRoundId(r.id); setShowRoundPicker(false); }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-zinc-700 transition-colors flex items-center gap-2 ${selectedRoundId === r.id ? 'text-brand font-semibold' : 'text-white'}`}
                >
                  {r.name}
                  {r.id === pool?.bonusRoundId && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-0.5">BÔNUS</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ranking por rodada */}
      {selectedRoundId ? (
        roundLoading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : (
          <RoundRankingList
            ranking={roundRanking}
            roundName={selectedRound?.name ?? ''}
            isBonusRound={selectedRound?.id === pool?.bonusRoundId}
          />
        )
      ) : (
        /* Ranking geral */
        <GeneralRankingList ranking={ranking} />
      )}
    </div>
  );
}

// ── Ranking Geral ─────────────────────────────────────────────
function GeneralRankingList({ ranking }: { ranking: RankingEntry[] }) {
  if (ranking.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <Trophy size={32} className="text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 text-sm">Nenhum palpite pontuado ainda.</p>
        <p className="text-zinc-500 text-xs mt-1">O ranking será atualizado após os jogos.</p>
      </div>
    );
  }

  const currentUserEntry = ranking.find((r) => r.isCurrentUser);

  return (
    <div className="space-y-3">
      {/* Destaque do usuário atual fora do top 3 */}
      {currentUserEntry && currentUserEntry.position > 3 && (
        <div className="bg-brand/10 border border-brand/30 rounded-xl p-4">
          <p className="text-xs text-brand font-medium mb-2 uppercase tracking-wider">Sua posição</p>
          <GeneralRankingRow entry={currentUserEntry} highlight />
        </div>
      )}

      {/* Pódio */}
      {ranking.filter((r) => r.position <= 3).length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <Trophy size={16} className="text-yellow-400" />
            <h3 className="font-bold text-white text-sm">Pódio</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {ranking.filter((r) => r.position <= 3).map((entry) => (
              <GeneralRankingRow key={entry.userId} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Restante */}
      {ranking.filter((r) => r.position > 3).length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="font-bold text-white text-sm">Classificação completa</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {ranking.filter((r) => r.position > 3).map((entry) => (
              <GeneralRankingRow key={entry.userId} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Legenda de desempate */}
      <p className="text-xs text-zinc-600 text-center px-2">
        Desempate: 1° pontos · 2° acertos exatos · 3° acertos resultado · 4° menos erros
      </p>
    </div>
  );
}

function GeneralRankingRow({ entry, highlight = false }: { entry: RankingEntry; highlight?: boolean }) {
  const positionColor = POSITION_COLORS[entry.position] ?? 'text-zinc-500';
  const positionIcon = POSITION_ICONS[entry.position];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${highlight ? 'bg-brand/5' : ''}`}>
      <div className={`text-sm font-black w-7 text-center flex-shrink-0 ${positionColor}`}>
        {positionIcon ?? `#${entry.position}`}
      </div>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
        entry.isCurrentUser ? 'bg-brand/20 text-brand border border-brand/30' : 'bg-zinc-800 text-zinc-400'
      }`}>
        {entry.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${entry.isCurrentUser ? 'text-brand' : 'text-white'}`}>
          {entry.name}
          {entry.isCurrentUser && <span className="ml-1.5 text-xs font-normal text-brand/70">(você)</span>}
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {entry.exactScores > 0 && (
            <span className="flex items-center gap-0.5 text-green-400">
              <Target size={9} /> {entry.exactScores} exato{entry.exactScores > 1 ? 's' : ''}
            </span>
          )}
          {entry.correctOutcomes > 0 && (
            <span className="flex items-center gap-0.5 text-blue-400">
              <CheckCircle size={9} /> {entry.correctOutcomes} resultado{entry.correctOutcomes > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-base font-black tabular-nums ${entry.totalPoints > 0 ? 'text-brand' : 'text-zinc-500'}`}>
          {entry.totalPoints}
        </p>
        <p className="text-xs text-zinc-600">pts</p>
      </div>
    </div>
  );
}

// ── Ranking por Rodada ────────────────────────────────────────
function RoundRankingList({
  ranking,
  roundName,
  isBonusRound,
}: {
  ranking: RoundRankingEntry[];
  roundName: string;
  isBonusRound: boolean;
}) {
  if (ranking.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <Trophy size={32} className="text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 text-sm">Nenhum palpite nesta rodada ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <Trophy size={16} className="text-brand" />
          <h3 className="font-bold text-white text-sm">{roundName}</h3>
          {isBonusRound && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-0.5 font-bold">BÔNUS 2×</span>
          )}
        </div>
        <div className="divide-y divide-zinc-800">
          {ranking.map((entry) => (
            <RoundRankingRow key={entry.userId} entry={entry} />
          ))}
        </div>
      </div>
      <p className="text-xs text-zinc-600 text-center">
        Desempate: 1° pontos · 2° acertos exatos · 3° acertos resultado
      </p>
    </div>
  );
}

function RoundRankingRow({ entry }: { entry: RoundRankingEntry }) {
  const positionColor = POSITION_COLORS[entry.position] ?? 'text-zinc-500';
  const positionIcon = POSITION_ICONS[entry.position];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${entry.isCurrentUser ? 'bg-brand/5' : ''}`}>
      <div className={`text-sm font-black w-7 text-center flex-shrink-0 ${positionColor}`}>
        {positionIcon ?? `#${entry.position}`}
      </div>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
        entry.isCurrentUser ? 'bg-brand/20 text-brand border border-brand/30' : 'bg-zinc-800 text-zinc-400'
      }`}>
        {entry.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${entry.isCurrentUser ? 'text-brand' : 'text-white'}`}>
          {entry.name}
          {entry.isCurrentUser && <span className="ml-1.5 text-xs font-normal text-brand/70">(você)</span>}
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {entry.exactScores > 0 && (
            <span className="flex items-center gap-0.5 text-green-400">
              <Target size={9} /> {entry.exactScores} exato{entry.exactScores > 1 ? 's' : ''}
            </span>
          )}
          {entry.correctOutcomes > 0 && (
            <span className="flex items-center gap-0.5 text-blue-400">
              <CheckCircle size={9} /> {entry.correctOutcomes} resultado{entry.correctOutcomes > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-base font-black tabular-nums ${entry.roundPoints > 0 ? 'text-brand' : 'text-zinc-500'}`}>
          {entry.roundPoints}
        </p>
        <p className="text-xs text-zinc-600">pts</p>
      </div>
    </div>
  );
}
