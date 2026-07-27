import { useState } from 'react';
import { Input, Button } from './ui';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isManualOverride?: boolean;
  onSuccess: () => void;
}

export function AdminEditResultModal({
  isOpen,
  onClose,
  matchId,
  homeScore,
  awayScore,
  status,
  isManualOverride = false,
  onSuccess,
}: Props) {
  const [home, setHome] = useState(String(homeScore ?? 0));
  const [away, setAway] = useState(String(awayScore ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function saveResult(manualOverride: boolean) {
    const h = Number(home);
    const a = Number(away);

    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 20 || a > 20) {
      setError('Use placares inteiros entre 0 e 20');
      return;
    }

    if (h === homeScore && a === awayScore && manualOverride === isManualOverride) {
      setError('Resultado não alterado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.patch(`/matches/${matchId}/result`, {
        homeScore: h,
        awayScore: a,
        status: status === 'LIVE' ? 'LIVE' : 'FINISHED',
        isManualOverride: manualOverride,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  async function handleReturnToApi() {
    const h = Number(home);
    const a = Number(away);

    setLoading(true);
    setError(null);

    try {
      await api.patch(`/matches/${matchId}/result`, {
        homeScore: h,
        awayScore: a,
        status,
        isManualOverride: false,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao liberar sincronização');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-2xl p-6 w-[320px] border border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">
          {isManualOverride
            ? '🔒 Correção manual ativa'
            : status === 'LIVE'
              ? 'Corrigir placar ao vivo'
              : 'Corrigir resultado final'}
        </h2>
        <p className="text-xs text-zinc-400 mb-4">
          {isManualOverride
            ? 'Esta partida está protegida contra atualizações automáticas da API.'
            : status === 'LIVE'
              ? 'Escolha entre uma atualização temporária ou bloquear a sincronização automática.'
              : 'Esta correção bloqueará futuras atualizações automáticas da API.'}
        </p>

        <div className="flex gap-2 mb-4">
          <Input value={home} onChange={(e) => setHome(e.target.value)} />
          <Input value={away} onChange={(e) => setAway(e.target.value)} />
        </div>

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <div className="space-y-2">
          {status === 'LIVE' && !isManualOverride && (
            <button
              type="button"
              onClick={() => saveResult(false)}
              disabled={loading}
              className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Atualizar SEM bloquear API
            </button>
          )}

          <Button onClick={() => saveResult(true)} isLoading={loading} fullWidth>
            {isManualOverride ? 'Salvar correção' : 'Atualizar e BLOQUEAR API'}
          </Button>

          {isManualOverride && (
            <button
              type="button"
              onClick={handleReturnToApi}
              disabled={loading}
              className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Liberar sincronização da API
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          disabled={loading}
          className="mt-3 text-sm text-zinc-400 hover:text-white w-full disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
