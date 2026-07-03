# QVeris Tool Map

Validation date: 2026-07-02

This map records QVeris Discover / Inspect preflight results for the first productized runner. The runner still performs Discover / Inspect before paid Calls to refresh coverage, parameters, and billing.

## Discovery Queries

| Data category | Query | Purpose |
| --- | --- | --- |
| Quote/history/liquidity | `portfolio risk stock quote historical OHLCV volatility liquidity API` | Measure price, drawdown, volatility, volume, and liquidity risk. |
| Profile/sector | `company fundamentals sector industry profile market data API` | Attribute holdings to company, sector, and industry exposures. |
| News/calendar | `earnings calendar company news stock API` | Add catalyst, earnings, and news-risk checks. |

## Verified Candidates

| Category | Provider | Tool ID | Parameters | Cost | Observed quality | Use |
| --- | --- | --- | --- | --- | --- | --- |
| Quote | Finnhub | `finnhub_io_api.stock.quote` | `symbol` | 1 credit/call | Success rate 0.916, avg 477 ms | Low-cost quote snapshot. |
| Live OHLCV | EODHD | `eodhd.live_data.real_time.retrieve.v1.b60a4285` | `symbol`, optional `fmt`, `s` | 2.81 credits/call | Success rate 0.995, avg 1215 ms | Fallback quote / liquidity snapshot. |
| History | FMP | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | `symbol`, optional `from`, `to` | 24.2 credits/call | Success rate 0.777, avg 1049 ms | Drawdown and volatility input. |
| Profile | FMP | `financialmodelingprep.stable.profile.retrieve.v1.0b443195` | `symbol` | 24.2 credits/call | Success rate 0.921, avg 1087 ms | Sector / industry exposure. |
| News sentiment | Alpha Vantage | `alphavantage.news_sentiment.query.v1.467a92c0` | `function=NEWS_SENTIMENT`, optional `tickers`, `sort`, `limit` | 2 credits/call | Success rate 0.944, avg 593 ms | News and catalyst risk. |
| CN beta/volatility | CN Financial Pro | `cn_financial_pro.beta_volatility.v1` | `codes`, optional `sdate`, `edate`, `freq`, `benchmark` | 1 credit/result | Success rate 0.651, avg 395 ms | A-share specific beta/volatility route. |

## Parameter Templates

```json
{
  "quote_snapshot": { "symbol": "NVDA" },
  "historical_prices": {
    "symbol": "NVDA",
    "from": "2026-06-02",
    "to": "2026-07-02"
  },
  "profile_sector": { "symbol": "NVDA" },
  "news_catalyst": {
    "function": "NEWS_SENTIMENT",
    "tickers": "NVDA",
    "sort": "LATEST",
    "limit": "10"
  }
}
```

## Returned Fields To Normalize

- Quote price, change, percent change, and volume.
- Historical close/high/low/volume for drawdown and volatility.
- Company sector, industry, market cap, and exchange.
- News headline/source/time/sentiment and earnings/catalyst references.

## Fallback Strategy

- If historical prices are too expensive, run quote/news/profile only and flag volatility/drawdown as missing.
- If profile/sector is missing, classify exposure as unknown rather than redistributing weights.
- If news fails, return numeric portfolio risk with catalyst-risk gap.
- If a holding lacks provider coverage, keep its weight in concentration but mark its data status as missing.

## Live Scenario Verification Update - 2026-07-03

Additional live scenarios were run for a concentrated NVDA portfolio and a defensive stock portfolio. Total incremental cost was 6 paid calls and 98.8 credits.

| Scenario | Successful routes | Failed or skipped routes | Cost |
| --- | --- | --- | --- |
| Concentrated NVDA | FMP historical prices, FMP profile/sector | Finnhub quote failed; news catalyst skipped due no inspected tool candidate | 3 calls / 49.4 credits |
| Defensive stocks | FMP historical prices, FMP profile/sector | Finnhub quote failed; news catalyst skipped due no inspected tool candidate | 3 calls / 49.4 credits |

Observed fallback policy:

- Prioritize FMP historical prices and profile/sector when the goal is exposure and risk decomposition.
- Finnhub quote returned unsuccessful in both new scenarios. Before production, use EODHD live data as the quote fallback when budget allows.
- If quote fallback is unavailable, keep concentration and sector exposure but mark quote-dependent metrics as missing.
- Current runner does not yet compute full VaR, drawdown, volatility, or correlation from returned history; those remain implementation hardening items, not provider gaps.
