// ============================================================
// Na Gaveta — RoundHighlightsCard
// Exibe os destaques de uma rodada: melhor jogador, pontuação
// máxima, acertos exatos e estatísticas gerais.
// ============================================================

import { Trophy, Target, Users, TrendingUp, Star } from 'lucide-react';
import type { RoundHighlights } from '../services/match.service';

interface Props {
  highlights: RoundHighlights;
}

export function RoundHighlightsCard({ highlights }: Props) {
  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-5 h-5 text-brand" />
        <h3 className="text-base font-bold text-white">Destaques — {highlights.roundName}</h3>
      </div>

      {/* Melhor da rodada */}
      {highlights.bestUser ? (
        <div className="bg-gradient-to-r from-brand/20 to-brand-light/10 border border-brand/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/30 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-brand font-semibold uppercase tracking-wide">Melhor da Rodada</p>
              <p className="text-white font-bold truncate">{highlights.bestUser.name}</p>
              <p className="text-sm text-zinc-400">
                {highlights.bestUser.roundPoints} pts
                {highlights.bestUser.exactScores > 0 && (
                  <span className="ml-2 text-green-400">· {highlights.bestUser.exactScores} exato{highlights.bestUser.exactScores > 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-black text-brand">{highlights.bestUser.roundPoints}</p>
              <p className="text-xs text-zinc-500">pontos</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
          <p className="text-zinc-500 text-sm">Nenhum palpite registrado ainda</p>
        </div>
      )}

      {/* Estatísticas da rodada */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox
          icon={<Target className="w-4 h-4 text-green-400" />}
          label="Acertos Exatos"
          value={highlights.totalExactScores}
          color="text-green-400"
        />
        <StatBox
          icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
          label="Acertos Resultado"
          value={highlights.totalCorrectOutcomes}
          color="text-blue-400"
        />
        <StatBox
          icon={<Users className="w-4 h-4 text-zinc-400" />}
          label="Participantes"
          value={highlights.totalParticipants}
          color="text-zinc-300"
        />
        <StatBox
          icon={<Trophy className="w-4 h-4 text-brand" />}
          label="Média de Pontos"
          value={highlights.averageScore.toFixed(1)}
          color="text-brand"
        />
      </div>

      {/* Total de palpites */}
      <p className="text-xs text-zinc-600 text-center">
        {highlights.totalPredictions} palpite{highlights.totalPredictions !== 1 ? 's' : ''} registrado{highlights.totalPredictions !== 1 ? 's' : ''} nesta rodada
      </p>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3 flex items-center gap-2">
      {icon}
      <div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-xs text-zinc-500 leading-tight">{label}</p>
      </div>
    </div>
  );
}
