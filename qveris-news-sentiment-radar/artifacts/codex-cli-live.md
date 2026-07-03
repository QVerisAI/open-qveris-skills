# News Sentiment Radar

Skill: `qveris-news-sentiment-radar`
Mode: live
Generated at: 2026-07-03T03:06:01.976Z

## Scope
```json
{
  "ticker": "NVDA",
  "market": "US",
  "window_days": 7,
  "from": "2026-06-26",
  "to": "2026-07-03"
}
```

## Findings
- Reviewed NVDA over a 7-day window with 4 QVeris call attempts.
- Observed 17 raw records or nested payload rows across selected sources.
- Sentiment text mentions in returned payload: 26 positive, 34 negative, 20 neutral.
- Use strong labels only when news, filings, or quote reaction agree; otherwise mark the catalyst as weak or unresolved.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |
| market_news_sentiment | `alphavantage.news_sentiment.query.v1.467a92c0` | yes | 8 | 2 |
| aggregate_sentiment | `eodhd.sentiments.list.v1.9ba159a0` | yes | 8 | 2.81 |
| filings_check | `finnhub.stock.filings.retrieve.v1.b6619ba1` | no | 0 | 1 |
| price_reaction | `finnhub_io_api.stock.quote` | no | 1 | 1 |

## Missing Data And Risks
- News volume is not the same as market relevance.
- Social or insider-sentiment signals need confirmation from filings, reputable news, or price reaction.
- Missing provider coverage should be shown explicitly rather than filled by model memory.

## QVeris Usage
- Paid calls: 4
- Estimated credits: 6.81
- Not investment advice.
