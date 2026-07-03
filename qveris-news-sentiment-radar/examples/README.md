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
