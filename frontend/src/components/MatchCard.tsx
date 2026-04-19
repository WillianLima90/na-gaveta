// ============================================================
// Na Gaveta — MatchCard v9
// HIERARQUIA VISUAL:
//   1. Palpite do usuário (maior, mais forte, cor do estado)
//   2. Pontos (+XX pts) — destaque secundário
//   3. Times — texto médio, subordinado ao palpite
//   4. Resultado real — pequeno, discreto, linha inferior
// ESTADOS:
//   EXATO   → dourado (amarelo forte)
//   CERTO   → verde
//   PARCIAL → azul
//   ERRO    → cinza
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Check, Zap, Radio, Clock, Edit2 } from 'lucide-react';
import type { Match, MyPrediction, Round } from '../services/match.service';
import { savePrediction } from '../services/match.service';
import { Spinner } from './ui';

export interface MatchCardProps {
  match: Match;
  round: Round;
  poolId: string;
  isAuthenticated: boolean;
  isMember: boolean;
  autoFocusFirst?: boolean;
  onPredictionSaved?: (matchId: string, prediction: MyPrediction) => void;
  onViewOpponentPredictions?: (matchId: string) => void;
}

// ── Helpers de tempo ─────────────────────────────────────────
const LOCK_MINUTES_BEFORE = 10;
const SAO_PAULO_TZ = 'America/Sao_Paulo';

function getNowInSaoPaulo(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: SAO_PAULO_TZ })
  );
}

function getMatchDateInSaoPaulo(matchDate: string): Date {
  return new Date(
    new Date(matchDate + 'Z').toLocaleString('en-US', { timeZone: SAO_PAULO_TZ })
  );
}

function getLockTime(matchDate: string): Date {
  const d = getMatchDateInSaoPaulo(matchDate);
  d.setMinutes(d.getMinutes() - LOCK_MINUTES_BEFORE);
  return d;
}

export function isMatchLocked(matchDate: string, status: string): boolean {
  if (status === 'LIVE' || status === 'FINISHED' || status === 'CANCELLED') return true;
  return getLockTime(matchDate) <= getNowInSaoPaulo();
}

function getMinutesUntilLock(matchDate: string): number {
  return Math.floor((getLockTime(matchDate).getTime() - getNowInSaoPaulo().getTime()) / 60000);
}

function formatCompact(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ── Resultado do palpite ──────────────────────────────────────
type PredictionResult = 'exact' | 'outcome' | 'partial' | 'miss' | null;

function getPredictionResult(prediction: MyPrediction, match: Match): PredictionResult {
  if (match.homeScore === null || match.awayScore === null) return null;
  const isExact = prediction.homeScoreTip === match.homeScore && prediction.awayScoreTip === match.awayScore;
  if (isExact) return 'exact';
  const outcome = (h: number, a: number) => (h > a ? 'home' : a > h ? 'away' : 'draw');
  if (outcome(prediction.homeScoreTip, prediction.awayScoreTip) === outcome(match.homeScore!, match.awayScore!)) return 'outcome';
  if (prediction.homeScoreTip === match.homeScore || prediction.awayScoreTip === match.awayScore) return 'partial';
  return 'miss';
}

function calcPoints(_prediction: MyPrediction, match: Match, round: Round, result: PredictionResult): number {
  if (!result || result === 'miss') return 0;
  const base = result === 'exact' ? 20 : result === 'outcome' ? 10 : 5;
  return Math.round(base * (match.myPrediction?.isJoker ? 2 : 1) * (round.isBonusRound ? 1.5 : 1));
}

// Configuração visual por estado — cores fortes, contraste alto
const RESULT_CFG = {
  exact: {
    cardBorder: 'border-yellow-400/60',
    cardBg: 'bg-yellow-400/8',
    scoreBg: 'bg-yellow-400/15',
    scoreText: 'text-yellow-300',
    scoreBorder: 'border-yellow-400/50',
    ptsText: 'text-yellow-300',
    ptsBg: 'bg-yellow-400/15',
    label: '🎯 Exato',
    labelColor: 'text-yellow-300',
  },
  outcome: {
    cardBorder: 'border-green-500/50',
    cardBg: 'bg-green-500/8',
    scoreBg: 'bg-green-500/15',
    scoreText: 'text-green-300',
    scoreBorder: 'border-green-500/40',
    ptsText: 'text-green-300',
    ptsBg: 'bg-green-500/15',
    label: '✅ Certo',
    labelColor: 'text-green-300',
  },
  partial: {
    cardBorder: 'border-blue-400/50',
    cardBg: 'bg-blue-400/8',
    scoreBg: 'bg-blue-400/15',
    scoreText: 'text-blue-300',
    scoreBorder: 'border-blue-400/40',
    ptsText: 'text-blue-300',
    ptsBg: 'bg-blue-400/15',
    label: '~ Parcial',
    labelColor: 'text-blue-300',
  },
  miss: {
    cardBorder: 'border-zinc-700/50',
    cardBg: 'bg-zinc-900/60',
    scoreBg: 'bg-zinc-800/60',
    scoreText: 'text-zinc-500',
    scoreBorder: 'border-zinc-700/40',
    ptsText: 'text-zinc-600',
    ptsBg: 'bg-zinc-800/40',
    label: '❌ Errou',
    labelColor: 'text-zinc-500',
  },
};

// ── Input de placar compacto ──────────────────────────────────
function ScoreInput({
  value, onChange, inputRef, autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
}) {
  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement | null> | undefined}
      autoFocus={autoFocus}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
      onFocus={(e) => e.target.select()}
      placeholder="–"
      maxLength={2}
      className="w-11 h-11 text-center text-xl font-black rounded-xl bg-zinc-800 border border-zinc-600 text-white focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/40 tabular-nums"
    />
  );
}

