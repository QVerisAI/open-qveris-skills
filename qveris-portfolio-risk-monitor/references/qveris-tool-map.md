# QVeris Tool Map

Validation date: 2026-07-02

This map records QVeris Discover / Inspect preflight results for the first productized runner. The runner still performs Discover / Inspect before paid Calls to refresh coverage, parameters, and billing.

## Discovery Queries

| Data category | Query | Purpose |
| --- | --- | --- |
| Quote/history/liquidity | `portfolio risk real-time stock quote EODHD live data historical OHLCV volatility liquidity API` | Measure price, drawdown, volatility, volume, and liquidity risk. |
| Historical prices | `historical price EOD full chart stock OHLCV FMP API` | Keep historical close data separate from live quote candidates. |
| Profile/sector | `company fundamentals sector industry profile market data API` | Attribute holdings to company, sector, and industry exposures. |
| News/calendar | `earnings calendar company news stock API` | Add catalyst, earnings, and news-risk checks. |

## Verified Candidates

| Category | Provider | Tool ID | Parameters | Cost | Observed quality | Use |
| --- | --- | --- | --- | --- | --- | --- |
| Live OHLCV | EODHD | `eodhd.live_data.real_time.retrieve.v1.b60a4285` | `symbol`, optional `fmt` | 2.81 credits/call | Success rate 0.995, avg 1215 ms | Primary quote / liquidity snapshot after hardening. |
| Delayed quote | EODHD | `eodhd.live_v2.us_quote_delayed.retrieve.v1.f0e13d45` | `s`, `page[limit]`, optional `fmt` | Inspect before use | Added as quote fallback | Secondary quote snapshot when live data is unavailable. |
| Quote | Finnhub | `finnhub_io_api.stock.quote` | `symbol` | 1 credit/call | Finnhub quote failed in 2026-07-03 live smoke | Low-cost quote fallback only. |
| History | FMP | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | `symbol`, optional `from`, `to` | 24.2 credits/call | Success rate 0.777, avg 1049 ms | Drawdown and volatility input. |
| Profile | FMP | `financialmodelingprep.stable.profile.retrieve.v1.0b443195` | `symbol` | 24.2 credits/call | Success rate 0.921, avg 1087 ms | Sector / industry exposure. |
| News | EODHD | `eodhd.news.retrieve.v1.fe8bf94c` | `s`, `from`, `to`, optional `limit`, `fmt` | Inspect before use | Added as news-catalyst fallback candidate | Primary news/catalyst route when discovered. |
| News sentiment | Alpha Vantage | `alphavantage.news_sentiment.query.v1.467a92c0` | `function=NEWS_SENTIMENT`, optional `tickers`, `sort`, `limit` | 2 credits/call | Success rate 0.944, avg 593 ms | News and catalyst risk fallback. |
| CN beta/volatility | CN Financial Pro | `cn_financial_pro.beta_volatility.v1` | `codes`, optional `sdate`, `edate`, `freq`, `benchmark` | 1 credit/result | Success rate 0.651, avg 395 ms | A-share specific beta/volatility route. |

## Parameter Templates

```json
{
  "quote_snapshot": { "symbol": "NVDA.US", "fmt": "json" },
  "historical_prices": {
    "symbol": "NVDA",
    "from": "2026-06-02",
    "to": "2026-07-02"
  },
  "profile_sector": { "symbol": "NVDA" },
  "news_catalyst": { "s": "NVDA.US", "from": "2026-06-02", "to": "2026-07-02", "limit": 10, "fmt": "json" }
}
```

## Returned Fields To Normalize

- Quote price, change, percent change, and volume.
- Historical close/high/low/volume for drawdown and volatility.
- Company sector, industry, market cap, and exchange.
- News headline/source/time/sentiment and earnings/catalyst references.

## Fallback Strategy

- Historical prices use the strict FMP historical-price route. If it is not discovered or is too expensive, run quote/news/profile only and flag volatility/drawdown/VaR as missing.
- If profile/sector is missing, classify exposure as unknown rather than redistributing weights.
- If news fails or returns empty, try EODHD news then Alpha Vantage news sentiment; return numeric portfolio risk with catalyst-risk gap only when both fail.
- If a holding lacks provider coverage, keep its weight in concentration but mark its data status as missing.
- Compute top-holding volatility, max drawdown, and 95% historical VaR from returned historical prices when enough closes are available. Correlation remains missing until a multi-asset history route is added.

## Live Scenario Verification Update - 2026-07-03

Additional live scenarios were run for a concentrated NVDA portfolio and a defensive stock portfolio. Total incremental cost was 6 paid calls and 98.8 credits.

| Scenario | Successful routes | Failed or skipped routes | Cost |
| --- | --- | --- | --- |
| Concentrated NVDA | FMP historical prices, FMP profile/sector | Finnhub quote failed; news catalyst skipped due no inspected tool candidate | 3 calls / 49.4 credits |
| Defensive stocks | FMP historical prices, FMP profile/sector | Finnhub quote failed; news catalyst skipped due no inspected tool candidate | 3 calls / 49.4 credits |

Observed fallback policy:

- Prioritize FMP historical prices and profile/sector when the goal is exposure and risk decomposition.
- Finnhub quote returned unsuccessful in both new scenarios. The hardened runner now uses EODHD live data first, then EODHD delayed quote, then Finnhub.
- If quote fallback is unavailable, keep concentration and sector exposure but mark quote-dependent metrics as missing.
- Current runner computes top-holding volatility, max drawdown, and historical VaR from returned history. Correlation remains an implementation/provider-coverage gap because the runner currently fetches only the top non-cash holding history.

## Skill-side Hardening Update - 2026-07-03

- Runner fallback is role-scoped and traceable across quote and news routes.
- Structured output now includes `risk_metrics` for the top non-cash holding when historical prices are present.
- `missing_metrics` distinguishes unavailable volatility/drawdown/VaR from correlation, instead of marking all risk analytics missing by default.

## Hardening Live Verification - 2026-07-03

Artifact set: `artifacts/hardening-live-20260703.*`

| Route | Tool | Result |
| --- | --- | --- |
| Quote snapshot | `eodhd.live_data.real_time.retrieve.v1.b60a4285` | Success. |
| Historical prices | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | Success after splitting historical prices into a strict category. |
| Profile / sector | `financialmodelingprep.stable.profile.retrieve.v1.0b443195` | Success. |
| News catalyst | `eodhd.news.retrieve.v1.fe8bf94c` | Success. |

Final live artifact cost: 4 paid calls / 54.02 credits. Output status: top-holding `risk_metrics` populated with 21 observations, annualized volatility, max drawdown, and historical VaR. Remaining missing metric is correlation.
