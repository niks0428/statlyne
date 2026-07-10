import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getMatchups, getTeamRecent } from '../api/espn'
import { SPORTS } from '../lib/sports'
import { trendTier } from '../lib/trends'
import { TrendBadge, BarChart, LineStepper, Spinner } from '../components/ui'
import { useStore } from '../store/useStore'

function roundHalf(x) {
  return Math.max(0.5, Math.round(x * 2) / 2)
}

function kickoff(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** merge two team samples by date, newest first */
function mergeByDate(a, b, n = 12) {
  return [...a, ...b].sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, n)
}

function PropCard({ prop, sport, game }) {
  const lineKey = `game:${sport}:${game.id}:${prop.key}`
  const storeLine = useStore((s) => s.lines[lineKey])
  const setLine = useStore((s) => s.setLine)
  const addLeg = useStore((s) => s.addLeg)
  const [dir, setDir] = useState(prop.key === 'btts' ? 'yes' : 'over')
  const [added, setAdded] = useState(false)

  const line = prop.key === 'btts' ? null : (storeLine ?? prop.suggested)
  const { hits, total, pct } = useMemo(() => {
    const t = prop.sample.length
    if (!t) return { hits: 0, total: 0, pct: 0 }
    let h
    if (prop.key === 'btts') {
      const yes = prop.sample.filter((g) => g.bothScored).length
      h = dir === 'yes' ? yes : t - yes
    } else {
      h = prop.sample.filter((g) => (dir === 'over' ? g.v > line : g.v < line)).length
    }
    return { hits: h, total: t, pct: Math.round((h / t) * 100) }
  }, [prop, line, dir])

  function add() {
    addLeg({
      key: lineKey,
      sport,
      game: true,
      playerId: null,
      playerName: `${game.away.abbr} @ ${game.home.abbr}`,
      team: '',
      stat: prop.key,
      statLabel: prop.short,
      line,
      dir,
      hitPct: pct,
      hits,
      total,
      demo: false,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <section className="rounded-2xl border border-edge bg-ink-800/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display font-bold uppercase tracking-wide text-white">{prop.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-display font-extrabold text-4xl leading-none ${
                trendTier(pct) === 'strong' ? 'text-volt-500' : trendTier(pct) === 'mixed' ? 'text-amber-hot' : 'text-mist'
              }`}
            >
              {pct}%
            </span>
            <TrendBadge pct={pct}>
              {hits}/{total} {dir}
            </TrendBadge>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex rounded-lg border border-edge overflow-hidden">
            {(prop.key === 'btts' ? ['yes', 'no'] : ['over', 'under']).map((d) => (
              <button
                key={d}
                onClick={() => setDir(d)}
                className={`px-3 py-1.5 text-xs font-bold uppercase ${
                  dir === d ? 'bg-volt-500 text-ink-950' : 'bg-ink-800 text-mist'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          {prop.key !== 'btts' && (
            <LineStepper compact value={line} onChange={(v) => setLine(lineKey, v)} />
          )}
        </div>
      </div>

      {prop.key !== 'btts' && (
        <>
          <p className="mt-1.5 text-right text-[9px] uppercase tracking-widest text-mist/60">
            Suggested line {prop.suggested} — not a real sportsbook price
          </p>
          <div className="mt-2">
            <BarChart games={prop.sample} stat="v" line={line} dir={dir} height={60} animate={false} />
          </div>
        </>
      )}

      <button
        onClick={add}
        className={`mt-3 w-full rounded-xl py-2.5 font-display font-bold uppercase tracking-wider transition-colors ${
          added ? 'bg-volt-600 text-ink-950' : 'bg-volt-500 text-ink-950 active:bg-volt-600'
        }`}
      >
        {added ? '✓ Added to slip' : `Add ${dir}${line != null ? ` ${line}` : ''} ${prop.short} to parlay`}
      </button>
    </section>
  )
}

export default function Game() {
  const { sport, eventId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const cfg = SPORTS[sport]
  const [game, setGame] = useState(location.state?.game || null)
  const [recents, setRecents] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!cfg) return
    let alive = true
    ;(async () => {
      let g = game
      if (!g || String(g.id) !== String(eventId)) {
        const all = await getMatchups(sport).catch(() => [])
        g = all.find((x) => String(x.id) === String(eventId))
        if (!g) {
          if (alive) setFailed(true)
          return
        }
        if (alive) setGame(g)
      }
      const [homeRec, awayRec] = await Promise.all([
        getTeamRecent(sport, g.home.id),
        getTeamRecent(sport, g.away.id),
      ])
      if (alive) setRecents({ homeRec, awayRec })
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, eventId])

  const props = useMemo(() => {
    if (!game || !recents) return null
    const { homeRec, awayRec } = recents
    const toSample = (arr, pick) =>
      arr.map((g) => ({ date: g.date, v: pick(g), bothScored: g.for > 0 && g.against > 0 }))
    const out = []
    const merged = mergeByDate(toSample(homeRec, (g) => g.total), toSample(awayRec, (g) => g.total))
    if (merged.length >= 4) {
      out.push({
        key: 'total',
        label: `Match total ${cfg.unit.toLowerCase()}`,
        short: `TOTAL ${cfg.unit}`,
        sample: merged,
        suggested: roundHalf(merged.reduce((a, g) => a + g.v, 0) / merged.length),
      })
    }
    for (const [key, team, rec] of [
      ['home_total', game.home, homeRec],
      ['away_total', game.away, awayRec],
    ]) {
      const sample = toSample(rec, (g) => g.for)
      if (sample.length >= 3)
        out.push({
          key,
          label: `${team.abbr} ${cfg.unit.toLowerCase()}`,
          short: `${team.abbr} ${cfg.unit}`,
          sample,
          suggested: roundHalf(sample.reduce((a, g) => a + g.v, 0) / sample.length),
        })
    }
    if (cfg.btts && merged.length >= 4) {
      out.push({
        key: 'btts',
        label: 'Both teams to score',
        short: 'BTTS',
        sample: merged,
      })
    }
    return out
  }, [game, recents, cfg])

  if (!cfg) return null
  if (failed)
    return (
      <p className="px-6 py-16 text-center text-sm text-mist">
        Couldn't find that game — it may be outside the current window.
      </p>
    )
  if (!game) return <Spinner label="Loading game" />

  return (
    <main className="pt-4 px-4">
      <button onClick={() => navigate(-1)} className="mb-3 text-xs font-bold uppercase text-mist">
        ← Back
      </button>

      {/* game header */}
      <div className="rounded-2xl border border-edge bg-ink-800/80 p-4">
        <div className="relative flex items-center justify-between">
          {[game.away, game.home].map((t, i) => (
            <div key={i} className="flex flex-col items-center gap-1 w-24">
              {t.logo ? (
                <img src={t.logo} alt="" className="h-12 w-12 object-contain" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-ink-600 border border-edge flex items-center justify-center font-display font-bold">
                  {t.abbr}
                </div>
              )}
              <span className="font-display font-bold uppercase text-white">{t.abbr}</span>
              <span className="text-[9px] text-mist text-center leading-tight">{t.name}</span>
            </div>
          ))}
          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            {game.status === 'pre' ? (
              <span className="font-display font-bold text-mist text-lg">@</span>
            ) : (
              <span className="font-display font-extrabold text-2xl text-white">
                {game.awayScore} – {game.homeScore}
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-mist">
          {SPORTS[sport].emoji} {game.status === 'pre' ? kickoff(game.date) : game.detail}
        </p>
      </div>

      <p className="mt-3 mb-2 text-[10px] uppercase tracking-widest text-mist">
        Game props · from both teams' recent results
      </p>

      {!recents ? (
        <Spinner label="Crunching team form" />
      ) : props && props.length ? (
        <div className="flex flex-col gap-3 pb-6">
          {props.map((p) => (
            <PropCard key={p.key} prop={p} sport={sport} game={game} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-mist">
          Not enough recent results for these teams to build props.
        </p>
      )}
    </main>
  )
}