// ── Badge de modificador ──────────────────────────────────────
function ModBadge({ type }: { type: 'joker' | 'bonus' }) {
  return type === 'joker'
    ? <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">⚡ Coringa</span>
    : <span className="text-xs font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">★ Especial</span>;
}

// ── Componente principal ──────────────────────────────────────
export function MatchCard({
  match, round, poolId, isAuthenticated, isMember,
  autoFocusFirst, onPredictionSaved, onViewOpponentPredictions,
}: MatchCardProps) {
  const locked = isMatchLocked(match.matchDate, match.status);
  const hasPrediction = !!match.myPrediction;

  const [homeInput, setHomeInput] = useState(hasPrediction ? String(match.myPrediction!.homeScoreTip) : '');
  const [awayInput, setAwayInput] = useState(hasPrediction ? String(match.myPrediction!.awayScoreTip) : '');
  const [isJokerSelected, setIsJokerSelected] = useState(Boolean(match.myPrediction && (match.myPrediction as MyPrediction & { isJoker?: boolean }).isJoker));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(hasPrediction);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minsUntilLock, setMinsUntilLock] = useState<number | null>(null);

  const homeRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef({ home: '', away: '', joker: false });
  const canPredict = isAuthenticated && isMember && !locked;

  function startEditing() {
    initialRef.current = {
      home: homeInput,
      away: awayInput,
      joker: isJokerSelected,
    };
    setEditing(true);
    setTimeout(() => homeRef.current?.focus(), 50);
  }

  function cancelEditing() {
    setHomeInput(initialRef.current.home);
    setAwayInput(initialRef.current.away);
    setIsJokerSelected(initialRef.current.joker);
    setEditing(false);
    setError(null);
  }

  const hasUnsavedChanges =
    homeInput !== initialRef.current.home ||
    awayInput !== initialRef.current.away ||
    isJokerSelected !== initialRef.current.joker;

  // Sincronizar estado local quando o palpite do card mudar
  useEffect(() => {
    setHomeInput(match.myPrediction ? String(match.myPrediction.homeScoreTip) : '');
    setAwayInput(match.myPrediction ? String(match.myPrediction.awayScoreTip) : '');
    setIsJokerSelected(Boolean(match.myPrediction?.isJoker));
    setSaved(!!match.myPrediction);
  }, [match.myPrediction]);

  // Fechar edição ao clicar fora
  useEffect(() => {
    if (!editing) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (cardRef.current && target && !cardRef.current.contains(target)) {
        cancelEditing();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        cancelEditing();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editing]);

  // Contagem regressiva
  useEffect(() => {
    if (locked || match.status !== 'SCHEDULED') return;
    const update = () => setMinsUntilLock(getMinutesUntilLock(match.matchDate));
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [match.matchDate, match.status, locked]);

  // Resultado
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const result: PredictionResult = hasPrediction && hasScore ? getPredictionResult(match.myPrediction!, match) : null;
  const cfg = result ? RESULT_CFG[result] : null;

  // Pontos
  const finalPts = match.myPrediction?.points ?? null;
  const dynPts = hasPrediction && hasScore && result ? calcPoints(match.myPrediction!, match, round, result) : null;
  const pts = finalPts !== null ? finalPts : dynPts;
  const isLivePts = match.status === 'LIVE' && finalPts === null && dynPts !== null;

  async function handleSave() {
    const home = parseInt(homeInput);
    const away = parseInt(awayInput);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) { setError('Placares inválidos'); return; }
    setSaving(true); setError(null);
    try {
      const pred = await savePrediction({ matchId: match.id, poolId, homeScoreTip: home, awayScoreTip: away, isJoker: isJokerSelected });
      setSaved(true); setEditing(false);
      onPredictionSaved?.(match.id, { id: pred.id, homeScoreTip: home, awayScoreTip: away, isJoker: isJokerSelected, points: pred.points, scoredAt: pred.scoredAt, createdAt: pred.createdAt });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  // ── Prazo de fechamento ───────────────────────────────────────
  function LockInfo() {
    if (locked) return null;
    if (minsUntilLock !== null && minsUntilLock <= 30 && minsUntilLock > 0) {
      return <span className="text-xs text-orange-400 font-medium">Fecha em {minsUntilLock} min</span>;
    }
    return <span className="text-xs text-zinc-600">Fecha às {formatTime(match.matchDate)}</span>;
  }

  // ── CARD: PALPITE EM ABERTO (sem palpite salvo) ───────────────
  if (canPredict && (!saved || editing)) {
    return (
      <div ref={cardRef} className="max-w-4xl mx-auto rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-lg">
        {/* Linha principal: times + inputs grandes + salvar */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
          <button
            onClick={() => {
              const next = !isJokerSelected;
              setIsJokerSelected(next);
              if (next && onPredictionSaved) {
                onPredictionSaved(match.id, {
                  ...(match.myPrediction || {}),
                  id: match.myPrediction?.id || 'temp',
                  homeScoreTip: Number(homeInput || 0),
                  awayScoreTip: Number(awayInput || 0),
                  isJoker: true,
                  points: match.myPrediction?.points ?? 0,
                  scoredAt: match.myPrediction?.scoredAt ?? null,
                  createdAt: match.myPrediction?.createdAt ?? new Date().toISOString(),
                });
              }
            }}
            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border transition-colors ${
              isJokerSelected
                ? 'text-yellow-400 bg-yellow-400/20 border-yellow-400/40'
                : 'text-zinc-400 bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            ⚡ {isJokerSelected ? 'Coringa' : 'Usar coringa'}
          </button>
          <span className="flex-1 text-right text-sm font-bold text-white truncate">{match.homeTeam}</span>
          <div className="flex items-center gap-2 shrink-0">
            <ScoreInput value={homeInput} onChange={setHomeInput} inputRef={homeRef} autoFocus={autoFocusFirst} />
            <span className="text-zinc-500 text-base font-black">×</span>
            <ScoreInput value={awayInput} onChange={setAwayInput} />
          </div>
          <span className="flex-1 text-left text-sm font-bold text-white truncate">{match.awayTeam}</span>
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges || homeInput === '' || awayInput === ''}
            className="shrink-0 h-11 px-4 rounded-xl font-bold text-sm bg-brand hover:bg-brand-light text-white disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md"
          >
            {saving ? <Spinner size="sm" /> : hasUnsavedChanges ? <><Zap size={13} /> Salvar</> : <>Sem alterações</>}
          </button>
        </div>
        {/* Linha secundária: data + prazo + badges */}
        <div className="flex items-center justify-between px-4 pb-3 gap-2">
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <Clock size={9} /> {formatCompact(match.matchDate)}
          </span>
          <div className="flex items-center gap-1.5">
            {match.myPrediction?.isJoker && <ModBadge type="joker" />}
            {round.isBonusRound && <ModBadge type="bonus" />}
            <LockInfo />
          </div>
        </div>
        {error && <p className="text-xs text-red-400 text-center pb-2">{error}</p>}
      </div>
    );
  }

  // ── CARD: PALPITE SALVO (ainda editável) ─────────────────────
  if (canPredict && saved && !editing) {
    return (
      <div className={`max-w-4xl mx-auto rounded-2xl border shadow-md ${match.myPrediction?.isJoker ? "border-yellow-400/70 bg-brand/8 shadow-lg shadow-yellow-500/20" : "border-brand/40 bg-brand/8"}`}>
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
          <span className="flex-1 text-right text-sm font-bold text-white truncate">{match.homeTeam}</span>
          <div
            onClick={startEditing}
            className="flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span className={`w-11 h-11 flex items-center justify-center text-xl font-black text-white bg-transparent border rounded-xl tabular-nums shadow-inner ${match.myPrediction?.isJoker ? "border-yellow-400/60" : "border-brand/40"}`}>{homeInput}</span>
            <span className="text-zinc-500 text-base font-black">×</span>
            <span className={`w-11 h-11 flex items-center justify-center text-xl font-black text-white bg-transparent border rounded-xl tabular-nums shadow-inner ${match.myPrediction?.isJoker ? "border-yellow-400/60" : "border-brand/40"}`}>{awayInput}</span>
          </div>
          <span className="flex-1 text-left text-sm font-bold text-white truncate">{match.awayTeam}</span>
          <button
            onClick={startEditing}
            className="shrink-0 h-8 px-3 rounded-lg font-semibold text-xs border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all flex items-center gap-1"
          >
            <Edit2 size={11} /> Editar
          </button>
        </div>
        <div className="flex items-center justify-between px-4 pb-3 gap-2">
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <Clock size={9} /> {formatCompact(match.matchDate)}
          </span>
          <div className="flex items-center gap-1.5">
            {match.myPrediction?.isJoker && <ModBadge type="joker" />}
            {round.isBonusRound && <ModBadge type="bonus" />}
            <LockInfo />
            <span className="flex items-center gap-1 text-xs text-brand font-semibold"><Check size={10} /> Salvo</span>
          </div>
        </div>
      </div>
    );
  }

  // ── CARD: MODO EDIÇÃO ─────────────────────────────────────────
  if (canPredict && editing) {
    return (
      <div className="max-w-4xl mx-auto rounded-2xl border border-brand/60 bg-brand/8 shadow-lg">
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
          <span className="flex-1 text-right text-sm font-bold text-white truncate">{match.homeTeam}</span>
          <div className="flex items-center gap-2 shrink-0">
            <ScoreInput value={homeInput} onChange={setHomeInput} inputRef={homeRef} autoFocus />
            <span className="text-zinc-500 text-base font-black">×</span>
            <ScoreInput value={awayInput} onChange={setAwayInput} />
          </div>
          <span className="flex-1 text-left text-sm font-bold text-white truncate">{match.awayTeam}</span>
          <button
            onClick={handleSave}
            disabled={saving || homeInput === '' || awayInput === ''}
            className="shrink-0 h-11 px-4 rounded-xl font-bold text-sm bg-brand hover:bg-brand-light text-white disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md"
          >
            {saving ? <Spinner size="sm" /> : <><Check size={13} /> Atualizar</>}
          </button>
        </div>
        <div className="flex items-center justify-between px-4 pb-3 gap-2">
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <Clock size={9} /> {formatCompact(match.matchDate)}
          </span>
          <span className="text-xs text-brand italic font-medium">Editando...</span>
        </div>
        {error && <p className="text-xs text-red-400 text-center pb-2">{error}</p>}
      </div>
    );
  }

  // ── CARD: PALPITE REALIZADO (ao vivo ou aguardando, com palpite) ──
  if (locked && hasPrediction && match.status !== 'FINISHED') {
    const isLive = match.status === 'LIVE';
    return (
      <div className={`max-w-4xl mx-auto rounded-2xl border shadow-md ${isLive ? 'border-green-500/40 bg-green-500/8' : 'border-zinc-700/50 bg-zinc-900/70'}`}>
        {/* Linha principal: times + palpite grande + pontos */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-1.5">
          <span className="flex-1 text-right text-sm font-bold text-zinc-300 truncate">{match.homeTeam}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-11 h-11 flex items-center justify-center text-xl font-black rounded-xl tabular-nums shadow-inner ${isLive ? 'text-green-300 bg-green-500/15 border border-green-500/40' : 'text-zinc-200 bg-zinc-800 border border-zinc-700'}`}>
              {match.myPrediction!.homeScoreTip}
            </span>
            <span className="text-zinc-500 text-base font-black">×</span>
            <span className={`w-11 h-11 flex items-center justify-center text-xl font-black rounded-xl tabular-nums shadow-inner ${isLive ? 'text-green-300 bg-green-500/15 border border-green-500/40' : 'text-zinc-200 bg-zinc-800 border border-zinc-700'}`}>
              {match.myPrediction!.awayScoreTip}
            </span>
          </div>
          <span className="flex-1 text-left text-sm font-bold text-zinc-300 truncate">{match.awayTeam}</span>
          {/* Pontos parciais ao vivo — destaque */}
          {isLive && pts !== null && (
            <span className={`shrink-0 text-base font-black tabular-nums px-2 py-1 rounded-lg ${cfg?.ptsBg ?? 'bg-zinc-800'} ${cfg?.ptsText ?? 'text-zinc-400'}`}>
              {pts > 0 ? `+${pts}` : '0'}
              {isLivePts && <span className="text-xs opacity-60 ml-0.5">~</span>}
            </span>
          )}
        </div>
        {/* Linha secundária: data + resultado real (discreto) + status */}
        <div className="flex items-center justify-between px-4 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <Clock size={9} /> {formatCompact(match.matchDate)}
            </span>
            {isLive && hasScore && (
              <span className="text-xs text-zinc-600">
                Real: <span className="text-zinc-400 font-semibold">{match.homeScore}–{match.awayScore}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {match.myPrediction?.isJoker && <ModBadge type="joker" />}
            {round.isBonusRound && <ModBadge type="bonus" />}
            {isLive ? (
              <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                <Radio size={9} className="animate-pulse" /> Ao vivo
              </span>
            ) : (
              <span className="text-xs text-zinc-600">Aguardando</span>
            )}
            {onViewOpponentPredictions && (
              <button
                onClick={() => onViewOpponentPredictions(match.id)}
                className="text-xs text-zinc-500 hover:text-white underline underline-offset-2 transition-colors"
              >
                Ver palpites
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── CARD: JOGO ENCERRADO com palpite ─────────────────────────
  if (locked && hasPrediction && match.status === 'FINISHED') {
    const c = cfg ?? RESULT_CFG.miss;
    return (
      <div className={`max-w-4xl mx-auto rounded-2xl border shadow-md ${c.cardBorder} ${c.cardBg}`}>
        {/* Linha principal: times + PALPITE GRANDE + pontos em destaque */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-1.5">
          <span className="flex-1 text-right text-sm font-bold text-zinc-300 truncate">{match.homeTeam}</span>
          {/* Palpite — elemento mais forte */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-12 h-12 flex items-center justify-center text-2xl font-black rounded-xl tabular-nums shadow-inner border ${c.scoreBg} ${c.scoreText} ${c.scoreBorder}`}>
              {match.myPrediction!.homeScoreTip}
            </span>
            <span className="text-zinc-500 text-base font-black">×</span>
            <span className={`w-12 h-12 flex items-center justify-center text-2xl font-black rounded-xl tabular-nums shadow-inner border ${c.scoreBg} ${c.scoreText} ${c.scoreBorder}`}>
              {match.myPrediction!.awayScoreTip}
            </span>
          </div>
          <span className="flex-1 text-left text-sm font-bold text-zinc-300 truncate">{match.awayTeam}</span>
          {/* Pontos — destaque secundário */}
          <span className={`shrink-0 text-base font-black tabular-nums px-2.5 py-1.5 rounded-xl ${c.ptsBg} ${c.ptsText}`}>
            {pts !== null ? (pts > 0 ? `+${pts}` : '0') : '—'}
          </span>
        </div>
        {/* Linha secundária: resultado real (pequeno, discreto) + label + badges */}
        <div className="flex items-center justify-between px-4 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <Clock size={9} /> {formatCompact(match.matchDate)}
            </span>
            {/* Resultado real — menor, subordinado */}
            {hasScore && (
              <span className="text-xs text-zinc-600">
                Real: <span className="text-zinc-500 font-semibold">{match.homeScore}–{match.awayScore}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {match.myPrediction?.isJoker && <ModBadge type="joker" />}
            {round.isBonusRound && <ModBadge type="bonus" />}
            {result && <span className={`text-xs font-semibold ${c.labelColor}`}>{c.label}</span>}
            {onViewOpponentPredictions && (
              <button
                onClick={() => onViewOpponentPredictions(match.id)}
                className="text-xs text-zinc-500 hover:text-white underline underline-offset-2 transition-colors"
              >
                Ver palpites
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── CARD: JOGO ENCERRADO sem palpite ─────────────────────────
  if (locked && !hasPrediction) {
    const isLive = match.status === 'LIVE';
    const isFinished = match.status === 'FINISHED';
    return (
      <div className="max-w-4xl mx-auto rounded-2xl border border-zinc-800/40 bg-zinc-900/30 opacity-55">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-right text-sm font-semibold text-zinc-500 truncate">{match.homeTeam}</span>
          <div className="flex items-center gap-2 shrink-0">
            {(isLive || isFinished) && hasScore ? (
              <>
                <span className="w-10 h-10 flex items-center justify-center text-lg font-black text-zinc-500 bg-zinc-800/60 rounded-xl tabular-nums">{match.homeScore}</span>
                <span className="text-zinc-600 text-base font-bold">×</span>
                <span className="w-10 h-10 flex items-center justify-center text-lg font-black text-zinc-500 bg-zinc-800/60 rounded-xl tabular-nums">{match.awayScore}</span>
              </>
            ) : (
              <span className="text-xs text-zinc-600 px-3">Sem palpite</span>
            )}
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-zinc-500 truncate">{match.awayTeam}</span>
          <span className="shrink-0 text-sm font-black text-zinc-700">0</span>
        </div>
        <div className="flex items-center justify-between px-4 pb-3 gap-2">
          <span className="text-xs text-zinc-700 flex items-center gap-1">
            <Clock size={9} /> {formatCompact(match.matchDate)}
          </span>
          <div className="flex items-center gap-1.5">
            {isLive && <span className="flex items-center gap-1 text-xs text-green-500"><Radio size={9} /> Ao vivo</span>}
            {isFinished && <span className="text-xs text-zinc-700">Encerrado</span>}
            {onViewOpponentPredictions && (isLive || isFinished) && (
              <button
                onClick={() => onViewOpponentPredictions(match.id)}
                className="text-xs text-zinc-600 hover:text-white underline underline-offset-2 transition-colors"
              >
                Ver palpites
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── CARD: JOGO FUTURO (não-membro ou não autenticado) ────────
  return (
    <div className="max-w-4xl mx-auto rounded-2xl border border-zinc-800/40 bg-zinc-900/30">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 text-right text-sm font-semibold text-zinc-400 truncate">{match.homeTeam}</span>
        <div className="flex items-center gap-2 shrink-0 px-2">
          <span className="text-xs text-zinc-600">vs</span>
        </div>
        <span className="flex-1 text-left text-sm font-semibold text-zinc-400 truncate">{match.awayTeam}</span>
      </div>
      <div className="flex items-center justify-between px-4 pb-3 gap-2">
        <span className="text-xs text-zinc-700 flex items-center gap-1">
          <Clock size={9} /> {formatCompact(match.matchDate)}
        </span>
        <div className="flex items-center gap-1.5">
          {match.myPrediction?.isJoker && <ModBadge type="joker" />}
          {round.isBonusRound && <ModBadge type="bonus" />}
        </div>
      </div>
    </div>
  );
}
