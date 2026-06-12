// ============================================================
// ShieldBadge — Componentes de escudo para o Na Gaveta
//
// ShieldBall agora renderiza uma bola de futebol real via SVG:
//   - Versão pequena (<28px): gradiente esférico + reflexo + escudo integrado
//   - Versão grande (≥28px): painéis curvos + gradiente esférico + escudo
//
// A sensação de volume vem de:
//   1. Gradiente radial deslocado (luz no canto sup-esq)
//   2. Sombra interna escura na borda inferior (escurecimento)
//   3. Reflexo branco translúcido no topo
//   4. Escudo integrado com máscara circular
// ============================================================

import React, { useState } from 'react';
import { getTeamLogo } from '../utils/teamDisplay';

// ── Mapa de escudos ───────────────────────────────────────────
const TEAM_LOGO_MAP: Record<string, string> = {
  'Flamengo':               'https://r2.thesportsdb.com/images/media/team/badge/syptwx1473538074.png',
  'Palmeiras':              'https://r2.thesportsdb.com/images/media/team/badge/vsqwqp1473538105.png',
  'Corinthians':            'https://r2.thesportsdb.com/images/media/team/badge/vvuvps1473538042.png',
  'São Paulo':              'https://r2.thesportsdb.com/images/media/team/badge/sxpupx1473538135.png',
  'Santos':                 'https://r2.thesportsdb.com/images/media/team/badge/j8xk9g1679447486.png',
  'Grêmio':                 'https://r2.thesportsdb.com/images/media/team/badge/uvpwyt1473538089.png',
  'Internacional':          'https://r2.thesportsdb.com/images/media/team/badge/yprvxx1473538097.png',
  'CA Mineiro':             'https://r2.thesportsdb.com/images/media/team/badge/x5lixs1743742872.png',
  'Atlético-MG':            'https://r2.thesportsdb.com/images/media/team/badge/x5lixs1743742872.png',
  'Atlético Mineiro':       'https://r2.thesportsdb.com/images/media/team/badge/x5lixs1743742872.png',
  'Cruzeiro':               'https://r2.thesportsdb.com/images/media/team/badge/upsvvu1473538059.png',
  'Botafogo':               'https://r2.thesportsdb.com/images/media/team/badge/bs5mbw1733004596.png',
  'Vasco':                  'https://r2.thesportsdb.com/images/media/team/badge/ynqlxo1630521109.png',
  'Vasco da Gama':          'https://r2.thesportsdb.com/images/media/team/badge/ynqlxo1630521109.png',
  'Fluminense':             'https://r2.thesportsdb.com/images/media/team/badge/stvvwp1473538082.png',
  'Bahia':                  'https://r2.thesportsdb.com/images/media/team/badge/xuvtsv1473539308.png',
  'Fortaleza':              'https://r2.thesportsdb.com/images/media/team/badge/tosmdr1532853458.png',
  'Ceará':                  'https://r2.thesportsdb.com/images/media/team/badge/xuvtsv1473539308.png',
  'Sport':                  'https://r2.thesportsdb.com/images/media/team/badge/tyrbls1545421563.png',
  'Sport Recife':           'https://r2.thesportsdb.com/images/media/team/badge/tyrbls1545421563.png',
  'Athletico-PR':           'https://r2.thesportsdb.com/images/media/team/badge/irzu1u1554237406.png',
  'Athletico Paranaense':   'https://r2.thesportsdb.com/images/media/team/badge/irzu1u1554237406.png',
  'Coritiba':               'https://r2.thesportsdb.com/images/media/team/badge/ywwsyu1473538050.png',
  'Goiás':                  'https://r2.thesportsdb.com/images/media/team/badge/qhfhdp1635869930.png',
  'Cuiabá':                 'https://r2.thesportsdb.com/images/media/team/badge/ykbxfa1766506334.png',
  'Bragantino':             'https://r2.thesportsdb.com/images/media/team/badge/2p7tl41701423595.png',
  'Red Bull Bragantino':    'https://r2.thesportsdb.com/images/media/team/badge/2p7tl41701423595.png',
  'América-MG':             'https://r2.thesportsdb.com/images/media/team/badge/rtpp171752177342.png',
  'América Mineiro':        'https://r2.thesportsdb.com/images/media/team/badge/rtpp171752177342.png',
  'Juventude':              'https://r2.thesportsdb.com/images/media/team/badge/1ntter1766506778.png',
};

export function getTeamLogoUrl(teamName: string | null | undefined, externalLogo?: string | null): string | null {
  if (externalLogo) return externalLogo;
  if (!teamName) return null;

  const logoFromDisplay = getTeamLogo(teamName);
  if (logoFromDisplay) return logoFromDisplay;

  if (TEAM_LOGO_MAP[teamName]) return TEAM_LOGO_MAP[teamName];

  return null;
}

