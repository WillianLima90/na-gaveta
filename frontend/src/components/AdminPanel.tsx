// ============================================================
// Na Gaveta — AdminPanel
// Painel de testes para registrar resultados de partidas
// e disparar o motor de pontuação manualmente.
// Visível apenas para o dono do bolão.
// ============================================================

import { useState } from 'react';
import { Terminal, Zap, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { Round, Match } from '../services/match.service';
import { setMatchResult } from '../services/match.service';
import { Spinner } from './ui';

interface AdminPanelProps {
  rounds: Round[];
  onResultSet: () => void; // callback para recarregar dados após registrar resultado
}

interface ResultForm {
  homeScore: string;
  awayScore: string;
  status: 'FINISHED' | 'LIVE' | 'SCHEDULED';
}

export function AdminPanel({ rounds, onResultSet }: AdminPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [forms, setForms] = useState<Record<string, ResultForm>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});

  // Apenas partidas agendadas ou ao vivo (não encerradas)
  const editableMatches = rounds.flatMap((r) =>
    r.matches
      .filter((m) => m.status !== 'FINISHED' && m.status !== 'CANCELLED')
      .map((m) => ({ ...m, roundName: r.name }))
  );

  function getForm(matchId: string): ResultForm {
    return forms[matchId] ?? { homeScore: '', awayScore: '', status: 'FINISHED' };
  }

  function updateForm(matchId: string, field: keyof ResultForm, value: string) {
    setForms((prev) => ({
      ...prev,
      [matchId]: { ...getForm(matchId), [field]: value },
    }));
  }

  async function handleSetResult(match: Match & { roundName: string }) {
    const form = getForm(match.id);
    const home = parseInt(form.homeScore);
    const away = parseInt(form.awayScore);

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setResults((prev) => ({ ...prev, [match.id]: '❌ Informe placares válidos' }));
      return;
    }

    setLoading((prev) => ({ ...prev, [match.id]: true }));
    setResults((prev) => ({ ...prev, [match.id]: '' }));

    try {
      const res = await setMatchResult(match.id, {
        homeScore: home,
        awayScore: away,
        status: form.status,
      });
      setResults((prev) => ({
        ...prev,
        [match.id]: `✅ ${res.message}`,
      }));
      onResultSet();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setResults((prev) => ({ ...prev, [match.id]: `❌ ${msg ?? 'Erro ao registrar'}` }));
    } finally {
      setLoading((prev) => ({ ...prev, [match.id]: false }));
    }
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-zinc-500" />
          <span className="text-xs font-medium text-zinc-500">Admin — Registrar resultados</span>
          <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full">
            {editableMatches.length} jogo{editableMatches.length !== 1 ? 's' : ''}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={13} className="text-zinc-600" />
        ) : (
          <ChevronDown size={13} className="text-zinc-600" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-zinc-800">
          {editableMatches.length === 0 ? (
            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
              Todos os jogos já foram encerrados.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {editableMatches.map((match) => {
                const form = getForm(match.id);
                const isLoading = loading[match.id] ?? false;
                const resultMsg = results[match.id];

                return (
                  <div key={match.id} className="px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-text-primary">
                          {match.homeTeam} × {match.awayTeam}
                        </p>
                        <p className="text-xs text-zinc-500">{match.roundName}</p>
                      </div>
                      {match.isJoker && (
                        <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Zap size={10} /> Coringa
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={form.homeScore}
                        onChange={(e) => updateForm(match.id, 'homeScore', e.target.value)}
                        placeholder="0"
                        className="w-14 text-center text-lg font-black py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-text-primary focus:outline-none focus:border-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-zinc-500 font-bold">×</span>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={form.awayScore}
                        onChange={(e) => updateForm(match.id, 'awayScore', e.target.value)}
                        placeholder="0"
                        className="w-14 text-center text-lg font-black py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-text-primary focus:outline-none focus:border-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />

                      <select
                        value={form.status}
                        onChange={(e) => updateForm(match.id, 'status', e.target.value)}
                        className="flex-1 py-2 px-2 rounded-lg bg-zinc-800 border border-zinc-700 text-text-primary text-xs focus:outline-none focus:border-zinc-500"
                      >
                        <option value="FINISHED">Encerrado</option>
                        <option value="LIVE">Ao vivo</option>
                        <option value="SCHEDULED">Agendado</option>
                      </select>

                      <button
                        onClick={() => handleSetResult(match)}
                        disabled={isLoading || form.homeScore === '' || form.awayScore === ''}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? <Spinner size="sm" /> : <Check size={14} />}
                        {isLoading ? '' : 'OK'}
                      </button>
                    </div>

                    {resultMsg && (
                      <p className="mt-2 text-xs text-zinc-400">{resultMsg}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
