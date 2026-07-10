import { useState } from 'react'
import { trendTier } from '../lib/trends'
import { headshotUrl } from '../lib/sports'

export function Avatar({ name, sport, playerId, size = 'md' }) {
  const [imgFailed, setImgFailed] = useState(false)
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  const cls = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base'
  const showImg = sport && playerId && !imgFailed
  return (
    <div
      className={`${cls} shrink-0 rounded-xl bg-ink-600 border border-edge flex items-center justify-center font-display font-bold text-fog uppercase overflow-hidden`}
    >
      {showImg ? (
        <img
          src={headshotUrl(sport, playerId)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover object-top"
          onError={() => setImgFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  )
}

const TIER_STYLES = {
  strong: 'bg-volt-500/15 text-volt-500 border-volt-500/40',
  mixed: 'bg-amber-hot/15 text-amber-hot border-amber-hot/40',
  weak: 'bg-ink-600/60 text-mist border-edge',
}

export function TrendBadge({ pct, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${TIER_STYLES[trendTier(pct)]}`}
    >
      {children}
    </span>
  )
}

export function DemoTag() {
  return (
    <span
      className="rounded border border-dashed border-mist/50 px-1 py-px text-[9px] font-bold uppercase tracking-widest text-mist"
      title="Simulated game log — ESPN stats were unreachable for this player"
    >
      demo
    </span>
  )
}

export function DemoBanner() {
  return (
    <div className="mx-4 mb-3 rounded-lg border border-dashed border-amber-hot/40 bg-amber-hot/8 px-3 py-2 text-[11px] leading-snug text-amber-hot/90">
      <b>Simulated game logs.</b> ESPN's stats feed couldn't be reached for some
      players, so their logs are deterministic demo data until it's back.
    </div>
  )
}

/** Mini bar chart: last N games vs a line. Bars that hit glow volt. */
export function BarChart({ games, stat, line, dir = 'over', height = 72, animate = true }) {
  const vals = games.map((g) => g[stat] ?? 0)
  if (!vals.length) return null
  const max = Math.max(...vals, line * 1.15, 1)
  const shown = [...games].reverse() // oldest -> newest, reads left to right
  return (
    <div className="relative w-full" style={{ height }}>
      {/* the line */}
      <div
        className="absolute inset-x-0 border-t border-dashed border-fog/50 z-10"
        style={{ bottom: `${(line / max) * 100}%` }}
      >
        <span className="absolute right-0 -top-4 text-[9px] font-bold text-fog/70 bg-ink-900/80 px-1 rounded">
          {line}
        </span>
      </div>
      <div className="absolute inset-0 flex items-end gap-[3px]">
        {shown.map((g, i) => {
          const v = g[stat] ?? 0
          const hit = dir === 'over' ? v > line : v < line
          return (
            <div key={i} className="flex-1 flex flex-col justify-end h-full group relative">
              <div
                className={`${animate ? 'bar-grow' : ''} w-full rounded-t-[3px] ${
                  hit ? 'bg-volt-500 shadow-[0_0_8px_rgba(200,250,58,0.35)]' : 'bg-ink-600'
                }`}
                style={{ height: `${Math.max((v / max) * 100, 3)}%`, animationDelay: `${i * 35}ms` }}
              />
              <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[9px] text-fog bg-ink-700 px-1 rounded transition-opacity">
                {v}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Numeric line stepper. Step scales with the line's magnitude (yards vs goals). */
export function stepFor(value) {
  if (value >= 100) return 5
  if (value >= 20) return 1
  return 0.5
}

export function LineStepper({ value, onChange, compact = false, min = 0.5 }) {
  const step = stepFor(Math.abs(value))
  const btn = `${compact ? 'w-7 h-7' : 'w-9 h-9'} rounded-lg bg-ink-600 border border-edge text-fog font-bold active:bg-ink-700 select-none`
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - step))}>
        −
      </button>
      <input
        type="number"
        step="0.5"
        min={min}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          onChange(Math.max(min, Number.isFinite(v) ? v : min))
        }}
        className={`${compact ? 'w-16 h-7 text-sm' : 'w-20 h-9 text-lg'} rounded-lg bg-ink-900 border border-edge text-center font-display font-bold text-white outline-none focus:border-volt-500/60`}
      />
      <button type="button" className={btn} onClick={() => onChange(value + step)}>
        +
      </button>
    </div>
  )
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-mist">
      <svg viewBox="0 0 24 24" className="w-8 h-8 animate-spin text-volt-500">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" fill="none" />
        <path d="M22 12 A10 10 0 0 0 12 2" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <span className="text-xs uppercase tracking-widest pulse-soft">{label}</span>
    </div>
  )
}
