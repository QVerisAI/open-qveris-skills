# Codex E2E Validation

Date: 2026-07-02

Prompt simulated in Codex:

> Use QVeris to screen AAPL, MSFT, NVDA, AMD, and AVGO by quality, momentum, valuation, liquidity, volatility, and news risk under an 80-credit budget.

Command run:

```bash
node qveris-quant-factor-screen/scripts/run.mjs \
  --live \
  --universe AAPL,MSFT,NVDA,AMD,AVGO \
  --window-days 90 \
  --max-paid-calls 4 \
  --max-credits 80 \
  --output qveris-quant-factor-screen/artifacts/live-smoke.md \
  --trace qveris-quant-factor-screen/artifacts/live-smoke-trace.json
```

Result:

- Report generated: `qveris-quant-factor-screen/artifacts/live-smoke.md`
- Trace generated: `qveris-quant-factor-screen/artifacts/live-smoke-trace.json`
- Paid calls: 4
- Estimated credits: 51.4
- Execution IDs:
  - `987a0b10-8660-4f6c-b1a9-c0a2f57b350e`
  - `5eb8e072-57d1-4f0a-aebe-ff3ee647e9f7`
  - `9ec94a39-5f8a-4fe1-99e5-17e1107c32b4`
  - `39378274-360d-40d3-acba-c0586317fdaa`

Known limitation:

- The first runner samples the first ticker for expensive factor inputs; broader universe expansion should be staged after budget approval.
