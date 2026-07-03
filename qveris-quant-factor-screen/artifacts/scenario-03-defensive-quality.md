# Quant Factor Screen

Skill: `qveris-quant-factor-screen`
Mode: live
Generated at: 2026-07-03T06:00:40.502Z

## Scope
```json
{
  "universe": [
    "JNJ",
    "PG",
    "KO",
    "PEP",
    "WMT"
  ],
  "market": "US",
  "window_days": 90,
  "factor_set": [
    "momentum",
    "valuation",
    "liquidity",
    "volatility",
    "quality",
    "news_risk"
  ]
}
```

## Findings
- Screen universe contains 5 tickers: JNJ, PG, KO, PEP, WMT.
- Factor coverage attempted: valuation_ratios, liquidity_float, quote_snapshot, momentum_or_volatility.
- Initial deterministic factor set is momentum, valuation, liquidity, volatility, quality, and news-risk penalty.
- Ranking must expose raw fields, normalized scores, missing-field flags, factor weights, and tie-break rules.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |
| valuation_ratios | `financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef` | yes | 1 | 24.2 |
| liquidity_float | `financialmodelingprep.stable.sharesfloat.retrieve.v1.9fdd1e4f` | yes | 1 | 24.2 |
| quote_snapshot | `finnhub_io_api.stock.quote` | no | 1 | 1 |
| momentum_or_volatility | `alphavantage.technical-indicators.bbands.v1` | yes | 6702 | 2 |

## Missing Data And Risks
- Do not rank missing fundamentals as neutral without flagging the gap.
- Provider coverage can vary by market and ticker.
- This is a research screen, not a buy/sell recommendation.

## QVeris Usage
- Paid calls: 4
- Estimated credits: 51.4
- Not investment advice.
