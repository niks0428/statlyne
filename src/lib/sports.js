// Per-sport configuration: ESPN paths, prop stat categories, demo-fallback params.
// `espn` is the stat name in ESPN's gamelog `names` array; `split: true` means the
// value arrives as "made-attempted" (e.g. "3-10") and we take the first number.
// `mean` drives the simulated-log fallback when ESPN is unreachable.

export const SPORTS = {
  nba: {
    label: 'NBA',
    emoji: '🏀',
    gamelog: 'basketball/nba',
    scoreboard: 'basketball/nba',
    unit: 'PTS',
    headshot: 'nba',
    searchSport: 'basketball',
    searchLeague: 'nba',
    cats: [
      { key: 'pts', espn: 'points', short: 'PTS', label: 'Points', mean: 22 },
      { key: 'reb', espn: 'totalRebounds', short: 'REB', label: 'Rebounds', mean: 7 },
      { key: 'ast', espn: 'assists', short: 'AST', label: 'Assists', mean: 5 },
      { key: 'fg3m', espn: 'threePointFieldGoalsMade-threePointFieldGoalsAttempted', short: '3PM', label: 'Threes', mean: 2, split: true },
      { key: 'stl', espn: 'steals', short: 'STL', label: 'Steals', mean: 1.2 },
      { key: 'blk', espn: 'blocks', short: 'BLK', label: 'Blocks', mean: 0.8 },
    ],
    demoOpponents: ['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'GSW', 'HOU', 'LAL', 'MIA', 'MIL', 'NYK', 'OKC', 'PHI', 'PHX', 'SAS'],
  },
  epl: {
    label: 'EPL',
    emoji: '⚽',
    gamelog: 'soccer/all',
    scoreboard: 'soccer/eng.1',
    unit: 'GOALS',
    btts: true,
    headshot: 'soccer',
    searchSport: 'soccer',
    searchLeague: 'eng.1',
    leagueFilter: 'Premier League',
    cats: [
      { key: 'g', espn: 'totalGoals', short: 'GOALS', label: 'Goals', mean: 0.5 },
      { key: 'a', espn: 'goalAssists', short: 'ASSISTS', label: 'Assists', mean: 0.35 },
      { key: 'sh', espn: 'totalShots', short: 'SHOTS', label: 'Shots', mean: 2.4 },
      { key: 'sog', espn: 'shotsOnTarget', short: 'SOT', label: 'Shots on target', mean: 1.1 },
    ],
    demoOpponents: ['ARS', 'AVL', 'BOU', 'BRE', 'BHA', 'CHE', 'CRY', 'EVE', 'FUL', 'LEE', 'LIV', 'MCI', 'MUN', 'NEW', 'NFO', 'SUN', 'TOT', 'WHU', 'WOL'],
  },
  wc: {
    label: 'World Cup',
    emoji: '🏆',
    special: 'wc', // no athlete gamelog endpoint — logs are built from match boxscore stats
    scoreboard: 'soccer/fifa.world',
    unit: 'GOALS',
    btts: true,
    headshot: 'soccer',
    searchSport: 'soccer',
    searchLeague: null, // any soccer player; non-WC players fall back to demo
    cats: [
      { key: 'g', espn: 'totalGoals', short: 'GOALS', label: 'Goals', mean: 0.4 },
      { key: 'a', espn: 'goalAssists', short: 'ASSISTS', label: 'Assists', mean: 0.3 },
      { key: 'sh', espn: 'totalShots', short: 'SHOTS', label: 'Shots', mean: 2.2 },
      { key: 'sog', espn: 'shotsOnTarget', short: 'SOT', label: 'Shots on target', mean: 1.0 },
    ],
    demoOpponents: ['ARG', 'BRA', 'FRA', 'ENG', 'ESP', 'GER', 'POR', 'NED', 'MEX', 'USA', 'CAN', 'NOR', 'ITA', 'CRO', 'MAR', 'JPN', 'KOR', 'AUS', 'COL', 'URU'],
  },
  nfl: {
    label: 'NFL',
    emoji: '🏈',
    gamelog: 'football/nfl',
    scoreboard: 'football/nfl',
    unit: 'PTS',
    headshot: 'nfl',
    searchSport: 'football',
    searchLeague: 'nfl',
    cats: [
      { key: 'payd', espn: 'passingYards', short: 'PASS YDS', label: 'Passing yards', mean: 235 },
      { key: 'patd', espn: 'passingTouchdowns', short: 'PASS TD', label: 'Passing TDs', mean: 1.6 },
      { key: 'ruyd', espn: 'rushingYards', short: 'RUSH YDS', label: 'Rushing yards', mean: 55 },
      { key: 'rutd', espn: 'rushingTouchdowns', short: 'RUSH TD', label: 'Rushing TDs', mean: 0.5 },
      { key: 'rec', espn: 'receptions', short: 'REC', label: 'Receptions', mean: 4.5 },
      { key: 'reyd', espn: 'receivingYards', short: 'REC YDS', label: 'Receiving yards', mean: 55 },
      { key: 'retd', espn: 'receivingTouchdowns', short: 'REC TD', label: 'Receiving TDs', mean: 0.4 },
    ],
    demoOpponents: ['BAL', 'BUF', 'CIN', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'KC', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB'],
  },
  nhl: {
    label: 'NHL',
    emoji: '🏒',
    gamelog: 'hockey/nhl',
    scoreboard: 'hockey/nhl',
    unit: 'GOALS',
    headshot: 'nhl',
    searchSport: 'hockey',
    searchLeague: 'nhl',
    cats: [
      { key: 'g', espn: 'goals', short: 'GOALS', label: 'Goals', mean: 0.45 },
      { key: 'a', espn: 'assists', short: 'ASSISTS', label: 'Assists', mean: 0.6 },
      { key: 'pts', espn: 'points', short: 'PTS', label: 'Points', mean: 1.0 },
      { key: 'sog', espn: 'shotsTotal', short: 'SOG', label: 'Shots on goal', mean: 3.0 },
    ],
    demoOpponents: ['BOS', 'CAR', 'CGY', 'CHI', 'COL', 'DAL', 'DET', 'EDM', 'FLA', 'MIN', 'MTL', 'NSH', 'NYR', 'OTT', 'PIT', 'TB', 'TOR', 'VAN', 'VGK', 'WPG'],
  },
  mlb: {
    label: 'MLB',
    emoji: '⚾',
    gamelog: 'baseball/mlb',
    scoreboard: 'baseball/mlb',
    unit: 'RUNS',
    headshot: 'mlb',
    searchSport: 'baseball',
    searchLeague: 'mlb',
    cats: [
      { key: 'h', espn: 'hits', short: 'HITS', label: 'Hits', mean: 1.0 },
      { key: 'r', espn: 'runs', short: 'RUNS', label: 'Runs', mean: 0.7 },
      { key: 'hr', espn: 'homeRuns', short: 'HR', label: 'Home runs', mean: 0.25 },
      { key: 'rbi', espn: 'RBIs', short: 'RBI', label: 'RBIs', mean: 0.8 },
      { key: 'sb', espn: 'stolenBases', short: 'SB', label: 'Stolen bases', mean: 0.2 },
      { key: 'k', espn: 'strikeouts', short: 'K', label: 'Strikeouts', mean: 1.0 },
    ],
    demoOpponents: ['ATL', 'BAL', 'BOS', 'CHC', 'CIN', 'CLE', 'HOU', 'LAD', 'MIL', 'MIN', 'NYM', 'NYY', 'PHI', 'SD', 'SEA', 'SF', 'STL', 'TB', 'TEX', 'TOR'],
  },
}

export const SPORT_KEYS = Object.keys(SPORTS)

export function catBy(sport, key) {
  return SPORTS[sport]?.cats.find((c) => c.key === key)
}

export function statShort(sport, key) {
  return catBy(sport, key)?.short || key.toUpperCase()
}

export function headshotUrl(sport, playerId) {
  return `https://a.espncdn.com/i/headshots/${SPORTS[sport].headshot}/players/full/${playerId}.png`
}
