# Live Scenario Review

Date: 2026-07-03

Purpose: SOP evidence for reproducible live business scenarios. Each scenario was run with `--live`, a paid-call budget, JSON output, a Markdown report, and a call trace.

## Coverage Matrix

| Scenario | Business question | Artifacts | Paid calls | Credits | Result |
| --- | --- | --- | --- | --- | --- |
| Scenario 01 | NVDA 7-day news/sentiment smoke test | `artifacts/nvda-live-smoke.*` | 4 | 6.81 | Schema-valid preview output; filings and quote reaction may be partial. |
| Scenario 02 | TSLA 14-day catalyst/sentiment check | `artifacts/scenario-02-tsla-14d.*` | 4 | 6.81 | Schema-valid output; news and aggregate sentiment succeeded; filings and quote reaction returned no usable records. |
| Scenario 03 | AAPL 30-day sentiment baseline | `artifacts/scenario-03-aapl-30d.*` | 4 | 6.81 | Schema-valid output; news and aggregate sentiment succeeded; filings and quote reaction returned no usable records. |

## Repro Commands

```bash
node qveris-news-sentiment-radar/scripts/run.mjs \
  --live \
  --ticker TSLA \
  --market US \
  --window-days 14 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 30 \
  --output qveris-news-sentiment-radar/artifacts/scenario-02-tsla-14d.md \
  --json-output qveris-news-sentiment-radar/artifacts/scenario-02-tsla-14d-output.json \
  --trace qveris-news-sentiment-radar/artifacts/scenario-02-tsla-14d-trace.json

node qveris-news-sentiment-radar/scripts/run.mjs \
  --live \
  --ticker AAPL \
  --market US \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 30 \
  --output qveris-news-sentiment-radar/artifacts/scenario-03-aapl-30d.md \
  --json-output qveris-news-sentiment-radar/artifacts/scenario-03-aapl-30d-output.json \
  --trace qveris-news-sentiment-radar/artifacts/scenario-03-aapl-30d-trace.json
```

## Execution Evidence

| Scenario | Task | Provider/tool | OK | Credits | execution_id |
| --- | --- | --- | --- | --- | --- |
| TSLA 14d | market_news_sentiment | Alpha Vantage `alphavantage.news_sentiment.query.v1.467a92c0` | true | 2 | `637a24c5-6e0b-479f-bdc8-7d7b530b339a` |
| TSLA 14d | aggregate_sentiment | EODHD `eodhd.sentiments.list.v1.9ba159a0` | true | 2.81 | `2fc863e9-403e-462d-8b50-ec3773810e55` |
| TSLA 14d | filings_check | Finnhub `finnhub.stock.filings.retrieve.v1.b6619ba1` | false | 1 | `5f301fcf-c939-4fc7-8edc-13fe2ab03db5` |
| TSLA 14d | price_reaction | Finnhub `finnhub_io_api.stock.quote` | false | 1 | `739a3017-4cc5-4752-9df4-938750fab2c9` |
| AAPL 30d | market_news_sentiment | Alpha Vantage `alphavantage.news_sentiment.query.v1.467a92c0` | true | 2 | `e95f503e-2cd0-4cac-8c7c-f37b29d69932` |
| AAPL 30d | aggregate_sentiment | EODHD `eodhd.sentiments.list.v1.9ba159a0` | true | 2.81 | `16b803c9-6c7e-4661-b60a-212439ea4f32` |
| AAPL 30d | filings_check | Finnhub `finnhub.stock.filings.retrieve.v1.b6619ba1` | false | 1 | `11e70fab-7d35-4c30-a3c9-76b2d76f757d` |
| AAPL 30d | price_reaction | Finnhub `finnhub_io_api.stock.quote` | false | 1 | `4853f92d-897b-4677-b350-cda5a213b10c` |

## Notes

- Alpha Vantage news sentiment and EODHD aggregate sentiment were reliable for these live scenarios.
- Finnhub filings and quote calls were paid but returned unsuccessful or empty records in both new scenarios.
- Current preview behavior is correct to mark filings and price reaction as missing rather than infer them from news.
- Next implementation hardening should add a verified quote fallback before treating price reaction as unavailable.
