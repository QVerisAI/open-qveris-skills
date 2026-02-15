# Stock Analyzer

A-share and global stock analysis skill for OpenClaw, powered by QVeris (THS iFinD and other providers).

## Features

- Real-time quote, fundamentals, financial statements, history, smart stock picking.
- QVeris search + execute with fallback; no hardcoded tool IDs.
- Supports symbols like 600519, 600519.SH, 0700.HK, AAPL.

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

## Install

```bash
npx skills add <repo-url> --skill stock-analyzer
```

## Usage

```bash
export QVERIS_API_KEY="your-key"
node scripts/stock_analyzer.mjs quote --symbol 600519
node scripts/stock_analyzer.mjs fundamentals --symbol 600519
node scripts/stock_analyzer.mjs history --symbol 600519
node scripts/stock_analyzer.mjs pick --keyword 新能源
```

Options: `--format json`, `--timeout N`.

## Disclaimer

For research only; not investment advice.
