# Statlyne

NBA player-prop trend research app — Linemate-style UX on a fully free stack.
**For research and entertainment purposes only.** No real odds, no wagering, no sportsbook integration.

Live: https://niks0428.github.io/statlyne/

## Stack

- React + Vite + Tailwind v4, React Router (hash routing for GitHub Pages), Zustand (persisted slip)
- Data: [balldontlie.io](https://www.balldontlie.io) v1 API — players, teams, games (free tier)
- No backend. All trend math is computed client-side from raw game logs.
- localStorage: parlay slip, manually-entered lines, 10-min API response cache

## Views

| Route | View |
|---|---|
| `/` | Discover — trend-card feed, best over-trend per tracked star, sorted by hit rate |
| `/research` / `/research/:playerId` | Player workstation — stat/window/home-away/opponent splits, line input, hit-rate, chart, game log |
| `/parlay` | Slip — legs, naive combined hit-rate estimate (independence assumption), share/copy |

## Suggested lines

There are no live sportsbook odds. The "suggested line" is `round(avg of last 10 games to nearest 0.5)` and is labelled as such everywhere.

## Demo data fallback

The free balldontlie tier covers players/teams/games but **not** per-game stats
(`/stats` and `/season_averages` return 401 — they need the paid ALL-STAR tier).
When that happens the app serves deterministic simulated game logs (seeded by
player id) and labels them **DEMO** in the UI. Drop an ALL-STAR key into `.env`
and the real logs light up automatically — no code changes.

## Setup

```bash
cp .env.example .env   # add your balldontlie key
npm install
npm run dev            # http://localhost:5900/statlyne/
npm run deploy         # build + publish to gh-pages
```

Note: since this is a static frontend, the API key ships inside the JS bundle.
That's acceptable for a free-tier key; don't put a paid key on a public deployment.

`src/data/starPlayers.json` seeds the Discover feed (regenerate with a players
search per name if rosters change).
