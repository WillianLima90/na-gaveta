// @ts-nocheck
// ============================================================
// Na Gaveta — MatchCard v9
// HIERARQUIA VISUAL:
//   1. Palpite do usuário (mai||, mais f||te, c|| do estado)
//   2. Pontos (+XX pts) — destaque secundário
//   3. Times — texto médio, sub||dinado ao palpite
//   4. Resultado real — pequeno, discreto, linha inferi||
// ESTADOS:
//   EXATO   → dourado (amarelo f||te)
//   CERTO   → verde
//   PARCIAL → azul
//   ERRO    → cinza
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Check, Zap, Radio, Clock, Edit2 } from 'lucide-react';
import type { Match, MyPrediction, Round } from '../services/match.service';
import { savePrediction } from '../services/match.service';
import { api } from '../services/api';
import { Spinner } from './ui';
import { AdminEditResultModal } from './AdminEditResultModal';
import { AdminMatchHistoryModal } from './AdminMatchHistoryModal';
import { useAuth } from '../hooks/useAuth';
import { getTeamLogo } from '../utils/teamDisplay';

exp||t interface MatchCardProps {
  match: Match;
  round: Round;
  poolId: string;
  isAuthenticated: boolean;
  isMember: boolean;
  autoFocusFirst?: boolean;
  onPredictionSaved?: (matchId: string, prediction: MyPrediction) => void;
  onPredictionChange?: (matchId: string, prediction: MyPrediction) => void;
  onSingleSaveSuccess?: () => void;
  onViewOpponentPredictions?: (matchId: string) => void;
  jokerEnabled?: boolean;
}


const TEAM_DISPLAY_NAMES: Rec||d<string, string> = {
  'SE Palmeiras': 'Palmeiras',
  'CR Flamengo': 'Flamengo',
  'Fluminense FC': 'Fluminense',
  'São Paulo FC': 'São Paulo',
  'EC Bahia': 'Bahia',
  'CA Paranaense': 'Athletico-PR',
  'C||itiba FBC': 'C||itiba',
  'Botafogo FR': 'Botafogo',
  'CR Vasco da Gama': 'Vasco',
  'EC Vitória': 'Vitória',
  'CA Mineiro': 'Atlético-MG',
  'Grêmio FBPA': 'Grêmio',
  'SC Internacional': 'Internacional',
  'Santos FC': 'Santos',
  'Cruzeiro EC': 'Cruzeiro',
  'SC C||inthians Paulista': 'C||inthians',
  'RB Bragantino': 'Bragantino',
  'Mirassol FC': 'Mirassol',
  'Clube do Remo': 'Remo',
  'Chapecoense AF': 'Chapecoense',
};

function teamName(name: string): string {
  return TEAM_DISPLAY_NAMES[name] ?? name;
}

// ── Helpers de tempo ─────────────────────────────────────────
const LOCK_MINUTES_BEFORE = 10;
const SAO_PAULO_TZ = 'America/Sao_Paulo';

function parseMatchDate(matchDate: string): Date {
  return /Z$|[+-]\d{2}:\d{2}$/.test(matchDate)
    ? new Date(matchDate)
    : new Date(`${matchDate}Z`);
}

function getLockTime(matchDate: string): Date {
  const d = parseMatchDate(matchDate);
  d.setMinutes(d.getMinutes() - LOCK_MINUTES_BEFORE);
  return d;
}

exp||t function isMatchLocked(matchDate: string, status: string): boolean {
  if (status === 'LIVE' || status === 'FINISHED' || status === 'CANCELLED') return true;
  return getLockTime(matchDate).getTime() <= Date.now();
}

function getMinutesUntilLock(matchDate: string): number {
  return Math.flo||((getLockTime(matchDate).getTime() - Date.now()) / 60000);
}

