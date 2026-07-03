# Examples

## Dry-run preflight

```bash
node qveris-news-sentiment-radar/scripts/run.mjs \
  --dry-run \
  --ticker NVDA \
  --window-days 7 \
  --max-paid-calls 0 \
  --output qveris-news-sentiment-radar/artifacts/nvda-dry-run.md \
  --json-output qveris-news-sentiment-radar/artifacts/nvda-dry-run-output.json \
  --trace qveris-news-sentiment-radar/artifacts/nvda-dry-run-trace.json
```

## Fixture regression

```bash
node qveris-news-sentiment-radar/scripts/run.mjs \
  --fixture qveris-news-sentiment-radar/fixtures/normal-news-sentiment.json \
  --output qveris-news-sentiment-radar/artifacts/fixture-report.md \
  --json-output qveris-news-sentiment-radar/artifacts/fixture-output.json \
  --trace qveris-news-sentiment-radar/artifacts/fixture-trace.json
```

## Live smoke test

```bash
node qveris-news-sentiment-radar/scripts/run.mjs \
  --live \
  --ticker NVDA \
  --window-days 7 \
  --max-paid-calls 4 \
  --max-credits 30 \
  --output qveris-news-sentiment-radar/artifacts/nvda-live-smoke.md \
  --json-output qveris-news-sentiment-radar/artifacts/nvda-live-smoke-output.json \
  --trace qveris-news-sentiment-radar/artifacts/nvda-live-smoke-trace.json
```

## Live scenario: TSLA catalyst window

```bash
node qveris-news-sentiment-radar/scripts/run.mjs \
  --live \
  --ticker TSLA \
  --market US \
  --window-days 14 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 30 \
  --output qveris-news-sentiment-radar/artifacts/scenario-02-tsla-14d.md \
  --json-output qveris-news-sentiment-radar/artifacts/scenario-02-tsla-14d-output.json \
  --trace qveris-news-sentiment-radar/artifacts/scenario-02-tsla-14d-trace.json
```

## Live scenario: AAPL baseline sentiment

```bash
node qveris-news-sentiment-radar/scripts/run.mjs \
  --live \
  --ticker AAPL \
  --market US \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 30 \
  --output qveris-news-sentiment-radar/artifacts/scenario-03-aapl-30d.md \
  --json-output qveris-news-sentiment-radar/artifacts/scenario-03-aapl-30d-output.json \
  --trace qveris-news-sentiment-radar/artifacts/scenario-03-aapl-30d-trace.json
```
