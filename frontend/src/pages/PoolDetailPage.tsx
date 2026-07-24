import { getTeamName, getTeamLogo } from '../utils/teamDisplay';

const UPGRADE_WHATSAPP_URL = 'https://wa.me/16892362739?text=' + encodeURIComponent('Olá! Atingi o limite do plano FREE e quero fazer upgrade no Na Gaveta.');
// @ts-nocheck
// ============================================================
// Na Gaveta — Página de Detalhe do Bolão (/pools/:id) v10
// NOVA ESTRUTURA (mobile-first):
//   1. Palpites (lista única, sempre aberta)
//   2. Tabela do bolão (ranking compacto)
//   3. Melhor da rodada + Recorde
//   4. Tabela do campeonato (sempre aberta)
//   5. Regras (colapsado)
// REMOVIDO:
//   - Card verde "Tudo certo"
//   - Separação "Falta palpitar / Já palpitados"
//   - "Você está na liderança" (card separado)
//   - Ranking de rodadas separado
//   - Seção Destaques com métricas extras
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users, ArrowLeft, Copy, Check,
  Lock, UserPlus, BookOpen, X,
  ChevronDown
} from 'lucide-react';
import { getPool, joinPoolById, joinPoolByCode, setFavoriteTeam, leavePool, cancelJoinRequest, deletePool, type Pool } from '../services/pool.service';
import {
  getPoolMatches,
  savePrediction,
  type Round,
  type Match,
  type MyPrediction,
} from '../services/match.service';
import { useAuth } from '../hooks/useAuth';
import { MatchCard, isMatchLocked } from '../components/MatchCard';
import { RulesTab } from '../components/RulesTab';
import { RankingBlock } from '../components/RankingBlock';
import { RoundNavigator } from '../components/RoundNavigator';
import { OpponentPredictionsDrawer } from '../components/OpponentPredictionsDrawer';
import { Spinner, Badge } from '../components/ui';

// ── Fonte única de verdade para o estado de um jogo ─────────────────────────
// Prioridade obrigatória:
//   1. FINISHED  → jogo encerrado (independente de palpite)
//   2. PLACED    → tem palpite salvo (jogo ainda não encerrado)
//   3. OPEN      → sem palpite (inclui LIVE sem palpite, SCHEDULED travado)
type MatchState = 'OPEN' | 'PLACED' | 'FINISHED';

function getMatchState(match: Match): MatchState {
  if (match.status === 'FINISHED') return 'FINISHED';
  if (match.myPrediction) return 'PLACED';
  return 'OPEN';
}

