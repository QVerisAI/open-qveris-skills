# Codex E2E Validation

Date: 2026-07-02

Prompt simulated in Codex:

> Use QVeris to build a 7-day news and sentiment radar for NVDA. Keep the budget under 30 credits and save a report plus trace.

Command run:

```bash
node qveris-news-sentiment-radar/scripts/run.mjs \
  --live \
  --ticker NVDA \
  --window-days 7 \
  --max-paid-calls 4 \
  --max-credits 30 \
  --output qveris-news-sentiment-radar/artifacts/live-smoke.md \
  --trace qveris-news-sentiment-radar/artifacts/live-smoke-trace.json
```

Result:

- Report generated: `qveris-news-sentiment-radar/artifacts/live-smoke.md`
- Trace generated: `qveris-news-sentiment-radar/artifacts/live-smoke-trace.json`
- Paid calls: 4
- Estimated credits: 6.81
- Execution IDs:
  - `70d0672a-6a6d-4862-b00f-315b1aa76fad`
  - `4d8f4af4-f70f-48f5-808e-662db1033dad`
  - `0d4cc78f-0a92-40d6-8c48-602579e36110`
  - `c08314af-3d5a-48b9-8712-56510c189fe5`

Known limitation:

- Filing check returned unsuccessful and is preserved as a missing-data signal rather than inferred from news.
