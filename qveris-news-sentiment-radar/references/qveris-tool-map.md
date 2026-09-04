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
| Filings | Finnhub | `finnhub.stock.filings.retrieve.v1`, `finnhub.stock.filings.retrieve.v1.27aa1125`, `finnhub.stock.filings.retrieve.v1.b6619ba1` | optional `symbol`, `cik`, `form`, `from`, `to` | 1 credit/call | Current success sample weak; fallback on empty enabled | Filing-event confirmation when available. |
| Live quote | EODHD | `eodhd.live_data.real_time.retrieve.v1.b60a4285` | `symbol`, optional `fmt` | 2.81 credits/call | Success rate 0.995, avg 1215 ms | Primary price-reaction sanity check after hardening. |
| Quote | Finnhub | `finnhub_io_api.stock.quote`, `finnhub.quote.retrieve.v1.f72cf5ef` | `symbol` | 1 credit/call | Finnhub quote failed in 2026-07-03 live smoke | Low-cost quote fallback only. |

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
    "symbol": "NVDA.US",
    "fmt": "json"
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
- If filings fail or have zero records, try the next Finnhub filings variant; do not infer confirmation from news alone if all variants fail or return empty.
- If quote data fails, try EODHD live data before Finnhub quote; return catalyst evidence without price-reaction scoring only when all quote routes fail.
- If cost exceeds budget, keep Alpha Vantage news as first call and skip lower-priority signals.
- Compute `catalyst_confidence_score` from sentiment balance and corroborating roles. Label `confirmed_evidence_set` only when all required roles return usable payloads.

## Live Scenario Verification Update - 2026-07-03

Additional live scenarios were run for TSLA 14d and AAPL 30d. Total incremental cost was 8 paid calls and 13.62 credits.

| Scenario | Successful routes | Failed or empty routes | Cost |
| --- | --- | --- | --- |
| TSLA 14d | Alpha Vantage news sentiment, EODHD aggregate sentiment | Finnhub filings, Finnhub quote | 4 calls / 6.81 credits |
| AAPL 30d | Alpha Vantage news sentiment, EODHD aggregate sentiment | Finnhub filings, Finnhub quote | 4 calls / 6.81 credits |

Observed fallback policy:

- Treat Alpha Vantage news plus EODHD aggregate sentiment as the verified minimum viable signal set.
- Treat Finnhub filings as optional confirmation only; an empty or unsuccessful response means "not verified", not "no catalyst".
- Finnhub quote returned unsuccessful in both new scenarios. The hardened runner now prioritizes EODHD live data for price reaction, then falls back to Finnhub variants.
- Keep the budget order as news sentiment, aggregate sentiment, filings, then quote fallback; allow one extra paid call when fallback is expected.

## Skill-side Hardening Update - 2026-07-03

- Runner fallback is role-scoped: unsuccessful or empty filings/quote calls remain in trace, then the next verified candidate is attempted while budget remains. Filings fallback is capped at two attempts so price reaction is not starved by repeated filing-provider failures.
- Missing data is reported once per role instead of once per failed provider attempt.
- Structured output now includes `catalyst_confidence_score` and `corroborating_roles`; these are deterministic summaries of returned evidence, not provider-native scores.

## Hardening Live Verification - 2026-07-03

Artifact set: `artifacts/hardening-live-20260703.*`

| Route | Tool | Result |
| --- | --- | --- |
| Market news sentiment | `alphavantage.news_sentiment.query.v1.467a92c0` | Success. |
| Aggregate sentiment | `eodhd.sentiments.list.v1.9ba159a0` | Success. |
| Filings check | `finnhub.stock.filings.retrieve.v1`, `finnhub.stock.filings.retrieve.v1.27aa1125` | Provider unsuccessful; fallback capped after two attempts. |
| Price reaction | `eodhd.live_data.real_time.retrieve.v1.b60a4285` | Success; no longer skipped after filing-provider failures. |

Final live artifact cost: 5 paid calls / 9.62 credits. Output status: `catalyst_confidence_score=0.601`; corroborating roles are news, aggregate sentiment, and price reaction. Remaining missing data is filings confirmation.

## Skill-side Repair Update - 2026-07-03

- Added `issuer_confirmation` as a paid fallback route after filings attempts. It uses strict preferred candidates only: EODHD company news, then Alpha Vantage news sentiment. Do not fall back to SEC filings tools in this role because their parameter schema is different.
- Catalyst confirmation now accepts either `filings_check` or `issuer_confirmation`; `confirmed_evidence_set` still requires market news, aggregate sentiment, price reaction, and one confirmation role.
- Output contract now includes `confirmation_roles` so downstream agents can distinguish SEC/filings evidence from issuer/news fallback evidence.
- Default live guardrail is now 20 paid calls / 150 credits to support bounded watchlist scans and issuer-confirmation fallback without starving price reaction.

## Repair Live Verification - 2026-07-03

Artifact set: `artifacts/repair-live-20260703.*`

- Cost: 6 paid calls / 33.82 credits.
- Result: market news, aggregate sentiment, price reaction, and fallback issuer-confirmation routes executed within budget.
- Remaining gap: `filings_or_issuer_confirmation` still missing because the live providers returned no usable filings/issuer-confirmation records for the selected NVDA window. This is now a provider/data availability gap, not a skipped skill route.
