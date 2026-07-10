import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // active sport tab, persisted across sessions
      sport: 'nba',
      setSport: (sport) => set({ sport }),

      // parlay slip legs:
      // { key, sport, playerId, playerName, team, stat, line, dir, hitPct, hits, total, demo }
      legs: [],
      // manually-entered lines, keyed `${sport}:${playerId}:${stat}`
      lines: {},

      addLeg: (leg) =>
        set((s) => ({
          legs: [...s.legs.filter((l) => l.key !== leg.key), leg],
        })),
      removeLeg: (key) => set((s) => ({ legs: s.legs.filter((l) => l.key !== key) })),
      clearSlip: () => set({ legs: [] }),

      setLine: (lineKey, line) => set((s) => ({ lines: { ...s.lines, [lineKey]: line } })),
      getLine: (lineKey) => get().lines[lineKey],
    }),
    { name: 'statlyne:slip', version: 2 },
  ),
)
