import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Search, Trophy, Lock, Globe2, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AdminPool {
  id: string;
  name: string;
  code: string;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  championship: { id: string; name: string };
  _count: { members: number; predictions: number };
}

export function AdminPoolsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [pools, setPools] = useState<AdminPool[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'PUBLIC' | 'PRIVATE'>('ACTIVE');
  const [error, setError] = useState('');

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('ng_user') || 'null');
    } catch {
      return null;
    }
  }, []);

  async function loadPools() {
    try {
      setError('');
      const res = await axios.get('/api/admin/pools', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPools(res.data.pools ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar bolões.');
    }
  }

  async function togglePoolActive(pool: AdminPool) {
    const action = pool.isActive ? 'desativar' : 'ativar';

    if (!window.confirm(`Tem certeza que deseja ${action} o bolão "${pool.name}"?`)) return;

    try {
      setError('');
      await axios.patch(
        `/api/admin/pools/${pool.id}/active`,
        { isActive: !pool.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadPools();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao atualizar status do bolão.');
    }
  }

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    loadPools();
  }, []);

  const filtered = pools.filter((pool) => {
    const matchesSearch =
      `${pool.name} ${pool.code} ${pool.owner?.name} ${pool.owner?.email} ${pool.championship?.name}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'ACTIVE' && pool.isActive) ||
      (filter === 'INACTIVE' && !pool.isActive) ||
      (filter === 'PUBLIC' && pool.isPublic) ||
      (filter === 'PRIVATE' && !pool.isPublic);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/admin/users')}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition"
        >
          <ArrowLeft size={14} />
          Voltar para usuários
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-brand/15 border border-brand/20 flex items-center justify-center">
              <Trophy size={18} className="text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Admin — Bolões</h1>
              <p className="text-sm text-zinc-400">
                Controle todos os bolões da plataforma, donos, participantes e atividade.
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap mt-4">
            <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300">
              <span className="font-bold text-white">{pools.length}</span> bolões
            </div>
            <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300">
              <span className="font-bold text-green-300">{pools.filter((p) => p.isActive).length}</span> ativos
            </div>
            <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300">
              <span className="font-bold text-brand">{pools.filter((p) => p.isPublic).length}</span> públicos
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ['ACTIVE', 'Ativos'],
            ['ALL', 'Todos'],
            ['PUBLIC', 'Públicos'],
            ['PRIVATE', 'Privados'],
            ['INACTIVE', 'Inativos'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value as typeof filter)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                filter === value
                  ? 'border-brand/40 bg-brand/15 text-brand'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-5 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            placeholder="Buscar por bolão, código, dono ou campeonato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((pool) => (
            <div key={pool.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-xl font-bold text-white">{pool.name}</p>

                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      pool.isPublic
                        ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}>
                      {pool.isPublic ? <Globe2 size={12} /> : <Lock size={12} />}
                      {pool.isPublic ? 'PÚBLICO' : 'PRIVADO'}
                    </span>

                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      pool.isActive
                        ? 'bg-brand/15 text-brand border border-brand/20'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {pool.isActive ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-400">
                    Código: <span className="font-mono text-zinc-200">{pool.code}</span>
                  </p>
                  <p className="text-sm text-zinc-500">
                    Dono: <span className="text-zinc-300">{pool.owner?.name}</span> · {pool.owner?.email}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Campeonato: <span className="text-zinc-300">{pool.championship?.name}</span>
                  </p>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-xl border border-zinc-800 bg-black/25 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">Criado em</p>
                      <p className="text-xs font-bold text-zinc-200">
                        {new Date(pool.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-black/25 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">Participantes</p>
                      <p className="text-xs font-bold text-zinc-200">{pool._count?.members ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-black/25 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">Palpites</p>
                      <p className="text-xs font-bold text-zinc-200">{pool._count?.predictions ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-black/25 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">Dono</p>
                      <p className="text-xs font-bold text-zinc-200 truncate">{pool.owner?.name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:min-w-[150px]">
                  <button
                    onClick={() => navigate(`/pools/${pool.id}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand/80 transition"
                  >
                    <Shield size={14} />
                    Abrir bolão
                  </button>

                  <button
                    onClick={() => togglePoolActive(pool)}
                    className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition ${
                      pool.isActive
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}
                  >
                    {pool.isActive ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-10 text-center text-zinc-500">
              Nenhum bolão encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
