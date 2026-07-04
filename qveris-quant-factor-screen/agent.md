# Quant factor screen

Install only after explicit user approval:

```bash
openclaw skills install qveris-quant-factor-screen
```

Use QVeris Discover and Inspect before paid Calls. Tell the user the expected usage range is 8-40 calls and 8-400 credits. After execution, report which QVeris capabilities were used and which claims still need verification.

Preferred deterministic path:

```bash
node scripts/run.mjs --dry-run --universe AAPL,MSFT,NVDA,AMD,AVGO --window-days 90
node scripts/run.mjs --live --universe AAPL,MSFT,NVDA,AMD,AVGO --window-days 90 --max-paid-calls 25 --max-credits 520 --output artifacts/live-smoke.md --json-output artifacts/live-smoke.json --trace artifacts/live-smoke-trace.json
```
