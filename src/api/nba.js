import { api, ApiError } from './client'
import { generateDemoLog } from './demoData'
import { TEAM_BY_ID } from '../lib/teams'

const STATS_BLOCKED_KEY = 'statlyne:statsBlocked'

export function normalizePlayer(p) {
  return {
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    name: `${p.first_name} ${p.last_name}`,
    position: p.position || '',
    team_id: p.team?.id,
    team_abbr: p.team?.abbreviation || '',
    team_name: p.team?.full_name || '',
  }
}

export async function searchPlayers(query) {
  const res = await api('/players', { search: query, per_page: 25 })
  return res.data.map(normalizePlayer)
}

export async function getPlayer(id) {
  const res = await api(`/players/${id}`)
  return normalizePlayer(res.data)
}

/**
 * Most recent slate of games: walk back from today in widening windows
 * (regular season -> playoffs -> offseason gap) until games are found.
 * Returns { games, lastByTeam } where lastByTeam maps team abbr ->
 * { opponent, date, home } for that team's most recent game.
 */
export async function getRecentGames() {
  const today = new Date()
  const fmt = (d) => d.toISOString().slice(0, 10)
  let games = []
  for (const daysBack of [7, 45, 120]) {
    const start = new Date(today.getTime() - daysBack * 86400000)
    const res = await api('/games', {
      start_date: fmt(start),
      end_date: fmt(today),
      per_page: 100,
    })
    games = res.data
    if (games.length) break
  }
  games.sort((a, b) => (a.date < b.date ? 1 : -1))

  const lastByTeam = {}
  for (const g of games) {
    const home = g.home_team.abbreviation
    const away = g.visitor_team.abbreviation
    if (!lastByTeam[home]) lastByTeam[home] = { opponent: away, date: g.date, home: true }
    if (!lastByTeam[away]) lastByTeam[away] = { opponent: home, date: g.date, home: false }
  }
  return { games, lastByTeam }
}

/**
 * Per-game log for a player, newest first, normalized to
 * { date, opponent, home, pts, reb, ast, fg3m }.
 *
 * Tries the real /stats endpoint. That endpoint needs balldontlie's paid
 * ALL-STAR tier — on 401 we remember that and serve deterministic simulated
 * logs instead, flagged with { demo: true } so the UI can label them.
 */
export async function getGameLog(player, n = 20) {
  const blocked = localStorage.getItem(STATS_BLOCKED_KEY) === '1'
  if (!blocked) {
    try {
      const res = await api('/stats', {
        player_ids: [player.id],
        seasons: [2025],
        per_page: 100,
      })
      const games = res.data
        .filter((s) => s.min && s.min !== '0' && s.min !== '00')
        .map((s) => {
          const home = s.game.home_team_id === player.team_id
          const oppId = home ? s.game.visitor_team_id : s.game.home_team_id
          return {
            date: s.game.date.slice(0, 10),
            opponent: TEAM_BY_ID[oppId] || '???',
            home,
            pts: s.pts ?? 0,
            reb: s.reb ?? 0,
            ast: s.ast ?? 0,
            fg3m: s.fg3m ?? 0,
          }
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, n)
      if (games.length) return { games, demo: false }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.setItem(STATS_BLOCKED_KEY, '1')
      }
      // fall through to demo on any failure
    }
  }
  return { games: generateDemoLog(player, n), demo: true }
}
