// Deterministic simulated game logs, used when the /stats endpoint is not
// available on the current balldontlie key tier (free tier = teams/players/games
// only). Seeded by player id so every visit shows the same "history".
import { TEAM_ABBRS } from '../lib/teams'

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// mean stat profiles by rough archetype
const PROFILES = {
  G: { pts: 24, reb: 5, ast: 7, fg3m: 3 },
  F: { pts: 22, reb: 8, ast: 4, fg3m: 2 },
  C: { pts: 20, reb: 11, ast: 3, fg3m: 1 },
}

function gaussian(rng) {
  // Box-Muller
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Generate `n` simulated game log entries for a player, newest first.
 * Shape matches what nba.js normalizes real /stats responses into.
 */
export function generateDemoLog(player, n = 20) {
  const rng = mulberry32((player.id || 1) * 2654435761)
  const pos = (player.position || 'G')[0]
  const base = PROFILES[pos] || PROFILES.G
  // per-player skew so two guards don't look identical
  const skew = {
    pts: 1 + (rng() - 0.5) * 0.45,
    reb: 1 + (rng() - 0.5) * 0.5,
    ast: 1 + (rng() - 0.5) * 0.5,
    fg3m: 1 + (rng() - 0.5) * 0.6,
  }
  // a hot/cold streak factor drifting across the season
  let form = 1
  const games = []
  // anchor dates to the end of the most recent season (June 2026 finals)
  const anchor = new Date('2026-06-18T00:00:00Z')
  const ownAbbr = player.team_abbr
  const opponents = TEAM_ABBRS.filter((a) => a !== ownAbbr)

  for (let i = 0; i < n; i++) {
    form = Math.min(1.25, Math.max(0.75, form + (rng() - 0.5) * 0.12))
    const date = new Date(anchor.getTime() - i * 2.4 * 86400000)
    const opp = opponents[Math.floor(rng() * opponents.length)]
    const home = rng() > 0.5
    const entry = { date: date.toISOString().slice(0, 10), opponent: opp, home }
    for (const stat of ['pts', 'reb', 'ast', 'fg3m']) {
      const mean = base[stat] * skew[stat] * form
      const sd = Math.max(1, mean * 0.32)
      entry[stat] = Math.max(0, Math.round(mean + gaussian(rng) * sd))
    }
    games.push(entry)
  }
  return games
}
