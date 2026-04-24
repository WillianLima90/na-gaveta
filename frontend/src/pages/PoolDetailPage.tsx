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

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users, ArrowLeft, Copy, Check,
  Lock, UserPlus, BookOpen, X, Trophy,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { getPool, joinPoolById, type Pool } from '../services/pool.service';
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
import { AdminPanel } from '../components/AdminPanel';
import { RankingBlock } from '../components/RankingBlock';
import { ChampionshipTable } from '../components/ChampionshipTable';
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

  const [pool, setPool] = useState<Pool | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Rodada selecionada para palpites
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

  // Regras colapsado
  const [showRegras, setShowRegras] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Drawer de palpites dos adversários
  const [drawerMatchId, setDrawerMatchId] = useState<string | null>(null);

  // ── STAGING: salvar tudo ─────────────────────────────
  const [pendingPredictions, setPendingPredictions] = useState<Record<string, any>>({});

  function handlePredictionStaged(matchId: string, prediction: any) {
    setPendingPredictions(prev => ({
      ...prev,
      [matchId]: prediction
    }));
  }

  async function handleSaveAll() {
    const entries = Object.entries(pendingPredictions);
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

    setPendingPredictions({});
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

  function copyCode() {
    if (!pool) return;
    navigator.clipboard.writeText(pool.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  function handlePredictionSaved(matchId: string, prediction: MyPrediction) {
    setRounds((prev) =>
      prev.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          // Se esse match é o salvo
          if (match.id === matchId) {
            return { ...match, myPrediction: prediction };
          }

          if (!match.myPrediction) return match;

          // Se outro match tinha coringa, remove
          if (match.myPrediction.isJoker) {
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
  const bonusRound = rounds.find((r) => r.id === pool?.bonusRoundId) ?? null;

  // Todos os jogos da rodada ordenados por hora
  const allRoundMatches: { match: Match; round: Round }[] = currentRound
    ? [...currentRound.matches]
        .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
        .map((m) => ({ match: m, round: currentRound }))
    : [];

  // ── Classificação centralizada usando getMatchState ───────────────────────
  // Regra obrigatória (fonte única de verdade):
  //   1. FINISHED  → finishedMatches
  //   2. PLACED    → doneMatches (tem palpite, não encerrado)
  //   3. OPEN      → openMatches (sem palpite: SCHEDULED aberto, SCHEDULED travado, LIVE)
  // Nenhum jogo pode ficar sem seção.
  const openMatches = allRoundMatches.filter(({ match }) => getMatchState(match) === 'OPEN');
  const doneMatches = allRoundMatches.filter(({ match }) => getMatchState(match) === 'PLACED');
  const finishedMatches = allRoundMatches.filter(({ match }) => getMatchState(match) === 'FINISHED');

  const totalOpenCount = openMatches.length;
  const totalPlacedCount = doneMatches.length;
  
  function parseDateSafe(dateStr: string): Date {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return new Date(dateStr + 'Z');
  }

  const nextMatch = openMatches
    .map(({ match }) => match)
    .sort((a, b) => parseDateSafe(a.matchDate).getTime() - parseDateSafe(b.matchDate).getTime())[0];

  const nowInSaoPaulo = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  );

  const nextMatchTimeLeft = nextMatch
    ? Math.floor((parseDateSafe(nextMatch.matchDate).getTime() - Date.now()) / 60000)
    : null;


  // ── Coluna da esquerda: palpites ─────────────────────────────
  const leftColumn = (
    <div className="max-w-4xl mx-auto">
      {/* ── ENTRAR NO BOLÃO (não-membro) ──────────────────────── */}
      {!isMember && (
        <div className="mb-5">
          {pool.isPublic ? (
            <>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full flex items-center justify-center gap-2 py-4 bg-brand hover:bg-brand-light text-white font-black text-lg rounded-2xl transition-colors disabled:opacity-50 shadow-lg shadow-brand/20"
              >
                {joining ? <Spinner size="sm" /> : <UserPlus size={20} />}
                {joining ? 'Entrando...' : 'Participar do bolão'}
              </button>
              {joinError && <p className="text-xs text-red-400 text-center mt-2">{joinError}</p>}
            </>
          ) : (
            <div className="flex items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm text-zinc-400">
              <Lock size={14} />
              <span>Bolão privado — use o código de convite para entrar</span>
            </div>
          )}
        </div>
      )}

      {/* ── 1. PALPITES ───────────────────────────────────────── */}
      {isMember && (
        <div className="mb-5">
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

          {totalOpenCount > 0 && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
              <span>
                Você ainda tem <strong className="text-white">{totalOpenCount}</strong> palpites para fazer
                
                {nextMatchTimeLeft !== null && nextMatchTimeLeft > 0 && (
                  <span className="ml-2 text-red-400 font-bold">
                    · Próximo jogo fecha em {nextMatchTimeLeft} min
                  </span>
                )}
              </span>
            </div>
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

          {/* Container com key por rodada: garante re-render completo ao trocar de rodada */}
          <div key={`round-sections-${currentRound?.id ?? 'none'}`}>

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
                      key={match.id}
                      match={match}
                      round={round}
                      poolId={id!}
                      isAuthenticated={isAuthenticated}
                      isMember={isMember}
                      autoFocusFirst={idx === 0}
                      onPredictionSaved={handlePredictionStaged}
                      onPredictionChange={handlePredictionStaged}
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
                      key={match.id}
                      match={match}
                      round={round}
                      poolId={id!}
                      isAuthenticated={isAuthenticated}
                      isMember={isMember}
                      onPredictionSaved={handlePredictionStaged}
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
                      key={match.id}
                      match={match}
                      round={round}
                      poolId={id!}
                      isAuthenticated={isAuthenticated}
                      isMember={isMember}
                      onPredictionSaved={handlePredictionStaged}
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
        <RankingBlock
          ownerId={pool.ownerId}
          poolId={id!}
          currentUserId={user?.id}
          rounds={rounds}
              bonusRoundId={pool?.bonusRoundId}
          isAuthenticated={isAuthenticated}
          isMember={isMember}
        />
      )}

      {/* ── 4. TABELA DO CAMPEONATO (sempre aberta) ─────────── */}
      <ChampionshipTable
        championshipId={pool.championshipId}
        rounds={rounds}
              bonusRoundId={pool?.bonusRoundId}
      />

      {/* ── 5. REGRAS (colapsado) ───────────────────────────── */}
      <CollapsibleSection
        title="Regras do bolão"
        defaultOpen={showRegras}
        onToggle={setShowRegras}
        icon="book"
      >
        <RulesTab
          poolId={id!}
          isOwner={isOwner}
          bonusRoundNumber={bonusRound?.number ?? null}
          roundOptions={rounds.map((r) => ({ id: r.id, number: r.number, startDate: r.startDate }))}
        />
      </CollapsibleSection>

      {/* ── ADMIN (apenas dono) ─────────────────────────────── */}
      {isOwner && (
        <div className="mt-1">
          <AdminPanel rounds={rounds}
              bonusRoundId={pool?.bonusRoundId} onResultSet={loadData} />
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* ── Voltar ──────────────────────────────────────────── */}
      <Link
        to="/pools"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        Todos os bolões
      </Link>

      {/* ── CABEÇALHO DO BOLÃO ──────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center flex-shrink-0">
          <Trophy size={24} className="text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          {pool.championship && (
            <p className="text-xs text-zinc-500 uppercase tracking-wider truncate">
              {pool.championship.name} · {pool.championship.season}
            </p>
          )}
          <h1 className="text-lg font-black text-white leading-tight truncate">{pool.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
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
          </div>
        </div>
        <button
          onClick={copyCode}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors flex-shrink-0"
          title="Copiar código de convite"
        >
          <span className="font-mono font-black text-sm text-white tracking-widest">{pool.code}</span>
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            {codeCopied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
            {codeCopied ? 'Copiado' : 'Copiar'}
          </span>
        </button>
      </div>

      {/* ── LAYOUT RESPONSIVO ───────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 xl:grid-cols-[1fr_420px]">
        <div>{leftColumn}</div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          {rightColumn}
        </div>
      </div>

      {/* ── DRAWER DE PALPITES DOS ADVERSÁRIOS ──────────────────────── */}
      {drawerMatchId && (() => {
        const allMatches = rounds.flatMap((r) => r.matches);
        const m = allMatches.find((x) => x.id === drawerMatchId);
        return (
          <OpponentPredictionsDrawer
            matchId={drawerMatchId}
            poolId={id!}
            currentUserId={user?.id}
            homeScore={m?.homeScore ?? null}
            awayScore={m?.awayScore ?? null}
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
              <RulesTab poolId={id!} isOwner={false} />
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
        className="w-full flex items-center justify-between mb-2 group py-1"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{title}</span>
          {badge}
        </div>
        <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-xs">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ── Seção colapsável genérica ──────────────────────────────────
interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  icon?: 'book' | 'table' | 'default';
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title, defaultOpen = false, icon = 'default', onToggle, children
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  function toggle() {
    const next = !open;
    setOpen(next);
    onToggle?.(next);
  }

  const iconEl = (() => {
    if (icon === 'book') return <BookOpen size={14} className="text-zinc-400" />;
    if (icon === 'table') return <span className="text-sm">📊</span>;
    return <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />;
  })();

  return (
    <div className="mb-2">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          {iconEl}
          <span className="font-bold text-white text-sm">{title}</span>
        </div>
        {open
          ? <ChevronUp size={16} className="text-zinc-400" />
          : <ChevronDown size={16} className="text-zinc-400" />
        }
      </button>
      {open && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
}
