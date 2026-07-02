# QVeris Tool Map

Validation date: 2026-07-02

This map records QVeris Discover / Inspect preflight results for the first productized runner. Tool IDs can evolve, so the runner still performs Discover / Inspect before paid Calls and treats this file as a verified candidate map, not a hard dependency.

## Discovery Queries

| Data category | Query | Purpose |
| --- | --- | --- |
| News and sentiment | `stock news sentiment filings quote reaction API` | Find market-news and sentiment feeds for ticker radar. |
| Market reaction | `real-time stock quote and historical OHLCV data API` | Verify price reaction or quote movement alongside news. |
| Filings | `SEC filings company announcements stock API` | Separate confirmed filings or official events from noisy narratives. |

## Verified Candidates

| Category | Provider | Tool ID | Parameters | Cost | Observed quality | Use |
| --- | --- | --- | --- | --- | --- | --- |
| News sentiment | Alpha Vantage | `alphavantage.news_sentiment.query.v1.467a92c0` | `function=NEWS_SENTIMENT`, optional `tickers`, `time_from`, `time_to`, `sort`, `limit` | 2 credits/call | Success rate 0.944, avg 593 ms | Primary market-news sentiment feed. |
| Sentiment score | EODHD | `eodhd.sentiments.list.v1.9ba159a0` | `s`, optional `from`, `to` | 2.81 credits/call | Success rate 1.0, avg 885 ms | Aggregate ticker sentiment check. |
| Insider sentiment | Finnhub | `finnhub.stock.insidersentiment.retrieve.v1.dff02940` | `symbol`, `from`, `to` | 1 credit/call | Success rate 0.548, avg 363 ms | Secondary sentiment signal, not a news substitute. |
| Filings | Finnhub | `finnhub.stock.filings.retrieve.v1.b6619ba1` | optional `symbol`, `cik`, `form`, `from`, `to` | 1 credit/call | Current success sample weak; inspect before use | Filing-event confirmation when available. |
| Quote | Finnhub | `finnhub_io_api.stock.quote` | `symbol` | 1 credit/call | Success rate 0.916, avg 477 ms | Price-reaction sanity check. |

## Parameter Templates

```json
{
  "market_news_sentiment": {
    "function": "NEWS_SENTIMENT",
    "tickers": "NVDA",
    "time_from": "20260625T0000",
    "time_to": "20260702T0000",
    "sort": "LATEST",
    "limit": "10"
  },
  "aggregate_sentiment": {
    "s": "NVDA.US",
    "from": "2026-06-25",
    "to": "2026-07-02"
  },
  "filings_check": {
    "symbol": "NVDA",
    "from": "2026-06-25",
    "to": "2026-07-02"
  },
  "price_reaction": {
    "symbol": "NVDA"
  }
}
```

## Returned Fields To Normalize

- Article/title/source/time/ticker sentiment fields from news providers.
- Sentiment scores or labels by ticker.
- Filing form, filed date, accession number, and document URL.
- Quote fields such as current price, change, percent change, and timestamp.

## Fallback Strategy

- If news sentiment fails, use aggregate sentiment and quote reaction, then mark missing article evidence.
- If filings fail or have zero records, do not infer confirmation from news alone.
- If quote data fails, return catalyst evidence without price-reaction scoring.
- If cost exceeds budget, keep Alpha Vantage news as first call and skip lower-priority signals.
