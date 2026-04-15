// ============================================================
// Na Gaveta — ChampionshipTable v2
// Duas abas:
//   1. Classificação — tabela real calculada dos resultados
//   2. Jogos — lista de jogos por rodada
// A classificação é calculada no frontend a partir dos matches.
// ============================================================

import { useState, useMemo } from 'react';
import { Radio, Clock, Zap, Star } from 'lucide-react';
import type { Round } from '../services/match.service';

interface ChampionshipTableProps {
  championshipId: string;
  rounds: Round[];
}

// Estatísticas de um time na tabela
interface TeamStats {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Calcula a tabela de classificação a partir dos rounds
function buildStandings(rounds: Round[]): TeamStats[] {
  const stats = new Map<string, TeamStats>();

  function getOrCreate(team: string): TeamStats {
    if (!stats.has(team)) {
      stats.set(team, {
        team,
        played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
      });
    }
    return stats.get(team)!;
  }

  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      if (match.status !== 'FINISHED') return;
      if (match.homeScore === null || match.awayScore === null) return;

      const home = getOrCreate(match.homeTeam);
      const away = getOrCreate(match.awayTeam);

      const hg = match.homeScore as number;
      const ag = match.awayScore as number;

      home.played++;
      away.played++;
      home.goalsFor += hg;
      home.goalsAgainst += ag;
      away.goalsFor += ag;
      away.goalsAgainst += hg;

      if (hg > ag) {
        home.wins++;
        home.points += 3;
        away.losses++;
      } else if (hg < ag) {
        away.wins++;
        away.points += 3;
        home.losses++;
      } else {
        home.draws++;
        away.draws++;
        home.points += 1;
        away.points += 1;
      }
    });
  });

  // Recalcular saldo
  stats.forEach((s) => {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
  });

  // Ordenar: pontos → saldo → gols pró → vitórias
  return Array.from(stats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return b.wins - a.wins;
  });
}

