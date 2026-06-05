export const TEAM_DISPLAY: Record<string, { name: string; logo: string }> = {
  "CA Mineiro": {
    "name": "Atlético-MG",
    "logo": "https://crests.football-data.org/1766.png"
  },
  "SE Palmeiras": {
    "name": "Palmeiras",
    "logo": "https://crests.football-data.org/1769.png"
  },
  "Coritiba FBC": {
    "name": "Coritiba",
    "logo": "https://crests.football-data.org/4241.png"
  },
  "RB Bragantino": {
    "name": "Bragantino",
    "logo": "https://crests.football-data.org/4286.png"
  },
  "SC Internacional": {
    "name": "Internacional",
    "logo": "https://crests.football-data.org/6684.png"
  },
  "CA Paranaense": {
    "name": "Athletico-PR",
    "logo": "https://crests.football-data.org/1768.png"
  },
  "EC Vitória": {
    "name": "Vitória",
    "logo": "https://crests.football-data.org/1782.png"
  },
  "Clube do Remo": {
    "name": "Remo",
    "logo": "https://crests.football-data.org/4287.png"
  },
  "Fluminense FC": {
    "name": "Fluminense",
    "logo": "https://r2.thesportsdb.com/images/media/team/badge/stvvwp1473538082.png"
  },
  "Grêmio FBPA": {
    "name": "Grêmio",
    "logo": "https://crests.football-data.org/1767.png"
  },
  "Chapecoense AF": {
    "name": "Chapecoense",
    "logo": "https://crests.football-data.org/1772_large.png"
  },
  "Santos FC": {
    "name": "Santos",
    "logo": "https://crests.football-data.org/6685.png"
  },
  "SC Corinthians Paulista": {
    "name": "Corinthians",
    "logo": "https://crests.football-data.org/1779.png"
  },
  "EC Bahia": {
    "name": "Bahia",
    "logo": "https://crests.football-data.org/1777.png"
  },
  "São Paulo FC": {
    "name": "São Paulo",
    "logo": "https://crests.football-data.org/1776.png"
  },
  "CR Flamengo": {
    "name": "Flamengo",
    "logo": "https://crests.football-data.org/1783.png"
  },
  "Mirassol FC": {
    "name": "Mirassol",
    "logo": "https://crests.football-data.org/4364.png"
  },
  "CR Vasco da Gama": {
    "name": "Vasco",
    "logo": "https://crests.football-data.org/1780.png"
  },
  "Botafogo FR": {
    "name": "Botafogo",
    "logo": "https://crests.football-data.org/1770.png"
  },
  "Cruzeiro EC": {
    "name": "Cruzeiro",
    "logo": "https://crests.football-data.org/1771.png"
  }
};

export function getTeamName(name: string): string {
  return TEAM_DISPLAY[name]?.name ?? name;
}

export function getTeamLogo(name: string, externalLogo?: string | null): string | null {
  return externalLogo || TEAM_DISPLAY[name]?.logo || null;
}
