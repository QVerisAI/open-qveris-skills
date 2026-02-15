# Sports Score

Sports leagues, games, and standings for OpenClaw, powered by QVeris (API-Sports, Api-Football).

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

## Usage

```bash
export QVERIS_API_KEY="your-key"
node scripts/sports_score.mjs leagues --sport football --country England
node scripts/sports_score.mjs leagues --sport basketball --search NBA
node scripts/sports_score.mjs games --league 39 --season 2024
node scripts/sports_score.mjs standings --league 39 --season 2024
```

Options: `--format json`, `--timeout N`.
