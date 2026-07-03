# News Sentiment Radar

Skill: `qveris-news-sentiment-radar`
Mode: live
Generated at: 2026-07-03T07:57:00.230Z

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
- Reviewed NVDA over a 7-day window with 6 QVeris call attempts.
- Observed 20 raw records or nested payload rows across selected sources.
- Sentiment text mentions in returned payload: 34 positive, 24 negative, 22 neutral.
- Composite catalyst confidence score is 0.698; scores below 0.65 should stay in watchlist mode.
- Use strong labels only when news, filings, or quote reaction agree; otherwise mark the catalyst as weak or unresolved.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |
| market_news_sentiment | `alphavantage.news_sentiment.query.v1.467a92c0` | yes | 8 | 2 |
| aggregate_sentiment | `eodhd.sentiments.list.v1.9ba159a0` | yes | 8 | 2.81 |
| filings_check | `finnhub.stock.filings.retrieve.v1` | no | 0 | 1 |
| filings_check | `finnhub.stock.filings.retrieve.v1.27aa1125` | no | 0 | 1 |
| price_reaction | `eodhd.live_data.real_time.retrieve.v1.b60a4285` | yes | 1 | 2.81 |
| issuer_confirmation | `financialmodelingprep.stable.secfilingscompanysearch.symbol.retrieve.v1.5cf7397d` | no | 3 | 24.2 |

## Missing Data And Risks
- News volume is not the same as market relevance.
- Social or insider-sentiment signals need confirmation from filings, reputable news, or price reaction.
- Missing provider coverage should be shown explicitly rather than filled by model memory.

## QVeris Usage
- Paid calls: 6
- Estimated credits: 33.82
- Not investment advice.
