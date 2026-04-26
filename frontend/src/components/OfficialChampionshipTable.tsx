import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { getChampionshipStandings, type ChampionshipStanding } from '../services/championship.service';
import { Spinner } from './ui';


const TEAM_DISPLAY_NAMES: Record<string, string> = {
  'SE Palmeiras': 'Palmeiras',
  'CR Flamengo': 'Flamengo',
  'Fluminense FC': 'Fluminense',
  'São Paulo FC': 'São Paulo',
  'EC Bahia': 'Bahia',
  'CA Paranaense': 'Athletico-PR',
  'Coritiba FBC': 'Coritiba',
  'RB Bragantino': 'Bragantino',
  'Botafogo FR': 'Botafogo',
  'CR Vasco da Gama': 'Vasco',
  'EC Vitória': 'Vitória',
  'CA Mineiro': 'Atlético-MG',
  'Grêmio FBPA': 'Grêmio',
  'SC Internacional': 'Internacional',
  'Santos FC': 'Santos',
  'Cruzeiro EC': 'Cruzeiro',
  'SC Corinthians Paulista': 'Corinthians',
  'Mirassol FC': 'Mirassol',
  'Clube do Remo': 'Remo',
  'Chapecoense AF': 'Chapecoense',
};

function getTeamDisplayName(apiName: string, fallback: string): string {
  return TEAM_DISPLAY_NAMES[apiName] ?? fallback;
}

interface OfficialChampionshipTableProps {
  championshipId: string;
}

export function OfficialChampionshipTable({ championshipId }: OfficialChampionshipTableProps) {
  const [standings, setStandings] = useState<ChampionshipStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!championshipId) return;

    let active = true;

    const loadStandings = () => {
      getChampionshipStandings(championshipId)
        .then((data) => {
          if (active) setStandings(data || []);
        })
        .catch(() => {
          if (active) setStandings([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    setLoading(true);
    loadStandings();

    const hasLiveMatch = standings.some(s => s.playedGames < 38); // heurística simples

    const interval = window.setInterval(
      loadStandings,
      hasLiveMatch ? 15000 : 60000
    );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [championshipId]);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-8 flex justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <Trophy size={16} className="text-zinc-400" />
        <h3 className="text-sm font-bold text-white">Classificação oficial</h3>
      </div>

      {standings.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 text-sm">
          Não foi possível carregar a classificação oficial
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          <div className="grid grid-cols-[28px_1fr_42px_34px_34px_34px_42px] gap-2 px-4 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
            <span>#</span>
            <span>Time</span>
            <span className="text-center">Pts</span>
            <span className="text-center">J</span>
            <span className="text-center">V</span>
            <span className="text-center">E</span>
            <span className="text-center">SG</span>
          </div>

          {standings.map((row) => (
            <div
              key={row.team.id}
              className="grid grid-cols-[28px_1fr_42px_34px_34px_34px_42px] gap-2 items-center px-4 py-2.5 text-sm"
            >
              <span className="text-zinc-500 text-xs">{row.position}</span>
              <div className="flex items-center gap-2 min-w-0">
                <img src={row.team.crest} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                <span className="text-zinc-200 font-medium truncate">{getTeamDisplayName(row.team.name, row.team.shortName)}</span>
              </div>
              <span className="text-center text-white font-bold tabular-nums">{row.points}</span>
              <span className="text-center text-zinc-400 tabular-nums">{row.playedGames}</span>
              <span className="text-center text-zinc-400 tabular-nums">{row.won}</span>
              <span className="text-center text-zinc-400 tabular-nums">{row.draw}</span>
              <span className="text-center text-zinc-400 tabular-nums">{row.goalDifference}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