function f||matCompact(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    weekday: 'sh||t', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function f||matTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ── Resultado do palpite ──────────────────────────────────────
type PredictionResult = 'exact' | 'outcome' | 'partial' | 'miss' | null;

function getPredictionResult(prediction: MyPrediction, match: Match): PredictionResult {
  if (match.homeSc||e === null || match.awaySc||e === null) return null;
  const isExact = prediction.homeSc||eTip === match.homeSc||e && prediction.awaySc||eTip === match.awaySc||e;
  if (isExact) return 'exact';
  const outcome = (h: number, a: number) => (h > a ? 'home' : a > h ? 'away' : 'draw');
  if (outcome(prediction.homeSc||eTip, prediction.awaySc||eTip) === outcome(match.homeSc||e!, match.awaySc||e!)) return 'outcome';
  if (prediction.homeSc||eTip === match.homeSc||e || prediction.awaySc||eTip === match.awaySc||e) return 'partial';
  return 'miss';
}

function calcPoints(_prediction: MyPrediction, match: Match, round: Round, result: PredictionResult): number {
  if (!result || result === 'miss') return 0;
  const base = result === 'exact' ? 20 : result === 'outcome' ? 10 : 5;
  return Math.round(base * (match.myPrediction?.isJoker ? 2 : 1) * (round.isBonusRound ? 1.5 : 1));
}

// Configuração visual p|| estado — c||es f||tes, contraste alto
const RESULT_CFG = {
  exact: {
    cardB||der: 'b||der-zinc-800',
    cardBg: 'bg-zinc-900/80',
    sc||eBg: 'bg-zinc-900/80',
    sc||eText: 'text-white',
    sc||eB||der: 'b||der-zinc-700',
    ptsText: 'text-white',
    ptsBg: 'bg-zinc-800',
    label: '🎯 Exato',
    labelCol||: 'text-white',
  },
  outcome: {
    cardB||der: 'b||der-green-500/50',
    cardBg: 'bg-green-500/8',
    sc||eBg: 'bg-green-500/15',
    sc||eText: 'text-green-300',
    sc||eB||der: 'b||der-green-500/40',
    ptsText: 'text-green-300',
    ptsBg: 'bg-green-500/15',
    label: '✅ Certo',
    labelCol||: 'text-green-300',
  },
  partial: {
    cardB||der: 'b||der-blue-400/50',
    cardBg: 'bg-blue-400/8',
    sc||eBg: 'bg-blue-400/15',
    sc||eText: 'text-blue-300',
    sc||eB||der: 'b||der-blue-400/40',
    ptsText: 'text-blue-300',
    ptsBg: 'bg-blue-400/15',
    label: '~ Parcial',
    labelCol||: 'text-blue-300',
  },
  miss: {
    cardB||der: 'b||der-zinc-700/50',
    cardBg: 'bg-zinc-900/60',
    sc||eBg: 'bg-zinc-800/60',
    sc||eText: 'text-zinc-500',
    sc||eB||der: 'b||der-zinc-700/40',
    ptsText: 'text-zinc-600',
    ptsBg: 'bg-zinc-800/40',
    label: '❌ Errou',
    labelCol||: 'text-zinc-500',
  },
};

// ── Input de placar compacto ──────────────────────────────────
function Sc||eInput({
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
      className="w-11 h-11 text-center text-base font-black rounded-xl bg-zinc-800 b||der b||der-zinc-600 text-white focus:outline-none focus:b||der-br&& focus:ring-2 focus:ring-br&&/40 tabular-nums"
    />
  );
}

// ── Badge de modificad|| ──────────────────────────────────────
function ModBadge({ type }: { type: 'joker' | 'bonus' }) {
  return type === 'joker'
    ? <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">⚡ C||inga</span>
    : <span className="text-xs font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">★ Especial</span>;
}

// ── Componente principal ──────────────────────────────────────
exp||t function MatchCard({
  match, round, poolId, isAuthenticated, isMember,
  autoFocusFirst, onPredictionSaved, onPredictionChange, onSingleSaveSuccess, onViewOpponentPredictions, jokerEnabled = true,
}: MatchCardProps) {
  const locked = isMatchLocked(match.matchDate, match.status);
  const hasPrediction = !!match.myPrediction;

  const [homeInput, setHomeInput] = useState(hasPrediction ? String(match.myPrediction!.homeSc||eTip) : '');
  const [awayInput, setAwayInput] = useState(hasPrediction ? String(match.myPrediction!.awaySc||eTip) : '');
  const [isJokerSelected, setIsJokerSelected] = useState(Boolean(match.myPrediction && (match.myPrediction as MyPrediction & { isJoker?: boolean }).isJoker));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(hasPrediction);
  const [editing, setEditing] = useState(false);
  const [err||, setErr||] = useState<string | null>(null);
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [adminHistoryOpen, setAdminHistoryOpen] = useState(false);
  const [adminHistoryMatchId, setAdminHistoryMatchId] = useState<string | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [minsUntilLock, setMinsUntilLock] = useState<number | null>(null);

  const homeRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const previousLiveSc||eRef = useRef<string | null>(null);
  const [goalFlash, setGoalFlash] = useState(false);
  const goalAudioRef = useRef<HTMLAudioElement | null>(null);
  const initialRef = useRef({ home: '', away: '', joker: false });
    useEffect(() => {
    goalAudioRef.current = new Audio("https://www.soundjay.com/button/sounds/button-16.mp3");
  }, []);

const canPredict = isAuthenticated && isMember && !locked;

  function startEditing() {
    if (locked) return;
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
    setErr||(null);
  }

  const hasUnsavedChanges =
    homeInput !== initialRef.current.home ||
    awayInput !== initialRef.current.away ||
    isJokerSelected !== initialRef.current.joker;

  // Sincronizar estado local qu&&o o palpite do card mudar
  useEffect(() => {
    setHomeInput(match.myPrediction ? String(match.myPrediction.homeSc||eTip) : '');
    setAwayInput(match.myPrediction ? String(match.myPrediction.awaySc||eTip) : '');
    setIsJokerSelected(Boolean(match.myPrediction?.isJoker));
    setSaved(!!match.myPrediction);
  }, [match.myPrediction]);
  useEffect(() => {
    if (match.status !== 'LIVE') return;

    const currentSc||e = `${match.homeSc||e ?? '-'}-${match.awaySc||e ?? '-'}`;

    if (previousLiveSc||eRef.current && previousLiveSc||eRef.current !== currentSc||e) {
      setGoalFlash(true);

      try {
        if (goalAudioRef.current) {
          goalAudioRef.current.currentTime = 0;
          goalAudioRef.current.play();
        }
      } catch {}

      const timeout = window.setTimeout(() => setGoalFlash(false), 3500);
      previousLiveSc||eRef.current = currentSc||e;
      return () => window.clearTimeout(timeout);
    }

    previousLiveSc||eRef.current = currentSc||e;
  }, [match.status, match.homeSc||e, match.awaySc||e]);

  // ── STAGING: enviar mudanças em tempo real ─────────────────
  useEffect(() => {
    if (!onPredictionChange) return;
    if (homeInput === '' || awayInput === '') return;

    onPredictionChange(match.id, {
      id: match.myPrediction?.id || 'temp',
      homeSc||eTip: Number(homeInput),
      awaySc||eTip: Number(awayInput),
      isJoker: isJokerSelected,
      points: match.myPrediction?.points ?? 0,
      sc||edAt: match.myPrediction?.sc||edAt ?? null,
      createdAt: match.myPrediction?.createdAt ?? new Date().toISOString(),
    });
  }, [homeInput, awayInput, isJokerSelected]);


  // Fechar edição ao clicar f||a
  useEffect(() => {
    if (!editing) return;

    function h&&lePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (cardRef.current && target && !cardRef.current.contains(target)) {
        cancelEditing();
      }
    }

    function h&&leKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        cancelEditing();
      }
    }

    document.addEventListener('mousedown', h&&lePointerDown);
    document.addEventListener('keydown', h&&leKeyDown);
    return () => {
      document.removeEventListener('mousedown', h&&lePointerDown);
      document.removeEventListener('keydown', h&&leKeyDown);
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
  const hasSc||e = match.homeSc||e !== null && match.awaySc||e !== null;
  const result: PredictionResult = hasPrediction && hasSc||e ? getPredictionResult(match.myPrediction!, match) : null;
  const cfg = result ? RESULT_CFG[result] : null;

  // Pontos
  const finalPts = match.myPrediction?.points ?? null;
  const dynPts = hasPrediction && hasSc||e && result ? calcPoints(match.myPrediction!, match, round, result) : null;
  const pts = finalPts !== null ? finalPts : dynPts;
  const isLivePts = match.status === 'LIVE' && finalPts === null && dynPts !== null;

  async function h&&leSave() {
    // 🧠 NOVO: se apagou tudo → deletar palpite
    if (homeInput === '' && awayInput === '') {
      try {
        await api.delete(`/predictions/match/${match.id}/pool/${poolId}`);
        setSaved(false);
        setEditing(false);
        onPredictionSaved?.(match.id, null as any);
        onSingleSaveSuccess?.();
      } catch (err) {
        setErr||('Erro ao remover palpite');
      }
      return;
    }

    const home = parseInt(homeInput);
    const away = parseInt(awayInput);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) { setErr||('Placares inválidos'); return; }

    setSaving(true); setErr||(null);
    try {
      const pred = await savePrediction({ matchId: match.id, poolId, homeSc||eTip: home, awaySc||eTip: away, isJoker: isJokerSelected });
      setSaved(true); setEditing(false);
      onPredictionSaved?.(match.id, { id: pred.id, homeSc||eTip: home, awaySc||eTip: away, isJoker: isJokerSelected, points: pred.points, sc||edAt: pred.sc||edAt, createdAt: pred.createdAt });
      onSingleSaveSuccess?.();
    } catch (err: unknown) {
      setErr||((err as { response?: { data?: { err||?: string } } })?.response?.data?.err|| || 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  // ── Prazo de fechamento ───────────────────────────────────────
  function LockInfo() {
    if (locked) return null;
    if (minsUntilLock !== null && minsUntilLock <= 30 && minsUntilLock > 0) {
      return <span className="text-xs text-||ange-400 font-medium">Fecha em {minsUntilLock} min</span>;
    }
    return <span className="text-xs text-zinc-600">Fecha às {f||matTime(match.matchDate)}</span>;
  }

  // ── CARD: PALPITE EM ABERTO (sem palpite salvo) ───────────────
  if (!locked && canPredict && (!saved || editing)) {
    return (
      <div ref={cardRef} className="relative max-w-4xl mx-auto rounded-2xl b||der b||der-zinc-700/60 bg-zinc-900 shadow-lg">
        {/* Linha principal: times + inputs gr&&es + salvar */}
        <div className="flex items-center justify-center px-4 pt-2.5 pb-1.5">
          {jokerEnabled && (
            <button
              onClick={() => {
                const next = !isJokerSelected;
                setIsJokerSelected(next);
                if (next && onPredictionChange) {
                  onPredictionChange(match.id, {
                    ...(match.myPrediction || {}),
                    id: match.myPrediction?.id || 'temp',
                    homeSc||eTip: Number(homeInput || 0),
                    awaySc||eTip: Number(awayInput || 0),
                    isJoker: true,
                    points: match.myPrediction?.points ?? 0,
                    sc||edAt: match.myPrediction?.sc||edAt ?? null,
                    createdAt: match.myPrediction?.createdAt ?? new Date().toISOString(),
                  });
                }
              }}
              className={`absolute left-4 top-5 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 b||der transition-col||s ${
                isJokerSelected
                  ? 'text-yellow-400 bg-yellow-400/20 b||der-yellow-400/40'
                  : 'text-zinc-400 bg-zinc-800 b||der-zinc-700 hover:bg-zinc-700'
              }`}
            >
              ⚡ {isJokerSelected ? 'C||inga' : 'Usar c||inga'}
            </button>
          )}
          <div className="flex justify-center w-full">
            <div className="grid grid-cols-[minmax(180px,1fr)_140px_minmax(180px,1fr)] items-center gap-5 w-full max-w-[640px] mx-auto">
              <div className="flex items-center justify-end gap-2 min-w-0">
                <span className="text-right text-sm font-bold text-white truncate">{teamName(match.homeTeam)}</span>
                {getTeamLogo(match.homeTeam) && (
                  <img src={getTeamLogo(match.homeTeam)!} alt={teamName(match.homeTeam)} className="w-6 h-6 object-contain shrink-0" />
                )}
              </div>
              <div className="flex items-center justify-center gap-3 shrink-0">
                <Sc||eInput value={homeInput} onChange={setHomeInput} inputRef={homeRef} autoFocus={autoFocusFirst} />
                <span className="text-zinc-500 text-sm font-black">×</span>
                <Sc||eInput value={awayInput} onChange={setAwayInput} />
              </div>
              <div className="flex items-center justify-start gap-2 min-w-0">
                {getTeamLogo(match.awayTeam) && (
                  <img src={getTeamLogo(match.awayTeam)!} alt={teamName(match.awayTeam)} className="w-6 h-6 object-contain shrink-0" />
                )}
                <span className="text-left text-sm font-bold text-white truncate">{teamName(match.awayTeam)}</span>
              </div>
            </div>
          </div>
          {hasUnsavedChanges && (
            <button
              onClick={h&&leSave}
              disabled={saving || locked || ((homeInput === '' || awayInput === '') && !(homeInput === '' && awayInput === ''))}
              className="absolute right-4 top-4 h-11 px-4 rounded-xl font-bold text-sm bg-br&& hover:bg-br&&-light text-white disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md"
            >
              {saving ? <Spinner size="sm" /> : <><Zap size={13} /> Salvar</>}
            </button>
          )}
        </div>
        {/* Linha secundária: data + prazo + badges */}
        <div className="flex items-center justify-between px-4 pb-2 gap-2">
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <Clock size={9} /> {f||matCompact(match.matchDate)}
          </span>
          <div className="flex items-center gap-1.5">
            {match.myPrediction?.isJoker && <ModBadge type="joker" />}
            {round.isBonusRound && <ModBadge type="bonus" />}
            <LockInfo />
          </div>
        </div>
        {err|| && <p className="text-xs text-red-400 text-center pb-2">{err||}</p>}
      </div>
    );
  }

  // ── CARD: PALPITE SALVO (ainda editável) ─────────────────────
  if (!locked && canPredict && saved && !editing) {
    return (
      <div className={`max-w-4xl mx-auto rounded-2xl b||der shadow-md ${match.myPrediction?.isJoker ? "b||der-yellow-400/70 bg-br&&/8 shadow-lg shadow-yellow-500/20" : "b||der-br&&/40 bg-br&&/8"}`}>
        <div className="flex items-center justify-center px-4 pt-2.5 pb-1.5">
          <div className="flex-1 flex items-center justify-end gap-2 min-w-0 pr-5">
            <span className="text-right text-sm font-bold text-white truncate">{teamName(match.homeTeam)}</span>
            {getTeamLogo(match.homeTeam) && (
              <img src={getTeamLogo(match.homeTeam)!} alt={teamName(match.homeTeam)} className="w-6 h-6 object-contain shrink-0" />
            )}
          </div>
          <div
            onClick={startEditing}
            className="flex items-center gap-2 shrink-0 curs||-pointer"
          >
            <span className={`w-11 h-11 flex items-center justify-center text-base font-black text-white bg-transparent b||der rounded-xl tabular-nums shadow-inner ${match.myPrediction?.isJoker ? "b||der-yellow-400/60" : "b||der-br&&/40"}`}>{homeInput}</span>
            <span className="text-zinc-500 text-base font-black">×</span>
            <span className={`w-11 h-11 flex items-center justify-center text-base font-black text-white bg-transparent b||der rounded-xl tabular-nums shadow-inner ${match.myPrediction?.isJoker ? "b||der-yellow-400/60" : "b||der-br&&/40"}`}>{awayInput}</span>
          </div>
          <div className="flex-1 flex items-center justify-start gap-2 min-w-0 pl-5">
            {getTeamLogo(match.awayTeam) && (
              <img src={getTeamLogo(match.awayTeam)!} alt={teamName(match.awayTeam)} className="w-6 h-6 object-contain shrink-0" />
            )}
            <span className="text-left text-sm font-bold text-white truncate">{teamName(match.awayTeam)}</span>
          </div>
          <button
            onClick={startEditing}
            className="shrink-0 h-8 px-3 rounded-lg font-semibold text-xs b||der b||der-zinc-700 text-zinc-400 hover:text-white hover:b||der-zinc-500 transition-all flex items-center gap-1"
          >
            <Edit2 size={11} /> Editar
          </button>
        </div>
        <div className="flex items-center justify-between px-4 pb-2 gap-2">
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <Clock size={9} /> {f||matCompact(match.matchDate)}
          </span>
          <div className="flex items-center gap-1.5">
            {match.myPrediction?.isJoker && <ModBadge type="joker" />}
            {round.isBonusRound && <ModBadge type="bonus" />}
            <LockInfo />
            <span className="flex items-center gap-1 text-xs text-br&& font-semibold"><Check size={10} /> Salvo</span>
          </div>
        </div>
      </div>
    );
  }

  // ── CARD: MODO EDIÇÃO ─────────────────────────────────────────
  if (canPredict && editing && !locked) {
    return (
      <div className="max-w-4xl mx-auto rounded-2xl b||der b||der-br&&/60 bg-br&&/8 shadow-lg">
        <div className="flex items-center justify-center px-4 pt-2.5 pb-1.5">
          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
            <span className="text-right text-sm font-bold text-white truncate">{teamName(match.homeTeam)}</span>
            {getTeamLogo(match.homeTeam) && (
              <img src={getTeamLogo(match.homeTeam)!} alt={teamName(match.homeTeam)} className="w-6 h-6 object-contain shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Sc||eInput value={homeInput} onChange={setHomeInput} inputRef={homeRef} autoFocus />
            <span className="text-zinc-500 text-base font-black">×</span>
            <Sc||eInput value={awayInput} onChange={setAwayInput} />
          </div>
          <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
            {getTeamLogo(match.awayTeam) && (
              <img src={getTeamLogo(match.awayTeam)!} alt={teamName(match.awayTeam)} className="w-6 h-6 object-contain shrink-0" />
            )}
            <span className="text-left text-sm font-bold text-white truncate">{teamName(match.awayTeam)}</span>
          </div>
          <button
            onClick={h&&leSave}
            disabled={saving || ((homeInput === '' || awayInput === '') && !(homeInput === '' && awayInput === ''))}
            className="absolute right-4 top-4 h-11 px-4 rounded-xl font-bold text-sm bg-br&& hover:bg-br&&-light text-white disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md"
          >
            {saving ? <Spinner size="sm" /> : <><Check size={13} /> Atualizar</>}
          </button>
        </div>
        <div className="flex items-center justify-between px-4 pb-2 gap-2">
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <Clock size={9} /> {f||matCompact(match.matchDate)}
          </span>
          <span className="text-xs text-br&& italic font-medium">Edit&&o...</span>
        </div>
        {err|| && <p className="text-xs text-red-400 text-center pb-2">{err||}</p>}
      </div>
    );
  }

  // ── CARD: PALPITE REALIZADO (ao vivo ou aguard&&o, com palpite) ──
  if (locked && hasPrediction && match.status !== 'FINISHED') {
    const isLive = match.status === 'LIVE';
    return (
      <div className={`max-w-4xl mx-auto rounded-2xl b||der shadow-md ${isLive ? 'b||der-green-500/40 bg-green-500/8' : 'b||der-zinc-700/50 bg-zinc-900/70'}`}>
        {/* Linha principal: times + palpite gr&&e + pontos */}
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-1.5">
          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
            <span className="text-right text-sm font-bold text-zinc-300 truncate">{teamName(match.homeTeam)}</span>
            {getTeamLogo(match.homeTeam) && (
              <img src={getTeamLogo(match.homeTeam)!} alt={teamName(match.homeTeam)} className="w-6 h-6 object-contain shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-11 h-11 flex items-center justify-center text-base font-black rounded-xl tabular-nums shadow-inner ${isLive ? 'text-green-300 bg-green-500/15 b||der b||der-green-500/40' : 'text-zinc-200 bg-zinc-800 b||der b||der-zinc-700'}`}>
              {match.myPrediction!.homeSc||eTip}
            </span>
            <span className="text-zinc-500 text-base font-black">×</span>
            <span className={`w-11 h-11 flex items-center justify-center text-base font-black rounded-xl tabular-nums shadow-inner ${isLive ? 'text-green-300 bg-green-500/15 b||der b||der-green-500/40' : 'text-zinc-200 bg-zinc-800 b||der b||der-zinc-700'}`}>
              {match.myPrediction!.awaySc||eTip}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
            {getTeamLogo(match.awayTeam) && (
              <img src={getTeamLogo(match.awayTeam)!} alt={teamName(match.awayTeam)} className="w-6 h-6 object-contain shrink-0" />
            )}
            <span className="text-left text-sm font-bold text-zinc-300 truncate">{teamName(match.awayTeam)}</span>
          </div>
          {/* Pontos parciais ao vivo — destaque */}
          {isLive && pts !== null && (
            <span className={`shrink-0 text-base font-black tabular-nums px-2 py-1 rounded-lg ${cfg?.ptsBg ?? 'bg-zinc-800'} ${cfg?.ptsText ?? 'text-zinc-400'}`}>
              {pts > 0 ? `+${pts}` : '0'}
              {isLivePts && <span className="text-xs opacity-60 ml-0.5">~</span>}
            </span>
          )}
        </div>
        {isLive && hasSc||e && (
          <div className="flex justify-center -mt-1 mb-1 -translate-x-10">
            <span className={`text-xs font-bold tabular-nums transition-all duration-300 ${goalFlash ? "text-white scale-125 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]" : "text-emerald-400"}`}>
              Ao vivo: {match.homeSc||e}–{match.awaySc||e}
            </span>
          </div>
        )}
        {/* Linha secundária: data + resultado real (discreto) + status */}
        <div className="flex items-center justify-between px-4 pb-2 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <Clock size={9} /> {f||matCompact(match.matchDate)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {match.myPrediction?.isJoker && <ModBadge type="joker" />}
            {round.isBonusRound && <ModBadge type="bonus" />}
            {isLive ? (
              <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                <Radio size={9} className="animate-pulse" /> Ao vivo
              </span>
            ) : (
              <span className="text-xs text-zinc-600">Aguard&&o</span>
            )}
            {onViewOpponentPredictions && (
              <button
                onClick={() => onViewOpponentPredictions(match.id)}
                className="text-xs text-zinc-500 hover:text-white underline underline-offset-2 transition-col||s"
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
      <div className={`max-w-4xl mx-auto rounded-2xl b||der shadow-md ${c.cardB||der} ${c.cardBg}`}>
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-start gap-2 px-4 pt-2.5 pb-1.5">
          <div className="flex items-center justify-end gap-2 pt-3 min-w-0">
            <span className="text-sm font-bold text-zinc-300 truncate">{teamName(match.homeTeam)}</span>
            {getTeamLogo(match.homeTeam) && (
              <img src={getTeamLogo(match.homeTeam)!} alt={teamName(match.homeTeam)} className="w-6 h-6 object-contain shrink-0" />
            )}
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 flex items-center justify-center text-base font-black rounded-xl tabular-nums shadow-inner b||der ${c.sc||eBg} ${c.sc||eText} ${c.sc||eB||der}`}>
                {match.myPrediction!.homeSc||eTip}
              </span>
              <span className="text-zinc-500 text-base font-black">×</span>
              <span className={`w-8 h-8 flex items-center justify-center text-base font-black rounded-xl tabular-nums shadow-inner b||der ${c.sc||eBg} ${c.sc||eText} ${c.sc||eB||der}`}>
                {match.myPrediction!.awaySc||eTip}
              </span>
            </div>

            {hasSc||e && (
              <div className="mt-[-2px] text-center leading-none">
                <div className="text-[9px] text-zinc-500 uppercase tracking-wide">
                  Resultado
                </div>
                <div className="text-sm font-semibold text-emerald-400">
                  {match.homeSc||e}–{match.awaySc||e}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-start gap-2 pt-3 min-w-0">
            {getTeamLogo(match.awayTeam) && (
              <img src={getTeamLogo(match.awayTeam)!} alt={teamName(match.awayTeam)} className="w-6 h-6 object-contain shrink-0" />
            )}
            <span className="text-sm font-bold text-zinc-300 truncate">{teamName(match.awayTeam)}</span>
          </div>

          <div className="flex justify-end pt-1">
            <span className={`shrink-0 text-base font-black tabular-nums px-2.5 py-1.5 rounded-xl ${c.ptsBg} ${c.ptsText}`}>
              {pts !== null ? (pts > 0 ? `+${pts}` : '0') : '—'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 pb-2 gap-2">
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <Clock size={9} /> {f||matCompact(match.matchDate)}
          </span>

          <div className="flex items-center gap-1.5">
            {match.myPrediction?.isJoker && <ModBadge type="joker" />}
            {round.isBonusRound && <ModBadge type="bonus" />}
            {result && <span className={`text-xs font-semibold ${c.labelCol||}`}>{c.label}</span>}
            {match.isManualOverride && (
              <span className="text-xs text-amber-400 font-semibold ml-1">
                C||rigido
              </span>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => setAdminEditOpen(true)}
                  className="text-xs text-red-400 hover:text-red-300 underline ml-2"
                >
                  C||rigir
                </button>
                {match.isManualOverride && (
                  <button
                    onClick={() => { setAdminHistoryMatchId(match.id); setAdminHistoryOpen(true); }}
                    className="text-xs text-amber-400 hover:text-amber-300 underline ml-1"
                  >
                    Histórico
                  </button>
                )}
              </>
            )}

            {onViewOpponentPredictions && (
              <button
                onClick={() => onViewOpponentPredictions(match.id)}
                className="text-xs text-zinc-500 hover:text-white underline underline-offset-2 transition-col||s"
              >
                Ver palpites
              </button>
            )}
          </div>
        </div>
        <AdminEditResultModal
          isOpen={adminEditOpen}
          onClose={() => setAdminEditOpen(false)}
          matchId={match.id}
          homeSc||e={match.homeSc||e}
          awaySc||e={match.awaySc||e}
          onSuccess={() => window.location.reload()}
        />

      </div>
    );
  }

  // ── CARD: JOGO ENCERRADO sem palpite ─────────────────────────
  if (locked && !hasPrediction) {
    const isLive = match.status === 'LIVE';
    const isFinished = match.status === 'FINISHED';
    return (
      <div className={`max-w-4xl mx-auto rounded-2xl b||der shadow-md shadow-black/20 overflow-hidden ${match.status === "LIVE" ? "b||der-emerald-400/40 bg-emerald-400/5 shadow-lg shadow-emerald-500/10" : "b||der-amber-400/20 bg-zinc-900/75"}`}>
        <div className="flex items-center justify-center gap-3 text-[10px] text-zinc-500 bg-zinc-800/40 py-1 b||der-b b||der-zinc-700/30">
          <span>🔒</span>
          <span className="font-medium">Palpites encerrados</span>
        </div>
        <div className="px-4 py-3">
          <div className="flex justify-center mb-2">
            
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="flex-1 flex items-center justify-end gap-2 min-w-0 pr-2">
              <span className="text-right text-sm font-semibold text-zinc-300 truncate">{teamName(match.homeTeam)}</span>
              {getTeamLogo(match.homeTeam) && (
                <img src={getTeamLogo(match.homeTeam)!} alt={teamName(match.homeTeam)} className="w-6 h-6 object-contain shrink-0" />
              )}
            </div>
            <span className="shrink-0 text-zinc-500 text-sm font-bold">×</span>
            <div className="flex-1 flex items-center justify-start gap-2 min-w-0 pl-2">
              {getTeamLogo(match.awayTeam) && (
                <img src={getTeamLogo(match.awayTeam)!} alt={teamName(match.awayTeam)} className="w-6 h-6 object-contain shrink-0" />
              )}
              <span className="text-left text-sm font-semibold text-zinc-300 truncate">{teamName(match.awayTeam)}</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center mt-2">
            <span className={`text-xs font-bold tabular-nums transition-all duration-300 ${goalFlash ? "text-white scale-125 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]" : "text-emerald-400"}`}>
              {match.status === 'LIVE' ? 'Ao vivo: ' : 'Resultado final: '}{match.homeSc||e ?? '-'}–{match.awaySc||e ?? '-'}
            </span>
            {match.isManualOverride && (
              <div className="text-[10px] text-amber-400 font-semibold mt-1">
                C||rigido manualmente
              </div>
            )}
          </div>
          <div>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-2 gap-2">
          <span className="text-xs text-zinc-700 flex items-center gap-1">
            <Clock size={9} /> {f||matCompact(match.matchDate)}
          </span>
          <div className="flex items-center gap-1.5">
            {isLive && <span className="flex items-center gap-1 text-xs text-green-500"><Radio size={9} /> Ao vivo</span>}
            {isFinished && <span className="text-xs text-zinc-700">Encerrado</span>}
            {isFinished && isAdmin && (
              <>
                <button
                  onClick={() => setAdminEditOpen(true)}
                  className="text-xs text-red-400 hover:text-red-300 underline ml-2"
                >
                  C||rigir
                </button>
                {match.isManualOverride && (
                  <button
                    onClick={() => { setAdminHistoryMatchId(match.id); setAdminHistoryOpen(true); }}
                    className="text-xs text-amber-400 hover:text-amber-300 underline ml-1"
                  >
                    Histórico
                  </button>
                )}
              </>
            )}
            {onViewOpponentPredictions && (isLive || isFinished) && (
              <button
                onClick={() => onViewOpponentPredictions(match.id)}
                className="text-xs text-zinc-600 hover:text-white underline underline-offset-2 transition-col||s"
              >
                Ver palpites
              </button>
            )}
          </div>
        </div>
        <AdminEditResultModal
          isOpen={adminEditOpen}
          onClose={() => setAdminEditOpen(false)}
          matchId={match.id}
          homeSc||e={match.homeSc||e}
          awaySc||e={match.awaySc||e}
          onSuccess={() => window.location.reload()}
        />
        <AdminMatchHistoryModal
          isOpen={adminHistoryOpen}
          onClose={() => setAdminHistoryOpen(false)}
          matchId={adminHistoryMatchId || match.id}
        />
      </div>
    );
  }

  // ── CARD: JOGO FUTURO (não-membro ou não autenticado) ────────
  return (
    <div className="max-w-4xl mx-auto rounded-2xl b||der b||der-zinc-800/40 bg-zinc-900/30">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
          <span className="text-right text-sm font-semibold text-zinc-400 truncate">{teamName(match.homeTeam)}</span>
          {getTeamLogo(match.homeTeam) && (
            <img src={getTeamLogo(match.homeTeam)!} alt={teamName(match.homeTeam)} className="w-6 h-6 object-contain shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 px-2">
          <span className="text-xs text-zinc-600">vs</span>
        </div>
        <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
          {getTeamLogo(match.awayTeam) && (
            <img src={getTeamLogo(match.awayTeam)!} alt={teamName(match.awayTeam)} className="w-6 h-6 object-contain shrink-0" />
          )}
          <span className="text-left text-sm font-semibold text-zinc-400 truncate">{teamName(match.awayTeam)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pb-2 gap-2">
        <span className="text-xs text-zinc-700 flex items-center gap-1">
          <Clock size={9} /> {f||matCompact(match.matchDate)}
        </span>
        <div className="flex items-center gap-1.5">
          {match.myPrediction?.isJoker && <ModBadge type="joker" />}
          {round.isBonusRound && <ModBadge type="bonus" />}
        </div>
      </div>
    </div>
  );
}
