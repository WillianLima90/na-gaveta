interface BiggestScoreItem {
  playerName: string;
  points: number;
  roundNumber: number;
}

interface BiggestScoresShareCardProps {
  scores: BiggestScoreItem[];
}

export function BiggestScoresShareCard({ scores }: BiggestScoresShareCardProps) {
  const topScore = scores[0];

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        padding: 72,
        background: 'linear-gradient(180deg, #050505 0%, #0b0b0d 55%, #111111 100%)',
        color: '#ffffff',
        fontFamily: 'Inter, Arial, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          height: '100%',
          borderRadius: 48,
          padding: 56,
          background: 'linear-gradient(180deg, rgba(24,24,27,0.98), rgba(9,9,11,0.99))',
          border: '3px solid rgba(249,115,22,0.55)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.45)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 64, textAlign: 'center', marginBottom: 12 }}>🏆</div><div style={{ fontSize: 28, fontWeight: 900, color: '#f97316', letterSpacing: 6 }}>
            NA GAVETA
          </div>
          <div style={{ fontSize: 66, fontWeight: 950, marginTop: 18, lineHeight: 1 }}>
            Hall da Fama
          </div>
          <div style={{ fontSize: 30, color: '#d4d4d8', marginTop: 18 }}>
            Maior pontuação da história do bolão
          </div>
        </div>

        {topScore && (
          <div
            style={{
              borderRadius: 36,
              padding: 42,
              background: 'linear-gradient(135deg, rgba(249,115,22,0.28), rgba(249,115,22,0.08))',
              border: '2px solid rgba(249,115,22,0.65)',
              marginBottom: 42,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 26, color: '#fb923c', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 3 }}>
              Recorde do Bolão
            </div>
            <div style={{ fontSize: 72, fontWeight: 950, marginTop: 20 }}>
              {topScore.playerName}
            </div>
            <div style={{ fontSize: 92, fontWeight: 950, color: '#f97316', marginTop: 10, lineHeight: 1 }}>
              {topScore.points} pts
            </div>
            <div style={{ fontSize: 30, color: '#e4e4e7', marginTop: 18 }}>
              Rodada {topScore.roundNumber}
            </div>
          </div>
        )}

        <div style={{ fontSize: 28, fontWeight: 900, color: '#e4e4e7', marginBottom: 18 }}>
          Top 5 histórico do bolão
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {scores.slice(0, 5).map((score, index) => (
            <div
              key={`${score.playerName}-${score.roundNumber}-${index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '82px 1fr 160px',
                alignItems: 'center',
                gap: 24,
                padding: '24px 28px',
                borderRadius: 28,
                background: index === 0 ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.06)',
                border: index === 0 ? '2px solid rgba(249,115,22,0.55)' : '2px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 950, color: index === 0 ? '#f59e0b' : '#a1a1aa' }}>
                #{index + 1}
              </div>
              <div>
                <div style={{ fontSize: 34, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {score.playerName}
                </div>
                <div style={{ fontSize: 22, color: '#a1a1aa', marginTop: 6 }}>
                  Rodada {score.roundNumber}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 32, fontWeight: 950, color: index === 0 ? '#f59e0b' : '#ffffff' }}>
                {score.points} pts
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', color: '#a1a1aa', fontSize: 24, marginTop: 34 }}>
          Quem será o próximo a entrar para o Hall da Fama?
        </div>
        <div style={{ textAlign: 'center', color: '#f97316', fontSize: 28, fontWeight: 900, marginTop: 12 }}>
          bolaonagaveta.com.br
        </div>
      </div>
    </div>
  );
}
