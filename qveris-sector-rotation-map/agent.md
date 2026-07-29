# Sector rotation map

Install only after explicit user approval:

```bash
openclaw skills install qveris-sector-rotation-map
```

Starter prompt:

> Use QVeris to map the strongest sector rotation this week.

Use QVeris Discover and Inspect before paid Calls. Tell the user the expected usage range and estimated credits (6-200 credits) before execution. After execution, report which QVeris capabilities were used and which claims still need verification.

Preferred deterministic path:

```bash
node scripts/run.mjs --dry-run --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU --benchmark SPY --window-days 30
node scripts/run.mjs --live --sectors XLK,XLF,XLV,XLE,XLI,XLY,XLP,XLU --benchmark SPY --window-days 30 --max-paid-calls 15 --max-credits 360 --output artifacts/live-smoke.md --json-output artifacts/live-smoke.json --trace artifacts/live-smoke-trace.json
```
