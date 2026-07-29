# Codex E2E Validation

Date: 2026-07-02

Prompt simulated in Codex:

> Use QVeris to review this portfolio: AAPL 25%, NVDA 25%, MSFT 20%, TSLA 15%, cash 15%. Flag concentration, drawdown, volatility, liquidity, catalyst, and news risks under a 60-credit budget.

Command run:

```bash
node qveris-portfolio-risk-monitor/scripts/run.mjs \
  --live \
  --holdings AAPL:25,NVDA:25,MSFT:20,TSLA:15,CASH:15 \
  --benchmark SPY \
  --window-days 30 \
  --max-paid-calls 4 \
  --max-credits 60 \
  --output qveris-portfolio-risk-monitor/artifacts/live-smoke.md \
  --trace qveris-portfolio-risk-monitor/artifacts/live-smoke-trace.json
```

Result:

- Report generated: `qveris-portfolio-risk-monitor/artifacts/live-smoke.md`
- Trace generated: `qveris-portfolio-risk-monitor/artifacts/live-smoke-trace.json`
- Paid calls: 3
- Estimated credits: 51.21
- Execution IDs:
  - `b961be79-5b4b-424e-8ddb-3324eaa904c7`
  - `220c6ea3-ee30-4310-8b6f-aa7342e75fb7`
  - `d606dca9-b277-4502-a10b-741df3a5b6c8`

Known limitation:

- News catalyst call was skipped because the strict preferred news-sentiment tool was not returned by this Discover/Inspect preflight.
