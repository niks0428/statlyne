import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import starPlayers from '../data/starPlayers.json'
import { getRecentGames, getGameLog } from '../api/nba'
import { STAT_CATEGORIES, statLabel, suggestedLine, hitRate, trendTier } from '../lib/trends'
import { useStore } from '../store/useStore'
import { Avatar, TrendBadge, DemoTag, DemoBanner, BarChart, LineStepper, Spinner } from '../components/ui'

function TrendCard({ card, index }) {
  const navigate = useNavigate()
  const { player, games, opponentInfo, demo } = card
  const storeLine = useStore((s) => s.lines[`${player.id}:${card.stat}`])
  const setLine = useStore((s) => s.setLine)
  const line = storeLine ?? card.line
  const last10 = games.slice(0, 10)
  const { hits, total, pct } = hitRate(last10, card.stat, line, 'over')

  return (
    <article
      onClick={() => navigate(`/research/${player.id}?stat=${card.stat}`, { state: { player } })}
      className="rise-in mx-4 rounded-2xl border border-edge bg-ink-800/80 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)] cursor-pointer active:scale-[0.99] transition-transform"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={player.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display font-bold text-lg leading-tight text-white uppercase tracking-wide">
              {player.name}
            </h3>
            {demo && <DemoTag />}
          </div>
          <p className="text-[11px] text-mist">
            {player.team_abbr}
            {opponentInfo ? ` · last ${opponentInfo.home ? 'vs' : '@'} ${opponentInfo.opponent}` : ''}
            {player.position ? ` · ${player.position}` : ''}
          </p>
        </div>
        <div className="text-right">
          <div className={`font-display font-extrabold text-3xl leading-none ${trendTier(pct) === 'strong' ? 'text-volt-500' : trendTier(pct) === 'mixed' ? 'text-amber-hot' : 'text-mist'}`}>
            {pct}%
          </div>
          <div className="text-[9px] uppercase tracking-widest text-mist">over rate</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <TrendBadge pct={pct}>
          Over {statLabel(card.stat)} hit {hits} of last {total}
        </TrendBadge>
        <LineStepper compact value={line} onChange={(v) => setLine(player.id, card.stat, v)} />
      </div>

      <div className="mt-3">
        <BarChart games={last10} stat={card.stat} line={line} animate={index < 6} />
        <div className="mt-1 flex justify-between text-[9px] uppercase tracking-widest text-mist/70">
          <span>10 games ago</span>
          <span>
            {statLabel(card.stat)} · line {line}{' '}
            <span className="text-mist/50">(suggested — not a sportsbook price)</span>
          </span>
        </div>
      </div>
    </article>
  )
}

export default function Discover() {
  const [cards, setCards] = useState(null)
  const [anyDemo, setAnyDemo] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let lastByTeam = {}
        try {
          ;({ lastByTeam } = await getRecentGames())
        } catch {
          /* schedule unavailable — cards still render without opponent context */
        }
        const built = []
        let demoSeen = false
        for (const player of starPlayers) {
          const { games, demo } = await getGameLog(player)
          if (demo) demoSeen = true
          if (!games.length) continue
          const last10 = games.slice(0, 10)
          // best over-trend across the four categories
          let best = null
          for (const { key } of STAT_CATEGORIES) {
            const line = suggestedLine(games, key)
            const { pct } = hitRate(last10, key, line, 'over')
            if (!best || pct > best.pct) best = { stat: key, line, pct }
          }
          built.push({
            player,
            games,
            demo,
            stat: best.stat,
            line: best.line,
            pct: best.pct,
            opponentInfo: lastByTeam[player.team_abbr] || null,
          })
        }
        built.sort((a, b) => b.pct - a.pct)
        if (alive) {
          setCards(built.slice(0, 15))
          setAnyDemo(demoSeen)
        }
      } catch (e) {
        if (alive) setError(e.message || 'Failed to build feed')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (error)
    return (
      <p className="px-6 py-16 text-center text-sm text-mist">
        Couldn't load the feed: {error}. Pull to refresh or try again shortly (free API tier is rate-limited).
      </p>
    )
  if (!cards) return <Spinner label="Scanning trends" />

  return (
    <main className="pt-4">
      <div className="px-4 pb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display font-bold text-xl uppercase tracking-wide text-white">Trending props</h2>
          <p className="text-[11px] text-mist">Top over-trends across {starPlayers.length} tracked players · tap a card to dig in</p>
        </div>
      </div>
      {anyDemo && <DemoBanner />}
      <div className="flex flex-col gap-3 pb-6">
        {cards.map((c, i) => (
          <TrendCard key={`${c.player.id}:${c.stat}`} card={c} index={i} />
        ))}
      </div>
    </main>
  )
}
