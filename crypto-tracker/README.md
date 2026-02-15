# Crypto Tracker

Cryptocurrency price and market data skill for OpenClaw, powered by QVeris.

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

## Usage

```bash
export QVERIS_API_KEY="your-key"
node scripts/crypto_tracker.mjs price --symbol BTC
node scripts/crypto_tracker.mjs markets --limit 20
node scripts/crypto_tracker.mjs convert --from BTC --to USD --amount 0.1
```

Options: `--format json`, `--timeout N`.
