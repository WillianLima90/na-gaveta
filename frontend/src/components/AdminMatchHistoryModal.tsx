import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
}

export function AdminMatchHistoryModal({ isOpen, onClose, matchId }: Props) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      setLoading(true);
      try {
        console.log('MATCH ID:', matchId);
      const res = await api.get(`/matches/${matchId}/history`);
      console.log('HISTORY:', res.data);
        setHistory(res.data.history || []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen, matchId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-2xl p-6 w-[360px] border border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-4">Histórico</h2>

        {loading && <p className="text-sm text-zinc-400">Carregando...</p>}

        {!loading && history.length === 0 && (
          <p className="text-sm text-zinc-500">Sem alterações</p>
        )}

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {history.map((h) => (
            <div key={h.id} className="text-xs text-zinc-300 border-b border-zinc-800 pb-2">
              <div>
                {h.prevHome ?? '-'} x {h.prevAway ?? '-'} → {h.newHome} x {h.newAway}
              </div>
              <div className="text-zinc-500">
                {new Date(h.createdAt).toLocaleString()}
              </div>
              {h.user && (
                <div className="text-[10px] text-zinc-400">
                  por {h.user.name || h.user.email}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-sm text-zinc-400 hover:text-white w-full"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
