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

// ── Mapa de escudos ───────────────────────────────────────────
const TEAM_LOGO_MAP: Record<string, string> = {
  'Flamengo':               'https://r2.thesportsdb.com/images/media/team/badge/syptwx1473538074.png',
  'Palmeiras':              'https://r2.thesportsdb.com/images/media/team/badge/vsqwqp1473538105.png',
  'Corinthians':            'https://r2.thesportsdb.com/images/media/team/badge/vvuvps1473538042.png',
  'São Paulo':              'https://r2.thesportsdb.com/images/media/team/badge/sxpupx1473538135.png',
  'Santos':                 'https://r2.thesportsdb.com/images/media/team/badge/j8xk9g1679447486.png',
  'Grêmio':                 'https://r2.thesportsdb.com/images/media/team/badge/uvpwyt1473538089.png',
  'Internacional':          'https://r2.thesportsdb.com/images/media/team/badge/yprvxx1473538097.png',
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

export function getTeamLogoUrl(teamName: string | null | undefined): string | null {
  if (!teamName) return null;
  if (TEAM_LOGO_MAP[teamName]) return TEAM_LOGO_MAP[teamName];
  const lower = teamName.toLowerCase();
  for (const [key, url] of Object.entries(TEAM_LOGO_MAP)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return url;
    }
  }
  return null;
}

// ── ShieldNormal — escudo retangular pequeno na coluna Jogador ──────────
interface ShieldNormalProps {
  teamName?: string | null;
  size?: number;
}

export const ShieldNormal: React.FC<ShieldNormalProps> = ({ teamName, size = 20 }) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getTeamLogoUrl(teamName);
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
    <div
      className="flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: 'rgba(255,255,255,0.92)',
        padding: '2px',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <img
        src={logoUrl}
        alt={teamName ?? 'escudo'}
        className="w-full h-full object-contain"
        onError={() => setImgError(true)}
        loading="lazy"
      />
    </div>
  );
};

// ── FootballBallSVG — bola de futebol em SVG puro ───────────────────────
// Dois níveis de detalhe controlados por `size`:
//   < 28px → volume esférico + reflexo + escudo (sem painéis — invisíveis nesse tamanho)
//   ≥ 28px → painéis curvos + volume esférico + escudo
interface FootballBallSVGProps {
  size: number;
  logoUrl: string | null;
  teamName?: string | null;
  onImgError: () => void;
}

