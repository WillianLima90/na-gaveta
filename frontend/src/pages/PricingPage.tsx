import { Check, Trophy } from 'lucide-react';

const plans = [
  {
    name: 'FREE',
    price: 'Grátis',
    description: 'Para testar e participar dos primeiros bolões.',
    features: ['Criar 1 bolão ativo', 'Participar de bolões', 'Palpites e ranking básicos'],
    cta: 'Plano atual',
  },
  {
    name: 'PRO',
    price: 'Em breve',
    description: 'Para quem quer organizar mais bolões com amigos.',
    features: ['Criar até 5 bolões ativos', 'Mais controle de participantes', 'Recursos premium futuros'],
    cta: 'Quero PRO',
    featured: true,
  },
  {
    name: 'BUSINESS',
    price: 'Em breve',
    description: 'Para empresas, grupos grandes e campeonatos recorrentes.',
    features: ['Bolões ilimitados', 'Gestão avançada', 'Suporte e recursos customizados'],
    cta: 'Falar sobre BUSINESS',
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 border border-brand/20">
          <Trophy className="text-brand" size={22} />
        </div>
        <h1 className="text-3xl font-black text-white">Escolha seu plano</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Comece grátis e faça upgrade quando quiser criar mais bolões.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-3xl border p-5 bg-zinc-900/80 ${
              plan.featured
                ? 'border-brand/50 shadow-lg shadow-brand/10'
                : 'border-zinc-800'
            }`}
          >
            {plan.featured && (
              <div className="mb-3 inline-flex rounded-full bg-brand/15 border border-brand/25 px-3 py-1 text-xs font-bold text-brand">
                Mais indicado
              </div>
            )}

            <h2 className="text-xl font-black text-white">{plan.name}</h2>
            <p className="mt-1 text-2xl font-black text-brand">{plan.price}</p>
            <p className="mt-2 min-h-[42px] text-sm text-zinc-400">{plan.description}</p>

            <div className="mt-5 space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                  <Check size={16} className="mt-0.5 shrink-0 text-green-400" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-black transition ${
                plan.featured
                  ? 'bg-brand hover:bg-brand-light text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
