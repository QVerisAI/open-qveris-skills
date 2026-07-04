# Examples

## Dry-run preflight

```bash
node scripts/run.mjs \
  --dry-run \
  --universe AAPL,MSFT,NVDA,AMD,AVGO \
  --window-days 90 \
  --max-paid-calls 0 \
  --output artifacts/factor-dry-run.md \
  --json-output artifacts/factor-dry-run-output.json \
  --trace artifacts/factor-dry-run-trace.json
```

## Fixture regression

```bash
node scripts/run.mjs \
  --fixture fixtures/normal-factor-screen.json \
  --output artifacts/fixture-report.md \
  --json-output artifacts/fixture-output.json \
  --trace artifacts/fixture-trace.json
```

## Live smoke test

```bash
node scripts/run.mjs \
  --live \
  --universe AAPL,MSFT,NVDA,AMD,AVGO \
  --window-days 90 \
  --max-paid-calls 5 \
  --max-credits 85 \
  --output artifacts/factor-live-smoke.md \
  --json-output artifacts/factor-live-smoke-output.json \
  --trace artifacts/factor-live-smoke-trace.json
```

## Live scenario: semiconductor screen

```bash
node scripts/run.mjs \
  --live \
  --universe NVDA,AMD,AVGO,INTC,QCOM \
  --market US \
  --window-days 90 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 85 \
  --output artifacts/scenario-02-semis.md \
  --json-output artifacts/scenario-02-semis-output.json \
  --trace artifacts/scenario-02-semis-trace.json
```

## Live scenario: defensive quality screen

```bash
node scripts/run.mjs \
  --live \
  --universe JNJ,PG,KO,PEP,WMT \
  --market US \
  --window-days 90 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 85 \
  --output artifacts/scenario-03-defensive-quality.md \
  --json-output artifacts/scenario-03-defensive-quality-output.json \
  --trace artifacts/scenario-03-defensive-quality-trace.json
```
