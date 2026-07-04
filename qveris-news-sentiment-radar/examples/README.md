# Examples

## Dry-run preflight

```bash
node scripts/run.mjs \
  --dry-run \
  --ticker NVDA \
  --window-days 7 \
  --max-paid-calls 0 \
  --output artifacts/nvda-dry-run.md \
  --json-output artifacts/nvda-dry-run-output.json \
  --trace artifacts/nvda-dry-run-trace.json
```

## Fixture regression

```bash
node scripts/run.mjs \
  --fixture fixtures/normal-news-sentiment.json \
  --output artifacts/fixture-report.md \
  --json-output artifacts/fixture-output.json \
  --trace artifacts/fixture-trace.json
```

## Live smoke test

```bash
node scripts/run.mjs \
  --live \
  --ticker NVDA \
  --window-days 7 \
  --max-paid-calls 5 \
  --max-credits 35 \
  --output artifacts/nvda-live-smoke.md \
  --json-output artifacts/nvda-live-smoke-output.json \
  --trace artifacts/nvda-live-smoke-trace.json
```

## Live scenario: TSLA catalyst window

```bash
node scripts/run.mjs \
  --live \
  --ticker TSLA \
  --market US \
  --window-days 14 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 35 \
  --output artifacts/scenario-02-tsla-14d.md \
  --json-output artifacts/scenario-02-tsla-14d-output.json \
  --trace artifacts/scenario-02-tsla-14d-trace.json
```

## Live scenario: AAPL baseline sentiment

```bash
node scripts/run.mjs \
  --live \
  --ticker AAPL \
  --market US \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 35 \
  --output artifacts/scenario-03-aapl-30d.md \
  --json-output artifacts/scenario-03-aapl-30d-output.json \
  --trace artifacts/scenario-03-aapl-30d-trace.json
```
