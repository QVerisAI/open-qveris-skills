---
name: stock-copilot-pro
description: High-performance global stock analysis copilot powered by QVeris. Fuses quote, fundamentals, technicals, news sentiment, and X sentiment with adaptive tool learning for higher success and better signal quality.
env:
  - QVERIS_API_KEY
requirements:
  env_vars:
    - QVERIS_API_KEY
credentials:
  primary: QVERIS_API_KEY
  scope: read-only
  endpoint: https://qveris.ai/api/v1
auto_invoke: true
source: https://qveris.ai
examples:
  - "Analyze AAPL with a comprehensive report"
  - "Technical analysis for 0700.HK"
  - "Compare AAPL, MSFT, NVDA"
  - "Give me fundamentals and sentiment for 600519.SS"
---

# Stock Copilot Pro

Global Multi-Source Stock Analysis with QVeris.

## What This Skill Does

Stock Copilot Pro performs end-to-end stock analysis with five data domains:

1. Market quote / trading context
2. Fundamental metrics
3. Technical signals (RSI/MACD/MA)
4. News and sentiment
5. X sentiment

It then generates a structured markdown report:
`summary / fundamentals / technicals / sentiment / risks / conclusion`.

## Key Advantages

- Dynamic tool learning that improves route quality over time
- Strong fallback strategy across providers and markets
- US/HK/CN market-aware symbol handling
- Structured outputs for both analyst reading and machine ingestion
- Safety-first handling of secrets and runtime state

## Core Workflow

1. Normalize symbol and detect market preference (`US/HK/CN/GLOBAL`).
2. Search tools by capability (quote, fundamentals, indicators, sentiment, X sentiment).
3. Rank candidates by `success_rate`, latency, and parameter fit.
4. Try learned priority queue first, then execute fallback candidates.
5. Run quality checks:
   - Missing key fields
   - Data recency
   - Cross-source inconsistency
6. Produce report with confidence score and explicit caveats.

## Command Surface

Primary script: `scripts/stock_copilot_pro.mjs`

- Analyze one symbol:
  - `node scripts/stock_copilot_pro.mjs analyze --symbol AAPL --market US --mode comprehensive`
- Compare multiple symbols:
  - `node scripts/stock_copilot_pro.mjs compare --symbols AAPL,MSFT --market US --mode comprehensive`

## Output Modes

- `markdown` (default): human-readable report
- `json`: machine-readable merged payload

## Dynamic Evolution

- Runtime learning state is stored in `.evolution/tool-evolution.json`.
- Admission policy is aggressive: one successful tool execution can enter queue.
- Future runs prioritize previously successful tools to improve execution reliability.

## Safety and Disclosure

- Uses only `QVERIS_API_KEY`.
- Calls only QVeris APIs over HTTPS.
- Does not store API keys in logs, reports, or evolution state.
- Research-only output. Not investment advice.

