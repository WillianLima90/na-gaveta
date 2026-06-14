// ============================================================
// Na Gaveta — OpponentPredictionsDrawer
// Drawer lateral que exibe os palpites de todos os participantes
// de um jogo específico, disponível apenas após o fechamento.
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { X, Lock } from 'lucide-react';
import api from '../services/api';
import { Spinner } from './ui';
import { getTeamLogo, getTeamName } from '../utils/teamDisplay';

interface ParticipantPrediction {
  userId: string;
  userName: string;
  avatarUrl?: string;
  homeScoreTip: number;
  awayScoreTip: number;
  isJoker?: boolean;
  points: number | null;
  scoredAt: string | null;
}

interface MatchPredictionsData {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  predictions: ParticipantPrediction[];
}

interface ScoreRule {
  pointsForOutcome: number;
  pointsForHomeGoals: number;
  pointsForAwayGoals: number;
  exactScoreBonus: number;
  jokerMultiplier: number;
  bonusRoundMultiplier: number;
}

interface OpponentPredictionsDrawerProps {
  matchId: string | null;
  poolId: string;
  currentUserId?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  scoreRule?: ScoreRule | null;
  isBonusRound?: boolean;
  onClose: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-pink-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

type PredictionResult = 'exact' | 'outcome' | 'homeGoal' | 'awayGoal' | 'partial' | 'miss' | null;

function getPredictionResult(
  homeTip: number,
  awayTip: number,
  homeScore: number | null | undefined,
  awayScore: number | null | undefined
): PredictionResult {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) return null;
  if (homeTip === homeScore && awayTip === awayScore) return 'exact';
  const getOutcome = (h: number, a: number) => (h > a ? 'home' : a > h ? 'away' : 'draw');
  if (getOutcome(homeTip, awayTip) === getOutcome(homeScore, awayScore)) return 'outcome';
  if (homeTip === homeScore && awayTip !== awayScore) return 'homeGoal';
  if (awayTip === awayScore && homeTip !== homeScore) return 'awayGoal';
  if (homeTip === homeScore || awayTip === awayScore) return 'partial';
  return 'miss';
}


const RESULT_STYLES: Record<PredictionResult & string, { border: string; text: string; label: string }> = {
  exact: { border: 'border-zinc-500/40', text: 'text-zinc-200', label: 'Acertando placar exato' },
  outcome: { border: 'border-zinc-700', text: 'text-zinc-300', label: 'Acertando resultado' },
  homeGoal: { border: 'border-zinc-800', text: 'text-zinc-400', label: 'Acertando gol mandante' },
  awayGoal: { border: 'border-zinc-800', text: 'text-zinc-400', label: 'Acertando gol visitante' },
  partial: { border: 'border-zinc-800', text: 'text-zinc-400', label: 'AO VIVO' },
  miss: { border: 'border-zinc-900', text: 'text-zinc-600', label: 'Não pontuando' },
};

function calcPredictionPoints(
  prediction: ParticipantPrediction,
  homeScore: number | null | undefined,
  awayScore: number | null | undefined,
  scoreRule?: ScoreRule | null,
  isBonusRound?: boolean
): number {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) return prediction.points ?? 0;

  const rule = scoreRule ?? {
    pointsForOutcome: 10,
    pointsForHomeGoals: 5,
    pointsForAwayGoals: 5,
    exactScoreBonus: 0,
    jokerMultiplier: 2,
    bonusRoundMultiplier: 2,
  };

  const outcome = (h: number, a: number) => (h > a ? 'home' : a > h ? 'away' : 'draw');

  let basePoints = 0;

  if (outcome(prediction.homeScoreTip, prediction.awayScoreTip) === outcome(homeScore, awayScore)) {
    basePoints += rule.pointsForOutcome;
  }

  if (prediction.homeScoreTip === homeScore) {
    basePoints += rule.pointsForHomeGoals;
  }

  if (prediction.awayScoreTip === awayScore) {
    basePoints += rule.pointsForAwayGoals;
  }

  if (prediction.homeScoreTip === homeScore && prediction.awayScoreTip === awayScore) {
    basePoints += rule.exactScoreBonus;
  }

  if (basePoints <= 0) return 0;

  let multiplier = 1;
  if (prediction.isJoker) multiplier *= rule.jokerMultiplier;
  if (isBonusRound) multiplier *= rule.bonusRoundMultiplier;

  return Math.round(basePoints * multiplier);
}

