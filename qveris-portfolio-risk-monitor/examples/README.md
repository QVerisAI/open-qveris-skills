# Examples

## Dry-run preflight

```bash
node qveris-portfolio-risk-monitor/scripts/run.mjs \
  --dry-run \
  --holdings AAPL:25,NVDA:25,MSFT:20,TSLA:15,CASH:15 \
  --benchmark SPY \
  --window-days 30 \
  --max-paid-calls 0 \
  --output qveris-portfolio-risk-monitor/artifacts/portfolio-dry-run.md \
  --json-output qveris-portfolio-risk-monitor/artifacts/portfolio-dry-run-output.json \
  --trace qveris-portfolio-risk-monitor/artifacts/portfolio-dry-run-trace.json
```

## Fixture regression

```bash
node qveris-portfolio-risk-monitor/scripts/run.mjs \
  --fixture qveris-portfolio-risk-monitor/fixtures/normal-portfolio-risk.json \
  --output qveris-portfolio-risk-monitor/artifacts/fixture-report.md \
  --json-output qveris-portfolio-risk-monitor/artifacts/fixture-output.json \
  --trace qveris-portfolio-risk-monitor/artifacts/fixture-trace.json
```

## Live smoke test

```bash
node qveris-portfolio-risk-monitor/scripts/run.mjs \
  --live \
  --holdings AAPL:25,NVDA:25,MSFT:20,TSLA:15,CASH:15 \
  --benchmark SPY \
  --window-days 30 \
  --max-paid-calls 4 \
  --max-credits 60 \
  --output qveris-portfolio-risk-monitor/artifacts/portfolio-live-smoke.md \
  --json-output qveris-portfolio-risk-monitor/artifacts/portfolio-live-smoke-output.json \
  --trace qveris-portfolio-risk-monitor/artifacts/portfolio-live-smoke-trace.json
```
