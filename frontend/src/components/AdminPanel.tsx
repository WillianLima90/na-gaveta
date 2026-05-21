// ============================================================
// Na Gaveta — AdminPanel
// Painel de testes para registrar resultados de partidas
// e disparar o motor de pontuação manualmente.
// Visível apenas para o dono do bolão.
// ============================================================

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Users, CheckCircle2, XCircle } from 'lucide-react';
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
}

export function AdminPanel({ poolId, onResultSet }: AdminPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<PoolMemberAdmin[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<PoolMemberAdmin[]>([]);


  async function loadMembersAdmin() {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        api.get(`/pools/${poolId}/members/pending`),
        api.get(`/pools/${poolId}/members/approved`),
      ]);

      setPendingMembers(pendingRes.data.members ?? []);
      setApprovedMembers(approvedRes.data.members ?? []);
    } catch {
      setPendingMembers([]);
      setApprovedMembers([]);
    }
  }

  useEffect(() => {
    if (expanded) loadMembersAdmin();
  }, [expanded, poolId]);

  async function handleModerateMember(memberId: string, action: "approve" | "reject") {
    await api.patch(`/pools/${poolId}/members/${memberId}/${action}`);
    await loadMembersAdmin();
    onResultSet();
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remover este participante do bolão? Os palpites dele serão apagados deste bolão.")) return;

    await api.delete(`/pools/${poolId}/members/${memberId}`);
    await loadMembersAdmin();
    onResultSet();
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users size={13} className={pendingMembers.length > 0 ? "text-yellow-400" : "text-zinc-500"} />
          <span className={pendingMembers.length > 0 ? "text-xs font-black text-yellow-300 animate-pulse" : "text-xs font-medium text-zinc-500"}>
            {pendingMembers.length > 0
              ? `Admin — ${pendingMembers.length} solicitação${pendingMembers.length !== 1 ? "ões" : ""} pendente${pendingMembers.length !== 1 ? "s" : ""}`
              : "Administração do bolão"}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={13} className="text-zinc-600" />
        ) : (

          <ChevronDown size={13} className="text-zinc-600" />
        )}
      </button>

      {expanded && (
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
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {member.user.name}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {member.user.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleModerateMember(member.id, "approve")}
                        className="flex items-center gap-1 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 px-2 py-1 text-xs font-bold text-green-300 transition-colors"
                      >
                        <CheckCircle2 size={12} /> Aprovar
                      </button>

                      <button
                        onClick={() => handleModerateMember(member.id, "reject")}
                        className="flex items-center gap-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 px-2 py-1 text-xs font-bold text-red-300 transition-colors"
                      >
                        <XCircle size={12} /> Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approvedMembers.length > 0 && (
            <div className="border-b border-zinc-800 bg-zinc-950/40 px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-zinc-400" />
                <span className="text-sm font-bold text-zinc-300">
                  Participantes aprovados ({approvedMembers.length})
                </span>
              </div>

              <div className="space-y-2">
                {approvedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {member.user.name}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {member.user.email}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-bold text-red-300 hover:bg-red-500/20 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