export default function PoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleDeletePool = async () => {
    if (!pool) return;

    const confirmDelete = window.confirm("Tem certeza que deseja deletar este bolão? Essa ação é irreversível.");
    if (!confirmDelete) return;

    try {
      await deletePool(pool.id);
      alert("Bolão deletado com sucesso");
      navigate("/pools");
    } catch (err) {
      console.error(err);
      alert("Erro ao deletar bolão");
    }
  };


  const [pool, setPool] = useState<Pool | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [hasUpdatesAvailable, setHasUpdatesAvailable] = useState(false);

  // Rodada selecionada para palpites
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

  // Regras colapsado
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Drawer de palpites dos adversários
  const [drawerMatchId, setDrawerMatchId] = useState<string | null>(null);
  const [favoriteTeam, setFavoriteTeamState] = useState("");
  const [favoriteTeamDraft, setFavoriteTeamDraft] = useState("");
  const [favoriteTeamOpen, setFavoriteTeamOpen] = useState(false);
  const favoriteTeamRef = useRef<HTMLDivElement | null>(null);

  async function handleSaveFavoriteTeam() {
    if (!favoriteTeamDraft || favoriteTeamDraft === favoriteTeam) return;
    try {
      await setFavoriteTeam(id!, favoriteTeamDraft);
      setFavoriteTeamState(favoriteTeamDraft);
      await loadData();
      setSaveMessage("Time do coração definido!");
    } catch {
      setSaveMessage("Erro ao definir time.");
    }
  }


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        favoriteTeamRef.current &&
        !favoriteTeamRef.current.contains(event.target as Node)
      ) {
        setFavoriteTeamOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // ── STAGING: salvar tudo ─────────────────────────────
  const [pendingPredictions, setPendingPredictions] = useState<Record<string, any>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function handlePredictionStaged(matchId: string, prediction: any) {
    setPendingPredictions(prev => ({
      ...prev,
      [matchId]: prediction
    }));
  }

  async function handleSaveAll() {
    const entries = Object.entries(pendingPredictions);
    const total = entries.length;
    if (entries.length === 0) return;

    for (const [matchId, pred] of entries) {
      await savePrediction({
        
        
          
        
        matchId,
        poolId: pool!.id,
        homeScoreTip: pred.homeScoreTip,
        awayScoreTip: pred.awayScoreTip,
        isJoker: pred.isJoker
      });
    }

    const pendingByMatchId = new Map(entries);
    const hasJoker = allRoundMatches.some(({ match }) => {
      const pending = pendingByMatchId.get(match.id);
      return pending ? Boolean(pending.isJoker) : Boolean(match.myPrediction?.isJoker);
    });

    setPendingPredictions({});
    setSaveMessage(
      hasJoker
        ? `${total} palpite${total > 1 ? 's' : ''} salvo${total > 1 ? 's' : ''} com sucesso`
        : `${total} palpite${total > 1 ? 's' : ''} salvo${total > 1 ? 's' : ''} com sucesso. Atenção: você ainda não escolheu seu Coringa.`
    );
    setTimeout(() => setSaveMessage(null), hasJoker ? 3000 : 6000);
    await loadData();
  }

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [poolData, roundsData] = await Promise.all([
        getPool(id),
        getPoolMatches(id),
      ]);
      setPool(poolData);
      setFavoriteTeamState((poolData as Pool & { myFavoriteTeam?: string | null }).myFavoriteTeam ?? "");
      setRounds(roundsData);

      // Priorizar rodada atual/próxima; não forçar rodada bônus na entrada
      if (roundsData.length > 0) {
        const liveRound = roundsData.find((r) => r.matches.some((m) => m.status === 'LIVE'));
        const openRound = roundsData.find((r) =>
          r.matches.some((m) => !isMatchLocked(m.matchDate, m.status))
        );
        const lastRound = roundsData[roundsData.length - 1];

        setSelectedRoundId((prev) => {
          const prevStillExists = prev && roundsData.some((r) => r.id === prev);
          if (prevStillExists) return prev;
          return (liveRound ?? openRound ?? lastRound).id;
        });
      }
    } catch (err) {
      console.error('[PoolDetailPage] loadData error', err);
      setJoinError('Erro ao carregar o bolão');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  // CORREÇÃO: isAuthenticated removido das dependências.
  // Ter isAuthenticated aqui causava re-disparo do loadData toda vez que o
  // estado de auth mudava (ex: após getProfile retornar), gerando ciclo de
  // loading e tela preta. loadData já é estável via useCallback([id, navigate]).
  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHasUpdatesAvailable(true);
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);



  function getBracketLabel(round: Round, index: number): string | undefined {
    const n = index + 1;
    if (round.number === 4) return `Segunda fase ${n}`;
    if (round.number === 5) return `Oitavas ${n}`;
    if (round.number === 6) return `Quartas ${n}`;
    if (round.number === 7) return `Semifinal ${n}`;
    if (round.number === 8) return 'Terceiro lugar';
    if (round.number === 9) return 'Final';
    return undefined;
  }


  function shareOnWhatsApp() {
    if (!pool) return;

    const url = `https://www.bolaonagaveta.com.br/pools/${pool.id}`;
    const message =
      `⚽ Você foi convidado para participar do bolão "${pool.name}" no Na Gaveta!\n\n` +
      `🏆 Campeonato: ${pool.championship?.name || 'Bolão esportivo'}\n` +
      `🔑 Código de convite: ${pool.code}\n\n` +
      `Entre pelo link abaixo, crie sua conta e solicite entrada no bolão.\n` +
      `Depois é só fazer seus palpites e acompanhar o ranking em tempo real.\n\n` +
      `${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async function handleJoinByCode() {
    if (!inviteCode.trim()) {
      setJoinError('Digite um código de convite.');
      return;
    }

    setJoining(true);
    setJoinError(null);

    try {
      await joinPoolByCode(inviteCode.trim());

      setPool((prev) => prev ? { ...prev, isMember: true } : prev);

      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setJoinError(msg || 'Código inválido.');
    } finally {
      setJoining(false);
    }
  }

  async function handleJoin() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/pools/${id}` } });
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      await joinPoolById(id!);

      // força estado local imediato
      setPool((prev) => prev ? { ...prev, isMember: true } : prev);

      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setJoinError(msg || 'Erro ao entrar no bolão');
    } finally { setJoining(false); }
  }

  async function handleCancelJoinRequest() {
    if (!id) return;

    const ok = window.confirm('Cancelar sua solicitação de entrada neste bolão?');
    if (!ok) return;

    setJoining(true);
    setJoinError(null);

    try {
      await cancelJoinRequest(id);
      setPool((prev) => prev ? { ...prev, membershipStatus: 'REMOVED' } : prev);
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setJoinError(msg || 'Erro ao cancelar solicitação.');
    } finally {
      setJoining(false);
    }
  }

  async function handleLeavePool() {
    if (!pool || !id) return;

    const confirmed = window.confirm('Tem certeza que deseja sair deste bolão? Essa ação só é permitida antes do fechamento do primeiro palpite.');
    if (!confirmed) return;

    try {
      await leavePool(id);
      setPool((prev) => prev ? { ...prev, isMember: false, membershipStatus: 'REMOVED' } : prev);
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Erro ao sair do bolão.');
    }
  }

  async function copyCode() {
    if (!pool) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pool.code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = pool.code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      alert(`Código do convite: ${pool.code}`);
    }
  }

  function handlePredictionSaved(matchId: string, prediction: MyPrediction | null) {
    setRounds((prev) =>
      prev.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          // Se esse match foi removido
          if (match.id === matchId && prediction === null) {
            return { ...match, myPrediction: null };
          }

          // Se esse match é o salvo
          if (match.id === matchId) {
            return { ...match, myPrediction: prediction };
          }

          if (!match.myPrediction) return match;

          // Se o palpite salvo virou coringa, remove coringa dos outros jogos
          if (prediction?.isJoker && match.myPrediction.isJoker) {
            return {
              ...match,
              myPrediction: { ...match.myPrediction, isJoker: false }
            };
          }

          return match;
        }),
      }))
    );

  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!pool) return null;

  const isMember = pool.isMember ?? false;
  const isOwner = user?.id === pool.ownerId;


  // Rodada selecionada
  const fallbackRound =
    rounds.find((r) => r.matches.some((m) => m.status === 'LIVE')) ||
    rounds.find((r) => r.matches.some((m) => !isMatchLocked(m.matchDate, m.status))) ||
    rounds[rounds.length - 1];

  const currentRound = rounds.find((r) => r.id === selectedRoundId) ?? fallbackRound;

  // Todos os jogos da rodada ordenados por hora
  const allRoundMatches: { match: Match; round: Round }[] = currentRound
    ? [...currentRound.matches]
        .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
        .map((m) => ({ match: m, round: currentRound }))
    : [];

  const favoriteTeamOptions = allRoundMatches
    .flatMap(m => [m.match.homeTeam, m.match.awayTeam])
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => getTeamName(a).localeCompare(getTeamName(b)));

  const getFavoriteTeamLogo = (team?: string | null): string | null => {
    if (!team) return null;

    const apiMatch = allRoundMatches.find(({ match }) =>
      match.homeTeam === team || match.awayTeam === team
    );

    if (apiMatch?.match.homeTeam === team && apiMatch.match.homeTeamCrest) {
      return apiMatch.match.homeTeamCrest;
    }

    if (apiMatch?.match.awayTeam === team && apiMatch.match.awayTeamCrest) {
      return apiMatch.match.awayTeamCrest;
    }

    return getTeamLogo(team);
  };

  // ── Classificação centralizada usando getMatchState ───────────────────────
  // Regra obrigatória (fonte única de verdade):
  //   1. FINISHED  → finishedMatches
  //   2. PLACED    → doneMatches (tem palpite, não encerrado)
  //   3. OPEN      → openMatches (sem palpite: SCHEDULED aberto, SCHEDULED travado, LIVE)
  // Nenhum jogo pode ficar sem seção.
  const liveMatches = allRoundMatches.filter(({ match }) => match.status === 'LIVE');
  const openMatches = allRoundMatches.filter(({ match }) => getMatchState(match) === 'OPEN' && match.status !== 'LIVE');
  const doneMatches = allRoundMatches.filter(({ match }) => getMatchState(match) === 'PLACED' && match.status !== 'LIVE');
  const finishedMatches = allRoundMatches.filter(({ match }) => getMatchState(match) === 'FINISHED');
  const lockedJokerMatchId = allRoundMatches.find(({ match }) =>
    Boolean(match.myPrediction?.isJoker) &&
    (
      match.status !== 'SCHEDULED' ||
      new Date(match.matchDate).getTime() <= Date.now()
    )
  )?.match.id;


  const totalOpenCount = openMatches.length;
  const totalPlacedCount = doneMatches.length;


  // ── Coluna da esquerda: palpites ─────────────────────────────
  const leftColumn = (
    <div className="max-w-4xl mx-auto">
      {/* ── ENTRAR NO BOLÃO (não-membro) ──────────────────────── */}
      {!isMember && (
        <div className="mb-5">
          {pool.membershipStatus === "PENDING" ? (
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 shadow-lg shadow-yellow-500/10">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-300">
                  <Lock size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-yellow-200">Solicitação enviada</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                    Aguarde a aprovação do administrador do bolão para liberar seus palpites, ranking e time do coração.
                  </p>

                  <button
                    type="button"
                    onClick={handleCancelJoinRequest}
                    disabled={joining}
                    className="mt-3 rounded-lg border border-yellow-500/30 px-3 py-2 text-xs font-black text-yellow-200 hover:bg-yellow-500/10 transition disabled:opacity-50"
                  >
                    {joining ? 'Cancelando...' : 'Cancelar solicitação'}
                  </button>
                </div>
              </div>
            </div>
          ) : pool.isPublic ? (
            <>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full flex items-center justify-center gap-2 py-4 bg-brand hover:bg-brand-light text-white font-black text-lg rounded-2xl transition-colors disabled:opacity-50 shadow-lg shadow-brand/20"
              >
                {joining ? <Spinner size="sm" /> : <UserPlus size={24} />}
                {joining ? 'Enviando solicitação...' : 'Solicitar entrada no bolão'}
              </button>
              {joinError && (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center">
                  <p className="text-xs text-red-300">{joinError}</p>
                  {(joinError.includes('FREE') || joinError.toLowerCase().includes('upgrade')) && (
                    <button
                      type="button"
                      onClick={() => window.open(UPGRADE_WHATSAPP_URL, '_blank')}
                      className="mt-3 rounded-lg bg-brand px-4 py-2 text-xs font-black text-white hover:bg-brand-light transition"
                    >
                      Falar no WhatsApp
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-300 mb-3">
                <Lock size={14} />
                <span className="font-semibold">Bolão privado</span>
              </div>

              <p className="text-xs text-zinc-500 mb-4">
                Digite o código de convite enviado pelo administrador do bolão.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Código do convite"
                  className="flex-1 rounded-xl border border-zinc-700 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-brand"
                />

                <button
                  onClick={handleJoinByCode}
                  disabled={joining}
                  className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-light transition disabled:opacity-50"
                >
                  {joining ? 'Entrando...' : 'Entrar'}
                </button>
              </div>

              {joinError && (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <p className="text-xs text-red-300">{joinError}</p>
                  {(joinError.includes('FREE') || joinError.toLowerCase().includes('upgrade')) && (
                    <button
                      type="button"
                      onClick={() => window.open(UPGRADE_WHATSAPP_URL, '_blank')}
                      className="mt-3 rounded-lg bg-brand px-4 py-2 text-xs font-black text-white hover:bg-brand-light transition"
                    >
                      Falar no WhatsApp
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 1. PALPITES ───────────────────────────────────────── */}
      {isMember && (
        <div className="mb-5">
          {hasUpdatesAvailable && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-zinc-200">
              <span>Novos dados disponíveis</span>
              <button
                onClick={async () => {
                  await loadData();
                  setHasUpdatesAvailable(false);
                }}
                className="rounded-lg bg-brand px-3 py-1 font-bold text-white hover:bg-brand-light transition"
              >
                Atualizar
              </button>
            </div>
          )}

          {/* Navegador de rodadas */}
          {rounds.length > 0 && (
            <RoundNavigator
              poolId={id!}
              currentUserId={user?.id}
              rounds={rounds}
              bonusRoundId={pool?.bonusRoundId}
              selectedRoundId={selectedRoundId}
              onSelectRound={setSelectedRoundId}
              isAuthenticated={isAuthenticated}
              isMember={isMember}
            />
          )}
          {/* Header de progresso */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand inline-block" />
              <span className="text-sm font-black text-white">Palpites</span>
              {(totalOpenCount > 0 || totalPlacedCount > 0) && (
                <span className="text-xs text-zinc-500 font-normal">
                  {totalPlacedCount}/{totalOpenCount + totalPlacedCount} feitos
                </span>
              )}
            </div>
            <button
              onClick={() => setShowRulesModal(true)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <BookOpen size={11} /> Regras
            </button>
          </div>

          {(pool as any)?.scoreRule?.jokerMultiplier > 1 && (
            <div className="mb-3 rounded-xl border border-brand/25 bg-brand/10 px-3 py-2 text-xs leading-relaxed text-zinc-200">
              <span className="font-black text-brand">Coringa:</span>{' '}
              escolha 1 jogo por rodada para multiplicar sua pontuação. Use com estratégia antes de salvar seus palpites.
            </div>
          )}

          {/* Container com key por rodada: garante re-render completo ao trocar de rodada */}
          <div key={`round-sections-${currentRound?.id ?? 'none'}`}>

            {/* SEÇÃO LIVE: Jogos ao vivo sempre primeiro */}
            {liveMatches.length > 0 && (
              <PredictionSection
                key={`live-${currentRound?.id}`}
                title="AO VIVO AGORA"
                defaultOpen={true}
                badge={
                  <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    Ao vivo
                  </span>
                }
              >
                <div className="space-y-2">
                  {liveMatches.map(({ match, round }) => (
                    <MatchCard
                      jokerEnabled={(pool as any)?.scoreRule?.jokerMultiplier > 1}
                      jokerLockedByAnotherMatch={Boolean(lockedJokerMatchId && lockedJokerMatchId !== match.id)}
                      key={match.id}
                      match={match}
                      round={round}
                      poolId={id!}
                      isAuthenticated={isAuthenticated}
                      isMember={isMember}
                      onPredictionSaved={handlePredictionSaved}
                      onPredictionChange={handlePredictionStaged}
                      onViewOpponentPredictions={setDrawerMatchId}
                    />
                  ))}
                </div>
              </PredictionSection>
            )}

            {/* SEÇÃO 1: Palpites em aberto */}
            {openMatches.length > 0 && (
              <PredictionSection
                key={`open-${currentRound?.id}`}
                title="Palpites em aberto"
                defaultOpen={true}
                badge={null}
              >
                <div className="flex justify-end mb-2">
                  <button
                    onClick={handleSaveAll}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-600 hover:bg-green-500 text-white transition"
                  >
                    Salvar tudo
                  </button>
                </div>
                <div className="space-y-2">
                  {openMatches.map(({ match, round }, idx) => (
                    <MatchCard
                      jokerEnabled={(pool as any)?.scoreRule?.jokerMultiplier > 1}
                      jokerLockedByAnotherMatch={Boolean(lockedJokerMatchId && lockedJokerMatchId !== match.id)}
                      key={match.id}
                      match={match}
                      round={round}
                      poolId={id!}
                      isAuthenticated={isAuthenticated}
                      isMember={isMember}
                      autoFocusFirst={idx === 0}
                      bracketLabel={getBracketLabel(round, idx)}
                      onPredictionSaved={handlePredictionSaved}
                      onPredictionChange={handlePredictionStaged}
                      onSingleSaveSuccess={(savedMatchId, savedPrediction) => {
                        const hasJokerInRound = allRoundMatches.some(({ match }) => {
                          if (match.id === savedMatchId) return Boolean(savedPrediction?.isJoker);
                          return Boolean(match.myPrediction?.isJoker);
                        });

                        setSaveMessage(
                          hasJokerInRound
                            ? 'Palpite salvo com sucesso'
                            : 'Palpite salvo com sucesso. Atenção: você ainda não escolheu seu Coringa.'
                        );
                        setTimeout(() => setSaveMessage(null), hasJokerInRound ? 3000 : 6000);
                      }}
                    />
                  ))}
                </div>
              </PredictionSection>
            )}

            {/* SEÇÃO 2: Palpites realizados (com palpite, não encerrados) */}
            {doneMatches.length > 0 && (
              <PredictionSection
                key={`placed-${currentRound?.id}`}
                title="PALPITES REALIZADOS"
                defaultOpen={true}
                badge={
                  doneMatches.some(({ match }) => match.status === 'LIVE')
                    ? <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                        Ao vivo
                      </span>
                    : null
                }
              >
                <div className="space-y-2">
                  {doneMatches.map(({ match, round }) => (
                    <MatchCard
                      jokerEnabled={(pool as any)?.scoreRule?.jokerMultiplier > 1}
                      jokerLockedByAnotherMatch={Boolean(lockedJokerMatchId && lockedJokerMatchId !== match.id)}
                      key={match.id}
                      match={match}
                      round={round}
                      poolId={id!}
                      isAuthenticated={isAuthenticated}
                      isMember={isMember}
                      onPredictionSaved={handlePredictionSaved}
                      onViewOpponentPredictions={setDrawerMatchId}
                    />
                  ))}
                </div>
              </PredictionSection>
            )}

            {/* SEÇÃO 3: Jogos encerrados */}
            {finishedMatches.length > 0 && (
              <PredictionSection
                key={`finished-${currentRound?.id}`}
                title="JOGOS ENCERRADOS"
                defaultOpen={true}
                badge={
                  <span className="text-xs text-zinc-600">{finishedMatches.length} jogo{finishedMatches.length !== 1 ? 's' : ''}</span>
                }
              >
                <div className="space-y-2">
                  {finishedMatches.map(({ match, round }) => (
                    <MatchCard
                      jokerEnabled={(pool as any)?.scoreRule?.jokerMultiplier > 1}
                      jokerLockedByAnotherMatch={Boolean(lockedJokerMatchId && lockedJokerMatchId !== match.id)}
                      key={match.id}
                      match={match}
                      round={round}
                      poolId={id!}
                      isAuthenticated={isAuthenticated}
                      isMember={isMember}
                      onPredictionSaved={handlePredictionSaved}
                      onViewOpponentPredictions={setDrawerMatchId}
                    />
                  ))}
                </div>
              </PredictionSection>
            )}

          </div>

          {/* Sem jogos na rodada */}
          {allRoundMatches.length === 0 && (
            <div className="rounded-2xl p-4 bg-zinc-900 border border-zinc-800 text-center">
              <p className="text-zinc-400 text-sm">Nenhum jogo nesta rodada</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Coluna da direita: ranking + destaques + campeonato + regras

const rightColumn = (
    <div className="space-y-3">

      {/* ── 2. TABELA DO BOLÃO ──────────────────────────────── */}
      {isMember && (
        <div id="pool-ranking">
          <RankingBlock
          ownerId={pool.ownerId}
          poolId={id!}
          currentUserId={user?.id}
          rounds={rounds}
          isAuthenticated={isAuthenticated}
          isMember={isMember}
        />
        </div>
      )}

      {/* Blocos extras movidos para páginas próprias: Campeonato e Informações */}
    </div>
  );

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {saveMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg z-50">
          {saveMessage}
        </div>
      )}

      {/* ── Voltar ──────────────────────────────────────────── */}
      <Link
        to="/pools"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        Todos os bolões
      </Link>

      {/* ── CABEÇALHO DO BOLÃO ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex-1 min-w-0 w-full">
          {pool.championship && (
            <p className="text-xs text-zinc-500 uppercase tracking-wider truncate">
              {pool.championship.name} · {pool.championship.season}
            </p>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight truncate">{pool.name}</h1>

            {favoriteTeam && getFavoriteTeamLogo(favoriteTeam) && (
              <img
                src={getFavoriteTeamLogo(favoriteTeam)!}
                alt={favoriteTeam}
                className="w-6 h-6 object-contain shrink-0"
              />
            )}
            {isMember && (
              <div className="flex items-center gap-2 ml-2 relative shrink-0">

                <div ref={favoriteTeamRef} className="relative">
                  <button
                    type="button"
                    disabled={!pool?.canEditFavoriteTeam}
                    onClick={() => setFavoriteTeamOpen(v => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700/80 transition text-sm text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                  {(favoriteTeamDraft || favoriteTeam) && getFavoriteTeamLogo(favoriteTeamDraft || favoriteTeam) && (
                    <img
                      src={getFavoriteTeamLogo(favoriteTeamDraft || favoriteTeam)!}
                      alt={getTeamName(favoriteTeamDraft || favoriteTeam)}
                      className="w-4 h-4 object-contain shrink-0"
                    />
                  )}

                    <span className="whitespace-nowrap">
                      {(favoriteTeamDraft || favoriteTeam)
                        ? getTeamName(favoriteTeamDraft || favoriteTeam)
                        : 'Escolher time'}
                    </span>

                    {pool?.canEditFavoriteTeam && (
                      <ChevronDown size={12} className="text-zinc-500 shrink-0" />
                    )}
                  </button>

                  {favoriteTeamOpen && pool?.canEditFavoriteTeam && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-72 overflow-auto">
                      {favoriteTeamOptions.map(team => (
                        <button
                          type="button"
                          key={team}
                          onClick={() => {
                            setFavoriteTeamDraft(team);
                            setFavoriteTeamOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/80 text-left text-xs text-white"
                        >
                          {getFavoriteTeamLogo(team) && (
                            <img
                              src={getFavoriteTeamLogo(team)!}
                              alt={getTeamName(team)}
                              className="w-4 h-4 object-contain shrink-0"
                            />
                          )}

                          <span>{getTeamName(team)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                </div>

                {favoriteTeamDraft && favoriteTeamDraft !== favoriteTeam && (
                  <button
                    type="button"
                    onClick={handleSaveFavoriteTeam}
                    className="px-2 py-1 rounded-md bg-orange-500 hover:bg-orange-400 text-white text-[10px] font-bold whitespace-nowrap"
                  >
                    Salvar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Users size={10} />
              {pool._count?.members ?? 0}
            </span>
            {pool.isPublic ? (
              <Badge variant="default">Público</Badge>
            ) : (
              <Badge variant="warning"><Lock size={9} className="mr-1" />Privado</Badge>
            )}
            {isOwner && <Badge variant="brand">Admin do bolão</Badge>}
            {isMember && !isOwner && <Badge variant="success">Participando</Badge>}
            {isMember && !isOwner && (
              <button
                onClick={handleLeavePool}
                className="ml-1 text-[10px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition"
              >
                Sair do bolão
              </button>
            )}
            {!isMember && pool.membershipStatus === "PENDING" && <Badge variant="warning">Aguardando aprovação</Badge>}
          </div>
        </div>
        {(user as any)?.role === 'ADMIN' && (
          <div className="w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDeletePool}
              className="w-full sm:w-auto flex items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/25 transition"
            >
              Deletar bolão
            </button>
          </div>
        )}

        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <button
            onClick={copyCode}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 transition-colors"
            title="Copiar código de convite"
          >
            <span className="font-mono font-black text-sm sm:text-base text-white tracking-widest">{pool.code}</span>
            <span className="text-xs text-zinc-300 flex items-center gap-1">
              {codeCopied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
              {codeCopied ? 'Copiado!' : 'Copiar'}
            </span>
          </button>

          <button
            onClick={shareOnWhatsApp}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-green-600/90 hover:bg-green-500 text-white transition-colors font-bold text-xs sm:text-sm"
            title="Convidar pelo WhatsApp"
          >
            <UserPlus size={14} />
            WhatsApp
          </button>
        </div>
      </div>


      {/* ── NAV DO BOLÃO ───────────────────────── */}
      <div className="mb-4 overflow-x-auto border-y border-zinc-800/70 bg-black/40 py-2">
        <div className="flex min-w-max items-center gap-2 px-1">
          <button type="button" onClick={() => navigate(`/pools/${id}`)} className="shrink-0 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-xs font-black text-brand">
            Palpites
          </button>
          <button type="button" onClick={() => navigate(`/pools/${id}/ranking`)} className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900/90 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800 transition">
            Tabela do Bolão
          </button>
          <button type="button" onClick={() => navigate(`/pools/${id}/championship`)} className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900/90 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800 transition">
            Tabela do Campeonato
          </button>
          <button type="button" onClick={() => navigate(`/pools/${id}/standing-prediction`)} className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900/90 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800 transition">
            Previsão da Classificação
          </button>

          <div className="h-6 w-px shrink-0 bg-zinc-800" />

          <button type="button" onClick={() => navigate(`/pools/${id}/info`)} className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs font-black text-zinc-300 hover:bg-zinc-800 hover:text-white transition">
            Premiação & Regras
          </button>
          {isOwner && (
            <button type="button" onClick={() => navigate(`/pools/${id}/admin`)} className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs font-black text-zinc-300 hover:bg-zinc-800 hover:text-white transition">
              Admin
            </button>
          )}
        </div>
      </div>

      {/* ── LAYOUT RESPONSIVO ───────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[minmax(760px,1fr)_500px] lg:gap-6 xl:grid-cols-[minmax(820px,1fr)_520px]">
        <div>{leftColumn}</div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          {rightColumn}
        </div>
      </div>

      {/* ── DRAWER DE PALPITES DOS ADVERSÁRIOS ──────────────────────── */}
      {drawerMatchId && (() => {
        const allMatches = rounds.flatMap((r) => r.matches);
        const m = allMatches.find((x) => x.id === drawerMatchId);
        const drawerRound = rounds.find((r) => r.matches.some((match) => match.id === drawerMatchId));
        return (
          <OpponentPredictionsDrawer
            matchId={drawerMatchId}
            poolId={id!}
            currentUserId={user?.id}
            homeScore={m?.homeScore ?? null}
            awayScore={m?.awayScore ?? null}
            finalHomeScore={(m as any)?.finalHomeScore ?? null}
            finalAwayScore={(m as any)?.finalAwayScore ?? null}
            decisionType={(m as any)?.decisionType ?? null}
            scoreRule={(pool as any)?.scoreRule ?? null}
            isBonusRound={Boolean(drawerRound && pool?.bonusRoundId === drawerRound.id)}
            onClose={() => setDrawerMatchId(null)}
          />
        );
      })()}

      <div className="h-8" />

      {/* ── MODAL DE REGRAS RÁPIDO ──────────────────────────── */}
      {showRulesModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRulesModal(false); }}
        >
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <BookOpen size={16} className="text-brand" /> Regras do bolão
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              <RulesTab
                poolId={id!}
                isOwner={false}
                roundOptions={rounds.map((r) => ({ id: r.id, number: r.number, startDate: r.startDate }))}
                onRulesSaved={loadData}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Seção de palpites genérica (colapsável) ──────────────────────────────
interface PredictionSectionProps {
  title: string;
  defaultOpen: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function PredictionSection({ title, defaultOpen, badge, children }: PredictionSectionProps) {
  // Usar defaultOpen como valor inicial; o key externo por rodada garante reset
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between mb-2 group px-3 py-2 rounded-xl border transition-all ${
          open
            ? 'bg-zinc-900/80 border-zinc-700/70'
            : 'bg-brand/10 border-brand/30 shadow-sm shadow-brand/10'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide truncate">{title}</span>
          {badge}
        </div>
        <span className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors">
          {open ? 'Ocultar' : 'Mostrar'}
          <span className="text-[10px]">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ── Seção colapsável genérica ──────────────────────────────────
