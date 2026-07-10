// All trend math is computed client-side from raw game logs.

export const STAT_CATEGORIES = [
  { key: 'pts', label: 'Points', short: 'PTS' },
  { key: 'reb', label: 'Rebounds', short: 'REB' },
  { key: 'ast', label: 'Assists', short: 'AST' },
  { key: 'fg3m', label: 'Threes', short: '3PM' },
]

export function statLabel(key) {
  return STAT_CATEGORIES.find((s) => s.key === key)?.short || key.toUpperCase()
}

/** Suggested line = average of last 10 games rounded to nearest 0.5. Not a real sportsbook price. */
export function suggestedLine(games, stat) {
  const vals = games.slice(0, 10).map((g) => g[stat])
  if (!vals.length) return 0.5
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.max(0.5, Math.round(avg * 2) / 2)
}

/** Hit rate for over/under vs a line. Returns { hits, total, pct }. */
export function hitRate(games, stat, line, dir = 'over') {
  const total = games.length
  if (!total) return { hits: 0, total: 0, pct: 0 }
  const hits = games.filter((g) => (dir === 'over' ? g[stat] > line : g[stat] < line)).length
  return { hits, total, pct: Math.round((hits / total) * 100) }
}

/** strong (green) >= 70%, mixed (amber) 50-69%, weak (grey) < 50% */
export function trendTier(pct) {
  if (pct >= 70) return 'strong'
  if (pct >= 50) return 'mixed'
  return 'weak'
}

export function average(games, stat) {
  if (!games.length) return 0
  return games.reduce((a, g) => a + g[stat], 0) / games.length
}
