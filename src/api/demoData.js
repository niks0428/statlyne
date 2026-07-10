// Deterministic simulated game logs, used only when ESPN is unreachable or a
// player has no parseable log. Seeded by player id + sport so every visit
// shows the same "history". Always labelled DEMO in the UI.
import { SPORTS } from '../lib/sports'

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

function gaussian(rng) {
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function generateDemoLog(player, sport, n = 20) {
  const cfg = SPORTS[sport]
  const seed = (parseInt(player.id, 10) || 1) * 2654435761 + sport.length * 97
  const rng = mulberry32(seed)

  const skew = {}
  for (const c of cfg.cats) skew[c.key] = 1 + (rng() - 0.5) * 0.5

  let form = 1
  const games = []
  const anchor = new Date()
  const opponents = cfg.demoOpponents

  for (let i = 0; i < n; i++) {
    form = Math.min(1.25, Math.max(0.75, form + (rng() - 0.5) * 0.12))
    const date = new Date(anchor.getTime() - (i + 1) * 4 * 86400000)
    const entry = {
      date: date.toISOString().slice(0, 10),
      opponent: opponents[Math.floor(rng() * opponents.length)],
      home: rng() > 0.5,
      team: player.team || '',
    }
    for (const c of cfg.cats) {
      const mean = c.mean * skew[c.key] * form
      const sd = Math.max(mean * 0.35, Math.min(1, mean)) // low-mean stats stay 0/1/2-ish
      entry[c.key] = Math.max(0, Math.round(mean + gaussian(rng) * sd))
    }
    games.push(entry)
  }
  return games
}