export function ChampionshipTable({ rounds }: ChampionshipTableProps) {
  const [activeTab, setActiveTab] = useState<'standings' | 'matches'>('standings');

  // Rodada padrão para aba de jogos
  const defaultRoundId = (() => {
    const live = rounds.find((r) => r.matches.some((m) => m.status === 'LIVE'));
    const next = rounds.find((r) => r.matches.some((m) => m.status === 'SCHEDULED'));
    const last = rounds[rounds.length - 1];
    return (live ?? next ?? last)?.id ?? null;
  })();

  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(defaultRoundId);

  const standings = useMemo(() => buildStandings(rounds), [rounds]);
  const selectedRound = rounds.find((r) => r.id === selectedRoundId);
  const hasAnyResult = rounds.some((r) => r.matches.some((m) => m.status === 'FINISHED'));

  if (rounds.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-8 text-center text-zinc-500 text-sm">
        Nenhuma rodada cadastrada
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Abas */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex-1 py-3 text-xs font-bold transition-colors ${
            activeTab === 'standings'
              ? 'text-white border-b-2 border-brand bg-brand/5'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          📊 Classificação
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-3 text-xs font-bold transition-colors ${
            activeTab === 'matches'
              ? 'text-white border-b-2 border-brand bg-brand/5'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          ⚽ Jogos
        </button>
      </div>

      {/* Aba: Classificação */}
      {activeTab === 'standings' && (
        <div>
          {!hasAnyResult ? (
            <div className="py-8 text-center text-zinc-500 text-sm">
              <p>Nenhum resultado ainda</p>
              <p className="text-xs text-zinc-600 mt-1">A tabela será atualizada conforme os jogos forem encerrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-3 py-2.5 text-zinc-500 font-medium w-6">#</th>
                    <th className="text-left px-2 py-2.5 text-zinc-500 font-medium">Time</th>
                    <th className="text-center px-2 py-2.5 text-zinc-400 font-bold w-8" title="Pontos">Pts</th>
                    <th className="text-center px-2 py-2.5 text-zinc-500 font-medium w-8" title="Jogos">J</th>
                    <th className="text-center px-2 py-2.5 text-zinc-500 font-medium w-8" title="Vitórias">V</th>
                    <th className="text-center px-2 py-2.5 text-zinc-500 font-medium w-8" title="Empates">E</th>
                    <th className="text-center px-2 py-2.5 text-zinc-500 font-medium w-8" title="Derrotas">D</th>
                    <th className="text-center px-2 py-2.5 text-zinc-500 font-medium w-14" title="Gols Pró / Contra">GP/GC</th>
                    <th className="text-center px-2 py-2.5 text-zinc-500 font-medium w-8" title="Saldo de Gols">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, idx) => {
                    const pos = idx + 1;
                    const total = standings.length;
                    // Zonas de classificação (simplificado para Brasileirão 20 times)
                    const isLibertadores = total >= 8 && pos <= 4;
                    const isSulAmericana = total >= 8 && pos >= 5 && pos <= 8;
                    const isRelegation = total >= 8 && pos > total - 4;

                    return (
                      <tr
                        key={team.team}
                        className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${
                          isLibertadores ? 'border-l-2 border-l-green-500' :
                          isSulAmericana ? 'border-l-2 border-l-blue-500' :
                          isRelegation ? 'border-l-2 border-l-red-500' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 text-zinc-500 tabular-nums font-medium">{pos}</td>
                        <td className="px-2 py-2.5 text-white font-semibold truncate max-w-[90px]">{team.team}</td>
                        <td className="px-2 py-2.5 text-center font-black text-white tabular-nums">{team.points}</td>
                        <td className="px-2 py-2.5 text-center text-zinc-400 tabular-nums">{team.played}</td>
                        <td className="px-2 py-2.5 text-center text-green-400 tabular-nums font-medium">{team.wins}</td>
                        <td className="px-2 py-2.5 text-center text-zinc-400 tabular-nums">{team.draws}</td>
                        <td className="px-2 py-2.5 text-center text-red-400 tabular-nums">{team.losses}</td>
                        <td className="px-2 py-2.5 text-center text-zinc-500 tabular-nums">{team.goalsFor}/{team.goalsAgainst}</td>
                        <td className={`px-2 py-2.5 text-center tabular-nums font-medium ${
                          team.goalDiff > 0 ? 'text-green-400' : team.goalDiff < 0 ? 'text-red-400' : 'text-zinc-500'
                        }`}>
                          {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Legenda das zonas */}
              {standings.length >= 8 && (
                <div className="flex flex-wrap gap-3 px-3 py-2.5 border-t border-zinc-800/50">
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="w-2 h-2 rounded-sm bg-green-500 flex-shrink-0" /> Libertadores
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="w-2 h-2 rounded-sm bg-blue-500 flex-shrink-0" /> Sul-Americana
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="w-2 h-2 rounded-sm bg-red-500 flex-shrink-0" /> Rebaixamento
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Aba: Jogos */}
      {activeTab === 'matches' && (
        <div>
          {/* Seletor de rodadas */}
          {rounds.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto px-3 py-2.5 border-b border-zinc-800/50">
              {rounds.map((r) => {
                const hasLive = r.matches.some((m) => m.status === 'LIVE');
                const isSelected = r.id === selectedRoundId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoundId(r.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      isSelected
                        ? 'bg-brand text-white'
                        : hasLive
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {r.name.replace('Rodada ', 'R')}
                    {r.id === pool?.bonusRoundId && <Star size={8} />}
                    {hasLive && <Radio size={8} className="animate-pulse" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Jogos da rodada selecionada */}
          {selectedRound ? (
            <div className="divide-y divide-zinc-800/50">
              {selectedRound.matches.map((match) => {
                const isLive = match.status === 'LIVE';
                const isFinished = match.status === 'FINISHED';

                return (
                  <div key={match.id} className={`px-3 py-3 ${isLive ? 'bg-green-500/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      {/* Time da casa */}
                      <span className={`flex-1 text-right text-xs font-semibold truncate ${
                        isFinished && match.homeScore !== null && match.awayScore !== null
                          ? (match.homeScore > match.awayScore ? 'text-white' : 'text-zinc-400')
                          : 'text-zinc-300'
                      }`}>
                        {match.homeTeam}
                      </span>

                      {/* Placar / VS */}
                      <div className="flex flex-col items-center shrink-0 min-w-[56px]">
                        {isFinished || isLive ? (
                          <span className={`text-sm font-black tabular-nums ${isLive ? 'text-green-400' : 'text-white'}`}>
                            {match.homeScore} – {match.awayScore}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-zinc-500">VS</span>
                        )}
                        {isLive && (
                          <span className="flex items-center gap-0.5 text-xs font-bold text-green-400">
                            <Radio size={7} className="animate-pulse" /> AO VIVO
                          </span>
                        )}
                        {!isFinished && !isLive && (
                          <span className="text-xs text-zinc-600 flex items-center gap-0.5">
                            <Clock size={8} />
                            {formatMatchDate(match.matchDate)}
                          </span>
                        )}
                        {isFinished && (
                          <span className="text-xs text-zinc-600">Encerrado</span>
                        )}
                      </div>

                      {/* Time visitante */}
                      <span className={`flex-1 text-left text-xs font-semibold truncate ${
                        isFinished && match.homeScore !== null && match.awayScore !== null
                          ? (match.awayScore > match.homeScore ? 'text-white' : 'text-zinc-400')
                          : 'text-zinc-300'
                      }`}>
                        {match.awayTeam}
                      </span>

                      {/* Badges */}
                      <div className="flex items-center gap-1 shrink-0">
                        {match.isJoker && (
                          <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-400 bg-yellow-400/10 px-1 py-0.5 rounded">
                            <Zap size={7} />
                          </span>
                        )}
                        {selectedRound.id === pool?.bonusRoundId && (
                          <span className="flex items-center gap-0.5 text-xs font-bold text-purple-400 bg-purple-400/10 px-1 py-0.5 rounded">
                            <Star size={7} />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Venue */}
                    {match.venue && (
                      <p className="text-xs text-zinc-700 mt-1 text-center truncate">{match.venue}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-zinc-500 text-sm">
              Selecione uma rodada
            </div>
          )}
        </div>
      )}
    </div>
  );
}
