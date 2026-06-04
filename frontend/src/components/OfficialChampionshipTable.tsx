import { useEffect, useState } from 'react';
import { ChevronDown, Trophy } from 'lucide-react';
import { getChampionshipStandings, type ChampionshipStanding, type ChampionshipStandingGroup } from '../services/championship.service';
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

function TableRows({ standings }: { standings: ChampionshipStanding[] }) {
  return (
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
        <div key={row.team.id} className="grid grid-cols-[28px_1fr_42px_34px_34px_34px_42px] gap-2 items-center px-4 py-2.5 text-sm">
          <span className="text-zinc-500 text-xs">{row.position}</span>
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={row.team.crest}
              alt=""
              className="w-6 h-6 object-contain flex-shrink-0 rounded-sm"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span className="text-zinc-100 font-semibold truncate">
              {getTeamDisplayName(row.team.name, row.team.shortName)}
            </span>
          </div>
          <span className="text-center text-white font-bold tabular-nums">{row.points}</span>
          <span className="text-center text-zinc-400 tabular-nums">{row.playedGames}</span>
          <span className="text-center text-zinc-400 tabular-nums">{row.won}</span>
          <span className="text-center text-zinc-400 tabular-nums">{row.draw}</span>
          <span className="text-center text-zinc-400 tabular-nums">{row.goalDifference}</span>
        </div>
      ))}
    </div>
  );
}

export function OfficialChampionshipTable({ championshipId }: OfficialChampionshipTableProps) {
  const [standings, setStandings] = useState<ChampionshipStanding[]>([]);
  const [groups, setGroups] = useState<ChampionshipStandingGroup[]>([]);
  const [standingsType, setStandingsType] = useState<'TABLE' | 'GROUPS'>('TABLE');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!championshipId) return;

    let active = true;

    const loadStandings = () => {
      getChampionshipStandings(championshipId)
        .then((data) => {
          if (!active) return;

          setStandingsType(data.type);

          if (data.type === 'GROUPS') {
            setGroups(data.standings as ChampionshipStandingGroup[]);
            setStandings([]);
          } else {
            setStandings(data.standings as ChampionshipStanding[]);
            setGroups([]);
          }
        })
        .catch(() => {
          if (active) {
            setStandings([]);
            setGroups([]);
            setStandingsType('TABLE');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    setLoading(true);
    loadStandings();

    const interval = window.setInterval(loadStandings, 60000);

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

  const hasData = standingsType === 'GROUPS' ? groups.length > 0 : standings.length > 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/30 transition"
      >
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-zinc-400" />
          <h3 className="text-sm font-bold text-white">Classificação oficial</h3>
        </div>
        <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {!hasData ? (
            <div className="py-8 text-center text-zinc-500 text-sm">
              Não foi possível carregar a classificação oficial
            </div>
          ) : standingsType === 'GROUPS' ? (
            <div className="p-3 space-y-3">
              {groups.map((group) => (
                <div key={group.group} className="rounded-xl border border-zinc-800 bg-black/20 overflow-hidden">
                  <div className="px-3 py-2 border-b border-zinc-800 text-xs font-black uppercase tracking-wider text-orange-400">
                    {group.group.replace('Group', 'Grupo')}
                  </div>
                  <TableRows standings={group.table} />
                </div>
              ))}
            </div>
          ) : (
            <TableRows standings={standings} />
          )}
        </>
      )}
    </div>
  );
}
