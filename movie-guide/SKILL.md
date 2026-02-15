---
name: movie-guide
description: Movie and TV info powered by QVeris. IMDb title details, chart rankings, and NYT movie reviews via justoneapi and nytimes.
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
  - "电影 肖申克的救赎 详情"
  - "IMDb 排行榜"
  - "纽约时报 影评"
  - "热门影视推荐"
---

# Movie Guide

Movie/TV details and reviews via QVeris (IMDb, NYT).

## What This Skill Does

- **Detail** – Title details (IMDb id or title).
- **Charts** – Chart rankings.
- **Reviews** – Movie reviews (e.g. NYT).

## Command Surface

- `node scripts/movie_guide.mjs detail --title "The Shawshank Redemption"`
- `node scripts/movie_guide.mjs detail --id tt0111161`
- `node scripts/movie_guide.mjs charts`
- `node scripts/movie_guide.mjs reviews`

## Safety

Uses only `QVERIS_API_KEY`; read-only.
