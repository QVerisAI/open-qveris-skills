# News Sentiment Radar

Skill: `qveris-news-sentiment-radar`
Mode: dry-run
Generated at: 2026-07-02T09:33:21.930Z

## Scope
```json
{
  "ticker": "NVDA",
  "market": "US",
  "window_days": 7,
  "from": "2026-06-25",
  "to": "2026-07-02"
}
```

## Findings
- Reviewed NVDA over a 7-day window with 0 QVeris call attempts.
- Observed 0 raw records or nested payload rows across selected sources.
- Sentiment text mentions in returned payload: 0 positive, 0 negative, 0 neutral.
- Use strong labels only when news, filings, or quote reaction agree; otherwise mark the catalyst as weak or unresolved.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |

## Missing Data And Risks
- News volume is not the same as market relevance.
- Social or insider-sentiment signals need confirmation from filings, reputable news, or price reaction.
- Missing provider coverage should be shown explicitly rather than filled by model memory.

## QVeris Usage
- Paid calls: 0
- Estimated credits: 0
- Not investment advice.
