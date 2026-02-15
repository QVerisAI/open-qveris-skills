# Movie Guide

Movie and TV info skill for OpenClaw, powered by QVeris (IMDb, NYT).

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

## Usage

```bash
export QVERIS_API_KEY="your-key"
node scripts/movie_guide.mjs detail --title "The Shawshank Redemption"
node scripts/movie_guide.mjs detail --id tt0111161
node scripts/movie_guide.mjs charts
node scripts/movie_guide.mjs reviews
```

Options: `--format json`, `--timeout N`.
