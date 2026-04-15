// ============================================================
// Na Gaveta — CreatePoolModal
// Modal para criar um novo bolão
// ============================================================

import { useState, useEffect, type FormEvent } from 'react';
import { X, Trophy } from 'lucide-react';
import { createPool } from '../services/pool.service';
import { listChampionships, type Championship } from '../services/championship.service';
import { Button, Input, Spinner } from './ui';

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (poolId: string) => void;
}

export function CreatePoolModal({ isOpen, onClose, onCreated }: CreatePoolModalProps) {
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                {championships.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.season})
                  </option>
                ))}
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

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading} fullWidth>
              Criar bolão
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
