---
name: sports-score
description: Sports leagues, games, and standings powered by QVeris. Football and basketball leagues, fixtures, results via API-Sports / Api-Football.
env:
  - QVERIS_API_KEY
credentials:
  required:
    - QVERIS_API_KEY
  primary_env: QVERIS_API_KEY
  scope: read-only
  endpoint: https://qveris.ai/api/v1
network:
  outbound_hosts:
    - qveris.ai
auto_invoke: true
source: https://qveris.ai
examples:
  - "英超联赛列表"
  - "NBA 赛程 今日"
  - "football league standings"
  - "basketball games score"
---

# Sports Score

Sports leagues, games, and standings via QVeris (API-Sports, Api-Football).

## What This Skill Does

- **Leagues** – List leagues/cups (football, basketball) with optional country/name/search.
- **Games** – Fixtures/games (by league, season, date, etc.).
- **Standings** – League standings (when supported by tool).

## Command Surface

- `node scripts/sports_score.mjs leagues --sport football --country England`
- `node scripts/sports_score.mjs leagues --sport basketball --search NBA`
- `node scripts/sports_score.mjs games --league 39 --season 2024`
- `node scripts/sports_score.mjs standings --league 39 --season 2024`

## Safety

Uses only `QVERIS_API_KEY`; read-only.
