// ============================================================
// Na Gaveta — RulesTab v3
// Simplificado:
//   - Usuário: apenas regras ATIVAS (valor > 0), sem summary
//   - Admin: todas as regras com checkbox + campo numérico
//   - Sem bloco de "pontuação máxima por jogo" (redundante)
// ============================================================

import { useState, useEffect } from 'react';
import { Check, Save, X, Info } from 'lucide-react';
import { getPoolRules, updatePoolRules, type ScoreRule } from '../services/match.service';
import { Spinner } from './ui';
import { BonusRoundModal } from './BonusRoundModal';

interface RulesTabProps {
  poolId: string;
  isOwner: boolean;
  bonusRoundNumber?: number | null;
  roundOptions: { id: string; number: number; startDate: string }[];
}

interface RuleField {
  key: keyof Omit<ScoreRule, 'id' | 'poolId'>;
  label: string;
  description: string;
  suffix: string;
  isMultiplier?: boolean;
}

const RULE_FIELDS: RuleField[] = [
  {
    key: 'pointsForOutcome',
    label: 'Acertar resultado (V/E/D)',
    description: 'Pontos por acertar vitória, empate ou derrota',
    suffix: 'pts',
  },
  {
    key: 'pointsForHomeGoals',
    label: 'Acertar gols do mandante',
    description: 'Pontos por acertar exatamente os gols do time da casa',
    suffix: 'pts',
  },
  {
    key: 'pointsForAwayGoals',
    label: 'Acertar gols do visitante',
    description: 'Pontos por acertar exatamente os gols do time visitante',
    suffix: 'pts',
  },
  {
    key: 'exactScoreBonus',
    label: 'Bônus por placar exato',
    description: 'Pontos extras por acertar o placar completo',
    suffix: 'pts',
  },
  {
    key: 'jokerMultiplier',
    label: 'Multiplicador coringa ⚡',
    description: 'Multiplica pontos em partidas marcadas como coringa',
    suffix: 'x',
    isMultiplier: true,
  },
  {
    key: 'bonusRoundMultiplier',
    label: 'Multiplicador rodada bônus 🌟',
    description: 'Multiplica pontos em rodadas marcadas como bônus',
    suffix: 'x',
    isMultiplier: true,
  },
];

