# Portfolio Risk Monitor

Skill: `qveris-portfolio-risk-monitor`
Mode: live
Generated at: 2026-07-02T09:26:47.169Z

## Scope
```json
{
  "holdings": [
    {
      "symbol": "AAPL",
      "weight": 25
    },
    {
      "symbol": "NVDA",
      "weight": 25
    },
    {
      "symbol": "MSFT",
      "weight": 20
    },
    {
      "symbol": "TSLA",
      "weight": 15
    },
    {
      "symbol": "CASH",
      "weight": 15
    }
  ],
  "market": "US",
  "benchmark": "SPY",
  "window_days": 30,
  "from": "2026-06-02",
  "to": "2026-07-02"
}
```

## Findings
- Largest non-cash holding is AAPL at 25%.
- Portfolio concentration HHI is 0.210; values above 0.25 deserve concentration review.
- Collected 3 QVeris call attempts across market, profile, historical, and news/catalyst roles.
- Risk interpretation should separate measurable exposure from narrative catalyst risk.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |
| quote_snapshot | `eodhd.live_data.real_time.retrieve.v1.b60a4285` | yes | 0 | 2.81 |
| historical_prices | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | yes | 21 | 24.2 |
| profile_sector | `financialmodelingprep.stable.profile.retrieve.v1.0b443195` | yes | 1 | 24.2 |

## Missing Data And Risks
- Weights must be normalized before comparing portfolios.
- Historical volatility and drawdown depend on lookback window and provider coverage.
- News/catalyst risk can be stale or incomplete without filings and earnings-calendar checks.

## QVeris Usage
- Paid calls: 3
- Estimated credits: 51.21
- Not investment advice.
