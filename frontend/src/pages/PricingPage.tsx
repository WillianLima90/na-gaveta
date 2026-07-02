import { Check, Trophy } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const WHATSAPP_URL =
  'https://wa.me/16892362739?text=' +
  encodeURIComponent('Olá! Tenho interesse no plano PRO anual (R$ 100/ano) do Na Gaveta.');

const BUSINESS_WHATSAPP_URL =
  'https://wa.me/16892362739?text=' +
  encodeURIComponent('Olá! Quero saber mais sobre o plano BUSINESS do Na Gaveta para grupos grandes ou empresas.');

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
    price: 'R$ 100/ano',
    description: 'Pagamento anual. Ideal para quem organiza bolões durante toda a temporada.',
    features: ['Criar até 5 bolões ativos', 'Pagamento único anual', 'Suporte direto pelo WhatsApp'],
    cta: 'Quero ser PRO',
    featured: true,
  },
  {
    name: 'BUSINESS',
    price: 'Sob consulta',
    description: 'Para empresas, grupos grandes e campeonatos recorrentes.',
    features: ['Bolões ilimitados', 'Gestão avançada', 'Suporte e recursos customizados'],
    cta: 'Quero ser BUSINESS',
  },
];

export default function PricingPage() {
  const { user } = useAuth();

  async function registerPricingLead(planName: string) {
    if (planName !== 'PRO' && planName !== 'BUSINESS') return;

    try {
      await axios.post('/api/crm/leads', {
        name: user?.name || `Interesse ${planName}`,
        email: user?.email || undefined,
        type: planName === 'BUSINESS' ? 'COMPANY' : 'ORGANIZER',
        source: 'Pricing Page',
        nextAction: `Contato sobre plano ${planName}`,
        notes: [
          `Lead automático gerado ao clicar em ${planName} na página de preços.`,
          user?.id ? `User ID: ${user.id}` : null,
          user?.plan ? `Plano atual: ${user.plan}` : null,
          `Interesse: ${planName}`,
        ].filter(Boolean).join('\n'),
      });
    } catch {
      // Não bloquear o WhatsApp se o CRM falhar.
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 border border-brand/20">
          <Trophy className="text-brand" size={22} />
        </div>
        <h1 className="text-3xl font-black text-white">Escolha seu plano</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Comece grátis. Faça upgrade quando quiser organizar mais bolões durante a temporada.
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
              onClick={async () => {
                await registerPricingLead(plan.name);

                if (plan.name === 'PRO') {
                  window.open(WHATSAPP_URL, '_blank');
                } else if (plan.name === 'BUSINESS') {
                  window.open(BUSINESS_WHATSAPP_URL, '_blank');
                }
              }}
              className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-black transition ${
                plan.featured
                  ? 'bg-brand hover:bg-brand-light text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              } ${plan.name === 'FREE' ? 'cursor-default opacity-80' : ''}`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
