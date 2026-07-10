import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import stars from '../data/stars.json'
import { getGameLog, getMatchups } from '../api/espn'
import { SPORTS, statShort } from '../lib/sports'
import { suggestedLine, hitRate, trendTier } from '../lib/trends'
import { useStore } from '../store/useStore'
import { Avatar, TrendBadge, DemoTag, DemoBanner, BarChart, LineStepper, Spinner } from '../components/ui'

/** map with a small concurrency cap so we don't burst dozens of requests */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

function MatchupStrip({ sport }) {
  const navigate = useNavigate()
  const [games, setGames] = useState(null)

  useEffect(() => {
    let alive = true
    setGames(null)
    getMatchups(sport)
      .then((g) => alive && setGames(g.slice(0, 14)))
      .catch(() => alive && setGames([]))
    return () => {
      alive = false
    }
  }, [sport])

  if (!games || !games.length) return null

  const fmtWhen = (g) => {
    if (g.status === 'in') return `LIVE ${g.awayScore}–${g.homeScore}`
    if (g.status === 'post') return `FT ${g.awayScore}–${g.homeScore}`
    return new Date(g.date).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="pb-3">
      <p className="px-4 pb-1.5 text-[10px] uppercase tracking-widest text-mist">
        Matchups · tap for game props
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4">
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => navigate(`/game/${sport}/${g.id}`, { state: { game: g } })}
            className="shrink-0 rounded-xl border border-edge bg-ink-800/80 px-3 py-2 text-left active:bg-ink-700"
          >
            <span className="flex items-center gap-1.5 font-display font-bold uppercase text-white">
              {g.away.logo && <img src={g.away.logo} alt="" className="h-4 w-4 object-contain" />}
              {g.away.abbr}
              <span className="text-mist font-normal">@</span>
              {g.home.logo && <img src={g.home.logo} alt="" className="h-4 w-4 object-contain" />}
              {g.home.abbr}
            </span>
            <span
              className={`mt-0.5 block text-[10px] ${g.status === 'in' ? 'text-volt-500 font-bold' : 'text-mist'}`}
            >
              {fmtWhen(g)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function TrendCard({ sport, card, index }) {
  const navigate = useNavigate()
  const { player, games, demo, team } = card
  const lineKey = `${sport}:${player.id}:${card.stat}`
  const storeLine = useStore((s) => s.lines[lineKey])
  const setLine = useStore((s) => s.setLine)
  const line = storeLine ?? card.line
  const last10 = games.slice(0, 10)
  const { hits, total, pct } = hitRate(last10, card.stat, line, 'over')
  const lastGame = games[0]

  return (
    <article
      onClick={() =>
        navigate(`/research/${sport}/${player.id}?stat=${card.stat}`, { state: { player } })
      }
      className="rise-in mx-4 rounded-2xl border border-edge bg-ink-800/80 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)] cursor-pointer active:scale-[0.99] transition-transform"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={player.name} sport={sport} playerId={player.id} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display font-bold text-lg leading-tight text-white uppercase tracking-wide">
              {player.name}
            </h3>
            {demo && <DemoTag />}
          </div>
          <p className="text-[11px] text-mist">
            {team || player.team || ''}
            {lastGame ? ` · last ${lastGame.home ? 'vs' : '@'} ${lastGame.opponent}` : ''}
            {player.position ? ` · ${player.position}` : ''}
          </p>
        </div>
        <div className="text-right">
          <div
            className={`font-display font-extrabold text-3xl leading-none ${
              trendTier(pct) === 'strong' ? 'text-volt-500' : trendTier(pct) === 'mixed' ? 'text-amber-hot' : 'text-mist'
            }`}
          >
            {pct}%
          </div>
          <div className="text-[9px] uppercase tracking-widest text-mist">over rate</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <TrendBadge pct={pct}>
          Over {statShort(sport, card.stat)} hit {hits} of last {total}
        </TrendBadge>
        <LineStepper compact value={line} onChange={(v) => setLine(lineKey, v)} />
      </div>

      <div className="mt-3">
        <BarChart games={last10} stat={card.stat} line={line} animate={index < 6} />
        <div className="mt-1 flex justify-between text-[9px] uppercase tracking-widest text-mist/70">
          <span>{last10.length} games ago</span>
          <span>
            {statShort(sport, card.stat)} · line {line}{' '}
            <span className="text-mist/50">(suggested — not a sportsbook price)</span>
          </span>
        </div>
      </div>
    </article>
  )
}

export default function Discover() {
  const sport = useStore((s) => s.sport)
  const [cards, setCards] = useState(null)
  const [anyDemo, setAnyDemo] = useState(false)

  useEffect(() => {
    let alive = true
    setCards(null)
    setAnyDemo(false)
    ;(async () => {
      const seed = stars[sport] || []
      const logs = await mapLimit(seed, 5, async (player) => ({
        player,
        ...(await getGameLog(player, sport)),
      }))
      if (!alive) return
      const built = []
      let demoSeen = false
      for (const { player, games, available, team, demo } of logs) {
        if (!games.length) continue
        if (demo) demoSeen = true
        const last10 = games.slice(0, 10)
        let best = null
        for (const key of available) {
          const line = suggestedLine(games, key)
          const { pct } = hitRate(last10, key, line, 'over')
          if (!best || pct > best.pct) best = { stat: key, line, pct }
        }
        built.push({ player, games, team, demo, ...best })
      }
      built.sort((a, b) => b.pct - a.pct)
      setCards(built.slice(0, 15))
      setAnyDemo(demoSeen)
    })()
    return () => {
      alive = false
    }
  }, [sport])

  if (!cards)
    return (
      <main className="pt-4">
        <MatchupStrip sport={sport} />
        <Spinner label={`Scanning ${SPORTS[sport].label} trends`} />
      </main>
    )

  return (
    <main className="pt-4">
      <MatchupStrip sport={sport} />
      <div className="px-4 pb-3">
        <h2 className="font-display font-bold text-xl uppercase tracking-wide text-white">
          Trending {SPORTS[sport].label} props
        </h2>
        <p className="text-[11px] text-mist">
          Top over-trends across {(stars[sport] || []).length} tracked players · tap a card to dig in
        </p>
      </div>
      {anyDemo && <DemoBanner />}
      <div className="flex flex-col gap-3 pb-6">
        {cards.map((c, i) => (
          <TrendCard key={`${c.player.id}:${c.stat}`} sport={sport} card={c} index={i} />
        ))}
      </div>
    </main>
  )
}
