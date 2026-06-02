// ============================================================

// Na Gaveta — CreatePoolModal
// Modal para criar um novo bolão
// ============================================================

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trophy } from 'lucide-react';
import { createPool } from '../services/pool.service';
import { authService } from '../services/auth.service';
import { listChampionships, type Championship } from '../services/championship.service';
import { Button, Input, Spinner } from './ui';
import { useAuth } from '../hooks/useAuth';

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (poolId: string) => void;
}

export function CreatePoolModal({ isOpen, onClose, onCreated }: CreatePoolModalProps) {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChamps, setLoadingChamps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    championshipId: '',
    isPublic: true,
  });

  // Carregar campeonatos ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    setLoadingChamps(true);
    listChampionships()
      .then(setChampionships)
      .catch(() => setError('Erro ao carregar campeonatos'))
      .finally(() => setLoadingChamps(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const poolLimits: Record<string, number> = {
    FREE: 1,
    PRO: 5,
    BUSINESS: Infinity,
  };

  const currentPlan = user?.plan || 'FREE';
  const currentPools = user?._count?.ownedPools || 0;
  const isPlatformAdmin = user?.role === 'ADMIN';
  const maxPools = isPlatformAdmin ? Infinity : (poolLimits[currentPlan] ?? 1);

  const usageText =
    maxPools === Infinity
      ? 'Ilimitado'
      : `${currentPools}/${maxPools} bolões ativos`;

  const hasReachedLimit =
    maxPools !== Infinity && currentPools >= maxPools;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.championshipId) {
      setError('Nome e campeonato são obrigatórios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pool = await createPool({
        name: form.name,
        description: form.description || undefined,
        championshipId: form.championshipId,
        isPublic: form.isPublic,
      });

      const freshUser = await authService.getProfile();
      updateUser(freshUser);

      onCreated(pool.id);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Erro ao criar bolão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand/20 flex items-center justify-center">
              <Trophy size={18} className="text-brand" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary">Criar bolão</h2>
              <p className="text-xs text-zinc-400">Configure seu novo bolão</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Plano atual
                </p>
                <p className="text-sm font-bold text-text-primary">
                  {currentPlan}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Uso
                </p>
                <p className="text-sm font-semibold text-brand">
                  {usageText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 opacity-100">
          <Input
            label="Nome do bolão"
            placeholder="Ex: Bolão do Escritório 2026"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Campeonato
            </label>
            {loadingChamps ? (
              <div className="flex items-center gap-2 text-zinc-400 text-sm py-2">
                <Spinner size="sm" /> Carregando...
              </div>
            ) : (
              <select
                value={form.championshipId}
                onChange={(e) => setForm({ ...form, championshipId: e.target.value })}
                required
                className="
                  w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700
                  text-text-primary text-sm
                  focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand
                "
              >
                <option value="">Selecione um campeonato</option>
                {championships.map((c) => {
                  const label =
                    c.name.includes("Brasileirão")
                      ? `${c.name} (${c.season}) — Liga (38 rodadas)`
                      : c.name.includes("Copa")
                      ? `${c.name} (${c.season}) — Mata-mata`
                      : `${c.name} (${c.season})`;

                  return (
                    <option key={c.id} value={c.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Descrição <span className="text-zinc-500">(opcional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o bolão para seus amigos..."
              rows={2}
              className="
                w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700
                text-text-primary text-sm resize-none
                focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand
                placeholder:text-zinc-500
              "
            />
          </div>

          {/* Visibilidade */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <input
              type="checkbox"
              id="isPublic"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
              className="w-4 h-4 accent-brand"
            />
            <div>
              <label htmlFor="isPublic" className="text-sm font-medium text-text-primary cursor-pointer">
                Bolão público
              </label>
              <p className="text-xs text-zinc-400">
                {form.isPublic
                  ? 'Qualquer pessoa pode encontrar e entrar'
                  : 'Apenas quem tiver o código pode entrar'}
              </p>
            </div>
          </div>

          {hasReachedLimit && (
            <div className="rounded-xl border border-brand/20 bg-brand/10 px-4 py-3">
              <p className="text-sm font-bold text-brand">
                Limite do plano FREE atingido
              </p>

              <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                Faça upgrade para criar mais bolões, liberar recursos avançados e aumentar os limites da sua conta.
              </p>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/pricing');
                }}
                className="mt-3 w-full rounded-lg bg-brand hover:bg-brand-light transition-colors px-4 py-2.5 text-sm font-bold text-white"
              >
                Ver planos
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose} fullWidth>
              Cancelar
            </Button>

            <Button
              type="submit"
              isLoading={loading}
              fullWidth
              disabled={hasReachedLimit}
            >
              {hasReachedLimit ? 'Limite atingido' : 'Criar bolão'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
