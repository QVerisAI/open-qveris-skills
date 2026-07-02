# Quant Factor Screen

Skill: `qveris-quant-factor-screen`
Mode: dry-run
Generated at: 2026-07-02T09:33:51.769Z

## Scope
```json
{
  "universe": [
    "AAPL",
    "MSFT",
    "NVDA",
    "AMD",
    "AVGO"
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
- Screen universe contains 5 tickers: AAPL, MSFT, NVDA, AMD, AVGO.
- Factor coverage attempted: none.
- Initial deterministic factor set is momentum, valuation, liquidity, volatility, quality, and news-risk penalty.
- Ranking must expose raw fields, normalized scores, missing-field flags, factor weights, and tie-break rules.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |

## Missing Data And Risks
- Do not rank missing fundamentals as neutral without flagging the gap.
- Provider coverage can vary by market and ticker.
- This is a research screen, not a buy/sell recommendation.

## QVeris Usage
- Paid calls: 0
- Estimated credits: 0
- Not investment advice.
