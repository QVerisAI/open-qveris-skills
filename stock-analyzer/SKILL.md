---
name: stock-analyzer
description: A-share and global stock analysis assistant powered by QVeris. Real-time quote, fundamentals, financial statements, history, and smart stock picking via THS iFinD and other providers.
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
  - "查询贵州茅台实时行情"
  - "600519 基本面与财务数据"
  - "按行业筛选龙头股"
  - "特变电工历史走势"
---

# Stock Analyzer

A-share / global stock analysis using QVeris tools (THS iFinD, etc.).

## What This Skill Does

- **Quote** – Real-time price and trading context for a symbol.
- **Fundamentals** – Company basics and financial statements (revenue, profit, assets, etc.).
- **History** – Historical OHLC and trend.
- **Pick** – Smart stock picking by industry/concept/indicators.

## Core Workflow

1. Parse command: quote / fundamentals / history / pick with symbol or criteria.
2. Search QVeris for tools (real-time quotation, financial statements, history, stock picking).
3. Rank by success_rate and parameter fit; execute with fallback.
4. Return markdown or JSON.

## Command Surface

- `node scripts/stock_analyzer.mjs quote --symbol 600519`
- `node scripts/stock_analyzer.mjs fundamentals --symbol 600519`
- `node scripts/stock_analyzer.mjs history --symbol 600519`
- `node scripts/stock_analyzer.mjs pick --keyword 新能源`

## Safety

Uses only `QVERIS_API_KEY`; read-only; not investment advice.
