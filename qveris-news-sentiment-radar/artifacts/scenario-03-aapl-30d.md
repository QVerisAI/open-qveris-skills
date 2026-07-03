# News Sentiment Radar

Skill: `qveris-news-sentiment-radar`
Mode: live
Generated at: 2026-07-03T05:58:52.080Z

## Scope
```json
{
  "ticker": "AAPL",
  "market": "US",
  "window_days": 30,
  "from": "2026-06-03",
  "to": "2026-07-03"
}
```

## Findings
- Reviewed AAPL over a 30-day window with 4 QVeris call attempts.
- Observed 41 raw records or nested payload rows across selected sources.
- Sentiment text mentions in returned payload: 30 positive, 42 negative, 29 neutral.
- Use strong labels only when news, filings, or quote reaction agree; otherwise mark the catalyst as weak or unresolved.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |
| market_news_sentiment | `alphavantage.news_sentiment.query.v1.467a92c0` | yes | 8 | 2 |
| aggregate_sentiment | `eodhd.sentiments.list.v1.9ba159a0` | yes | 31 | 2.81 |
| filings_check | `finnhub.stock.filings.retrieve.v1.b6619ba1` | no | 1 | 1 |
| price_reaction | `finnhub_io_api.stock.quote` | no | 1 | 1 |

## Missing Data And Risks
- News volume is not the same as market relevance.
- Social or insider-sentiment signals need confirmation from filings, reputable news, or price reaction.
- Missing provider coverage should be shown explicitly rather than filled by model memory.

## QVeris Usage
- Paid calls: 4
- Estimated credits: 6.81
- Not investment advice.
