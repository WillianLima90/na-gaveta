import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Search, Save, Trophy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELED';

function getStatusStyle(status: MatchStatus): string {
  if (status === 'LIVE') return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300';
  if (status === 'FINISHED') return 'border-zinc-600 bg-zinc-800/60 text-zinc-300';
  if (status === 'SCHEDULED') return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
  if (status === 'POSTPONED') return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  if (status === 'CANCELED') return 'border-red-500/40 bg-red-500/10 text-red-300';
  return 'border-zinc-700 bg-zinc-950 text-zinc-300';
}

interface AdminMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  apiStatus?: string | null;
  matchDate: string;
  isManualOverride?: boolean;
  round?: {
    id: string;
    name: string;
    number: number;
    championship?: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export function AdminMatchesPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MatchStatus>('ALL');
  const [championshipFilter, setChampionshipFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'FINISHED'>('ALL');
  const [dirtyMatchIds, setDirtyMatchIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('ng_user') || 'null');
    } catch {
      return null;
    }
  }, []);

  async function loadMatches() {
    try {
      setError('');
      const res = await axios.get('/api/matches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatches(res.data.matches ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar jogos.');
    }
  }

  function updateLocalMatch(matchId: string, patch: Partial<AdminMatch>) {
    setDirtyMatchIds((current) => new Set(current).add(matchId));
    setMatches((current) =>
      current.map((match) => (match.id === matchId ? { ...match, ...patch } : match))
    );
  }

  function getBrasiliaDateKey(dateValue: string): string {
    return new Date(dateValue).toLocaleDateString('en-CA', {
      timeZone: 'America/Sao_Paulo',
    });
  }

  async function saveMatch(match: AdminMatch) {
    const homeScore = Number(match.homeScore ?? 0);
    const awayScore = Number(match.awayScore ?? 0);

    if (homeScore < 0 || awayScore < 0) {
      setError('Placar não pode ser negativo.');
      return;
    }

    const confirmMessage =
      `Salvar alteração manual?\n\n${match.homeTeam} ${homeScore} x ${awayScore} ${match.awayTeam}\nStatus: ${match.status}`;

    if (
      match.status === 'FINISHED' &&
      !window.confirm(
        'ATENÇÃO\n\nEncerrar esta partida pode recalcular pontuações do bolão.\n\nDeseja continuar?'
      )
    ) {
      return;
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      setSavingId(match.id);
      setError('');

      await axios.patch(
        `/api/matches/${match.id}/result`,
        {
          homeScore,
          awayScore,
          status: match.status,
          isManualOverride: true,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDirtyMatchIds((current) => {
        const next = new Set(current);
        next.delete(match.id);
        return next;
      });
      await loadMatches();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao salvar jogo.');
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }

    loadMatches();
  }, []);

  const championships = [...new Set(
    matches
      .map((m) => m.round?.championship?.name)
      .filter(Boolean)
  )];

  const filteredMatches = useMemo(() => {
    const q = search.trim().toLowerCase();

    return matches.filter((match) => {
      const text = [
        match.homeTeam,
        match.awayTeam,
        match.round?.name,
        match.round?.championship?.name,
        match.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !q || text.includes(q);
      const isDirty = dirtyMatchIds.has(match.id);
      const matchesStatus = statusFilter === 'ALL' || match.status === statusFilter || isDirty;

      const matchesChampionship =
        championshipFilter === 'ALL' ||
        match.round?.championship?.name === championshipFilter;

      const todayKey = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Sao_Paulo',
      });
      const matchDateKey = getBrasiliaDateKey(match.matchDate);
      const matchesDate =
        dateFilter === 'ALL' ||
        isDirty ||
        (dateFilter === 'TODAY' && matchDateKey === todayKey) ||
        (dateFilter === 'UPCOMING' && match.status === 'SCHEDULED') ||
        (dateFilter === 'FINISHED' && match.status === 'FINISHED');

      return matchesSearch && matchesStatus && matchesChampionship && matchesDate;
    });
  }, [matches, search, statusFilter, championshipFilter, dateFilter, dirtyMatchIds]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-orange-500" />
              <h1 className="text-2xl font-black">Admin de Jogos</h1>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Controle manual de status e placar das partidas.
            </p>
          </div>

          <button
            type="button"
            onClick={loadMatches}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-zinc-500"
          >
            Atualizar
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px_260px]">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3">
            <Search size={16} className="text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por time, rodada ou campeonato..."
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | MatchStatus)}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm outline-none"
          >
            <option value="ALL">Todos</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="LIVE">LIVE</option>
            <option value="FINISHED">FINISHED</option>
            <option value="POSTPONED">POSTPONED</option>
            <option value="CANCELED">CANCELED</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as 'ALL' | 'TODAY' | 'UPCOMING' | 'FINISHED')}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm outline-none"
          >
            <option value="ALL">Todas datas</option>
            <option value="TODAY">Hoje</option>
            <option value="UPCOMING">Próximos</option>
            <option value="FINISHED">Finalizados</option>
          </select>

          <select
            value={championshipFilter}
            onChange={(e) => setChampionshipFilter(e.target.value)}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm outline-none"
          >
            <option value="ALL">Todos campeonatos</option>
            {championships.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <div className="hidden grid-cols-[1fr_150px_160px_150px] gap-3 border-b border-zinc-800 px-4 py-3 text-xs font-black uppercase tracking-wide text-zinc-400 md:grid">
            <span>Jogo</span>
            <span>Placar</span>
            <span>Status</span>
            <span className="text-right">Ação</span>
          </div>

          <div className="divide-y divide-zinc-800">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_150px_160px_150px] md:items-center"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white">
                    {match.homeTeam} x {match.awayTeam}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {match.round?.championship?.name ?? 'Campeonato'} · {match.round?.name ?? 'Rodada'} ·{' '}
                    {new Date(match.matchDate).toLocaleString('pt-BR')}
                  </div>
                  {match.isManualOverride && (
                    <div className="mt-1 text-xs font-bold text-orange-400">
                      Ajuste manual ativo
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={match.homeScore ?? 0}
                    onChange={(e) => updateLocalMatch(match.id, { homeScore: Number(e.target.value) })}
                    className="h-10 w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center font-black outline-none"
                  />
                  <span className="text-zinc-500">x</span>
                  <input
                    type="number"
                    min={0}
                    value={match.awayScore ?? 0}
                    onChange={(e) => updateLocalMatch(match.id, { awayScore: Number(e.target.value) })}
                    className="h-10 w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center font-black outline-none"
                  />
                </div>

                <select
                  value={match.status}
                  onChange={(e) => updateLocalMatch(match.id, { status: e.target.value as MatchStatus })}
                  className={`h-10 rounded-lg border px-3 text-sm font-bold outline-none ${getStatusStyle(match.status)}`}
                >
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="LIVE">LIVE</option>
                  <option value="FINISHED">FINISHED</option>
                  <option value="POSTPONED">POSTPONED</option>
                  <option value="CANCELED">CANCELED</option>
                </select>

                <button
                  type="button"
                  onClick={() => saveMatch(match)}
                  disabled={savingId === match.id}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-black text-white hover:bg-orange-500 disabled:opacity-60"
                >
                  <Save size={14} />
                  {savingId === match.id ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            ))}

            {filteredMatches.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-zinc-500">
                Nenhum jogo encontrado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
