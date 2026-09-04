# Codex E2E Validation

Date: 2026-07-02

Prompt simulated in Codex:

> Use QVeris to map US sector rotation using XLK, XLF, XLV, XLE, XLI, XLY, XLP, and XLU against SPY under an 80-credit budget.

Command run:

```bash
node qveris-sector-rotation-map/scripts/run.mjs \
  --live \
  --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU \
  --benchmark SPY \
  --window-days 30 \
  --max-paid-calls 4 \
  --max-credits 80 \
  --output qveris-sector-rotation-map/artifacts/live-smoke.md \
  --trace qveris-sector-rotation-map/artifacts/live-smoke-trace.json
```

Result:

- Report generated: `qveris-sector-rotation-map/artifacts/live-smoke.md`
- Trace generated: `qveris-sector-rotation-map/artifacts/live-smoke-trace.json`
- Paid calls: 3
- Estimated credits: 72.6
- Execution IDs:
  - `03bb593c-c359-46f8-b782-55a8f8b641f0`
  - `6368bb54-97e5-4879-989d-0e21f09882e4`
  - `f83f4b3b-e4e5-4355-aba2-5e9841a7b332`

Known limitation:

- ETF performance call was skipped because the strict preferred ETF-performance tool was not returned by this Discover/Inspect preflight.
