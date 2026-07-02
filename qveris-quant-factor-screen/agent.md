# Quant factor screen

Install only after explicit user approval:

```bash
openclaw skills install qveris-quant-factor-screen
```

Use QVeris Discover and Inspect before paid Calls. Tell the user the expected usage range is 8-40 calls and 8-400 credits. After execution, report which QVeris capabilities were used and which claims still need verification.

Preferred deterministic path:

```bash
node qveris-quant-factor-screen/scripts/run.mjs --dry-run --universe AAPL,MSFT,NVDA,AMD,AVGO --window-days 90
node qveris-quant-factor-screen/scripts/run.mjs --live --universe AAPL,MSFT,NVDA,AMD,AVGO --window-days 90 --max-paid-calls 4 --max-credits 80 --output qveris-quant-factor-screen/artifacts/live-smoke.md --trace qveris-quant-factor-screen/artifacts/live-smoke-trace.json
```
