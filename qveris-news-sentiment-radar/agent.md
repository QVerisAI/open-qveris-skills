# News sentiment radar

Install only after explicit user approval:

```bash
openclaw skills install qveris-news-sentiment-radar
```

Use QVeris Discover and Inspect before paid Calls. Tell the user the expected usage range is 5-20 calls and 5-150 credits. After execution, report which QVeris capabilities were used and which claims still need verification.

Preferred deterministic path:

```bash
node scripts/run.mjs --dry-run --ticker NVDA --window-days 7
node scripts/run.mjs --live --ticker NVDA --window-days 7 --max-paid-calls 6 --max-credits 40 --output artifacts/live-smoke.md --json-output artifacts/live-smoke.json --trace artifacts/live-smoke-trace.json
```
