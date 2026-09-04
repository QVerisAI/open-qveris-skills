# Sector Rotation Map

Skill: `qveris-sector-rotation-map`
Mode: live
Generated at: 2026-07-03T08:03:14.168Z

## Scope
```json
{
  "sector_proxies": [
    "XLK",
    "XLE"
  ],
  "benchmark": "SPY",
  "market": "US",
  "window_days": 30,
  "from": "2026-06-02",
  "to": "2026-07-02"
}
```

## Findings
- Rotation proxy set contains 2 sectors or ETFs.
- Collected 93 raw records or nested payload rows across selected sector/market sources.
- Generated snapshot rotation quadrants for 0 sector proxies.
- Initial deterministic signals are relative strength, momentum, volatility, drawdown, liquidity, and catalyst context.
- Phase labels should be treated as research labels until verified against benchmark-relative history.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |
| sector_performance_snapshot | `financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159` | yes | 11 | 24.2 |
| available_sectors | `financialmodelingprep.stable.availablesectors.retrieve.v1.becb02d9` | yes | 11 | 24.2 |
| proxy_price_history | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | yes | 22 | 24.2 |
| proxy_price_history | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | yes | 22 | 24.2 |
| benchmark_price_history | `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | yes | 22 | 24.2 |
| flow_or_revision_confirmation | `alphavantage.news_sentiment.query.v1.467a92c0` | yes | 1 | 2 |
| etf_symbol_search | `financialmodelingprep.stable.etflist.retrieve.v1.85cd2c31` | yes | 4 | 24.2 |

## Missing Data And Risks
- Sector ETF proxies may not match local-market sector indices.
- Flow, earnings-revision, and valuation coverage can be provider-dependent.
- Rotation labels are not trading instructions.

## QVeris Usage
- Paid calls: 7
- Estimated credits: 147.2
- Not investment advice.