export function RulesTab({ poolId, isOwner, bonusRoundNumber, roundOptions }: RulesTabProps) {
  const [rules, setRules] = useState<ScoreRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);

  const isPresetDefault =
    rules?.pointsForOutcome === 10 &&
    rules?.pointsForHomeGoals === 5 &&
    rules?.pointsForAwayGoals === 5 &&
    rules?.exactScoreBonus === 0;

  useEffect(() => {
    loadRules();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId]);

  async function loadRules() {
    setLoading(true);
    try {
      const data = await getPoolRules(poolId);
      setRules(data.rules);
      initEditValues(data.rules);
      setLocked(data.locked);
    } catch {
      setError('Erro ao carregar regras');
    } finally {
      setLoading(false);
    }
  }

  function initEditValues(r: ScoreRule) {
    setEditValues({
      pointsForOutcome: r.pointsForOutcome,
      pointsForHomeGoals: r.pointsForHomeGoals,
      pointsForAwayGoals: r.pointsForAwayGoals,
      exactScoreBonus: r.exactScoreBonus,
      jokerMultiplier: r.jokerMultiplier,
      bonusRoundMultiplier: r.bonusRoundMultiplier,
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePoolRules(poolId, editValues);
      setRules(updated);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      if (err?.response?.data?.error?.includes('não podem mais ser alteradas')) {
        setLocked(true);
        setError('Regras bloqueadas após início do campeonato');
      } else {
        setError('Erro ao salvar regras');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (rules) initEditValues(rules);
    setEditing(false);
    setError(null);
  }

  async function handleConfirmBonusRound(roundId: string) {
    try {
      const response = await fetch(`http://localhost:3001/api/pools/${poolId}/bonus/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ng_token')}`,
        },
        body: JSON.stringify({ roundId }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data?.error || 'Erro ao sortear rodada bônus');
        return;
      }

      setShowBonusModal(false);
      alert(`Rodada bônus sorteada: Rodada ${data.roundNumber}`);
      window.location.reload();
    } catch {
      alert('Erro ao sortear rodada bônus');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (!rules) {
    return (
      <div className="text-center py-6 text-zinc-500 text-sm">
        {error ?? 'Regras não configuradas'}
      </div>
    );
  }

  // Para usuário: filtrar apenas regras ativas
  const activeFields = editing
    ? RULE_FIELDS
    : RULE_FIELDS.filter((f) => {
        const val = rules[f.key] as number;
        return f.isMultiplier ? val > 1 : val > 0;
      });

  return (
    <>
      <BonusRoundModal
        isOpen={showBonusModal}
        onClose={() => setShowBonusModal(false)}
        rounds={roundOptions}
        onConfirm={handleConfirmBonusRound}
      />
      <div className="space-y-3">
      {locked && (
        <div className="text-xs text-red-400 px-2">
          Regras bloqueadas após início do campeonato
        </div>
      )}

      {bonusRoundNumber && (
        <div className="px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-sm text-purple-300">
          ✨ Rodada bônus sorteada: Rodada {bonusRoundNumber}
        </div>
      )}

      {/* Lista de regras */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

        {/* Header com botão editar (apenas admin) */}
        {isOwner && (
          <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Regras de pontuação</span>
              <span className="text-[11px] text-green-400 mt-0.5">{isPresetDefault ? "Preset padrão ativo" : "Regras personalizadas"}</span>
            </div>
            {!editing ? (
              <div className="flex items-center gap-3">
                {!bonusRoundNumber && (
                  <button
                    onClick={() => setShowBonusModal(true)}
                    className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    🎯 Sortear rodada bônus
                  </button>
                )}
                <button
                  onClick={() => !locked && setEditing(true)}
                  className={`text-xs font-medium transition-colors ${locked ? 'text-zinc-500 cursor-not-allowed' : 'text-brand hover:text-brand-light'}`}
                >
                  Customizar regras
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving || locked}
                  className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <X size={11} /> Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || locked}
                  className="text-xs text-brand hover:text-brand-light font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {saving ? <Spinner size="sm" /> : <Save size={11} />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Linhas de regras */}
        {activeFields.length === 0 ? (
          <div className="px-4 py-5 text-center text-zinc-500 text-sm">
            Nenhuma regra configurada
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {activeFields.map((field) => {
              const value = rules[field.key] as number;
              const editVal = editValues[field.key] ?? value;

              return (
                <div
                  key={field.key}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {/* Checkbox (apenas admin em modo edição) */}
                  {isOwner && editing ? (
                    <button
                      onClick={() => {
                        const currentVal = editValues[field.key] ?? value;
                        let defaultVal = 0;
                        if (field.key === "pointsForOutcome") defaultVal = 10;
                        else if (field.key === "pointsForHomeGoals") defaultVal = 5;
                        else if (field.key === "pointsForAwayGoals") defaultVal = 5;
                        else if (field.key === "exactScoreBonus") defaultVal = 0;
                        else if (field.isMultiplier) defaultVal = 2;

                        setEditValues((prev) => ({
                          ...prev,
                          [field.key]: currentVal > 0 ? 0 : defaultVal,
                        }));
                      }}
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                        editVal > 0
                          ? 'bg-brand border-brand'
                          : 'bg-zinc-800 border-zinc-600'
                      }`}
                    >
                      {editVal > 0 && <Check size={11} className="text-white" />}
                    </button>
                  ) : (
                    /* Indicador visual ativo para usuário */
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        field.isMultiplier ? 'bg-yellow-400' : 'bg-brand'
                      }`}
                    />
                  )}

                  {/* Label e descrição */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-white">{field.label}</p>
                      {field.description && (
                        <div className="group relative">
                          <Info size={14} className="text-zinc-500 cursor-pointer" />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-zinc-900 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap shadow-lg border border-zinc-700 z-50">
                            {field.description}
                          </div>
                        </div>
                      )}
                    </div>
                    {isOwner && editing && (
                      <p className="text-xs text-zinc-500 mt-0.5">{field.description}</p>
                    )}
                  </div>

                  {/* Valor: campo numérico (admin editando) ou badge (read-only) */}
                  {isOwner && editing ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <input
                        type="number"
                        min="0"
                        step={field.isMultiplier ? '0.5' : '1'}
                        value={editVal}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [field.key]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-14 text-center text-sm font-bold py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-white focus:outline-none focus:border-brand [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-zinc-500">{field.suffix}</span>
                    </div>
                  ) : (
                    <span
                      className={`text-base font-black flex-shrink-0 ${
                        field.isMultiplier ? 'text-yellow-400' : 'text-brand'
                      }`}
                    >
                      {value}{field.suffix}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback de sucesso */}
      {saveSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
          <Check size={14} />
          <span>Regras atualizadas com sucesso!</span>
        </div>
      )}

      {/* Erro */}
      {error && editing && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <X size={14} />
          <span>{error}</span>
        </div>
      )}
      </div>
    </>
  );
}
