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
  --max-paid-calls 5 \
  --max-credits 70 \
  --output qveris-portfolio-risk-monitor/artifacts/portfolio-live-smoke.md \
  --json-output qveris-portfolio-risk-monitor/artifacts/portfolio-live-smoke-output.json \
  --trace qveris-portfolio-risk-monitor/artifacts/portfolio-live-smoke-trace.json
```

## Live scenario: concentrated NVDA risk

```bash
node qveris-portfolio-risk-monitor/scripts/run.mjs \
  --live \
  --holdings NVDA:60,AMD:20,CASH:20 \
  --market US \
  --benchmark QQQ \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 70 \
  --output qveris-portfolio-risk-monitor/artifacts/scenario-02-concentrated-nvda.md \
  --json-output qveris-portfolio-risk-monitor/artifacts/scenario-02-concentrated-nvda-output.json \
  --trace qveris-portfolio-risk-monitor/artifacts/scenario-02-concentrated-nvda-trace.json
```

## Live scenario: defensive stock risk

```bash
node qveris-portfolio-risk-monitor/scripts/run.mjs \
  --live \
  --holdings JNJ:25,PG:25,KO:20,WMT:20,CASH:10 \
  --market US \
  --benchmark SPY \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 70 \
  --output qveris-portfolio-risk-monitor/artifacts/scenario-03-defensive-stocks.md \
  --json-output qveris-portfolio-risk-monitor/artifacts/scenario-03-defensive-stocks-output.json \
  --trace qveris-portfolio-risk-monitor/artifacts/scenario-03-defensive-stocks-trace.json
```
