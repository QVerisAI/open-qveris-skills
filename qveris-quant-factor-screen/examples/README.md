# Examples

## Dry-run preflight

```bash
node qveris-quant-factor-screen/scripts/run.mjs \
  --dry-run \
  --universe AAPL,MSFT,NVDA,AMD,AVGO \
  --window-days 90 \
  --max-paid-calls 0 \
  --output qveris-quant-factor-screen/artifacts/factor-dry-run.md \
  --trace qveris-quant-factor-screen/artifacts/factor-dry-run-trace.json
```

## Fixture regression

```bash
node qveris-quant-factor-screen/scripts/run.mjs \
  --fixture qveris-quant-factor-screen/fixtures/normal-factor-screen.json \
  --output qveris-quant-factor-screen/artifacts/fixture-report.md \
  --trace qveris-quant-factor-screen/artifacts/fixture-trace.json
```

## Live smoke test

```bash
node qveris-quant-factor-screen/scripts/run.mjs \
  --live \
  --universe AAPL,MSFT,NVDA,AMD,AVGO \
  --window-days 90 \
  --max-paid-calls 4 \
  --max-credits 80 \
  --output qveris-quant-factor-screen/artifacts/factor-live-smoke.md \
  --trace qveris-quant-factor-screen/artifacts/factor-live-smoke-trace.json
```
