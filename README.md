# Statlyne

Multi-sport player-prop trend research app — Linemate-style UX on a fully free stack.
**For research and entertainment purposes only.** No real odds, no wagering, no sportsbook integration.

Live: https://niks0428.github.io/statlyne/

## Sports

🏀 NBA · ⚽ EPL · 🏆 FIFA World Cup 2026 · 🏈 NFL · 🏒 NHL · ⚾ MLB

## Stack

- React + Vite + Tailwind v4, React Router (hash routing for GitHub Pages), Zustand (persisted slip + sport tab)
- Data: ESPN's public JSON APIs — free, keyless, CORS-enabled (undocumented/unofficial)
- No backend, no API key. All trend math is computed client-side from raw game logs.
- localStorage: parlay slip, manually-entered lines, 10-min cache of **parsed** results (raw ESPN payloads are 300-650KB; parsed logs are a few KB)

## Views

| Route | View |
|---|---|
| `/` | Discover — trend-card feed per sport, best over-trend per tracked star, sorted by hit rate |
| `/research` / `/research/:sport/:playerId` | Player workstation — stat/window/home-away/opponent splits, line input, hit-rate, chart, game log |
| `/game/:sport/:eventId` | Game props — match total, team totals, BTTS (soccer), computed from both teams' recent results |
| `/parlay` | Slip — cross-sport player + game legs, naive combined hit-rate estimate (independence assumption), share/copy |

## Data sources (all ESPN)

- **Game logs**: `site.web.api.espn.com/apis/common/v3/sports/{sport}/{league}/athletes/{id}/gamelog`
  (EPL uses `soccer/all` filtered to Premier League events)
- **World Cup**: no athlete gamelog exists, so logs are assembled from the athlete's
  `fifa.world` eventlog (core API) + per-match statistics payloads + one cached scoreboard
- **Search**: `site.web.api.espn.com/apis/search/v2`, filtered by sport/league
- **Stat categories are position-aware**: NFL/MLB players only show the categories present
  in their log (QBs get passing props, WRs receiving, etc.)

If ESPN is unreachable (12s timeout per request), logs fall back to deterministic
simulated data labelled **DEMO** in the UI — never silently.

## Suggested lines

There are no live sportsbook odds. The "suggested line" is `round(avg of last 10 games to nearest 0.5)` and is labelled as such everywhere.

## Setup

```bash
npm install
npm run dev            # http://localhost:5900/statlyne/
npm run deploy         # build + publish to gh-pages
```

`src/data/stars.json` seeds the Discover feed per sport (US leagues auto-generated
from ESPN leaders endpoints; EPL/World Cup resolved via ESPN search — regenerate
when rosters shift).