const FootballBallSVG: React.FC<FootballBallSVGProps> = ({ size, logoUrl, teamName, onImgError }) => {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const isLarge = size >= 28;

  // IDs únicos para evitar conflito entre múltiplas instâncias
  const uid = `fb-${size}-${(teamName ?? 'none').replace(/[^a-z0-9]/gi, '')}`;
  const gradId = `${uid}-grad`;
  const shadowId = `${uid}-shadow`;
  const reflectId = `${uid}-reflect`;
  const clipId = `${uid}-clip`;
  const logoClipId = `${uid}-logoclip`;

  // Tamanho do escudo dentro da bola
  // Pequeno: ocupa ~60% do diâmetro; grande: ~50%
  const logoSize = isLarge ? size * 0.48 : size * 0.58;
  const logoOffset = (size - logoSize) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        {/* Gradiente esférico: luz vinda do canto superior esquerdo */}
        <radialGradient id={gradId} cx="35%" cy="30%" r="65%" fx="30%" fy="25%">
          <stop offset="0%"   stopColor="#e8e8e8" stopOpacity="1" />
          <stop offset="40%"  stopColor="#c0c0c0" stopOpacity="1" />
          <stop offset="75%"  stopColor="#888888" stopOpacity="1" />
          <stop offset="100%" stopColor="#3a3a3a" stopOpacity="1" />
        </radialGradient>

        {/* Sombra interna na borda inferior para reforçar volume */}
        <radialGradient id={shadowId} cx="50%" cy="80%" r="55%" fx="50%" fy="90%">
          <stop offset="0%"   stopColor="#000000" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Reflexo de luz no topo */}
        <radialGradient id={reflectId} cx="38%" cy="22%" r="35%" fx="35%" fy="18%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="60%"  stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Clip circular para a bola inteira */}
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r - 0.5} />
        </clipPath>

        {/* Clip circular para o escudo */}
        <clipPath id={logoClipId}>
          <circle cx={cx} cy={cy} r={logoSize / 2 - 0.5} />
        </clipPath>
      </defs>

      {/* ── Camada 1: base da bola (gradiente esférico) ── */}
      <circle cx={cx} cy={cy} r={r - 0.5} fill={`url(#${gradId})`} />

      {/* ── Camada 2 (apenas versão grande): painéis curvos escuros ── */}
      {isLarge && (
        <g clipPath={`url(#${clipId})`} opacity="0.35">
          {/* Painel central superior — pentágono curvo simplificado */}
          <path
            d={`M ${cx} ${cy - r * 0.55}
                C ${cx + r * 0.35} ${cy - r * 0.55}, ${cx + r * 0.55} ${cy - r * 0.1}, ${cx + r * 0.45} ${cy + r * 0.25}
                C ${cx + r * 0.2} ${cy + r * 0.45}, ${cx - r * 0.2} ${cy + r * 0.45}, ${cx - r * 0.45} ${cy + r * 0.25}
                C ${cx - r * 0.55} ${cy - r * 0.1}, ${cx - r * 0.35} ${cy - r * 0.55}, ${cx} ${cy - r * 0.55} Z`}
            fill="#111111"
          />
          {/* Painel inferior esquerdo */}
          <path
            d={`M ${cx - r * 0.75} ${cy + r * 0.1}
                C ${cx - r * 0.9} ${cy + r * 0.5}, ${cx - r * 0.5} ${cy + r * 0.85}, ${cx - r * 0.1} ${cy + r * 0.85}
                C ${cx - r * 0.35} ${cy + r * 0.5}, ${cx - r * 0.5} ${cy + r * 0.2}, ${cx - r * 0.75} ${cy + r * 0.1} Z`}
            fill="#111111"
          />
          {/* Painel inferior direito */}
          <path
            d={`M ${cx + r * 0.75} ${cy + r * 0.1}
                C ${cx + r * 0.9} ${cy + r * 0.5}, ${cx + r * 0.5} ${cy + r * 0.85}, ${cx + r * 0.1} ${cy + r * 0.85}
                C ${cx + r * 0.35} ${cy + r * 0.5}, ${cx + r * 0.5} ${cy + r * 0.2}, ${cx + r * 0.75} ${cy + r * 0.1} Z`}
            fill="#111111"
          />
        </g>
      )}

      {/* ── Camada 3: sombra inferior para volume ── */}
      <circle cx={cx} cy={cy} r={r - 0.5} fill={`url(#${shadowId})`} clipPath={`url(#${clipId})`} />

      {/* ── Camada 4: escudo do time integrado na bola ── */}
      {logoUrl ? (
        <>
          {/* Fundo branco suave atrás do escudo para legibilidade */}
          <circle
            cx={cx}
            cy={cy}
            r={logoSize / 2 + (isLarge ? 2 : 1)}
            fill="rgba(255,255,255,0.82)"
            clipPath={`url(#${clipId})`}
          />
          <image
            href={logoUrl}
            x={logoOffset}
            y={logoOffset}
            width={logoSize}
            height={logoSize}
            clipPath={`url(#${logoClipId})`}
            preserveAspectRatio="xMidYMid meet"
            onError={onImgError}
          />
        </>
      ) : (
        /* Sem escudo: símbolo ⚽ como texto SVG */
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.42}
          fill="rgba(0,0,0,0.5)"
        >
          ⚽
        </text>
      )}

      {/* ── Camada 5: reflexo de luz no topo (sobre tudo) ── */}
      <circle cx={cx} cy={cy} r={r - 0.5} fill={`url(#${reflectId})`} clipPath={`url(#${clipId})`} />

      {/* ── Camada 6: borda fina para definição ── */}
      <circle
        cx={cx}
        cy={cy}
        r={r - 0.75}
        fill="none"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="1"
      />
    </svg>
  );
};

// ── ShieldBall — bola de futebol com escudo do time ─────────────────────
interface ShieldBallProps {
  teamName?: string | null;
  tooltip?: string;
  size?: number;
}

export const ShieldBall: React.FC<ShieldBallProps> = ({
  teamName,
  tooltip,
  size = 16,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [imgError, setImgError] = useState(false);

  const logoUrl = imgError ? null : getTeamLogoUrl(teamName);

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => tooltip && setShowTooltip(true)}
      onTouchEnd={() => setTimeout(() => setShowTooltip(false), 1500)}
    >
      <FootballBallSVG
        size={size}
        logoUrl={logoUrl}
        teamName={teamName}
        onImgError={() => setImgError(true)}
      />

      {/* Tooltip */}
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
          tooltip={`${win.roundName} — Vitória na rodada`}
          size={size}
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
