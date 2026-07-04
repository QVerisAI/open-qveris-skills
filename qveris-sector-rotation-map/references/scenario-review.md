# Live Scenario Review

Date: 2026-07-03

Purpose: SOP evidence for reproducible live business scenarios. Each scenario was run with `--live`, a paid-call budget, JSON output, a Markdown report, and a call trace.

## Coverage Matrix

| Scenario | Business question | Artifacts | Paid calls | Credits | Result |
| --- | --- | --- | --- | --- | --- |
| Scenario 01 | Broad sector rotation smoke test | `artifacts/sector-live-smoke.*` | 3 | 72.6 | Schema-valid preview output; ETF performance route skipped. |
| Scenario 02 | Risk-on/risk-off sector map | `artifacts/scenario-02-risk-on-off.*` | 3 | 72.6 | Schema-valid output; sector snapshot, available sectors, and ETF list succeeded. |
| Scenario 03 | Cyclicals versus defensives sector map | `artifacts/scenario-03-cyclicals-defensives.*` | 3 | 72.6 | Schema-valid output; sector snapshot, available sectors, and ETF list succeeded. |

## Repro Commands

```bash
node scripts/run.mjs \
  --live \
  --sectors XLK,XLY,XLF,XLU,XLP,XLV \
  --market US \
  --benchmark SPY \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 80 \
  --output artifacts/scenario-02-risk-on-off.md \
  --json-output artifacts/scenario-02-risk-on-off-output.json \
  --trace artifacts/scenario-02-risk-on-off-trace.json

node scripts/run.mjs \
  --live \
  --sectors XLI,XLE,XLB,XLP,XLU,XLV \
  --market US \
  --benchmark SPY \
  --window-days 30 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 80 \
  --output artifacts/scenario-03-cyclicals-defensives.md \
  --json-output artifacts/scenario-03-cyclicals-defensives-output.json \
  --trace artifacts/scenario-03-cyclicals-defensives-trace.json
```

## Execution Evidence

| Scenario | Task | Provider/tool | OK | Credits | execution_id |
| --- | --- | --- | --- | --- | --- |
| Risk-on/off | sector_performance_snapshot | FMP `financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159` | true | 24.2 | `bda882a5-3a94-4960-bfa6-5386c8d5fc98` |
| Risk-on/off | available_sectors | FMP `financialmodelingprep.stable.availablesectors.retrieve.v1.becb02d9` | true | 24.2 | `862fa951-851d-4ab3-b776-37768fa62e23` |
| Risk-on/off | etf_symbol_search | FMP `financialmodelingprep.stable.etflist.retrieve.v1.85cd2c31` | true | 24.2 | `f0d9871a-251c-47bd-aa03-350110373c7d` |
| Cyclicals/defensives | sector_performance_snapshot | FMP `financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159` | true | 24.2 | `f643e760-18fa-4a4c-a14d-e378a66ca442` |
| Cyclicals/defensives | available_sectors | FMP `financialmodelingprep.stable.availablesectors.retrieve.v1.becb02d9` | true | 24.2 | `ba08e849-16cc-49f5-b668-8e35035b9377` |
| Cyclicals/defensives | etf_symbol_search | FMP `financialmodelingprep.stable.etflist.retrieve.v1.85cd2c31` | true | 24.2 | `58e09646-998d-4f87-b84c-5f24eda915d2` |

## Notes

- FMP sector snapshot, available sectors, and ETF list calls were reliable in both new scenarios.
- `etf_performance` was skipped because no inspected tool candidate was available in the current route.
- Current preview output does not yet produce relative-strength scores, momentum scores, or rotation quadrants.
- Production hardening should add an ETF price/history route before claiming a complete rotation map.
