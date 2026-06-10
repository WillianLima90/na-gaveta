import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { getPool, type Pool } from '../services/pool.service';
import { OfficialChampionshipTable } from '../components/OfficialChampionshipTable';
import { Spinner } from '../components/ui';

export default function PoolChampionshipPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/pools');
      return;
    }

    let active = true;

    async function load() {
      try {
        const data = await getPool(id!);
        if (active) setPool(data);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!pool || !id) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <Link
          to={`/pools/${id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Voltar para o bolão
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-brand" />
          <h1 className="text-xl font-black text-white">Classificação do campeonato</h1>
        </div>
        <p className="mt-1 text-sm font-semibold text-zinc-400">
          {pool.championship?.name || pool.name}
        </p>
      </div>

      <OfficialChampionshipTable championshipId={pool.championshipId} />
    </div>
  );
}
