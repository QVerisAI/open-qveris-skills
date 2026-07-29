# Examples

## Dry-run preflight

```bash
node scripts/run.mjs \
  --dry-run \
  --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU \
  --benchmark SPY \
  --window-days 30 \
  --max-paid-calls 0 \
  --output artifacts/sector-dry-run.md \
  --json-output artifacts/sector-dry-run-output.json \
  --trace artifacts/sector-dry-run-trace.json
```

## Fixture regression

```bash
node scripts/run.mjs \
  --fixture fixtures/normal-sector-rotation.json \
  --output artifacts/fixture-report.md \
  --json-output artifacts/fixture-output.json \
  --trace artifacts/fixture-trace.json
```

## Live smoke test

```bash
node scripts/run.mjs \
  --live \
  --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU \
  --benchmark SPY \
  --window-days 30 \
  --max-paid-calls 5 \
  --max-credits 85 \
  --output artifacts/sector-live-smoke.md \
  --json-output artifacts/sector-live-smoke-output.json \
  --trace artifacts/sector-live-smoke-trace.json
```

## Live scenario: risk-on/risk-off sectors

```bash
node scripts/run.mjs \
  --live \
  --sectors XLK,XLY,XLF,XLU,XLP,XLV \
  --market US \
  --benchmark SPY \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 85 \
  --output artifacts/scenario-02-risk-on-off.md \
  --json-output artifacts/scenario-02-risk-on-off-output.json \
  --trace artifacts/scenario-02-risk-on-off-trace.json
```

## Live scenario: cyclicals versus defensives

```bash
node scripts/run.mjs \
  --live \
  --sectors XLI,XLE,XLB,XLP,XLU,XLV \
  --market US \
  --benchmark SPY \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 85 \
  --output artifacts/scenario-03-cyclicals-defensives.md \
  --json-output artifacts/scenario-03-cyclicals-defensives-output.json \
  --trace artifacts/scenario-03-cyclicals-defensives-trace.json
```
