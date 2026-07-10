import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { SPORTS, statShort } from '../lib/sports'
import { trendTier } from '../lib/trends'
import { Avatar, TrendBadge, DemoTag } from '../components/ui'

export default function Parlay() {
  const navigate = useNavigate()
  const { legs, removeLeg, clearSlip } = useStore()
  const [copied, setCopied] = useState(false)

  const combined = legs.reduce((acc, l) => acc * (l.hitPct / 100), legs.length ? 1 : 0)
  const combinedPct = Math.round(combined * 1000) / 10

  async function share() {
    const lines = [
      `STATLYNE SLIP — ${legs.length} leg${legs.length > 1 ? 's' : ''}`,
      ...legs.map(
        (l) =>
          `• ${SPORTS[l.sport]?.emoji || ''} ${l.playerName} ${l.dir.toUpperCase()} ${l.line} ${statShort(l.sport, l.stat)} — ${l.hitPct}% (${l.hits}/${l.total})`,
      ),
      `Est. combined hit rate: ${combinedPct}% (naive independence)`,
      'Research & entertainment only — no real odds.',
    ]
    const text = lines.join('\n')
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Statlyne slip', text })
        return
      }
      throw new Error('no web share')
    } catch {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } catch {
        /* clipboard blocked — nothing else to do */
      }
    }
  }

  if (!legs.length)
    return (
      <main className="px-6 pt-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-edge text-3xl">
          🧾
        </div>
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">Slip is empty</h2>
        <p className="mx-auto mt-2 max-w-[26ch] text-sm text-mist">
          Add legs from the Discover feed or the Research workstation — any sport, one slip.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 rounded-xl bg-volt-500 px-5 py-3 font-display font-bold uppercase tracking-wider text-ink-950"
        >
          Browse trends
        </button>
      </main>
    )

  return (
    <main className="px-4 pt-4 pb-6">
      <div className="flex items-end justify-between pb-3">
        <div>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">Your slip</h2>
          <p className="text-[11px] text-mist">{legs.length} leg{legs.length > 1 ? 's' : ''} · saved on this device</p>
        </div>
        <button onClick={clearSlip} className="rounded-lg border border-edge px-2.5 py-1.5 text-xs font-bold uppercase text-mist">
          Clear all
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {legs.map((l) => (
          <div key={l.key} className="rise-in flex items-center gap-3 rounded-2xl border border-edge bg-ink-800/80 p-3">
            <Avatar name={l.playerName} sport={l.sport} playerId={l.playerId} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-semibold text-white">{l.playerName}</p>
                {l.demo && <DemoTag />}
              </div>
              <p className="text-[11px] text-mist">
                {SPORTS[l.sport]?.emoji} {l.team ? `${l.team} · ` : ''}
                <span className="uppercase font-bold text-fog">
                  {l.dir} {l.line} {statShort(l.sport, l.stat)}
                </span>
              </p>
            </div>
            <TrendBadge pct={l.hitPct}>
              {l.hitPct}% <span className="font-normal normal-case">({l.hits}/{l.total})</span>
            </TrendBadge>
            <button
              onClick={() => removeLeg(l.key)}
              aria-label={`Remove ${l.playerName}`}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-mist active:bg-ink-700"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* combined estimate */}
      <section className="mt-4 rounded-2xl border border-volt-500/25 bg-gradient-to-b from-ink-800 to-ink-900 p-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-mist">Estimated combined hit rate</p>
        <div
          className={`font-display font-extrabold text-6xl leading-tight ${
            trendTier(combinedPct) === 'strong' ? 'text-volt-500' : trendTier(combinedPct) === 'mixed' ? 'text-amber-hot' : 'text-fog'
          }`}
        >
          {combinedPct}%
        </div>
        <p className="mx-auto max-w-[34ch] text-[10px] leading-snug text-mist/80">
          Product of each leg's individual hit rate — a naive independence assumption,
          not a real probability model. Research &amp; entertainment only.
        </p>
        <button
          onClick={share}
          className="mt-4 w-full rounded-xl bg-volt-500 py-3 font-display text-lg font-bold uppercase tracking-wider text-ink-950 active:bg-volt-600"
        >
          {copied ? '✓ Copied to clipboard' : 'Share slip'}
        </button>
      </section>
    </main>
  )
}
