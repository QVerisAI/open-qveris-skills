# QVeris Tool Map

Validation date: 2026-07-02

This map records QVeris Discover / Inspect preflight results for the first productized runner. The runner refreshes Discover / Inspect before paid Calls and uses this file as the verified starting map.

## Discovery Queries

| Data category | Query | Purpose |
| --- | --- | --- |
| Fundamentals/valuation | `stock factor screening fundamentals valuation financial ratios API` | Quality and valuation factor inputs. |
| Quote/liquidity | `stock quote OHLCV liquidity shares float API` | Momentum, liquidity, and tradability inputs. |
| Technical momentum | `technical indicators momentum volatility stock API` | Deterministic momentum and volatility signals. |

## Verified Candidates

| Category | Provider | Tool ID | Parameters | Cost | Observed quality | Use |
| --- | --- | --- | --- | --- | --- | --- |
| Ratios | FMP | `financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef` | `symbol`, optional `limit`, `period` | 24.2 credits/call | Success rate 0.939, avg 1084 ms | Valuation and quality factors. |
| Shares float | FMP | `financialmodelingprep.stable.sharesfloat.retrieve.v1.9fdd1e4f` | `symbol` | 24.2 credits/call | Success rate 1.0, avg 1033 ms | Liquidity and float signal. |
| Live OHLCV | EODHD | `eodhd.live_data.real_time.retrieve.v1.b60a4285` | `symbol`, optional `fmt`, `s` | 2.81 credits/call | Success rate 0.995, avg 1215 ms | Quote and volume snapshot. |
| Quote | Finnhub | `finnhub_io_api.stock.quote` | `symbol` | 1 credit/call | Success rate 0.916, avg 477 ms | Low-cost quote fallback. |
| Momentum | Alpha Vantage | `alphavantage.rocr.list.v1.467a92c0` | `function=ROCR`, `symbol`, `interval`, `time_period`, `series_type` | 2 credits/call | Success rate 1.0, avg 465 ms | Momentum factor. |
| Technical volatility | Alpha Vantage | `alphavantage.technical-indicators.bbands.v1` | `function=BBANDS`, `symbol`, `interval`, `time_period`, `series_type` | 2 credits/call | Success rate 0.998, avg 498 ms | Volatility/band context. |

## Parameter Templates

```json
{
  "valuation_ratios": {
    "symbol": "NVDA",
    "limit": 1,
    "period": "annual"
  },
  "liquidity_float": { "symbol": "NVDA" },
  "quote_snapshot": { "symbol": "NVDA" },
  "momentum_rocr": {
    "function": "ROCR",
    "symbol": "NVDA",
    "interval": "daily",
    "time_period": 60,
    "series_type": "close"
  }
}
```

## Returned Fields To Normalize

- Valuation ratios such as PE, PB, EV/EBITDA, margins, debt, and returns when available.
- Float, volume, and live quote fields.
- ROCR or other momentum values by date.
- Missing provider fields by ticker and factor.

## Fallback Strategy

- If FMP ratio calls are over budget, run quote and momentum only and label valuation/quality as missing.
- If technical indicator calls fail, use quote/history fallback where available.
- Never impute missing fundamentals as neutral.
- For large universes, run staged sampling first and expand only after budget approval.

## Live Scenario Verification Update - 2026-07-03

Additional live scenarios were run for a semiconductor universe and a defensive-quality universe. Total incremental cost was 8 paid calls and 102.8 credits.

| Scenario | Successful routes | Failed routes | Cost |
| --- | --- | --- | --- |
| Semiconductors | FMP ratios, FMP shares float, Alpha Vantage BBANDS | Finnhub quote | 4 calls / 51.4 credits |
| Defensive quality | FMP ratios, FMP shares float, Alpha Vantage BBANDS | Finnhub quote | 4 calls / 51.4 credits |

Observed fallback policy:

- FMP ratios and shares float are reliable but expensive; keep them behind explicit budget guardrails.
- Alpha Vantage BBANDS is a verified low-cost technical context route.
- Finnhub quote returned unsuccessful in both new scenarios. Before production, prefer EODHD live data for quote/liquidity fallback when budget allows.
- Current runner output remains preview-level for ranking: normalized scores, factor weights, ranking table, and tie-break rules are not yet complete.
