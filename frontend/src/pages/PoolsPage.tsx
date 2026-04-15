// ============================================================
// Na Gaveta — Página de Bolões (/pools)
// Lista bolões públicos + meus bolões + criar bolão
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, Trophy, Search, ArrowRight, LogIn } from 'lucide-react';
import { listPools, myPools, joinPoolByCode, type Pool } from '../services/pool.service';
import { useAuth } from '../hooks/useAuth';
import { CreatePoolModal } from '../components/CreatePoolModal';
import { Spinner, Badge } from '../components/ui';

export default function PoolsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [publicPools, setPublicPools] = useState<Pool[]>([]);
  const [myPoolsList, setMyPoolsList] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'public' | 'mine'>('public');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    loadPools();
  }, [isAuthenticated]);

  async function loadPools() {
    setLoading(true);
    try {
      const [pub, mine] = await Promise.all([
        listPools(),
        isAuthenticated ? myPools() : Promise.resolve([]),
      ]);
      setPublicPools(pub);
      setMyPoolsList(mine);
    } catch {
      // silencioso — mostrar lista vazia
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoiningCode(true);
    setJoinError(null);
    try {
      const result = await joinPoolByCode(joinCode.trim().toUpperCase());
      navigate(`/pools/${result.poolId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setJoinError(msg || 'Código inválido');
    } finally {
      setJoiningCode(false);
    }
  }

  function handlePoolCreated(poolId: string) {
    navigate(`/pools/${poolId}`);
  }

  const displayedPools = activeTab === 'mine' ? myPoolsList : publicPools;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Bolões</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Participe de bolões ou crie o seu próprio
          </p>
        </div>
        {isAuthenticated && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl transition-colors text-sm"
          >
            <Plus size={16} />
            Criar bolão
          </button>
        )}
      </div>

      {/* Entrar por código */}
      {isAuthenticated && (
        <form onSubmit={handleJoinByCode} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null); }}
                placeholder="Tem um código? Ex: BRAS26"
                maxLength={6}
                className="
                  w-full pl-9 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800
                  text-text-primary text-sm font-mono tracking-widest uppercase
                  focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand
                  placeholder:text-zinc-500 placeholder:font-sans placeholder:tracking-normal
                "
              />
            </div>
            <button
              type="submit"
              disabled={joiningCode || joinCode.length < 4}
              className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-text-primary font-bold rounded-xl transition-colors text-sm disabled:opacity-50"
            >
              {joiningCode ? <Spinner size="sm" /> : <LogIn size={16} />}
              Entrar
            </button>
          </div>
          {joinError && (
            <p className="text-xs text-red-400 mt-1.5 ml-1">{joinError}</p>
          )}
        </form>
      )}

      {/* Tabs */}
      {isAuthenticated && (
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl mb-6 w-fit">
          {(['public', 'mine'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-brand text-white'
                  : 'text-zinc-400 hover:text-text-primary'
              }`}
            >
              {tab === 'public' ? 'Públicos' : 'Meus bolões'}
              {tab === 'mine' && myPoolsList.length > 0 && (
                <span className="ml-1.5 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                  {myPoolsList.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lista de bolões */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : displayedPools.length === 0 ? (
        <div className="text-center py-16">
          <Trophy size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">
            {activeTab === 'mine'
              ? 'Você ainda não participa de nenhum bolão'
              : 'Nenhum bolão público disponível'}
          </p>
          {isAuthenticated && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-brand hover:text-brand-light text-sm font-medium transition-colors"
            >
              Criar o primeiro bolão →
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {displayedPools.map((pool) => (
            <PoolCard key={pool.id} pool={pool} />
          ))}
        </div>
      )}

      {/* Modal de criação */}
      <CreatePoolModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handlePoolCreated}
      />
    </div>
  );
}

// ── Card de bolão ────────────────────────────────────────────
function PoolCard({ pool }: { pool: Pool }) {
  return (
    <Link
      to={`/pools/${pool.id}`}
      className="group block p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Nome do bolão */}
          <h3 className="font-bold text-text-primary group-hover:text-brand transition-colors truncate">
            {pool.name}
          </h3>

          {/* Campeonato */}
          {pool.championship && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate">
              {pool.championship.name}
            </p>
          )}

          {/* Descrição */}
          {pool.description && (
            <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{pool.description}</p>
          )}
        </div>

        <ArrowRight
          size={16}
          className="text-zinc-600 group-hover:text-brand group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5"
        />
      </div>

      <div className="flex items-center gap-3 mt-4">
        {/* Participantes */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Users size={12} />
          <span>{pool._count?.members ?? 0} participantes</span>
        </div>

        {/* Badges */}
        <div className="flex gap-1.5 ml-auto">
          {pool.isPublic ? (
            <Badge variant="default">Público</Badge>
          ) : (
            <Badge variant="warning">Privado</Badge>
          )}
          {(pool as Pool & { myScore?: number }).myScore !== undefined && (
            <Badge variant="brand">{(pool as Pool & { myScore?: number }).myScore} pts</Badge>
          )}
        </div>
      </div>

      {/* Código do bolão */}
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <span className="text-xs text-zinc-500">
          Código: <span className="font-mono font-bold text-zinc-400">{pool.code}</span>
        </span>
      </div>
    </Link>
  );
}
