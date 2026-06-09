import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { AdminPanel } from '../components/AdminPanel';

export default function PoolAdminPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/pools');
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link
          to={`/pools/${id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft size={16} />
          Voltar para o bolão
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-brand" />
          <h1 className="text-xl font-black text-white">Admin do Bolão</h1>
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          Área operacional para aprovar participantes, acompanhar pendências e administrar o bolão.
        </p>
      </div>

      <AdminPanel poolId={id} onResultSet={() => {}} />
    </div>
  );
}
