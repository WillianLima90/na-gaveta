import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RefreshCw, Search, ShieldCheck, Trophy, Unlock } from 'lucide-react';
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

  async function saveMatch(match: AdminMatch, manualOverride: boolean) {
    const homeScore = Number(match.homeScore ?? 0);
    const awayScore = Number(match.awayScore ?? 0);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0 ||
      homeScore > 20 ||
      awayScore > 20
    ) {
      setError('Use placares inteiros entre 0 e 20.');
      return;
    }

    if (
      match.status === 'FINISHED' &&
      !window.confirm(
        'ATENÇÃO\n\nEncerrar esta partida pode recalcular pontuações do bolão.\n\nDeseja continuar?'
      )
    ) {
      return;
    }

    const actionLabel = manualOverride
      ? 'ATUALIZAR E BLOQUEAR A API'
      : 'ATUALIZAR SEM BLOQUEAR A API';

    const confirmMessage =
      `${actionLabel}?\n\n${match.homeTeam} ${homeScore} x ${awayScore} ${match.awayTeam}\nStatus: ${match.status}`;

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
          isManualOverride: manualOverride,
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

  async function releaseApi(match: AdminMatch) {
    if (
      !window.confirm(
        `Liberar sincronização automática?\n\n${match.homeTeam} x ${match.awayTeam}\n\nA API poderá voltar a alterar o placar e o status desta partida.`
      )
    ) {
      return;
    }

    try {
      setSavingId(match.id);
      setError('');

      await axios.patch(
        `/api/matches/${match.id}/result`,
        {
          homeScore: Number(match.homeScore ?? 0),
          awayScore: Number(match.awayScore ?? 0),
          status: match.status,
          isManualOverride: false,
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
      setError(err?.response?.data?.error || 'Erro ao liberar sincronização.');
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
              Gerencie placares, status e o controle da sincronização automática da API.
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
          <div className="hidden grid-cols-[minmax(260px,1fr)_150px_160px_150px_250px] gap-3 border-b border-zinc-800 px-4 py-3 text-xs font-black uppercase tracking-wide text-zinc-400 lg:grid">
            <span>Jogo</span>
            <span>Placar</span>
            <span>Status</span>
            <span>Controle</span>
            <span className="text-right">Ações</span>
          </div>

          <div className="divide-y divide-zinc-800">
            {filteredMatches.map((match) => {
              const isSaving = savingId === match.id;
              const isManual = Boolean(match.isManualOverride);
              const canUseTemporaryUpdate = match.status === 'LIVE';

              return (
                <div
                  key={match.id}
                  className={`grid gap-4 px-4 py-4 transition lg:grid-cols-[minmax(260px,1fr)_150px_160px_150px_250px] lg:items-center ${
                    isManual
                      ? 'border-l-2 border-l-amber-500 bg-amber-500/[0.04]'
                      : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white">
                      {match.homeTeam} x {match.awayTeam}
                    </div>

                    <div className="mt-1 text-xs text-zinc-500">
                      {match.round?.championship?.name ?? 'Campeonato'} · {match.round?.name ?? 'Rodada'} ·{' '}
                      {new Date(match.matchDate).toLocaleString('pt-BR')}
                    </div>

                    {isManual && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300">
                        <ShieldCheck size={13} />
                        🔒 Controle Manual
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-zinc-600 lg:hidden">
                      Placar
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={match.homeScore ?? 0}
                        onChange={(e) =>
                          updateLocalMatch(match.id, { homeScore: Number(e.target.value) })
                        }
                        className="h-10 w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center font-black outline-none focus:border-orange-500"
                      />
                      <span className="text-zinc-500">x</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={match.awayScore ?? 0}
                        onChange={(e) =>
                          updateLocalMatch(match.id, { awayScore: Number(e.target.value) })
                        }
                        className="h-10 w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center font-black outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-zinc-600 lg:hidden">
                      Status
                    </div>

                    <select
                      value={match.status}
                      onChange={(e) =>
                        updateLocalMatch(match.id, { status: e.target.value as MatchStatus })
                      }
                      className={`h-10 w-full rounded-lg border px-3 text-sm font-bold outline-none ${getStatusStyle(match.status)}`}
                    >
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="LIVE">LIVE</option>
                      <option value="FINISHED">FINISHED</option>
                      <option value="POSTPONED">POSTPONED</option>
                      <option value="CANCELED">CANCELED</option>
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-zinc-600 lg:hidden">
                      Sincronização
                    </div>

                    {isManual ? (
                      <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-sm font-bold text-amber-300">
                        <ShieldCheck size={15} />
                        Manual
                      </div>
                    ) : (
                      <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm font-bold text-emerald-300">
                        <RefreshCw size={15} />
                        API
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-zinc-600 lg:hidden">
                      Ações
                    </div>

                    {isManual ? (
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => saveMatch(match, true)}
                          disabled={isSaving}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 text-xs font-black text-white hover:bg-orange-500 disabled:opacity-60"
                        >
                          <ShieldCheck size={14} />
                          {isSaving ? 'Salvando...' : 'Salvar correção'}
                        </button>

                        <button
                          type="button"
                          onClick={() => releaseApi(match)}
                          disabled={isSaving}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60"
                        >
                          <Unlock size={14} />
                          Liberar API
                        </button>
                      </div>
                    ) : canUseTemporaryUpdate ? (
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => saveMatch(match, false)}
                          disabled={isSaving}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60"
                        >
                          <RefreshCw size={14} />
                          {isSaving ? 'Salvando...' : 'Correção temporária'}
                        </button>

                        <button
                          type="button"
                          onClick={() => saveMatch(match, true)}
                          disabled={isSaving}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 text-xs font-black text-white hover:bg-orange-500 disabled:opacity-60"
                        >
                          <ShieldCheck size={14} />
                          Assumir controle manual
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => saveMatch(match, true)}
                        disabled={isSaving}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 text-xs font-black text-white hover:bg-orange-500 disabled:opacity-60"
                      >
                        <ShieldCheck size={14} />
                        {isSaving ? 'Salvando...' : 'Salvar em controle manual'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

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
