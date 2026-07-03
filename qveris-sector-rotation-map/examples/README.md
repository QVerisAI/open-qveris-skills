# Examples

## Dry-run preflight

```bash
node qveris-sector-rotation-map/scripts/run.mjs \
  --dry-run \
  --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU \
  --benchmark SPY \
  --window-days 30 \
  --max-paid-calls 0 \
  --output qveris-sector-rotation-map/artifacts/sector-dry-run.md \
  --json-output qveris-sector-rotation-map/artifacts/sector-dry-run-output.json \
  --trace qveris-sector-rotation-map/artifacts/sector-dry-run-trace.json
```

## Fixture regression

```bash
node qveris-sector-rotation-map/scripts/run.mjs \
  --fixture qveris-sector-rotation-map/fixtures/normal-sector-rotation.json \
  --output qveris-sector-rotation-map/artifacts/fixture-report.md \
  --json-output qveris-sector-rotation-map/artifacts/fixture-output.json \
  --trace qveris-sector-rotation-map/artifacts/fixture-trace.json
```

## Live smoke test

```bash
node qveris-sector-rotation-map/scripts/run.mjs \
  --live \
  --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU \
  --benchmark SPY \
  --window-days 30 \
  --max-paid-calls 4 \
  --max-credits 80 \
  --output qveris-sector-rotation-map/artifacts/sector-live-smoke.md \
  --json-output qveris-sector-rotation-map/artifacts/sector-live-smoke-output.json \
  --trace qveris-sector-rotation-map/artifacts/sector-live-smoke-trace.json
```

## Live scenario: risk-on/risk-off sectors

```bash
node qveris-sector-rotation-map/scripts/run.mjs \
  --live \
  --sectors XLK,XLY,XLF,XLU,XLP,XLV \
  --market US \
  --benchmark SPY \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 80 \
  --output qveris-sector-rotation-map/artifacts/scenario-02-risk-on-off.md \
  --json-output qveris-sector-rotation-map/artifacts/scenario-02-risk-on-off-output.json \
  --trace qveris-sector-rotation-map/artifacts/scenario-02-risk-on-off-trace.json
```

## Live scenario: cyclicals versus defensives

```bash
node qveris-sector-rotation-map/scripts/run.mjs \
  --live \
  --sectors XLI,XLE,XLB,XLP,XLU,XLV \
  --market US \
  --benchmark SPY \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 80 \
  --output qveris-sector-rotation-map/artifacts/scenario-03-cyclicals-defensives.md \
  --json-output qveris-sector-rotation-map/artifacts/scenario-03-cyclicals-defensives-output.json \
  --trace qveris-sector-rotation-map/artifacts/scenario-03-cyclicals-defensives-trace.json
```
