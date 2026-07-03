# Live Scenario Review

Date: 2026-07-03

Purpose: SOP evidence for reproducible live business scenarios. Each scenario was run with `--live`, a paid-call budget, JSON output, a Markdown report, and a call trace.

## Coverage Matrix

| Scenario | Business question | Artifacts | Paid calls | Credits | Result |
| --- | --- | --- | --- | --- | --- |
| Scenario 01 | Growth/AI portfolio smoke risk check | `artifacts/portfolio-live-smoke.*` | 3 | 51.21 | Schema-valid preview output; quote/news catalyst coverage partial. |
| Scenario 02 | Concentrated NVDA portfolio risk check | `artifacts/scenario-02-concentrated-nvda.*` | 3 | 49.4 | Schema-valid output; history/profile succeeded; quote failed; news catalyst skipped. |
| Scenario 03 | Defensive staples/healthcare portfolio risk check | `artifacts/scenario-03-defensive-stocks.*` | 3 | 49.4 | Schema-valid output; history/profile succeeded; quote failed; news catalyst skipped. |

## Repro Commands

```bash
node qveris-portfolio-risk-monitor/scripts/run.mjs \
  --live \
  --holdings NVDA:60,AMD:20,CASH:20 \
  --market US \
  --benchmark QQQ \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 60 \
  --output qveris-portfolio-risk-monitor/artifacts/scenario-02-concentrated-nvda.md \
  --json-output qveris-portfolio-risk-monitor/artifacts/scenario-02-concentrated-nvda-output.json \
  --trace qveris-portfolio-risk-monitor/artifacts/scenario-02-concentrated-nvda-trace.json

node qveris-portfolio-risk-monitor/scripts/run.mjs \
  --live \
  --holdings JNJ:25,PG:25,KO:20,WMT:20,CASH:10 \
  --market US \
  --benchmark SPY \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 60 \
  --output qveris-portfolio-risk-monitor/artifacts/scenario-03-defensive-stocks.md \
  --json-output qveris-portfolio-risk-monitor/artifacts/scenario-03-defensive-stocks-output.json \
  --trace qveris-portfolio-risk-monitor/artifacts/scenario-03-defensive-stocks-trace.json
```

## Execution Evidence

| Scenario | Task | Provider/tool | OK | Credits | execution_id |
| --- | --- | --- | --- | --- | --- |
| Concentrated NVDA | quote_snapshot | Finnhub `finnhub_io_api.stock.quote` | false | 1 | `a324ebaf-7795-48d5-b589-8589be38bc13` |
| Concentrated NVDA | historical_prices | FMP `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | true | 24.2 | `b7617582-2c26-49a5-bc8d-75b9dce485d3` |
| Concentrated NVDA | profile_sector | FMP `financialmodelingprep.stable.profile.retrieve.v1.0b443195` | true | 24.2 | `3dba199a-e0c2-49a1-9d36-2e8f31677586` |
| Defensive stocks | quote_snapshot | Finnhub `finnhub_io_api.stock.quote` | false | 1 | `ea647fa4-114e-4f19-8c46-53fd191a8769` |
| Defensive stocks | historical_prices | FMP `financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22` | true | 24.2 | `7ab77ded-78e2-4e53-889a-030dc7c3a13e` |
| Defensive stocks | profile_sector | FMP `financialmodelingprep.stable.profile.retrieve.v1.0b443195` | true | 24.2 | `096ec1a3-d026-425b-b95f-596c25769e99` |

## Notes

- FMP historical prices and profile calls were reliable for both new scenarios.
- Finnhub quote returned unsuccessful status in both scenarios; quote-dependent metrics are therefore partial.
- `news_catalyst` was skipped because no inspected tool candidate was available in the current runner route.
- Current preview output intentionally marks volatility, drawdown, correlation, and VaR as missing where the deterministic analysis does not yet compute them from returned history.
