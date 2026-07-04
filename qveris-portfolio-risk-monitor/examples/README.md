# Examples

## Dry-run preflight

```bash
node scripts/run.mjs \
  --dry-run \
  --holdings AAPL:25,NVDA:25,MSFT:20,TSLA:15,CASH:15 \
  --benchmark SPY \
  --window-days 30 \
  --max-paid-calls 0 \
  --output artifacts/portfolio-dry-run.md \
  --json-output artifacts/portfolio-dry-run-output.json \
  --trace artifacts/portfolio-dry-run-trace.json
```

## Fixture regression

```bash
node scripts/run.mjs \
  --fixture fixtures/normal-portfolio-risk.json \
  --output artifacts/fixture-report.md \
  --json-output artifacts/fixture-output.json \
  --trace artifacts/fixture-trace.json
```

## Live smoke test

```bash
node scripts/run.mjs \
  --live \
  --holdings AAPL:25,NVDA:25,MSFT:20,TSLA:15,CASH:15 \
  --benchmark SPY \
  --window-days 30 \
  --max-paid-calls 5 \
  --max-credits 70 \
  --output artifacts/portfolio-live-smoke.md \
  --json-output artifacts/portfolio-live-smoke-output.json \
  --trace artifacts/portfolio-live-smoke-trace.json
```

## Live scenario: concentrated NVDA risk

```bash
node scripts/run.mjs \
  --live \
  --holdings NVDA:60,AMD:20,CASH:20 \
  --market US \
  --benchmark QQQ \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 70 \
  --output artifacts/scenario-02-concentrated-nvda.md \
  --json-output artifacts/scenario-02-concentrated-nvda-output.json \
  --trace artifacts/scenario-02-concentrated-nvda-trace.json
```

## Live scenario: defensive stock risk

```bash
node scripts/run.mjs \
  --live \
  --holdings JNJ:25,PG:25,KO:20,WMT:20,CASH:10 \
  --market US \
  --benchmark SPY \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 70 \
  --output artifacts/scenario-03-defensive-stocks.md \
  --json-output artifacts/scenario-03-defensive-stocks-output.json \
  --trace artifacts/scenario-03-defensive-stocks-trace.json
```
