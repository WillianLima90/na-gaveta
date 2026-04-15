// ============================================================
// Na Gaveta — PoolTop3
// Pódio compacto (top 3) para exibição na tela principal do bolão.
// Carrega o ranking e mostra apenas as 3 primeiras posições.
// ============================================================

import { useEffect, useState } from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import { getPoolRanking, type RankingEntry } from '../services/match.service';
import { Spinner } from './ui';

interface PoolTop3Props {
  poolId: string;
  currentUserId?: string;
  onViewFullRanking?: () => void; // callback para abrir a aba de ranking completo
}

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['text-yellow-400', 'text-zinc-300', 'text-amber-600'];
const MEDAL_BG = ['bg-yellow-400/10 border-yellow-400/20', 'bg-zinc-700/30 border-zinc-700', 'bg-amber-600/10 border-amber-600/20'];

export function PoolTop3({ poolId, currentUserId, onViewFullRanking }: PoolTop3Props) {
  const [top3, setTop3] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);

  useEffect(() => {
    load();
  }, [poolId]);

  async function load() {
    setLoading(true);
    try {
      const data = await getPoolRanking(poolId);
      setTop3(data.ranking.slice(0, 3));
      setTotalMembers(data.totalMembers);
    } catch {
      setTop3([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="sm" />
      </div>
    );
  }

  if (top3.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
        <Trophy size={28} className="text-zinc-600 mx-auto mb-2" />
        <p className="text-zinc-400 text-sm">Nenhum palpite pontuado ainda</p>
        <p className="text-zinc-500 text-xs mt-1">O ranking aparece após os primeiros resultados</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={15} className="text-yellow-400" />
          <span className="font-bold text-white text-sm">Ranking</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
            {totalMembers} participante{totalMembers !== 1 ? 's' : ''}
          </span>
        </div>
        {onViewFullRanking && (
          <button
            onClick={onViewFullRanking}
            className="flex items-center gap-1 text-xs text-brand hover:text-brand-light transition-colors font-medium"
          >
            Ver completo <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Top 3 */}
      <div className="divide-y divide-zinc-800/50">
        {top3.map((entry, i) => {
          const isCurrentUser = entry.userId === currentUserId;
          return (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 px-4 py-3 ${isCurrentUser ? 'bg-brand/5' : ''}`}
            >
              {/* Medalha */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 border ${MEDAL_BG[i]}`}>
                {MEDALS[i]}
              </div>

              {/* Avatar inicial */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                isCurrentUser ? 'bg-brand/20 text-brand border border-brand/30' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {entry.name.charAt(0).toUpperCase()}
              </div>

              {/* Nome */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-brand' : 'text-white'}`}>
                  {entry.name}
                  {isCurrentUser && <span className="ml-1 text-xs font-normal text-brand/60">(você)</span>}
                </p>
                {entry.exactScores > 0 && (
                  <p className="text-xs text-green-400">
                    {entry.exactScores} acerto{entry.exactScores > 1 ? 's' : ''} exato{entry.exactScores > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Pontos */}
              <div className="text-right flex-shrink-0">
                <p className={`text-base font-black tabular-nums ${MEDAL_COLORS[i]}`}>
                  {entry.totalPoints}
                </p>
                <p className="text-xs text-zinc-600">pts</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé com desempate */}
      <div className="px-4 py-2 border-t border-zinc-800/50 bg-zinc-900/50">
        <p className="text-xs text-zinc-600 text-center">
          Desempate: pontos · acertos exatos · resultado · menos erros
        </p>
      </div>
    </div>
  );
}
