// ESPN public JSON API — free, keyless, CORS-enabled. Undocumented/unofficial,
// so every call degrades gracefully: game logs fall back to simulated demo data.
//
// Raw gamelog responses are ~300-650KB each, so we cache the small PARSED
// results in localStorage (10 min TTL), never the raw JSON.
import { SPORTS } from '../lib/sports'
import { generateDemoLog } from './demoData'

const TTL_MS = 10 * 60 * 1000
const CACHE_PREFIX = 'statlyne:espn:'
const FETCH_TIMEOUT_MS = 12000

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { t, data } = JSON.parse(raw)
    if (Date.now() - t > TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return data
  } catch {
    return null
  }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), data }))
  } catch {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  }
}

async function fetchJson(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`ESPN ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Search players within the active sport/league. Parsed results cached. */
export async function searchPlayers(query, sport) {
  const cfg = SPORTS[sport]
  const cacheKey = `q:${sport}:${query.toLowerCase()}`
  const hit = cacheGet(cacheKey)
  if (hit) return hit

  const d = await fetchJson(
    `https://site.web.api.espn.com/apis/search/v2?region=us&lang=en&limit=20&query=${encodeURIComponent(query)}`,
  )
  const items = (d.results || []).flatMap((r) => r.contents || [])
  const players = items
    .filter(
      (i) =>
        i.type === 'player' &&
        i.sport === cfg.searchSport &&
        (!cfg.searchLeague || i.defaultLeagueSlug === cfg.searchLeague),
    )
    .map((i) => ({
      id: i.uid?.match(/a:(\d+)/)?.[1],
      name: i.displayName,
      team: i.subtitle || '',
      position: '',
    }))
    .filter((p) => p.id)
  cacheSet(cacheKey, players)
  return players
}

/**
 * Per-game log, newest first, normalized to
 * { date, opponent, home, team, <catKey>: number, ... }.
 * Returns { games, available, team, demo } — `available` lists the stat
 * category keys actually present for this player (NFL/MLB vary by position).
 */
export async function getGameLog(player, sport, n = 20) {
  const cfg = SPORTS[sport]
  const cacheKey = `log:${sport}:${player.id}`
  const hit = cacheGet(cacheKey)
  if (hit) return hit

  if (cfg.special === 'wc') return getWorldCupLog(player, cfg, cacheKey, n)

  try {
    const d = await fetchJson(
      `https://site.web.api.espn.com/apis/common/v3/sports/${cfg.gamelog}/athletes/${player.id}/gamelog`,
    )
    const names = d.names || []
    const idx = {}
    for (const c of cfg.cats) {
      const i = names.indexOf(c.espn)
      if (i >= 0) idx[c.key] = { i, split: c.split }
    }
    if (!Object.keys(idx).length) throw new Error('no stat columns')

    const seen = new Set()
    const entries = []
    for (const st of d.seasonTypes || []) {
      for (const cat of st.categories || []) {
        for (const ev of cat.events || []) {
          if (seen.has(ev.eventId)) continue
          seen.add(ev.eventId)
          const meta = d.events?.[ev.eventId]
          if (!meta?.gameDate) continue
          if (cfg.leagueFilter && meta.leagueAbbreviation !== cfg.leagueFilter) continue
          const entry = {
            date: meta.gameDate.slice(0, 10),
            opponent: meta.opponent?.abbreviation || meta.opponent?.displayName || '—',
            home: meta.atVs === 'vs',
            team: meta.team?.abbreviation || '',
          }
          for (const [k, { i, split }] of Object.entries(idx)) {
            let v = ev.stats?.[i] ?? '0'
            if (split) v = String(v).split('-')[0]
            entry[k] = parseFloat(v) || 0
          }
          entries.push(entry)
        }
      }
    }
    if (!entries.length) throw new Error('empty log')
    entries.sort((a, b) => (a.date < b.date ? 1 : -1))
    const games = entries.slice(0, n)
    const result = { games, available: Object.keys(idx), team: games[0]?.team || '', demo: false }
    cacheSet(cacheKey, result)
    return result
  } catch {
    // not cached: a transient ESPN failure shouldn't pin demo data for 10 min
    const games = generateDemoLog(player, sport, n)
    return { games, available: cfg.cats.map((c) => c.key), team: player.team || '', demo: true }
  }
}

// --- Matchups & game props ----------------------------------------------

/**
 * Games around now (yesterday -> +8 days) for the sport's league.
 * Returns [{ id, date, time, status, detail, home, away, homeScore, awayScore }]
 * where home/away = { id, abbr, name, logo }.
 */
export async function getMatchups(sport) {
  const cfg = SPORTS[sport]
  const cacheKey = `matchups:${sport}`
  const hit = cacheGet(cacheKey)
  if (hit) return hit

  const fmt = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')
  const from = new Date(Date.now() - 1 * 86400000)
  const to = new Date(Date.now() + 8 * 86400000)
  const d = await fetchJson(
    `https://site.api.espn.com/apis/site/v2/sports/${cfg.scoreboard}/scoreboard?dates=${fmt(from)}-${fmt(to)}&limit=100`,
  )
  const games = []
  for (const ev of d.events || []) {
    const comp = ev.competitions?.[0]
    const cs = comp?.competitors || []
    const h = cs.find((c) => c.homeAway === 'home')
    const a = cs.find((c) => c.homeAway === 'away')
    if (!h?.team?.id || !a?.team?.id) continue
    const mk = (c) => ({
      id: c.team.id,
      abbr: c.team.abbreviation || c.team.shortDisplayName || '?',
      name: c.team.shortDisplayName || c.team.displayName || '',
      logo: c.team.logo || '',
    })
    games.push({
      id: ev.id,
      date: ev.date,
      status: ev.status?.type?.state || 'pre', // pre | in | post
      detail: ev.status?.type?.shortDetail || '',
      home: mk(h),
      away: mk(a),
      homeScore: Number(h.score?.value ?? h.score) || 0,
      awayScore: Number(a.score?.value ?? a.score) || 0,
    })
  }
  games.sort((x, y) => (x.date > y.date ? 1 : -1))
  cacheSet(cacheKey, games)
  return games
}

