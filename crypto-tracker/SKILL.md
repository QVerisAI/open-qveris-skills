---
name: crypto-tracker
description: Cryptocurrency price, market cap, and conversion powered by QVeris. CoinMarketCap and CoinGecko tools for BTC/ETH and altcoins.
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
  - "BTC 当前价格"
  - "以太坊兑美元"
  - "加密货币市值排行"
  - "100 USDT 换多少 ETH"
---

# Crypto Tracker

Cryptocurrency price and market data via QVeris (CoinMarketCap, CoinGecko).

## What This Skill Does

- **Price** – Real-time price for a coin (symbol or id).
- **Markets** – Market list / ranking by cap.
- **Convert** – Convert amount between crypto and fiat.

## Command Surface

- `node scripts/crypto_tracker.mjs price --symbol BTC`
- `node scripts/crypto_tracker.mjs markets --limit 20`
- `node scripts/crypto_tracker.mjs convert --from BTC --to USD --amount 0.1`

## Safety

Uses only `QVERIS_API_KEY`; read-only; not financial advice.