// ── ShieldNormal — escudo retangular pequeno na coluna Jogador ──────────
interface ShieldNormalProps {
  teamName?: string | null;
  externalLogo?: string | null;
  size?: number;
}

export const ShieldNormal: React.FC<ShieldNormalProps> = ({ teamName, externalLogo, size = 20 }) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getTeamLogoUrl(teamName, externalLogo);
  const hasLogo = logoUrl && !imgError;

  if (!hasLogo) {
    return (
      <div
        className="flex-shrink-0 rounded-full flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ fontSize: size * 0.55, lineHeight: 1, opacity: 0.4 }}>⚽</span>
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={teamName ?? 'escudo'}
      className="flex-shrink-0 object-contain"
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
};

// ── ShieldBall — bola de futebol com escudo do time ─────────────────────
interface ShieldBallProps {
  teamName?: string | null;
  externalLogo?: string | null;
  tooltip?: string;
  size?: number;
  roundNumber?: number;
}

export const ShieldBall: React.FC<ShieldBallProps> = ({
  teamName,
  externalLogo,
  tooltip,
  size = 16,
  roundNumber,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [imgError, setImgError] = useState(false);

  const normalizedTeamName = String(teamName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  const customBallUrl =
    normalizedTeamName === 'brasil' || normalizedTeamName === 'brazil'
      ? '/assets/team-balls/brazil-ball.png'
      : normalizedTeamName === 'japan' || normalizedTeamName === 'japao' || normalizedTeamName === 'japão'
        ? '/assets/team-balls/japan-ball.png'
        : normalizedTeamName === 'france' || normalizedTeamName === 'franca' || normalizedTeamName === 'frança'
          ? '/assets/team-balls/franca-ball.png'
          : normalizedTeamName === 'portugal'
            ? '/assets/team-balls/portugal-ball.png'
            : null;

  const logoUrl = imgError ? null : (customBallUrl ?? getTeamLogoUrl(teamName, externalLogo));

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size + 6, height: size + 4 }}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => tooltip && setShowTooltip(true)}
      onTouchEnd={() => setTimeout(() => setShowTooltip(false), 1500)}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={teamName ?? 'time'}
          className={customBallUrl ? "object-contain" : "object-cover rounded-sm"}
          style={customBallUrl ? { width: size, height: size } : { width: size, height: Math.max(10, size * 0.68) }}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <span style={{ fontSize: size * 0.65, lineHeight: 1, opacity: 0.5 }}>⚽</span>
      )}

      {roundNumber && (
        <span
          className="absolute -right-1 -bottom-1 rounded-full bg-zinc-950 text-white font-black tabular-nums border border-white/30 shadow-sm"
          style={{ fontSize: Math.max(6, size * 0.34), lineHeight: 1, padding: '1px 2px' }}
        >
          {roundNumber}
        </span>
      )}

      {showTooltip && tooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 whitespace-nowrap"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="text-white text-xs rounded-lg px-2 py-1 shadow-xl"
            style={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {tooltip}
          </div>
          <div
            className="w-1.5 h-1.5 rotate-45 mx-auto -mt-0.5"
            style={{ background: 'rgba(24,24,27,0.95)' }}
          />
        </div>
      )}
    </div>
  );
};

// ── ShieldBallList — lista de ShieldBall com limitador +X ───────────────
interface ShieldBallListProps {
  wins: Array<{
    roundId: string;
    roundName: string;
    favoriteTeam?: string | null;
    favoriteTeamCrest?: string | null;
    roundNumber?: number;
  }>;
  maxVisible?: number;
  size?: number;
}

export const ShieldBallList: React.FC<ShieldBallListProps> = ({
  wins,
  maxVisible = 5,
  size = 14,
}) => {
  if (!wins || wins.length === 0) return null;

  const visible = wins.slice(0, maxVisible);
  const extra = wins.length - maxVisible;

  return (
    <div className="flex items-center gap-0.5">
      {visible.map((win) => (
        <ShieldBall
          key={win.roundId}
          teamName={win.favoriteTeam}
          externalLogo={win.favoriteTeamCrest}
          tooltip={`${win.roundName} — Vitória na rodada`}
          size={size}
          roundNumber={win.roundNumber}
        />
      ))}
      {extra > 0 && (
        <span
          className="font-semibold tabular-nums"
          style={{ fontSize: Math.max(9, size * 0.65), color: '#71717A', marginLeft: '1px' }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
};

// ── ShieldList — alias legado (compatibilidade com PoolRankingPage) ──────
export const ShieldList = ShieldBallList;

// ── ShieldBadge — default export (alias para ShieldBall) ─────────────────
const ShieldBadge = ShieldBall;
export default ShieldBadge;
