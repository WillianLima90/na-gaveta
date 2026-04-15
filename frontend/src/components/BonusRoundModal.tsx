import { useEffect, useRef, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rounds: { id: string; number: number; startDate: string }[];
  onConfirm: (roundId: string) => Promise<void>;
}

export function BonusRoundModal({ isOpen, onClose, rounds, onConfirm }: Props) {
  const availableRounds = rounds.filter((r) => new Date(r.startDate) > new Date());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!spinning || availableRounds.length === 0) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % availableRounds.length);
    }, 80);

    return () => window.clearInterval(interval);
  }, [spinning, availableRounds.length]);

  useEffect(() => {
    if (!isOpen) {
      setSpinning(false);
      setConfirming(false);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isOpen]);

  async function handleSpin() {
    if (spinning || confirming || availableRounds.length === 0) return;

    setSpinning(true);

    timeoutRef.current = window.setTimeout(async () => {
      try {
        setSpinning(false);
        setConfirming(true);
        const selected = availableRounds[currentIndex];
        await onConfirm(selected.id);
      } finally {
        setConfirming(false);
        timeoutRef.current = null;
      }
    }, 2000);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-2xl p-6 w-[320px] border border-zinc-800 text-center">
        <h2 className="text-lg font-bold text-white mb-4">Sortear rodada bônus</h2>

        <div className="h-20 flex items-center justify-center mb-6">
          <div className="text-2xl font-black text-brand">
            Rodada {availableRounds[currentIndex]?.number}
          </div>
        </div>

        <button
          onClick={handleSpin}
          disabled={spinning || confirming || availableRounds.length === 0}
          className="w-full py-2 rounded-xl bg-brand text-white font-semibold hover:bg-brand-light transition disabled:opacity-50"
        >
          {availableRounds.length === 0 ? 'Sem rodadas futuras' : confirming ? 'Confirmando...' : spinning ? 'Sorteando...' : 'Girar'}
        </button>

        <button
          onClick={onClose}
          disabled={spinning || confirming}
          className="mt-3 text-sm text-zinc-400 hover:text-white disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
