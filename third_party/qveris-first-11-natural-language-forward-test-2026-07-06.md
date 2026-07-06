# QVeris First 11 Natural-Language Forward Test

Date: 2026-07-06

Scope: Ask Codex agents to read each converted `qveris-01` through `qveris-11` skill and answer realistic natural-language finance requests using live QVeris calls. This is not the earlier smoke script; it tests whether an agent can naturally invoke the skill, choose tools, handle failures, and produce traceable output.

## Overall Result

| Skill | Verdict | Natural-language usability |
|---|---|---|
| `qveris-01-financial-services` | usable-with-warning | Earnings workflow runs, but actual-surprise and transcript tools failed. |
| `qveris-02-langalpha-dcf-earnings` | usable-with-warning | DCF audit runs, but risk-free rate and period alignment need strict handling. |
| `qveris-03-market-monitor` | good | Company brief workflow works; still needs stale quote and target-field suppression. |
| `qveris-04-factor-finance` | usable-with-warning | Factor workflow runs with qualitative fallback, but several core numeric tools failed. |
| `qveris-05-us-stock-research` | usable-with-warning | Filing/red-flag sketch works; raw 10-K and true XBRL evidence were not available. |
| `qveris-06-tech-earnings-deepdive` | usable-with-warning | Estimates/news/market fallback works; not a full segment/transcript deep dive when core tools fail. |
| `qveris-07-global-tech-memo` | usable-with-warning | Memo skeleton works; FX, macro region, and research payloads need sanity checks. |
| `qveris-08-earnings-tracker` | usable-with-warning | Recap-prep works; calendar returned out-of-window rows and transcript/surprise failed. |
| `qveris-09-a-share-market-snapshot` | usable-with-warning | A-share snapshot works with index fallback; CN breadth/top movers/margin/flow quality is weak. |
| `qveris-10-risk-regime-review` | usable-with-warning | Regime review works with VIX/rates/proxy fallback; breadth/index/macro tools failed. |
| `qveris-11-financial-document-modeling` | usable-with-warning | Filing index and fundamentals extraction work; structured XBRL and period alignment need guarding. |

Summary: 1 good, 10 usable-with-warning, 0 blocked.

## Issues Found And Skill-Layer Fixes Applied

| Area | Observed natural-language problem | Skill-layer fix applied |
|---|---|---|
| Natural-language controls | Users do not naturally provide `dry_run`, `max_calls`, `max_age`, or `budget_note`. | All skills now default omitted controls to `dry_run=false`, `max_calls=12`, `max_age=P1D`, with a conservative budget note, and require echoing them. |
| Disclaimer encoding | Some skill/fixture outputs emitted mojibake before `Not investment advice.` | All `SKILL.md` and fixture disclaimers now use `不构成投资建议 / Not investment advice.` |
| Internal provider provenance | QVeris payload `_meta.source_provider` can show names such as EODHD/FMP/Alpha Vantage. | Skills now state this is QVeris internal provenance only, not a direct callable dependency or credential requirement. |
| Target-price leakage | Ratio/research payloads can include fields such as `analyst_target_price`. | All skills now require suppressing target-price, upside, recommendation, buy/sell, and price-objective fields. Schemas include `suppressed_fields`. |
| Stale/cross-period data | Quotes can be stale; statements can return mismatched fiscal periods; calendar rows can be out of requested windows. | All skills now require payload sanity checks and `data_quality` output with warnings, stale fields, and out-of-window events. |
| Tool 503/404 failures | Several QVeris tools failed during realistic calls. | Tool maps now record live-tested fallback rules and require missing-field reporting instead of silent substitution. |
| Semantically wrong payloads | Some tools returned data with the wrong content type, market, form, or region. | Tool maps now require payload-shape validation before evidence use. |

## Per-Skill Notes

### `qveris-01-financial-services`

Test request: NVDA latest earnings context.

