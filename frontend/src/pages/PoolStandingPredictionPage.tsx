import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  Lock,
  Save,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getStandingPrediction,
  saveStandingPrediction,
  type StandingPredictionItem,
  type StandingPredictionResponse,
  type StandingPredictionTeam,
} from '../services/pool.service';
import { Spinner } from '../components/ui';

function formatDate(value?: string | null): string {
  if (!value) return 'Prazo ainda não definido';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function createEmptySlots(
  size: number
): Array<StandingPredictionTeam | null> {
  return Array.from({ length: size }, () => null);
}

export default function PoolStandingPredictionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<StandingPredictionResponse | null>(null);
  const [topTeams, setTopTeams] = useState<
    Array<StandingPredictionTeam | null>
  >([]);
  const [bottomTeams, setBottomTeams] = useState<
    Array<StandingPredictionTeam | null>
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      navigate('/pools');
      return;
    }

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const response = await getStandingPrediction(id!);

        if (!active) return;

        setData(response);

        const size = response.configuration.size;

        if (!size) {
          setTopTeams([]);
          setBottomTeams([]);
          return;
        }

        const topSlots = createEmptySlots(size);
        const bottomSlots = createEmptySlots(size);

        for (const item of response.prediction?.items ?? []) {
          const slotIndex = item.predictedPosition - 1;

          if (slotIndex < 0 || slotIndex >= size) continue;

          const team: StandingPredictionTeam = {
            teamKey: item.teamKey,
            teamName: item.teamName,
            teamTla: item.teamTla,
            teamCrest: item.teamCrest,
          };

          if (item.group === 'TOP') {
            topSlots[slotIndex] = team;
          } else {
            bottomSlots[slotIndex] = team;
          }
        }

        setTopTeams(topSlots);
        setBottomTeams(bottomSlots);
      } catch (requestError: any) {
        if (active) {
          setError(
            requestError?.response?.data?.error ||
              'Não foi possível carregar a previsão da classificação.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const selectedTeamKeys = useMemo(() => {
    return new Set(
      [...topTeams, ...bottomTeams]
        .filter(
          (team): team is StandingPredictionTeam => team !== null
        )
        .map((team) => team.teamKey)
    );
  }, [topTeams, bottomTeams]);

  function updateSlot(
    group: 'TOP' | 'BOTTOM',
    position: number,
    teamKey: string
  ) {
    if (!data || data.locked) return;

    const currentSlots = group === 'TOP' ? topTeams : bottomTeams;
    const nextSlots = [...currentSlots];
    const previousTeam = nextSlots[position];

    if (!teamKey) {
      nextSlots[position] = null;
    } else {
      const selectedTeam = data.teams.find(
        (team) => team.teamKey === teamKey
      );

      if (!selectedTeam) return;

      const alreadySelected =
        selectedTeamKeys.has(selectedTeam.teamKey) &&
        previousTeam?.teamKey !== selectedTeam.teamKey;

      if (alreadySelected) {
        toast.error('Este clube já foi selecionado.');
        return;
      }

      nextSlots[position] = selectedTeam;
    }

    if (group === 'TOP') {
      setTopTeams(nextSlots);
    } else {
      setBottomTeams(nextSlots);
    }
  }

  async function handleSave() {
    if (!id || !data || !data.configuration.size || data.locked) return;

    const size = data.configuration.size;

    if (
      topTeams.length !== size ||
      bottomTeams.length !== size ||
      topTeams.some((team) => !team) ||
      bottomTeams.some((team) => !team)
    ) {
      toast.error(
        `Preencha todos os clubes do G${size} e do Z${size}.`
      );
      return;
    }

    const items: StandingPredictionItem[] = [
      ...topTeams.map((team, index) => ({
        ...team!,
        group: 'TOP' as const,
        predictedPosition: index + 1,
      })),
      ...bottomTeams.map((team, index) => ({
        ...team!,
        group: 'BOTTOM' as const,
        predictedPosition: index + 1,
      })),
    ];

    try {
      setSaving(true);

      const response = await saveStandingPrediction(id, items);

      setData((current) =>
        current
          ? {
              ...current,
              prediction: response.prediction,
            }
          : current
      );

      toast.success(
        response.message ||
          'Previsão da classificação salva com sucesso!'
      );
    } catch (requestError: any) {
      toast.error(
        requestError?.response?.data?.error ||
          'Não foi possível salvar sua previsão.'
      );
    } finally {
      setSaving(false);
    }
  }

  function renderGroup(
    group: 'TOP' | 'BOTTOM',
    title: string,
    subtitle: string,
    slots: Array<StandingPredictionTeam | null>
  ) {
    const isTop = group === 'TOP';

    return (
      <section
        className={`rounded-2xl border p-4 sm:p-5 ${
          isTop
            ? 'border-green-500/25 bg-green-500/[0.06]'
            : 'border-red-500/25 bg-red-500/[0.06]'
        }`}
      >
        <div className="mb-4">
          <h2
            className={`text-lg font-black ${
              isTop ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {title}
          </h2>
          <p className="mt-1 text-sm font-semibold text-zinc-400">
            {subtitle}
          </p>
        </div>

        <div className="space-y-3">
          {slots.map((selectedTeam, index) => (
            <div
              key={`${group}-${index}`}
              className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black ${
                  isTop
                    ? 'border-green-500/30 bg-green-500/10 text-green-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                {index + 1}º
              </div>

              <div className="relative">
                {selectedTeam?.teamCrest && (
                  <img
                    src={selectedTeam.teamCrest}
                    alt=""
                    className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 object-contain"
                  />
                )}

                <select
                  value={selectedTeam?.teamKey ?? ''}
                  onChange={(event) =>
                    updateSlot(group, index, event.target.value)
                  }
                  disabled={data?.locked || saving}
                  className={`w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 py-3 pr-10 text-sm font-bold text-white outline-none transition focus:border-brand disabled:cursor-not-allowed disabled:opacity-60 ${
                    selectedTeam?.teamCrest ? 'pl-12' : 'pl-3'
                  }`}
                >
                  <option value="">Selecione um clube</option>

                  {data?.teams.map((team) => {
                    const unavailable =
                      selectedTeamKeys.has(team.teamKey) &&
                      selectedTeam?.teamKey !== team.teamKey;

                    return (
                      <option
                        key={team.teamKey}
                        value={team.teamKey}
                        disabled={unavailable}
                      >
                        {team.teamName}
                        {team.teamTla ? ` (${team.teamTla})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!id) return null;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Link
          to={`/pools/${id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Voltar para o bolão
        </Link>

        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <h1 className="text-lg font-black text-red-200">
            Não foi possível abrir esta modalidade
          </h1>
          <p className="mt-2 text-sm font-semibold text-red-100/80">
            {error || 'Dados da previsão não encontrados.'}
          </p>
        </div>
      </div>
    );
  }

  const { pool, configuration, deadline, locked, prediction } = data;
  const size = configuration.size;
  const isComplete =
    Boolean(size) &&
    topTeams.length === size &&
    bottomTeams.length === size &&
    topTeams.every(Boolean) &&
    bottomTeams.every(Boolean);

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

      <section className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-brand" />
              <h1 className="text-xl font-black text-white sm:text-2xl">
                Previsão da classificação
              </h1>
            </div>

            <p className="mt-1 text-sm font-semibold text-zinc-400">
              {pool.championship.name} · {pool.name}
            </p>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${
              locked
                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                : 'border-green-500/30 bg-green-500/10 text-green-300'
            }`}
          >
            {locked ? <Lock size={14} /> : <ShieldCheck size={14} />}
            {locked ? 'Palpite encerrado' : 'Palpite aberto'}
          </div>
        </div>
      </section>

      {!configuration.enabled || !size ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <h2 className="text-lg font-black text-amber-200">
            Modalidade ainda não habilitada
          </h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-amber-100/80">
            O administrador deste bolão ainda não ativou a previsão da
            classificação final.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-zinc-500">
                Modalidade
              </p>
              <p className="mt-2 text-xl font-black text-white">
                G{size} / Z{size}
              </p>
            </article>

            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-zinc-500">
                Acerto exato
              </p>
              <p className="mt-2 text-xl font-black text-white">
                {configuration.exactPoints} pts
              </p>
            </article>

            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-zinc-500">
                Acerto no grupo
              </p>
              <p className="mt-2 text-xl font-black text-white">
                {configuration.groupPoints} pts
              </p>
            </article>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-brand/10 p-2 text-brand">
                <CalendarClock size={18} />
              </div>

              <div>
                <h2 className="font-black text-white">Prazo para envio</h2>
                <p className="mt-1 text-sm font-semibold text-zinc-400">
                  {deadline
                    ? `${deadline.name} · ${formatDate(deadline.endDate)}`
                    : 'O prazo ainda não foi definido para este participante.'}
                </p>

                {prediction?.submittedAt && (
                  <p className="mt-2 text-xs font-bold text-zinc-500">
                    Último envio: {formatDate(prediction.submittedAt)}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
            <h2 className="text-lg font-black text-white">
              Monte sua previsão
            </h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">
              Escolha a posição exata dos {size} primeiros colocados e dos{' '}
              {size} últimos colocados. O mesmo clube não pode aparecer em
              dois lugares.
            </p>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {renderGroup(
              'TOP',
              `G${size} — Grupo superior`,
              `Do campeão ao ${size}º colocado.`,
              topTeams
            )}

            {renderGroup(
              'BOTTOM',
              `Z${size} — Grupo inferior`,
              `Do último colocado para cima dentro da zona inferior.`,
              bottomTeams
            )}
          </div>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
            {locked ? (
              <div className="flex items-start gap-3">
                <Lock size={18} className="mt-0.5 shrink-0 text-red-300" />
                <div>
                  <h2 className="font-black text-white">
                    Previsão bloqueada
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-zinc-400">
                    O prazo terminou e esta previsão não pode mais ser
                    alterada.
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isComplete}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Spinner size="sm" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Salvar previsão
                  </>
                )}
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
