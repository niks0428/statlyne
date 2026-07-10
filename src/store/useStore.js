import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // parlay slip legs: { key, playerId, playerName, teamAbbr, stat, line, dir, hitPct, hits, total, demo }
      legs: [],
      // manually-entered lines, keyed `${playerId}:${stat}`
      lines: {},

      addLeg: (leg) =>
        set((s) => ({
          legs: [...s.legs.filter((l) => l.key !== leg.key), leg],
        })),
      removeLeg: (key) => set((s) => ({ legs: s.legs.filter((l) => l.key !== key) })),
      clearSlip: () => set({ legs: [] }),

      setLine: (playerId, stat, line) =>
        set((s) => ({ lines: { ...s.lines, [`${playerId}:${stat}`]: line } })),
      getLine: (playerId, stat) => get().lines[`${playerId}:${stat}`],
    }),
    { name: 'statlyne:slip' },
  ),
)
