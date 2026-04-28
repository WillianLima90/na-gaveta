import { useState } from 'react';
import { Input, Button } from './ui';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  onSuccess: () => void;
}

export function AdminEditResultModal({
  isOpen,
  onClose,
  matchId,
  homeScore,
  awayScore,
  onSuccess,
}: Props) {
  const [home, setHome] = useState(String(homeScore ?? 0));
  const [away, setAway] = useState(String(awayScore ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSave() {
    const h = Number(home);
    const a = Number(away);

    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('Placar inválido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.patch(`/matches/${matchId}/result`, {
        homeScore: h,
        awayScore: a,
        status: 'FINISHED',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-2xl p-6 w-[320px] border border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-4">Corrigir resultado</h2>

        <div className="flex gap-2 mb-4">
          <Input value={home} onChange={(e) => setHome(e.target.value)} />
          <Input value={away} onChange={(e) => setAway(e.target.value)} />
        </div>

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <Button onClick={handleSave} isLoading={loading} fullWidth>
          Salvar
        </Button>

        <button
          onClick={onClose}
          className="mt-3 text-sm text-zinc-400 hover:text-white w-full"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
