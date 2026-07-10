import { Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import SportSwitcher from './components/SportSwitcher'
import Discover from './pages/Discover'
import Research from './pages/Research'
import Parlay from './pages/Parlay'
import Game from './pages/Game'

export default function App() {
  return (
    <div className="mx-auto max-w-lg min-h-dvh pb-24">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-ink-950/80 border-b border-edge/60">
        <div className="flex items-end justify-between px-4 pt-3 pb-2">
          <h1 className="font-display font-extrabold text-[26px] leading-none tracking-wide text-white uppercase">
            Stat<span className="text-volt-500">lyne</span>
          </h1>
          <span className="text-[10px] text-mist leading-tight text-right">
            For research &amp; entertainment
            <br />
            purposes only — no real odds
          </span>
        </div>
        <SportSwitcher />
      </header>
      <Routes>
        <Route path="/" element={<Discover />} />
        <Route path="/research" element={<Research />} />
        <Route path="/research/:sport/:playerId" element={<Research />} />
        <Route path="/game/:sport/:eventId" element={<Game />} />
        <Route path="/parlay" element={<Parlay />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
