import { NavLink } from 'react-router-dom'
import { useStore } from '../store/useStore'

const tabs = [
  {
    to: '/',
    label: 'Discover',
    icon: (
      <path d="M3 17 L9 9.5 L13.5 13 L21 4.5 M21 4.5 h-5 M21 4.5 v5" strokeWidth="2.1" />
    ),
  },
  {
    to: '/research',
    label: 'Research',
    icon: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" strokeWidth="2.1" />
        <path d="M15.5 15.5 L21 21" strokeWidth="2.1" />
      </>
    ),
  },
  {
    to: '/parlay',
    label: 'Parlay',
    icon: (
      <path d="M5 4 h14 v16 l-2.3-1.6 L14.4 20 l-2.4-1.6 L9.6 20 l-2.3-1.6 L5 20 Z M9 9 h6 M9 13 h4" strokeWidth="2.1" />
    ),
  },
]

export default function BottomNav() {
  const count = useStore((s) => s.legs.length)
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-lg border-t border-edge/70 bg-ink-900/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-3">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-volt-500' : 'text-mist hover:text-fog'
              }`
            }
          >
            <span className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                {t.icon}
              </svg>
              {t.to === '/parlay' && count > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-volt-500 text-ink-950 text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </span>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
