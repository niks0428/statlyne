import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import starPlayers from '../data/starPlayers.json'
import { searchPlayers, getPlayer, getGameLog } from '../api/nba'
import { STAT_CATEGORIES, statLabel, suggestedLine, hitRate, trendTier, average } from '../lib/trends'
import { useStore } from '../store/useStore'
import { Avatar, TrendBadge, DemoTag, DemoBanner, BarChart, LineStepper, Spinner } from '../components/ui'

const chip = (active) =>
  `rounded-lg border px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
    active ? 'border-volt-500/60 bg-volt-500/15 text-volt-500' : 'border-edge bg-ink-800 text-mist active:bg-ink-700'
  }`

function PlayerSearch({ onSelect }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function run(e) {
    e?.preventDefault()
    if (!q.trim() || busy) return
    setBusy(true)
    setErr(null)
    try {
      setResults(await searchPlayers(q.trim()))
    } catch (ex) {
      setErr(ex.status === 429 ? 'Rate limit hit — wait a minute and retry.' : 'Search failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4">
      <form onSubmit={run} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any NBA player…"
          className="flex-1 rounded-xl border border-edge bg-ink-800 px-3.5 py-3 text-sm text-white placeholder:text-mist/60 outline-none focus:border-volt-500/60"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-volt-500 px-4 font-display font-bold uppercase tracking-wide text-ink-950 active:bg-volt-600 disabled:opacity-50"
        >
          {busy ? '…' : 'Go'}
        </button>
      </form>
      {err && <p className="mt-2 text-xs text-amber-hot">{err}</p>}

      {results && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {results.length === 0 && <li className="py-6 text-center text-sm text-mist">No players found.</li>}
          {results.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onSelect(p)}
                className="flex w-full items-center gap-3 rounded-xl border border-edge bg-ink-800/70 px-3 py-2.5 text-left active:bg-ink-700"
              >
                <Avatar name={p.name} />
                <span>
                  <span className="block font-semibold text-white">{p.name}</span>
                  <span className="text-[11px] text-mist">
                    {p.team_name || 'Free agent'}
                    {p.position ? ` · ${p.position}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!results && (
        <div className="mt-5">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-mist">Quick picks</p>
          <div className="flex flex-wrap gap-1.5">
            {starPlayers.slice(0, 12).map((p) => (
              <button key={p.id} onClick={() => onSelect(p)} className={chip(false)}>
                {p.last_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Workstation({ player }) {
  const [searchParams] = useSearchParams()
  const [log, setLog] = useState(null)
  const [stat, setStat] = useState(searchParams.get('stat') || 'pts')
  const [windowN, setWindowN] = useState(10)
  const [venue, setVenue] = useState('all') // all | home | away
  const [vsOpp, setVsOpp] = useState('all')
  const [dir, setDir] = useState('over')
  const [added, setAdded] = useState(false)

  const storeLine = useStore((s) => s.lines[`${player.id}:${stat}`])
  const setStoreLine = useStore((s) => s.setLine)
  const addLeg = useStore((s) => s.addLeg)

  useEffect(() => {
    let alive = true
    setLog(null)
    getGameLog(player).then((r) => alive && setLog(r))
    return () => {
      alive = false
    }
  }, [player])

  const filtered = useMemo(() => {
    if (!log) return []
    return log.games
      .filter((g) => (venue === 'all' ? true : venue === 'home' ? g.home : !g.home))
      .filter((g) => (vsOpp === 'all' ? true : g.opponent === vsOpp))
      .slice(0, windowN)
  }, [log, venue, vsOpp, windowN])

  const suggested = useMemo(
    () => (filtered.length ? suggestedLine(filtered, stat) : 0.5),
    [filtered, stat],
  )
  const line = storeLine ?? suggested
  const { hits, total, pct } = hitRate(filtered, stat, line, dir)
  const avg = average(filtered, stat)
  const opponents = useMemo(
    () => (log ? [...new Set(log.games.map((g) => g.opponent))].sort() : []),
    [log],
  )

  if (!log) return <Spinner label={`Loading ${player.last_name} logs`} />

  function addToParlay() {
    addLeg({
      key: `${player.id}:${stat}`,
      playerId: player.id,
      playerName: player.name,
      teamAbbr: player.team_abbr,
      stat,
      line,
      dir,
      hitPct: pct,
      hits,
      total,
      demo: log.demo,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div className="px-4">
      {log.demo && <div className="-mx-4 mt-3"><DemoBanner /></div>}

      {/* stat chips */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {STAT_CATEGORIES.map((s) => (
          <button key={s.key} onClick={() => setStat(s.key)} className={chip(stat === s.key)}>
            {s.short}
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {[5, 10, 20].map((n) => (
          <button key={n} onClick={() => setWindowN(n)} className={chip(windowN === n)}>
            L{n}
          </button>
        ))}
        <span className="mx-0.5 h-5 w-px bg-edge" />
        {['all', 'home', 'away'].map((v) => (
          <button key={v} onClick={() => setVenue(v)} className={chip(venue === v)}>
            {v}
          </button>
        ))}
        <select
          value={vsOpp}
          onChange={(e) => setVsOpp(e.target.value)}
          className="rounded-lg border border-edge bg-ink-800 px-2 py-1.5 text-xs font-bold uppercase text-mist outline-none"
        >
          <option value="all">vs any</option>
          {opponents.map((o) => (
            <option key={o} value={o}>
              vs {o}
            </option>
          ))}
        </select>
      </div>

      {/* verdict panel */}
      <section className="mt-4 rounded-2xl border border-edge bg-ink-800/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-display font-extrabold text-5xl leading-none ${
                  trendTier(pct) === 'strong' ? 'text-volt-500' : trendTier(pct) === 'mixed' ? 'text-amber-hot' : 'text-mist'
                }`}
              >
                {pct}%
              </span>
              <TrendBadge pct={pct}>
                {hits}/{total} {dir}
              </TrendBadge>
            </div>
            <p className="mt-1 text-[11px] text-mist">
              {statLabel(stat)} avg {avg.toFixed(1)} in this split
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex rounded-lg border border-edge overflow-hidden">
              {['over', 'under'].map((d) => (
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
            <LineStepper compact value={line} onChange={(v) => setStoreLine(player.id, stat, v)} />
          </div>
        </div>
        <p className="mt-1.5 text-right text-[9px] uppercase tracking-widest text-mist/60">
          Suggested line {suggested} — not a real sportsbook price
        </p>

        <div className="mt-3">
          <BarChart games={filtered} stat={stat} line={line} dir={dir} height={90} />
        </div>

        <button
          onClick={addToParlay}
          className={`mt-4 w-full rounded-xl py-3 font-display text-lg font-bold uppercase tracking-wider transition-colors ${
            added ? 'bg-volt-600 text-ink-950' : 'bg-volt-500 text-ink-950 active:bg-volt-600'
          }`}
        >
          {added ? '✓ Added to slip' : `Add ${dir} ${line} ${statLabel(stat)} to parlay`}
        </button>
      </section>

      {/* game-by-game table */}
      <section className="mt-4 mb-6 overflow-hidden rounded-2xl border border-edge">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-800 text-[10px] uppercase tracking-widest text-mist">
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-2 py-2 text-left font-semibold">Opp</th>
              <th className="px-2 py-2 text-right font-semibold">{statLabel(stat)}</th>
              <th className="px-3 py-2 text-right font-semibold">{dir}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g, i) => {
              const hit = dir === 'over' ? g[stat] > line : g[stat] < line
              return (
                <tr key={i} className={`border-t border-edge/50 ${i % 2 ? 'bg-ink-900/40' : ''}`}>
                  <td className="px-3 py-2 text-xs text-mist">{g.date.slice(5)}</td>
                  <td className="px-2 py-2 text-xs text-fog">
                    {g.home ? 'vs' : '@'} {g.opponent}
                  </td>
                  <td className="px-2 py-2 text-right font-display text-base font-bold text-white">{g[stat]}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${hit ? 'bg-volt-500' : 'bg-ink-600'}`} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default function Research() {
  const { playerId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [player, setPlayer] = useState(location.state?.player || null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!playerId) {
      setPlayer(null)
      return
    }
    if (player && String(player.id) === String(playerId)) return
    const bundled = starPlayers.find((p) => String(p.id) === String(playerId))
    if (bundled) {
      setPlayer(bundled)
      return
    }
    getPlayer(playerId)
      .then(setPlayer)
      .catch(() => setFailed(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId])

  return (
    <main className="pt-4">
      {player && (
        <div className="flex items-center gap-3 px-4">
          <Avatar name={player.name} size="lg" />
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white leading-none">
              {player.name}
            </h2>
            <p className="text-[11px] text-mist">
              {player.team_name || player.team_abbr}
              {player.position ? ` · ${player.position}` : ''}
            </p>
          </div>
          <button
            onClick={() => {
              setPlayer(null)
              navigate('/research')
            }}
            className="rounded-lg border border-edge px-2.5 py-1.5 text-xs font-bold uppercase text-mist"
          >
            Change
          </button>
        </div>
      )}

      {player ? (
        <Workstation key={player.id} player={player} />
      ) : failed ? (
        <p className="px-6 py-16 text-center text-sm text-mist">Couldn't load that player.</p>
      ) : (
        <div className="pt-1">
          <p className="px-4 pb-3 text-[11px] text-mist">
            Pick a player to open the workstation — filters, splits, hit-rates and game logs.
          </p>
          <PlayerSearch onSelect={(p) => navigate(`/research/${p.id}`, { state: { player: p } })} />
        </div>
      )}
    </main>
  )
}
