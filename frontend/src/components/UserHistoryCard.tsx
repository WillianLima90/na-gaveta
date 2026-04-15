// ============================================================
// Na Gaveta — UserHistoryCard
// Exibe o histórico completo do usuário no bolão:
// total de pontos, acertos e pontuação por rodada.
// ============================================================

import { BarChart2, Target, CheckCircle, Hash } from 'lucide-react';
import type { UserPoolHistory } from '../services/match.service';

interface Props {
  history: UserPoolHistory;
}

export function UserHistoryCard({ history }: Props) {
  // Calcular pontuação máxima para normalizar a barra de progresso
  const maxRoundPoints = Math.max(...history.rounds.map((r) => r.points), 1);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-brand" />
        <h3 className="text-base font-bold text-white">Meu Histórico</h3>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 gap-3">
        <TotalBox label="Total de Pontos" value={history.totalPoints} highlight />
        <TotalBox label="Palpites Enviados" value={history.totalPredictions} />
        <TotalBox label="Acertos Exatos" value={history.exactScores} color="text-green-400" />
        <TotalBox label="Acertos Resultado" value={history.correctOutcomes} color="text-blue-400" />
      </div>

      {/* Histórico por rodada */}
      {history.rounds.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Por Rodada</p>
          {history.rounds.map((round) => (
            <RoundRow key={round.roundId} round={round} maxPoints={maxRoundPoints} />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Hash className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">Nenhum palpite registrado ainda</p>
        </div>
      )}
    </div>
  );
}

function TotalBox({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        highlight
          ? 'bg-brand/10 border-brand/30'
          : 'bg-zinc-800/60 border-zinc-700/50'
      }`}
    >
      <p className={`text-2xl font-black ${color ?? (highlight ? 'text-brand' : 'text-white')}`}>
        {value}
      </p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function RoundRow({
  round,
  maxPoints,
}: {
  round: UserPoolHistory['rounds'][number];
  maxPoints: number;
}) {
  const barWidth = maxPoints > 0 ? (round.points / maxPoints) * 100 : 0;

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{round.roundName}</span>
          {round.id === pool?.bonusRoundId && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-0.5 font-bold">
              BÔNUS
            </span>
          )}
        </div>
        <span className="text-brand font-bold text-sm flex-shrink-0 ml-2">{round.points} pts</span>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-brand to-brand-light rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Detalhes */}
      <div className="flex gap-3 text-xs text-zinc-500">
        {round.exactScores > 0 && (
          <span className="flex items-center gap-1 text-green-400">
            <Target className="w-3 h-3" />
            {round.exactScores} exato{round.exactScores > 1 ? 's' : ''}
          </span>
        )}
        {round.correctOutcomes > 0 && (
          <span className="flex items-center gap-1 text-blue-400">
            <CheckCircle className="w-3 h-3" />
            {round.correctOutcomes} resultado{round.correctOutcomes > 1 ? 's' : ''}
          </span>
        )}
        <span>{round.totalPredictions} palpite{round.totalPredictions !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
