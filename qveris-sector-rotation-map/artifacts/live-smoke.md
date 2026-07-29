# Sector Rotation Map

Skill: `qveris-sector-rotation-map`
Mode: live
Generated at: 2026-07-02T09:27:21.328Z

## Scope
```json
{
  "sector_proxies": [
    "XLK",
    "XLF",
    "XLV",
    "XLE",
    "XLI",
    "XLY",
    "XLP",
    "XLU"
  ],
  "benchmark": "SPY",
  "market": "US",
  "window_days": 30,
  "from": "2026-06-02",
  "to": "2026-07-02"
}
```

## Findings
- Rotation proxy set contains 8 sectors or ETFs.
- Collected 24 raw records or nested payload rows across selected sector/market sources.
- Initial deterministic signals are relative strength, momentum, volatility, drawdown, liquidity, and catalyst context.
- Phase labels should be treated as research labels until verified against benchmark-relative history.

## Evidence
| Role | Tool | OK | Records | Cost |
| --- | --- | --- | ---: | ---: |
| sector_performance_snapshot | `financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159` | yes | 11 | 24.2 |
| available_sectors | `financialmodelingprep.stable.availablesectors.retrieve.v1.becb02d9` | yes | 11 | 24.2 |
| etf_symbol_search | `financialmodelingprep.stable.etflist.retrieve.v1.85cd2c31` | yes | 2 | 24.2 |

## Missing Data And Risks
- Sector ETF proxies may not match local-market sector indices.
- Flow, earnings-revision, and valuation coverage can be provider-dependent.
- Rotation labels are not trading instructions.

## QVeris Usage
- Paid calls: 3
- Estimated credits: 72.6
- Not investment advice.
