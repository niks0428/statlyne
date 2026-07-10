import { useLocation, useNavigate } from 'react-router-dom'
import { SPORTS, SPORT_KEYS } from '../lib/sports'
import { useStore } from '../store/useStore'

export default function SportSwitcher() {
  const sport = useStore((s) => s.sport)
  const setSport = useStore((s) => s.setSport)
  const navigate = useNavigate()
  const location = useLocation()

  function pick(key) {
    if (key === sport) return
    setSport(key)
    // a deep-linked player belongs to the old sport — back out to the search view
    if (location.pathname.startsWith('/research/')) navigate('/research')
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2.5">
      {SPORT_KEYS.map((key) => {
        const active = key === sport
        return (
          <button
            key={key}
            onClick={() => pick(key)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 font-display font-bold uppercase tracking-wider text-sm transition-colors ${
              active
                ? 'border-volt-500/60 bg-volt-500/15 text-volt-500'
                : 'border-edge bg-ink-800 text-mist active:bg-ink-700'
            }`}
          >
            {SPORTS[key].emoji} {SPORTS[key].label}
          </button>
        )
      })}
    </div>
  )
}
