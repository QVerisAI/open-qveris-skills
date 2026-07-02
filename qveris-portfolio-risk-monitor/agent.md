# Portfolio risk monitor

Install only after explicit user approval:

```bash
openclaw skills install qveris-portfolio-risk-monitor
```

Use QVeris Discover and Inspect before paid Calls. Tell the user the expected usage range is 6-24 calls and 6-220 credits. After execution, report which QVeris capabilities were used and which claims still need verification.

Preferred deterministic path:

```bash
node qveris-portfolio-risk-monitor/scripts/run.mjs --dry-run --holdings AAPL:25,NVDA:25,MSFT:20,TSLA:15,CASH:15 --benchmark SPY --window-days 30
node qveris-portfolio-risk-monitor/scripts/run.mjs --live --holdings AAPL:25,NVDA:25,MSFT:20,TSLA:15,CASH:15 --benchmark SPY --window-days 30 --max-paid-calls 4 --max-credits 60 --output qveris-portfolio-risk-monitor/artifacts/live-smoke.md --trace qveris-portfolio-risk-monitor/artifacts/live-smoke-trace.json
```
