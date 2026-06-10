// ============================================================
// Na Gaveta — AdminPanel
// Painel de testes para registrar resultados de partidas
// e disparar o motor de pontuação manualmente.
// Visível apenas para o dono do bolão.
// ============================================================

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Users, CheckCircle2, XCircle, ClipboardList } from 'lucide-react';
import api from "../services/api";

interface AdminPanelProps {
poolId: string;
onResultSet: () => void;
}

interface PoolMemberAdmin {
id: string;
joinedAt: string;
user: {
id: string;
name: string;
email: string;
avatarUrl?: string;
};
favoriteTeam?: string | null;
predictionCount?: number;
}

interface PendingPredictionUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface AdminPredictionMatchStatus {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  status: string;
  doneCount: number;
  totalMembers: number;
  pendingUsers: PendingPredictionUser[];
}

interface AdminPredictionRoundStatus {
  id: string;
  number: number;
  name?: string | null;
  matches: AdminPredictionMatchStatus[];
}

export function AdminPanel({ poolId, onResultSet }: AdminPanelProps) {
  const [playersExpanded, setPlayersExpanded] = useState(false);
  const [predictionsExpanded, setPredictionsExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<PoolMemberAdmin[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<PoolMemberAdmin[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [prizeDraft, setPrizeDraft] = useState("");
  const [rulesDraft, setRulesDraft] = useState("");
  const [paymentDraft, setPaymentDraft] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [memberError, setMemberError] = useState("");
  const [predictionRounds, setPredictionRounds] = useState<AdminPredictionRoundStatus[]>([]);
  const [expandedPendingMatchIds, setExpandedPendingMatchIds] = useState<Record<string, boolean>>({});


  async function loadMembersAdmin() {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        api.get(`/pools/${poolId}/members/pending`),
        api.get(`/pools/${poolId}/members/approved`),
      ]);

      setPendingMembers(pendingRes.data.members ?? []);
      setApprovedMembers(approvedRes.data.members ?? []);

      const [poolRes, predictionStatusRes] = await Promise.all([
        api.get(`/pools/${poolId}`),
        api.get(`/pools/${poolId}/admin/prediction-status`),
      ]);
      setIsPublic(!!poolRes.data.pool?.isPublic);
      setPrizeDraft(poolRes.data.pool?.prizeDescription ?? "");
      setRulesDraft(poolRes.data.pool?.rulesDescription ?? "");
      setPaymentDraft(poolRes.data.pool?.paymentDescription ?? "");
      setPredictionRounds(predictionStatusRes.data.rounds ?? []);
    } catch {
      setPendingMembers([]);
      setApprovedMembers([]);
      setPredictionRounds([]);
    }
  }

  useEffect(() => {
    loadMembersAdmin();
  }, [poolId]);

  async function handleModerateMember(memberId: string, action: "approve" | "reject") {
    try {
      setMemberError("");

      await api.patch(`/pools/${poolId}/members/${memberId}/${action}`);

      await loadMembersAdmin();
      onResultSet();
    } catch (err: any) {
      setMemberError(
        err?.response?.data?.error ||
        "Erro ao moderar participante."
      );
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remover este participante do bolão? Os palpites dele serão apagados deste bolão.")) return;

    await api.delete(`/pools/${poolId}/members/${memberId}`);
    await loadMembersAdmin();
    onResultSet();
  }

  async function handleSavePoolInfo() {
    try {
      setInfoSaving(true);
      setInfoMessage("");

      await api.patch(`/pools/${poolId}/prize`, {
        prizeDescription: prizeDraft,
      });

      await api.patch(`/pools/${poolId}/rules`, {
        rulesDescription: rulesDraft,
      });

      await api.patch(`/pools/${poolId}/payment`, {
        paymentDescription: paymentDraft,
      });

      setInfoMessage("Informações do bolão salvas com sucesso.");
      await loadMembersAdmin();
      onResultSet();
    } catch (err: any) {
      setInfoMessage(
        err?.response?.data?.error ||
        "Erro ao salvar pagamento, premiação e regras."
      );
    } finally {
      setInfoSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {memberError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          {memberError}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setPlayersExpanded(!playersExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users size={15} className="text-brand" />
            <span className="text-sm font-black text-white">
              Gestão dos jogadores
            </span>
            {pendingMembers.length > 0 && (
              <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] font-black text-yellow-300">
                {pendingMembers.length} pendente{pendingMembers.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {playersExpanded ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
        </button>

        {playersExpanded && (
          <div className="border-t border-zinc-800">
            {pendingMembers.length > 0 && (
              <div className="border-b border-zinc-800 bg-yellow-500/5 px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-300">
                    Solicitações pendentes ({pendingMembers.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{member.user.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{member.user.email}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleModerateMember(member.id, "approve")} className="flex items-center gap-1 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 px-2 py-1 text-xs font-bold text-green-300 transition-colors">
                          <CheckCircle2 size={12} /> Aprovar
                        </button>
                        <button onClick={() => handleModerateMember(member.id, "reject")} className="flex items-center gap-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 px-2 py-1 text-xs font-bold text-red-300 transition-colors">
                          <XCircle size={12} /> Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approvedMembers.some((member) => !member.favoriteTeam) && (
              <div className="border-b border-zinc-800 bg-amber-500/5 px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-amber-400" />
                  <span className="text-sm font-bold text-amber-300">
                    Sem time do coração ({approvedMembers.filter((member) => !member.favoriteTeam).length})
                  </span>
                </div>

                <div className="space-y-2">
                  {approvedMembers.filter((member) => !member.favoriteTeam).map((member) => (
                    <div key={member.id} className="rounded-xl border border-amber-500/20 bg-zinc-900/70 px-3 py-2">
                      <p className="text-sm font-semibold text-white truncate">{member.user.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{member.user.email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-zinc-300">
                  Jogadores / participantes ({approvedMembers.length})
                </span>
                <span className="text-[11px] font-bold text-zinc-500">
                  Gestão dos jogadores
                </span>
              </div>

              <div className="space-y-2">
                {approvedMembers.map((member) => {
                  const noPredictions = (member.predictionCount ?? 0) === 0;

                  return (
                    <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{member.user.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{member.user.email}</p>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {member.favoriteTeam ? (
                            <span className="rounded-full bg-green-500/10 px-2 py-1 text-[11px] font-bold text-green-300">
                              Time: {member.favoriteTeam}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-300">
                              Sem time do coração
                            </span>
                          )}

                          <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${noPredictions ? 'bg-red-500/10 text-red-300' : 'bg-zinc-800 text-zinc-300'}`}>
                            {member.predictionCount ?? 0} palpite{(member.predictionCount ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <button onClick={() => handleRemoveMember(member.id)} className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-bold text-red-300 hover:bg-red-500/20 transition-colors">
                        Remover
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setPredictionsExpanded(!predictionsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={15} className="text-brand" />
            <span className="text-sm font-black text-white">
              Gestão dos palpites
            </span>
          </div>
          {predictionsExpanded ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
        </button>

        {predictionsExpanded && (
          <div className="border-t border-zinc-800 px-4 py-4">
            {predictionRounds.length > 0 ? (
              <div className="space-y-4">
                {predictionRounds.map((round) => {
                  const pendingMatches = round.matches
                    .filter((match) => match.pendingUsers.length > 0)
                    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
                  const completeMatches = round.matches.length - pendingMatches.length;
                  const uniquePendingUsers = new Set(
                    pendingMatches.flatMap((match) => match.pendingUsers.map((user) => user.userId))
                  );
                  const reminderText =
                    `Pessoal, lembrete rápido do bolão Na Gaveta: ainda existem palpites pendentes na Rodada ${round.number}. ` +
                    `Entrem no bolão e salvem seus palpites antes do fechamento dos jogos.`;

                  return (
                    <div key={round.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-zinc-400">
                            Rodada {round.number}{round.name ? ` — ${round.name}` : ''}
                          </p>
                          <p className="mt-1 text-[11px] font-black text-amber-300">
                            {uniquePendingUsers.size > 0
                              ? `Atenção: ${uniquePendingUsers.size} participante${uniquePendingUsers.size !== 1 ? 's' : ''} com pendência`
                              : 'Todos os participantes concluíram a rodada'}
                          </p>
                          <p className="mt-0.5 text-[11px] font-bold text-zinc-500">
                            {round.matches.length} jogos · {completeMatches} completos · {pendingMatches.length} com pendência
                          </p>
                        </div>

                        {pendingMatches.length > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(reminderText);
                                alert('Lembrete copiado.');
                              } catch {
                                alert(reminderText);
                              }
                            }}
                            className="w-full rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-xs font-black text-brand hover:bg-brand/20 transition sm:w-auto"
                          >
                            Copiar lembrete WhatsApp
                          </button>
                        )}
                      </div>

                      {pendingMatches.length === 0 ? (
                        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-3 text-sm font-bold text-green-300">
                          Todos os participantes concluíram os palpites desta rodada.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {pendingMatches.map((match) => (
                            <div key={match.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-white">{match.homeTeam} x {match.awayTeam}</p>
                                  <p className="mt-1 text-[11px] text-zinc-500">
                                    {new Date(match.matchDate).toLocaleString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>

                                <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-black text-amber-300">
                                  {match.pendingUsers.length} pendente{match.pendingUsers.length !== 1 ? 's' : ''}
                                </span>
                              </div>

                              <div className="mt-2 border-t border-zinc-800 pt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedPendingMatchIds((prev) => ({
                                      ...prev,
                                      [match.id]: !prev[match.id],
                                    }))
                                  }
                                  className="text-xs font-bold text-amber-300 hover:text-amber-200 transition"
                                >
                                  {expandedPendingMatchIds[match.id] ? 'Ocultar nomes' : 'Ver nomes'}
                                </button>

                                {expandedPendingMatchIds[match.id] && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {match.pendingUsers.map((user) => (
                                      <span key={user.userId} className="rounded-full bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-zinc-300">
                                        {user.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">
                Nenhuma rodada aberta encontrada para acompanhamento.
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setSettingsExpanded(!settingsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
        >
          <span className="text-sm font-black text-white">Configurações do bolão</span>
          {settingsExpanded ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
        </button>

        {settingsExpanded && (
          <div className="border-t border-zinc-800 px-4 py-4">
            <div className="mb-5 rounded-2xl border border-zinc-800 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-zinc-400">
                Informações do bolão
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Configure a premiação, os dados para pagamento e o regulamento do bolão.
              </p>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-bold text-zinc-300">Premiação oficial</span>
                  <textarea
                    value={prizeDraft}
                    onChange={(e) => setPrizeDraft(e.target.value)}
                    rows={8}
                    maxLength={3000}
                    placeholder={"Exemplo:\n1º lugar: 50% do valor arrecadado\n2º lugar: 20% do valor arrecadado\n3º lugar: 10% do valor arrecadado\nMaior pontuação em uma rodada: 10%\nMais vezes melhor da rodada: 10%"}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none transition focus:border-brand/60"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-zinc-300">Dados para pagamento</span>
                  <textarea
                    value={paymentDraft}
                    onChange={(e) => setPaymentDraft(e.target.value)}
                    rows={6}
                    maxLength={3000}
                    placeholder={"Exemplo:\nValor da inscrição: R$ 50,00\nChave PIX: sua-chave-pix\nTitular: Nome completo\nBanco: Nome do banco\nApós pagar, envie o comprovante para o administrador."}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none transition focus:border-brand/60"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-zinc-300">Regulamento e desempates</span>
                  <textarea
                    value={rulesDraft}
                    onChange={(e) => setRulesDraft(e.target.value)}
                    rows={6}
                    maxLength={3000}
                    placeholder={"Exemplo:\n- Palpites fecham no horário do jogo.\n- Critérios de desempate seguem a tabela do bolão.\n- Comprovante deve ser enviado no grupo."}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none transition focus:border-brand/60"
                  />
                </label>

                {infoMessage && (
                  <p className="text-xs font-bold text-zinc-300">{infoMessage}</p>
                )}

                <button
                  type="button"
                  onClick={handleSavePoolInfo}
                  disabled={infoSaving}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-black text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {infoSaving ? "Salvando..." : "Salvar informações"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-white">
                  Visibilidade do bolão
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Público permite solicitações abertas. Privado exige código ou convite.
                </p>
              </div>

              <button
                onClick={async () => {
                  const next = !isPublic;

                  if (!window.confirm(
                    `Tem certeza que deseja tornar este bolão ${next ? 'público' : 'privado'}?`
                  )) return;

                  await api.patch(`/pools/${poolId}/visibility`, {
                    isPublic: next,
                  });

                  setIsPublic(next);
                  onResultSet();
                }}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  isPublic
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                    : 'bg-green-500/15 text-green-300 border border-green-500/30 hover:bg-green-500/25'
                }`}
              >
                {isPublic ? 'Tornar privado' : 'Tornar público'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>

  );
}
