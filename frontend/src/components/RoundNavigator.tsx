// ============================================================
// Na Gaveta — RoundNavigator v3
// Visual refinado:
//   - Rodada ativa: destaque laranja forte, tamanho normal
//   - Rodadas anteriores/futuras: menores, discretas
//   - Rodada especial: símbolo ⚡ pequeno DENTRO do card (não aumenta tamanho)
//   - Sem destaque extra para rodada especial
//   - Admin: botão de toggle de rodada especial por rodada
// ============================================================

import {useEffect, useState, useRef} from 'react';
import { Zap, Shuffle } from 'lucide-react';
import { getUserHistory, toggleMatchJoker, type Round, type UserRoundHistory } from '../services/match.service';
import { updatePoolRules } from '../services/match.service';

interface RoundNavigatorProps {
  poolId: string;
  currentUserId?: string;
  rounds: Round[];
  bonusRoundId?: string | null;
  selectedRoundId: string | null;
  onSelectRound: (roundId: string) => void;
  isAuthenticated: boolean;
  isMember: boolean;
  isOwner?: boolean;
  onRoundUpdated?: () => void;
}

export function RoundNavigator({
  poolId,
  currentUserId,
  rounds,
  bonusRoundId,
  selectedRoundId,
  onSelectRound,
  isAuthenticated,
  isMember,
  isOwner = false,
  onRoundUpdated,
}: RoundNavigatorProps) {
  const [roundHistory, setRoundHistory] = useState<UserRoundHistory[]>([]);
  const [togglingRoundId, setTogglingRoundId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && isMember && currentUserId) {
      loadHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId, currentUserId, isAuthenticated, isMember]);

  async function loadHistory() {
    if (!currentUserId) return;
    try {
      const data = await getUserHistory(poolId, currentUserId);
      setRoundHistory(data.history.rounds);
    } catch {
      setRoundHistory([]);
    }
  }

  async function handleToggleBonusRound(roundId: string, currentValue: boolean, e: React.MouseEvent) {
    e.stopPropagation();
    setTogglingRoundId(roundId);
    try {
      await fetch(`/api/rounds/${roundId}/bonus`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ng_token')}`,
        },
        body: JSON.stringify({ isBonusRound: !currentValue }),
      });
      onRoundUpdated?.();
    } catch {
      // ignorar
    } finally {
      setTogglingRoundId(null);
    }
  }

  async function handleRandomBonusRound(e: React.MouseEvent) {
    e.stopPropagation();
    if (rounds.length === 0) return;
    // Escolher rodada aleatória que ainda não é especial
    const nonBonus = rounds.filter((r) => !r.id === bonusRoundId);
    const pool = nonBonus.length > 0 ? nonBonus : rounds;
    const randomRound = pool[Math.floor(Math.random() * pool.length)];
    setTogglingRoundId(randomRound.id);
    try {
      // Primeiro, remover todas as rodadas especiais
      await Promise.all(
        rounds
          .filter((r) => r.id === bonusRoundId)
          .map((r) =>
            fetch(`/api/rounds/${r.id}/bonus`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('ng_token')}`,
              },
              body: JSON.stringify({ isBonusRound: false }),
            })
          )
      );
      // Depois, marcar a rodada aleatória como especial
      await fetch(`/api/rounds/${randomRound.id}/bonus`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ng_token')}`,
        },
        body: JSON.stringify({ isBonusRound: true }),
      });
      onRoundUpdated?.();
    } catch {
      // ignorar
    } finally {
      setTogglingRoundId(null);
    }
  }

  if (rounds.length === 0) return null;

  const selectedRoundRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selectedRoundRef.current) return;
    selectedRoundRef.current.scrollIntoView({
      behavior: 'auto',
      inline: 'center',
      block: 'nearest',
    });
  }, [selectedRoundId, rounds.length]);


  // Mapa de roundId → histórico do usuário
  const pointsByRound = new Map<string, UserRoundHistory>();
  roundHistory.forEach((rh) => pointsByRound.set(rh.roundId, rh));

  return (
    <div className="mb-4">
      {/* Seletor de rodadas */}
      <div className="flex gap-2 overflow-x-auto pt-3 pb-1 -mx-1 px-1 items-end">
        {rounds.map((r) => {
          const isSelected = r.id === selectedRoundId;
          const hasLive = r.matches.some((m) => m.status === 'LIVE');
          const roundPts = pointsByRound.get(r.id);
          const hasResults = r.matches.some((m) => m.status === 'FINISHED');
          const isToggling = togglingRoundId === r.id;

          return (
            <button
              ref={isSelected ? selectedRoundRef : null}
              key={r.id}
              onClick={() => onSelectRound(r.id)}
              className={`relative flex flex-col items-center justify-center whitespace-nowrap transition-all flex-shrink-0 min-w-[108px] px-4 py-2.5 rounded-xl ${
                isSelected
                  ? 'bg-brand text-white shadow-lg shadow-brand/30'
                  : r.id === bonusRoundId
                  ? 'bg-zinc-900 text-white border border-purple-500/50'
                  : hasLive
                  ? 'bg-zinc-900 text-zinc-200 border border-green-500/45'
                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {hasLive && (
                <span className="absolute left-1/2 -translate-x-1/2 -top-0.5 z-10 px-1.5 py-[1px] text-[9px] font-medium rounded-full bg-green-500 text-black">
                  AO VIVO
                </span>
              )}

              <span className={`font-bold leading-tight ${isSelected ? 'text-sm' : 'text-xs'}`}>
                {`Rodada ${r.number}`}
              </span>

              {roundPts && hasResults ? (
                <span className={`font-black tabular-nums mt-0.5 leading-none ${isSelected ? 'text-sm text-white/90' : 'text-xs text-zinc-400'}`}>
                  {roundPts.points} pts
                </span>
              ) : (
                <span className={`mt-0.5 leading-none ${isSelected ? 'text-xs text-white/40' : 'text-xs text-zinc-700'}`}>—</span>
              )}

              {r.id === bonusRoundId && (
                <span className="absolute left-1/2 -translate-x-1/2 -top-0.5 z-10 px-1.5 py-[1px] text-[9px] font-medium rounded-full bg-purple-500 text-white">
                  BONUS
                </span>
              )}

              {isOwner && (
                <button
                  onClick={(e) => handleToggleBonusRound(r.id, r.id === bonusRoundId, e)}
                  disabled={isToggling}
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                    r.id === bonusRoundId
                      ? 'bg-purple-500/80 hover:bg-purple-600'
                      : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                  title={r.id === bonusRoundId ? 'Remover rodada especial' : 'Marcar como rodada especial'}
                >
                  <Zap size={8} className={r.id === bonusRoundId ? 'text-white' : 'text-zinc-400'} />
                </button>
              )}
            </button>
          );
        })}

        {/* Botão admin: rodada especial aleatória */}
        {isOwner && (
          <button
            onClick={handleRandomBonusRound}
            disabled={togglingRoundId !== null}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition-colors opacity-75 hover:opacity-100"
            title="Escolher rodada especial aleatoriamente"
          >
            <Shuffle size={10} />
            Aleatória
          </button>
        )}
      </div>
    </div>
  );
}
