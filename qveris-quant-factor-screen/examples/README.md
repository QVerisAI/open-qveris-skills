# Examples

## Dry-run preflight

```bash
node qveris-quant-factor-screen/scripts/run.mjs \
  --dry-run \
  --universe AAPL,MSFT,NVDA,AMD,AVGO \
  --window-days 90 \
  --max-paid-calls 0 \
  --output qveris-quant-factor-screen/artifacts/factor-dry-run.md \
  --json-output qveris-quant-factor-screen/artifacts/factor-dry-run-output.json \
  --trace qveris-quant-factor-screen/artifacts/factor-dry-run-trace.json
```

## Fixture regression

```bash
node qveris-quant-factor-screen/scripts/run.mjs \
  --fixture qveris-quant-factor-screen/fixtures/normal-factor-screen.json \
  --output qveris-quant-factor-screen/artifacts/fixture-report.md \
  --json-output qveris-quant-factor-screen/artifacts/fixture-output.json \
  --trace qveris-quant-factor-screen/artifacts/fixture-trace.json
```

## Live smoke test

```bash
node qveris-quant-factor-screen/scripts/run.mjs \
  --live \
  --universe AAPL,MSFT,NVDA,AMD,AVGO \
  --window-days 90 \
  --max-paid-calls 5 \
  --max-credits 85 \
  --output qveris-quant-factor-screen/artifacts/factor-live-smoke.md \
  --json-output qveris-quant-factor-screen/artifacts/factor-live-smoke-output.json \
  --trace qveris-quant-factor-screen/artifacts/factor-live-smoke-trace.json
```

## Live scenario: semiconductor screen

```bash
node qveris-quant-factor-screen/scripts/run.mjs \
  --live \
  --universe NVDA,AMD,AVGO,INTC,QCOM \
  --market US \
  --window-days 90 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 85 \
  --output qveris-quant-factor-screen/artifacts/scenario-02-semis.md \
  --json-output qveris-quant-factor-screen/artifacts/scenario-02-semis-output.json \
  --trace qveris-quant-factor-screen/artifacts/scenario-02-semis-trace.json
```

## Live scenario: defensive quality screen

```bash
node qveris-quant-factor-screen/scripts/run.mjs \
  --live \
  --universe JNJ,PG,KO,PEP,WMT \
  --market US \
  --window-days 90 \
  --as-of 2026-07-03 \
  --max-paid-calls 5 \
  --max-credits 85 \
  --output qveris-quant-factor-screen/artifacts/scenario-03-defensive-quality.md \
  --json-output qveris-quant-factor-screen/artifacts/scenario-03-defensive-quality-output.json \
  --trace qveris-quant-factor-screen/artifacts/scenario-03-defensive-quality-trace.json
```
