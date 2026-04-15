// ============================================================
// Na Gaveta — OpponentPredictionsDrawer
// Drawer lateral que exibe os palpites de todos os participantes
// de um jogo específico, disponível apenas após o fechamento.
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { X, Lock } from 'lucide-react';
import api from '../services/api';
import { Spinner } from './ui';

interface ParticipantPrediction {
  userId: string;
  userName: string;
  avatarUrl?: string;
  homeScoreTip: number;
  awayScoreTip: number;
  points: number | null;
  scoredAt: string | null;
}

interface MatchPredictionsData {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  predictions: ParticipantPrediction[];
}

interface OpponentPredictionsDrawerProps {
  matchId: string | null;
  poolId: string;
  currentUserId?: string;
  homeScore?: number | null;
  awayScore?: number | null;
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

type PredictionResult = 'exact' | 'outcome' | 'partial' | 'miss' | null;

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
  if (homeTip === homeScore || awayTip === awayScore) return 'partial';
  return 'miss';
}

const RESULT_STYLES: Record<PredictionResult & string, { border: string; text: string; label: string }> = {
  exact: { border: 'border-yellow-400/50', text: 'text-yellow-400', label: '🎯 Exato' },
  outcome: { border: 'border-green-500/40', text: 'text-green-400', label: '✅ Certo' },
  partial: { border: 'border-blue-400/30', text: 'text-blue-400', label: '~ Parcial' },
  miss: { border: 'border-zinc-800', text: 'text-zinc-600', label: '❌ Errou' },
};

export function OpponentPredictionsDrawer({
  matchId,
  poolId,
  currentUserId,
  homeScore,
  awayScore,
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

  // Ordenar: exatos primeiro, depois certos, parciais, erros, sem palpite
  const sorted = data
    ? [...data.predictions].sort((a, b) => {
        const order = { exact: 0, outcome: 1, partial: 2, miss: 3 };
        const ra = getPredictionResult(a.homeScoreTip, a.awayScoreTip, homeScore, awayScore);
        const rb = getPredictionResult(b.homeScoreTip, b.awayScoreTip, homeScore, awayScore);
        const oa = ra ? order[ra] : 4;
        const ob = rb ? order[rb] : 4;
        if (oa !== ob) return oa - ob;
        // Desempate por pontos
        return (b.points ?? 0) - (a.points ?? 0);
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
              <p className="text-xs text-zinc-500 mt-0.5">
                {data.homeTeam} × {data.awayTeam}
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
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-zinc-300">{data.homeTeam}</span>
              <span className="text-2xl font-black text-white tabular-nums">
                {homeScore} – {awayScore}
              </span>
              <span className="text-sm font-semibold text-zinc-300">{data.awayTeam}</span>
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
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-lg font-black tabular-nums ${style?.text ?? 'text-zinc-400'}`}>
                          {p.homeScoreTip}
                        </span>
                        <span className="text-zinc-600 text-sm">×</span>
                        <span className={`text-lg font-black tabular-nums ${style?.text ?? 'text-zinc-400'}`}>
                          {p.awayScoreTip}
                        </span>
                      </div>

                      {/* Pontos */}
                      {p.points !== null && p.points > 0 && (
                        <div className="shrink-0 text-right">
                          <span className={`text-sm font-black tabular-nums ${style?.text ?? 'text-zinc-400'}`}>
                            +{p.points}
                          </span>
                          <span className="text-xs text-zinc-600 ml-0.5">pts</span>
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