/**
 * A team's completed games, newest first:
 * [{ date, opponent, home, for: n, against: n, total: n }]
 */
export async function getTeamRecent(sport, teamId, n = 10) {
  const cfg = SPORTS[sport]
  const cacheKey = `team:${sport}:${teamId}`
  const hit = cacheGet(cacheKey)
  if (hit) return hit

  try {
    const d = await fetchJson(
      `https://site.api.espn.com/apis/site/v2/sports/${cfg.scoreboard}/teams/${teamId}/schedule`,
    )
    const out = []
    for (const ev of d.events || []) {
      const comp = ev.competitions?.[0]
      if (!comp?.status?.type?.completed) continue
      const cs = comp.competitors || []
      const us = cs.find((c) => String(c.team?.id) === String(teamId))
      const them = cs.find((c) => String(c.team?.id) !== String(teamId))
      if (!us || !them) continue
      const forV = Number(us.score?.value ?? us.score)
      const agV = Number(them.score?.value ?? them.score)
      if (!Number.isFinite(forV) || !Number.isFinite(agV)) continue
      out.push({
        date: ev.date?.slice(0, 10) || '',
        opponent: them.team?.abbreviation || '?',
        home: us.homeAway === 'home',
        for: forV,
        against: agV,
        total: forV + agV,
      })
    }
    out.sort((a, b) => (a.date < b.date ? 1 : -1))
    const recent = out.slice(0, n)
    cacheSet(cacheKey, recent)
    return recent
  } catch {
    return []
  }
}

// --- FIFA World Cup 2026 ------------------------------------------------
// ESPN has no athlete gamelog for the World Cup, so we assemble one:
// scoreboard (one cached call, all matches) + the athlete's eventlog +
// a small per-match statistics payload for each match they played.

const WC_DATES = '20260601-20260731'

async function getWCScoreboardMap() {
  const cacheKey = 'wc:scoreboard'
  const hit = cacheGet(cacheKey)
  if (hit) return hit
  const d = await fetchJson(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${WC_DATES}&limit=250`,
  )
  const map = {}
  for (const ev of d.events || []) {
    const comps = ev.competitions?.[0]?.competitors || []
    const home = comps.find((c) => c.homeAway === 'home')
    const away = comps.find((c) => c.homeAway === 'away')
    if (!home || !away) continue
    map[ev.id] = {
      date: ev.date?.slice(0, 10) || '',
      completed: !!ev.status?.type?.completed,
      home: { id: home.team?.id, abbr: home.team?.abbreviation || home.team?.shortDisplayName },
      away: { id: away.team?.id, abbr: away.team?.abbreviation || away.team?.shortDisplayName },
    }
  }
  cacheSet(cacheKey, map)
  return map
}

function pickWCStats(splits, cats) {
  const flat = {}
  for (const cat of splits?.categories || []) {
    for (const s of cat.stats || []) flat[s.name] = s.value
  }
  const out = {}
  for (const c of cats) out[c.key] = Number(flat[c.espn]) || 0
  return out
}

async function getWorldCupLog(player, cfg, cacheKey, n) {
  try {
    const [scoreboard, eventlog] = await Promise.all([
      getWCScoreboardMap(),
      fetchJson(
        `https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/athletes/${player.id}/eventlog?limit=20`,
      ),
    ])
    const items = (eventlog.events?.items || []).filter((i) => i.played && i.statistics?.$ref)
    if (!items.length) throw new Error('no WC appearances')

    // fetch per-match stats with a small concurrency cap
    const entries = []
    let idx = 0
    await Promise.all(
      Array.from({ length: Math.min(3, items.length) }, async () => {
        while (idx < items.length) {
          const item = items[idx++]
          try {
            const stats = await fetchJson(item.statistics.$ref.replace('http://', 'https://'))
            const eventId = item.event?.$ref?.match(/events\/(\d+)/)?.[1]
            const meta = scoreboard[eventId]
            if (!meta?.completed) continue
            const isHome = String(meta.home.id) === String(item.teamId)
            entries.push({
              date: meta.date,
              opponent: isHome ? meta.away.abbr : meta.home.abbr,
              home: isHome,
              team: isHome ? meta.home.abbr : meta.away.abbr,
              ...pickWCStats(stats.splits, cfg.cats),
            })
          } catch {
            /* skip a match we can't fetch */
          }
        }
      }),
    )
    if (!entries.length) throw new Error('no parsed WC matches')
    entries.sort((a, b) => (a.date < b.date ? 1 : -1))
    const games = entries.slice(0, n)
    const result = { games, available: cfg.cats.map((c) => c.key), team: games[0]?.team || '', demo: false }
    cacheSet(cacheKey, result)
    return result
  } catch {
    const games = generateDemoLog(player, 'wc', n)
    return { games, available: cfg.cats.map((c) => c.key), team: player.team || '', demo: true }
  }
}
