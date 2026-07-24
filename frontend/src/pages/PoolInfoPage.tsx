import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, CreditCard, Target, Trophy } from 'lucide-react';
import { getPool, type Pool } from '../services/pool.service';
import { Spinner } from '../components/ui';
import { RulesTab } from '../components/RulesTab';

export default function PoolInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrize, setShowPrize] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showScoring, setShowScoring] = useState(false);

  useEffect(() => {
    if (loading) return;

    const section = location.hash.replace('#', '');

    if (section === 'payment') setShowPayment(true);
    if (section === 'scoring') setShowScoring(true);
    if (section === 'rules') setShowRules(true);
    if (section === 'prize') setShowPrize(true);

    if (['payment', 'scoring', 'rules', 'prize'].includes(section)) {
      window.requestAnimationFrame(() => {
        document.getElementById(section)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
  }, [location.hash, loading]);

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

  const prizeUpdatedLabel = pool.prizeUpdatedAt
    ? new Date(pool.prizeUpdatedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const rulesUpdatedLabel = pool.rulesUpdatedAt
    ? new Date(pool.rulesUpdatedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const paymentUpdatedLabel = pool.paymentUpdatedAt
    ? new Date(pool.paymentUpdatedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
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
        <h1 className="text-xl font-black text-white">Premiação, Regras & Pagamento</h1>
        <p className="mt-1 text-sm font-semibold text-zinc-400">{pool.name}</p>
      </div>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div id="prize" className="scroll-mt-24 rounded-2xl border border-yellow-400/20 bg-yellow-400/5">
          <button
            type="button"
            onClick={() => setShowPrize((v) => !v)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <span className="flex items-center gap-2">
              <Trophy size={17} className="text-yellow-300" />
              <span className="text-base font-black text-white">Premiação</span>
            </span>
            <ChevronDown size={18} className={`text-zinc-400 transition ${showPrize ? 'rotate-180' : ''}`} />
          </button>

          {showPrize && (
            <div className="px-4 pb-4">
              {prizeUpdatedLabel && (
                <p className="mb-3 text-[11px] text-zinc-500">
                  Última atualização: {prizeUpdatedLabel}
                </p>
              )}

              {pool.prizeDescription ? (
                <div className="whitespace-pre-line rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm leading-relaxed text-zinc-100">
                  {pool.prizeDescription}
                </div>
              ) : (
                <p className="rounded-xl border border-zinc-800 bg-black/20 p-3 text-sm text-zinc-500">
                  A premiação ainda não foi informada pelo admin do bolão.
                </p>
              )}
            </div>
          )}
        </div>


        <div id="payment" className="scroll-mt-24 rounded-2xl border border-emerald-400/20 bg-emerald-400/5">
          <button
            type="button"
            onClick={() => setShowPayment((v) => !v)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <span className="flex items-center gap-2">
              <CreditCard size={17} className="text-emerald-300" />
              <span className="text-base font-black text-white">Dados para pagamento</span>
            </span>
            <ChevronDown size={18} className={`text-zinc-400 transition ${showPayment ? 'rotate-180' : ''}`} />
          </button>

          {showPayment && (
            <div className="px-4 pb-4">
              {paymentUpdatedLabel && (
                <p className="mb-3 text-[11px] text-zinc-500">
                  Última atualização: {paymentUpdatedLabel}
                </p>
              )}

              {pool.paymentDescription ? (
                <div className="whitespace-pre-line rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm leading-relaxed text-zinc-100">
                  {pool.paymentDescription}
                </div>
              ) : (
                <p className="rounded-xl border border-zinc-800 bg-black/20 p-3 text-sm text-zinc-500">
                  Os dados para pagamento ainda não foram informados pelo admin do bolão.
                </p>
              )}
            </div>
          )}
        </div>


        <div id="scoring" className="scroll-mt-24 rounded-2xl border border-brand/20 bg-brand/5">
          <button
            type="button"
            onClick={() => setShowScoring((v) => !v)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <span className="flex items-center gap-2">
              <Target size={17} className="text-brand" />
              <span className="text-base font-black text-white">Pontuação do bolão</span>
            </span>
            <ChevronDown size={18} className={`text-zinc-400 transition ${showScoring ? 'rotate-180' : ''}`} />
          </button>

          {showScoring && (
            <div className="px-4 pb-4">
              <RulesTab
                poolId={id}
                isOwner={false}
                bonusRoundNumber={null}
                roundOptions={[]}
              />
            </div>
          )}
        </div>

        <div id="rules" className="scroll-mt-24 rounded-2xl border border-zinc-800 bg-black/20">
          <button
            type="button"
            onClick={() => setShowRules((v) => !v)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <span className="flex items-center gap-2">
              <BookOpen size={17} className="text-brand" />
              <span className="text-base font-black text-white">Regulamento e desempates</span>
            </span>
            <ChevronDown size={18} className={`text-zinc-400 transition ${showRules ? 'rotate-180' : ''}`} />
          </button>

          {showRules && (
            <div className="px-4 pb-4">
              {rulesUpdatedLabel && (
                <p className="mb-3 text-[11px] text-zinc-500">
                  Última atualização: {rulesUpdatedLabel}
                </p>
              )}

              {pool.rulesDescription ? (
                <div className="whitespace-pre-line rounded-2xl border border-zinc-700 bg-black/20 p-4 text-sm leading-relaxed text-zinc-100">
                  {pool.rulesDescription}
                </div>
              ) : (
                <p className="rounded-xl border border-zinc-800 bg-black/20 p-3 text-sm text-zinc-500">
                  Nenhuma regra adicional foi cadastrada pelo administrador.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
