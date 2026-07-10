// All trend math is computed client-side from raw game logs.

/** Suggested line = average of the games rounded to nearest 0.5. Not a real sportsbook price. */
export function suggestedLine(games, stat) {
  const vals = games.slice(0, 10).map((g) => g[stat] ?? 0)
  if (!vals.length) return 0.5
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.max(0.5, Math.round(avg * 2) / 2)
}

/** Hit rate for over/under vs a line. Returns { hits, total, pct }. */
export function hitRate(games, stat, line, dir = 'over') {
  const total = games.length
  if (!total) return { hits: 0, total: 0, pct: 0 }
  const hits = games.filter((g) => (dir === 'over' ? (g[stat] ?? 0) > line : (g[stat] ?? 0) < line)).length
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
  return games.reduce((a, g) => a + (g[stat] ?? 0), 0) / games.length
}
