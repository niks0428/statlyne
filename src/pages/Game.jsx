import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getMatchups, getTeamRecent, getTeamRoster } from '../api/espn'
import { SPORTS } from '../lib/sports'
import { trendTier } from '../lib/trends'
import { Avatar, TrendBadge, BarChart, LineStepper, Spinner } from '../components/ui'
import { useStore } from '../store/useStore'

const roundHalf = (x) => Math.round(x * 2) / 2
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

function kickoff(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** merge two team samples by date, newest first */
function mergeByDate(a, b, n = 12) {
  return [...a, ...b].sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, n)
}

/**
 * Prop kinds:
 *  - 'ou':     numeric sample [{date, v}] vs an adjustable line; over/under
 *  - 'choice': fixed outcomes, each with its own precomputed hits/total/pct
 */
function PropCard({ prop, sport, game }) {
  const lineKey = `game:${sport}:${game.id}:${prop.key}`
  const storeLine = useStore((s) => s.lines[lineKey])
  const setLine = useStore((s) => s.setLine)
  const addLeg = useStore((s) => s.addLeg)
  const [dir, setDir] = useState(prop.kind === 'choice' ? prop.choices[0].key : 'over')
  const [added, setAdded] = useState(false)

  const line = prop.kind === 'ou' ? (storeLine ?? prop.book ?? prop.suggested) : null

  const { hits, total, pct, dirLabel } = useMemo(() => {
    if (prop.kind === 'choice') {
      const c = prop.choices.find((x) => x.key === dir) || prop.choices[0]
      return { hits: c.hits, total: c.total, pct: c.pct, dirLabel: c.label }
    }
    const t = prop.sample.length
    const h = prop.sample.filter((g) => (dir === 'over' ? g.v > line : g.v < line)).length
    return { hits: h, total: t, pct: t ? Math.round((h / t) * 100) : 0, dirLabel: dir }
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
      dir: dirLabel,
      hitPct: pct,
      hits,
      total,
      demo: false,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  const toggles = prop.kind === 'choice' ? prop.choices.map((c) => ({ key: c.key, text: c.label })) : [
    { key: 'over', text: 'over' },
    { key: 'under', text: 'under' },
  ]

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
              {hits}/{total} {dirLabel}
            </TrendBadge>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex rounded-lg border border-edge overflow-hidden">
            {toggles.map((t) => (
              <button
                key={t.key}
                onClick={() => setDir(t.key)}
                className={`px-2.5 py-1.5 text-xs font-bold uppercase ${
                  dir === t.key ? 'bg-volt-500 text-ink-950' : 'bg-ink-800 text-mist'
                }`}
              >
                {t.text}
              </button>
            ))}
          </div>
          {prop.kind === 'ou' && (
            <LineStepper compact value={line} min={prop.min ?? 0.5} onChange={(v) => setLine(lineKey, v)} />
          )}
        </div>
      </div>

      {prop.kind === 'ou' && (
        <>
          <p className="mt-1.5 text-right text-[9px] uppercase tracking-widest text-mist/60">
            {prop.book != null
              ? `${prop.bookProvider} line ${prop.book} · trend model suggests ${prop.suggested}`
              : `Suggested line ${prop.suggested} — not a real sportsbook price`}
          </p>
          {!prop.noChart && (
            <div className="mt-2">
              <BarChart games={prop.sample} stat="v" line={line} dir={dir} height={60} animate={false} />
            </div>
          )}
        </>
      )}

      <button
        onClick={add}
        className={`mt-3 w-full rounded-xl py-2.5 font-display font-bold uppercase tracking-wider transition-colors ${
          added ? 'bg-volt-600 text-ink-950' : 'bg-volt-500 text-ink-950 active:bg-volt-600'
        }`}
      >
        {added ? '✓ Added to slip' : `Add ${dirLabel}${line != null ? ` ${line}` : ''} ${prop.short} to parlay`}
      </button>
    </section>
  )
}

function PlayersSection({ sport, game }) {
  const navigate = useNavigate()
  const [side, setSide] = useState('away')
  const [rosters, setRosters] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      getTeamRoster(sport, game.away.id),
      getTeamRoster(sport, game.home.id),
    ]).then(([away, home]) => alive && setRosters({ away, home }))
    return () => {
      alive = false
    }
  }, [sport, game])

  if (!rosters) return <Spinner label="Loading rosters" />
  const list = rosters[side]
  if (!rosters.away.length && !rosters.home.length)
    return <p className="py-6 text-center text-sm text-mist">Rosters unavailable for this game.</p>

  return (
    <div>
      <div className="flex gap-1.5 pb-2">
        {['away', 'home'].map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`flex-1 rounded-lg border px-2.5 py-2 font-display font-bold uppercase tracking-wider text-sm ${
              side === s ? 'border-volt-500/60 bg-volt-500/15 text-volt-500' : 'border-edge bg-ink-800 text-mist'
            }`}
          >
            {game[s].abbr} · {game[s].name}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {list.length === 0 && <p className="py-4 text-center text-sm text-mist">Roster unavailable.</p>}
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/research/${sport}/${p.id}`, { state: { player: { ...p, team: game[side].abbr } } })}
            className="flex w-full items-center gap-3 rounded-xl border border-edge bg-ink-800/70 px-3 py-2 text-left active:bg-ink-700"
          >
            <Avatar name={p.name} sport={sport} playerId={p.id} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-white">{p.name}</span>
              <span className="text-[11px] text-mist">
                {game[side].abbr}
                {p.position ? ` · ${p.position}` : ''}
              </span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-volt-500">props →</span>
          </button>
        ))}
      </div>
    </div>
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
        const all = await getMatchups(sport)
          .then((d) => d.games)
          .catch(() => [])
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
    const soccer = !!cfg.btts
    const unit = cfg.unit.toLowerCase()
    const sample = (arr, pick) => arr.map((g) => ({ date: g.date, v: pick(g) }))
    const pctOf = (arr, pred) => {
      const h = arr.filter(pred).length
      return { hits: h, total: arr.length, pct: arr.length ? Math.round((h / arr.length) * 100) : 0 }
    }
    const out = []

    const totals = mergeByDate(sample(homeRec, (g) => g.total), sample(awayRec, (g) => g.total))
    if (totals.length >= 4)
      out.push({
        kind: 'ou',
        key: 'total',
        label: `Match total ${unit}`,
        short: `TOTAL ${cfg.unit}`,
        sample: totals,
        suggested: Math.max(0.5, roundHalf(avg(totals.map((g) => g.v)))),
        book: game.status === 'pre' ? (game.odds?.overUnder ?? null) : null,
        bookProvider: game.odds?.provider,
      })

    // result: each side's win rate in their own recent games (+ draw rate for soccer)
    if (homeRec.length >= 3 && awayRec.length >= 3) {
      const choices = [
        { key: 'away', label: `${game.away.abbr} win`, ...pctOf(awayRec, (g) => g.for > g.against) },
      ]
      if (soccer) {
        const draws = [...homeRec, ...awayRec]
        choices.push({ key: 'draw', label: 'draw', ...pctOf(draws, (g) => g.for === g.against) })
      }
      choices.push({ key: 'home', label: `${game.home.abbr} win`, ...pctOf(homeRec, (g) => g.for > g.against) })
      out.push({ kind: 'choice', key: 'result', label: 'Result', short: 'RESULT', choices })
    }

    if (soccer && totals.length >= 4) {
      const both = [...homeRec, ...awayRec]
      out.push({
        kind: 'choice',
        key: 'btts',
        label: 'Both teams to score',
        short: 'BTTS',
        choices: [
          { key: 'yes', label: 'yes', ...pctOf(both, (g) => g.for > 0 && g.against > 0) },
          { key: 'no', label: 'no', ...pctOf(both, (g) => g.for === 0 || g.against === 0) },
        ],
      })
    }

    for (const [key, team, rec] of [
      ['away', game.away, awayRec],
      ['home', game.home, homeRec],
    ]) {
      if (rec.length < 3) continue
      const forS = sample(rec, (g) => g.for)
      out.push({
        kind: 'ou',
        key: `${key}_total`,
        label: `${team.abbr} ${unit}`,
        short: `${team.abbr} ${cfg.unit}`,
        sample: forS,
        suggested: Math.max(0.5, roundHalf(avg(forS.map((g) => g.v)))),
      })
      const marginS = sample(rec, (g) => g.for - g.against)
      out.push({
        kind: 'ou',
        key: `${key}_margin`,
        label: `${team.abbr} margin`,
        short: `${team.abbr} MARGIN`,
        sample: marginS,
        suggested: roundHalf(avg(marginS.map((g) => g.v))),
        min: -50,
        noChart: true,
      })
      if (soccer)
        out.push({
          kind: 'choice',
          key: `${key}_cs`,
          label: `${team.abbr} clean sheet`,
          short: `${team.abbr} CLEAN SHEET`,
          choices: [
            { key: 'yes', label: 'yes', ...pctOf(rec, (g) => g.against === 0) },
            { key: 'no', label: 'no', ...pctOf(rec, (g) => g.against > 0) },
          ],
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
        {game.status === 'pre' && game.odds?.details && (
          <p className="mt-1 text-center text-[11px] font-semibold text-volt-500">
            {game.odds.provider}: {game.odds.details}
            {game.odds.overUnder ? ` · O/U ${game.odds.overUnder}` : ''}
          </p>
        )}
      </div>

      <p className="mt-3 mb-2 text-[10px] uppercase tracking-widest text-mist">
        Game props · from both teams' recent results
      </p>

      {!recents ? (
        <Spinner label="Crunching team form" />
      ) : props && props.length ? (
        <div className="flex flex-col gap-3">
          {props.map((p) => (
            <PropCard key={p.key} prop={p} sport={sport} game={game} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-mist">
          Not enough recent results for these teams to build props.
        </p>
      )}

      <p className="mt-5 mb-2 text-[10px] uppercase tracking-widest text-mist">
        Players in this game · tap for player props
      </p>
      <div className="pb-6">
        <PlayersSection sport={sport} game={game} />
      </div>
    </main>
  )
}