Live issues: `earnings_actual_surprise` returned 503, `transcripts_earnings_call` returned 503, `event_calendar_earnings` discovery was flaky, and `fundamentals_cf` looked cross-period/TTM-like. The skill can still produce an earnings context memo from calendar, estimates, fundamentals, news, and quote data, but must not state beat/miss or management quotes when those primary tools fail.

Applied fix: added transcript fallback rules, statement period-alignment warnings, target suppression, natural-language defaults, and `data_quality`.

### `qveris-02-langalpha-dcf-earnings`

Test request: MSFT DCF input audit.

Live issues: `rates_govt_benchmark` failed for the requested DCF input, cash-flow period did not align with income statement/balance sheet, and consensus output was not always clean forward DCF data.

Applied fix: added DCF period-alignment rules and explicit missing risk-free-rate behavior.

### `qveris-03-market-monitor`

Test request: AAPL company brief.

Live issues: workflow was good overall. Quote timestamp was older than the test date, news was noisy/truncated, and ratios included target-price-like fields.

Applied fix: added stale quote handling and target-field suppression.

### `qveris-04-factor-finance`

Test request: TSLA sentiment/valuation/earnings factor notes.

Live issues: `sentiment_text_signals`, `fundamentals_derived_ratios`, `estimates_consensus`, and `earnings_actual_surprise` returned 503 in the natural-language run or surrounding tests. News fallback worked but only supports qualitative context.

Applied fix: added qualitative-only sentiment fallback and partial-factor rules for missing ratios/estimates/surprise.

### `qveris-05-us-stock-research`

Test request: AMZN 10-K/filing red-flag digest.

Live issues: `filings_regulatory_raw` returned 503, `filings_structured_xbrl` looked metadata-like instead of true XBRL facts, ratios failed, and news/insider payloads were truncated.

Applied fix: added rule to downgrade to filing-activity/red-flag sketch when raw filing or true XBRL facts are unavailable.

### `qveris-06-tech-earnings-deepdive`

Test request: NVDA tech earnings deep dive.

Live issues: segment, surprise, and transcript paths failed, so the output can only be an estimates/news/market fallback memo. `alt_patents` looked mis-mapped and research/theme payloads were noisy.

Applied fix: added fallback memo labeling, no segment scorecard without segment facts, and payload-shape checks for patent/research/theme evidence.

### `qveris-07-global-tech-memo`

Test request: ASML global tech memo.

Live issues: `fx_spot` returned 503, research reports looked like academic material, and EU macro calls returned region/content mismatches.

Applied fix: added FX missing behavior, no academic rows as sell-side research, and macro region sanity checks.

### `qveris-08-earnings-tracker`

Test request: AAPL upcoming earnings and recap inputs.

Live issues: earnings calendar returned rows outside the requested date window, event `hour` could be blank, and surprise/transcript tools failed.

Applied fix: added required date-window filtering, out-of-window reporting, and recap-prep-only fallback behavior.

### `qveris-09-a-share-market-snapshot`

Test request: CN snapshot for `000001.SH`.

Live issues: CN breadth returned 503, CN top movers returned `AAPL.US`, margin failed, and northbound flow returned all zeros.

Applied fix: added non-CN mover rejection, margin/flow low-confidence labeling, and breadth fallback rules.

### `qveris-10-risk-regime-review`

Test request: US market regime with VIX/rates context.

Live issues: index levels and breadth returned 503, macro actual-vs-forecast returned 404, and rate data worked only through a symbol proxy.

Applied fix: added limited VIX/rates/liquid ETF proxy fallback, macro-event fallback, and `_meta.failover_log` trace handling.

### `qveris-11-financial-document-modeling`

Test request: META filing metadata and financial-document model JSON.

Live issues: filing metadata filtering by form type was unreliable, structured XBRL looked like metadata, cash-flow period could be quarterly/TTM-like despite annual intent, and ratio payloads can include target-price fields.

Applied fix: added form/accession validation, metadata-not-XBRL guard, statement period alignment, and target-field suppression.