export function OpponentPredictionsDrawer({
  matchId,
  poolId,
  currentUserId,
  homeScore,
  awayScore,
  scoreRule,
  isBonusRound,
  onClose,
}: OpponentPredictionsDrawerProps) {
  const [data, setData] = useState<MatchPredictionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const load = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/predictions/match/${matchId}/pool/${poolId}`);
      setData(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Erro ao carregar palpites');
    } finally {
      setLoading(false);
    }
  }, [matchId, poolId]);

  useEffect(() => {
    if (matchId) {
      load();
      // Animar entrada
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [matchId, load]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  if (!matchId) return null;

  const hasResults = homeScore !== null && homeScore !== undefined;

  // Ordenar por maior pontuação atual; desempate por qualidade do acerto
  const sorted = data
    ? [...data.predictions].sort((a, b) => {
        const order = { exact: 0, outcome: 1, homeGoal: 2, awayGoal: 2, partial: 2, miss: 3 };
        const ra = getPredictionResult(a.homeScoreTip, a.awayScoreTip, homeScore, awayScore);
        const rb = getPredictionResult(b.homeScoreTip, b.awayScoreTip, homeScore, awayScore);

        const pointsA = calcPredictionPoints(a, homeScore, awayScore, scoreRule, isBonusRound);
        const pointsB = calcPredictionPoints(b, homeScore, awayScore, scoreRule, isBonusRound);
        const pointsDiff = pointsB - pointsA;
        if (pointsDiff !== 0) return pointsDiff;

        const oa = ra ? order[ra] : 4;
        const ob = rb ? order[rb] : 4;
        if (oa !== ob) return oa - ob;

        if (a.homeScoreTip !== b.homeScoreTip) return a.homeScoreTip - b.homeScoreTip;
        if (a.awayScoreTip !== b.awayScoreTip) return a.awayScoreTip - b.awayScoreTip;

        return a.userName.localeCompare(b.userName, 'pt-BR');
      })
    : [];

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-sm bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col transition-transform duration-250 ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-bold text-white">Palpites dos participantes</h2>
            {data && (
              <p className="text-xs text-zinc-500 mt-1">
                Resultado e palpites da partida
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Placar real (se disponível) */}
        {hasResults && data && (
          <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 mb-1">Resultado final</p>
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-zinc-300 truncate">
                  {getTeamName(data.homeTeam)}
                </span>
                {getTeamLogo(data.homeTeam) && (
                  <img
                    src={getTeamLogo(data.homeTeam)!}
                    alt={getTeamName(data.homeTeam)}
                    className="w-5 h-5 object-contain shrink-0"
                  />
                )}
              </div>

              <span className="text-2xl font-black text-white tabular-nums shrink-0">
                {homeScore} – {awayScore}
              </span>

              <div className="flex items-center gap-2 min-w-0">
                {getTeamLogo(data.awayTeam) && (
                  <img
                    src={getTeamLogo(data.awayTeam)!}
                    alt={getTeamName(data.awayTeam)}
                    className="w-5 h-5 object-contain shrink-0"
                  />
                )}
                <span className="text-sm font-semibold text-zinc-300 truncate">
                  {getTeamName(data.awayTeam)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Lock size={32} className="text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-400">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="p-4 space-y-2">
              {sorted.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">Nenhum palpite registrado</p>
              ) : (
                sorted.map((p) => {
                  const result = getPredictionResult(p.homeScoreTip, p.awayScoreTip, homeScore, awayScore);
                  const style = result ? RESULT_STYLES[result] : null;
                  const isCurrentUser = p.userId === currentUserId;

                  const displayPoints = calcPredictionPoints(p, homeScore, awayScore, scoreRule, isBonusRound);
                  const isLivePartial = hasResults && p.scoredAt === null;

                  return (
                    <div
                      key={p.userId}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        style?.border ?? 'border-zinc-800'
                      } ${isCurrentUser ? 'bg-brand/5' : 'bg-zinc-900/60'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getAvatarColor(p.userName)}`}>
                        {getInitials(p.userName)}
                      </div>

                      {/* Nome */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-brand' : 'text-zinc-200'}`}>
                            {p.userName}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs text-brand/70 font-medium shrink-0">você</span>
                          )}
                        </div>
                        {style && (
                          <span className={`text-xs ${style.text}`}>{style.label}</span>
                        )}
                      </div>

                      {/* Palpite */}
                      <div className="w-[54px] flex items-center justify-center gap-1 shrink-0">
                        <span className={`text-lg font-black tabular-nums ${style?.text ?? 'text-zinc-400'}`}>
                          {p.homeScoreTip}
                        </span>
                        <span className="text-zinc-600 text-sm">×</span>
                        <span className={`text-lg font-black tabular-nums ${style?.text ?? 'text-zinc-400'}`}>
                          {p.awayScoreTip}
                        </span>
                      </div>

                      {/* Pontos */}
                      {displayPoints !== null && (
                        <div className="w-[78px] shrink-0 text-right flex flex-col items-end gap-1">
                          <div>
                            <span className={`text-sm font-black tabular-nums ${style?.text ?? 'text-zinc-400'}`}>
                              {displayPoints > 0 ? `+${displayPoints}` : '0'}
                            </span>
                            <span className="text-xs text-zinc-600 ml-0.5">pts</span>
                          </div>

                          {isLivePartial && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                              AO VIVO
                            </span>
                          )}

                          {p.isJoker && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                              ⚡ Coringa ×2
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {data && data.predictions.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
            <p className="text-xs text-zinc-500 text-center">
              {data.predictions.length} participante{data.predictions.length !== 1 ? 's' : ''} palpitaram neste jogo
            </p>
          </div>
        )}
      </div>
    </>
  );
}
