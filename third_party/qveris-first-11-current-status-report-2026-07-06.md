# QVeris First 11 Current Status Report

Date: 2026-07-06

Scope: Current repository state for the eleven QVeris-adapted finance skills after natural-language forward testing, skill-layer guardrail patches, schema/fixture updates, and follow-up audit.

## Executive Summary

All eleven skills are present and structurally valid. They have the required skill files, source records, QVeris-only runtime instructions, `qveris_trace` constraints, controls, data-quality reporting, fixtures, schemas, and disclaimers.

Current usability status:

| Status | Count | Skills |
|---|---:|---|
| Good | 1 | `qveris-03-market-monitor` |
| Usable with warning | 10 | `qveris-01`, `qveris-02`, `qveris-04`, `qveris-05`, `qveris-06`, `qveris-07`, `qveris-08`, `qveris-09`, `qveris-10`, `qveris-11` |
| Blocked | 0 | None |

Important nuance: "usable with warning" means the skill can be invoked and can produce traceable output, but it must surface `missing_fields`, `fallback_used`, and `data_quality` because live QVeris payloads were incomplete, failed, stale, out-of-window, cross-market, or semantically mismatched.

## Current Repository Checks

| Check | Current result |
|---|---|
| 11 independent skill directories | Passed |
| Required files per skill | Passed: `SKILL.md`, `references/qveris-tool-map.md`, `schemas/output.schema.json`, `fixtures/qveris/sample-output.json`, `agents/openai.yaml` |
| `quick_validate.py` | Passed for all 11 |
| Schema JSON parse | Passed |
| Fixture JSON parse | Passed |
| `controls` schema | Requires `dry_run`, `max_calls`, `max_age`, `budget_note` |
| `data_quality` schema | Required in all 11 schemas |
| Disclaimer | Correct: `不构成投资建议 / Not investment advice.` |
| Runtime old-provider residuals | No direct runtime dependency found; provider names remain only in source records, prohibited-capability text, or QVeris provenance explanation |
| Cloned source repos | Kept under ignored `third_party/source_repos/` |

## Cross-Cutting Gaps

These are not blockers, but they are the main places where the current implementation is not as strong as the claims might imply.

| Gap | Current state | Impact |
|---|---|---|
| Tool names in `SKILL.md` workflows | Many workflow lists use short names such as `mkt_l1_rt`, while runtime policy/tool-map says QVeris-only | Low-to-medium ambiguity; should fully qualify as `qveris_finance.mkt_l1_rt` everywhere |
| Quality gate | Current quality rules are instructions, not a deterministic script | Codex must remember to apply date/market/period/XBRL checks; no machine-enforced gate yet |
| Schema strictness | `additionalProperties: true` remains in schemas | Extra fields can still leak into output unless the model follows instructions |
| Suppressed fields | `suppressed_fields` is defined but not top-level required | Target-price/upside suppression is documented but not fully schema-enforced |
| Fixtures | Fixtures are mostly happy-path examples | They do not show realistic `limited`, `fallback_used: true`, missing-field, or bad-payload examples |
| `agents/openai.yaml` | Present, but short descriptions/default prompts do not fully mention `data_quality`, target suppression, or QVeris-only constraints | Trigger/UX metadata is weaker than the current `SKILL.md` behavior |
| Post-patch natural-language retest | Not rerun after guardrail patches | We know the files validate, but have not measured whether user-facing natural-language behavior improved |

## Skill Status

### 1. `qveris-01-financial-services`

Current status: usable with warning.

What works: Institution-style earnings, comps, DCF/model-update, and market-research structure is preserved. Source record, controls, trace, disclaimer, fallback policy, and data-quality reporting are present.

Live issues observed: `qveris_finance.earnings_actual_surprise` returned 503; `qveris_finance.transcripts_earnings_call` returned 503; `fundamentals_cf` could be cross-period/TTM-like; news can be noisy.

Current guardrail: Do not state beat/miss without actual and consensus; do not invent management quotes; mark cross-period financials in `data_quality.warnings`.

Still not fully done: Workflow tool names in `SKILL.md` should be fully qualified; fixture should show the actual earnings-surprise fallback case.

### 2. `qveris-02-langalpha-dcf-earnings`

Current status: usable with warning.

What works: DCF, earnings preview/post-mortem, and sector overview shape is preserved. Controls, trace, period-alignment instructions, and missing-input reporting are present.

Live issues observed: `rates_govt_benchmark` failed for DCF risk-free-rate input; cash-flow period did not align with income statement/balance sheet; consensus rows were not always clean forward DCF assumptions.

Current guardrail: Do not blend annual/quarterly/TTM values; mark missing risk-free-rate instead of substituting non-QVeris values.

Still not fully done: Needs deterministic period-alignment gate and fallback fixture for missing rates/cross-period cash flow.

### 3. `qveris-03-market-monitor`

Current status: good.

What works: Company brief workflow ran cleanly in natural-language testing. Company profile, quote, ratios, and tagged news produced a usable brief.

Live issues observed: Quote timestamp can be stale because of market calendar; news can be noisy/truncated; ratio payload can include target-price-like fields.

Current guardrail: Flag stale quotes and suppress target-price/upside/recommendation fields.

Still not fully done: Original EODHD names remain in source records as required provenance, which can look noisy in residual scans; fixture should show stale-quote handling.

### 4. `qveris-04-factor-finance`

Current status: usable with warning.

What works: Factor-table shape is preserved for sentiment, valuation input, earnings recap, liquidity, and correlation. Qualitative fallback is documented.

Live issues observed: `sentiment_text_signals`, `fundamentals_derived_ratios`, `estimates_consensus`, and `earnings_actual_surprise` returned 503 in live testing contexts.

Current guardrail: If sentiment scoring fails, use only qualitative `news_fin_tagged` context; if ratios/estimates/surprise fail, mark numeric fields missing and avoid directional return claims.

Still not fully done: Needs fallback fixture showing qualitative-only sentiment and partial valuation factors.

### 5. `qveris-05-us-stock-research`

Current status: usable with warning.

What works: Filing activity, red-flag sketch, catalyst, competitor, DCF-input, and earnings-call workflow shape is preserved.

Live issues observed: `filings_regulatory_raw` returned 503; `filings_structured_xbrl` looked metadata-like rather than true XBRL facts; ratios failed; news/insider payloads could be truncated.

Current guardrail: If raw filing or true XBRL facts are unavailable, output only a filing-activity/red-flag sketch and do not quote 10-K sections.

Still not fully done: Needs schema/fixture examples for "metadata is not XBRL" and source-span absence.

### 6. `qveris-06-tech-earnings-deepdive`

Current status: usable with warning.

What works: Tech earnings memo shape is preserved: thesis, evidence, contrary evidence, risks, valuation/reaction, and next checks.

Live issues observed: Segment, surprise, and transcript paths failed; `alt_patents` looked mis-mapped; research/theme payloads were noisy.

Current guardrail: Without segment facts, do not emit a segment revenue/margin scorecard; if transcript/surprise fails, label output as an estimates/news/market fallback memo.

Still not fully done: Needs deterministic payload-shape checks for patents/research/theme data and a fallback memo fixture.

### 7. `qveris-07-global-tech-memo`

Current status: usable with warning.

What works: Global/tech memo structure is preserved: company context, geography/market backdrop, business drivers, evidence table, contrary evidence, risks, next checks.

Live issues observed: `fx_spot` returned 503; research payloads looked academic/OpenAlex-like rather than sell-side; EU macro context returned region/content mismatches.

Current guardrail: Mark FX missing if unavailable; do not label academic rows as sell-side research; mark wrong-region macro as missing/low confidence.

Still not fully done: Needs region/content-type quality gate and fixture showing missing FX/macro.

### 8. `qveris-08-earnings-tracker`

Current status: usable with warning.

What works: Earnings calendar, watchlist/industry filter, recap, and price-reaction workflow shape is preserved.

Live issues observed: `event_calendar_earnings` returned rows outside the requested window; event `hour` could be blank; `earnings_actual_surprise` and `transcripts_earnings_call` returned 503.

Current guardrail: Filter calendar rows to the requested date window; put rejected rows in `data_quality.out_of_window_events`; output recap-prep only when surprise/transcript fail.

Still not fully done: Needs out-of-window fixture and deterministic calendar-window gate.

### 9. `qveris-09-a-share-market-snapshot`

Current status: usable with warning.

What works: A-share snapshot workflow shape is preserved: index snapshot, concepts, news, margin, northbound/flows, and compact JSON/markdown output.

Live issues observed: CN breadth returned 503; `mkt_top_movers(market: CN)` returned `AAPL.US`; margin returned an error; northbound flow returned all zeros.

Current guardrail: Use index quote fallback for broad snapshot; do not emit breadth counts without breadth data; discard non-CN mover rows; mark all-zero/null flow as low confidence.

Still not fully done: Needs deterministic market/suffix gate and fallback fixture for CN breadth/top-mover rejection.

### 10. `qveris-10-risk-regime-review`

Current status: usable with warning.

What works: Risk/regime, sector rotation, data-quality checker, and earnings calendar structure is preserved with trading execution removed.

Live issues observed: `index_levels` and `mkt_breadth_internals` returned 503; `macro_actual_vs_forecast` returned 404; rates worked only through a symbol proxy.

Current guardrail: Use VIX/rates/liquid ETF proxies only as limited fallback; lower confidence; derive `fallback_used` from QVeris `_meta.failover_log`.

Still not fully done: Needs strict schema enforcement for proxy vs primary evidence and fixture showing limited confidence.

### 11. `qveris-11-financial-document-modeling`

Current status: usable with warning.

What works: Filing index, fundamentals extraction, calculations, modeling inputs, and trace-backed JSON shape are present.

Live issues observed: Filing metadata filtering by form type was unreliable; `filings_structured_xbrl` returned metadata-like output; annual cash-flow requests could return quarterly/TTM-like periods; ratio payloads can include target-price fields.

Current guardrail: Verify form/accession before declaring a latest 10-K; do not label metadata as XBRL facts; keep mismatched statement periods separate; suppress target-price fields.

Still not fully done: Needs deterministic XBRL fact-shape validation and cross-period modeling fixture.

## What Is Done Versus Not Done

Done:

- The eleven candidates are represented as eleven independent QVeris skills.
- Original source records are preserved.
- Financial runtime access is instructed to use only `qveris_finance.*` and `QVERIS_API_KEY`.
- Direct legacy data adapters, cookies, login state, browser automation, trading execution, wallet/swap, buy/sell points, and target-price commitments are prohibited.
- `qveris_trace`, controls, `missing_fields`, `data_quality`, and disclaimer are present.
- Live-tested fallback rules are documented in the skill docs/tool maps.

Not fully done:

- No shared deterministic `qveris_quality_gate` script yet.
- `SKILL.md` workflow tool names are not fully qualified everywhere.
- Schemas are still permissive with `additionalProperties: true`.
- Fixtures do not yet model the real fallback/error states seen in testing.
- `agents/openai.yaml` metadata is not yet refreshed to reflect the stronger guardrails.
- Natural-language forward tests have not been rerun after the latest guardrail patches.

## Recommended Next Steps

1. Fully qualify every workflow tool name in `SKILL.md` as `qveris_finance.*`.
2. Add a shared deterministic quality gate for market/date/period/form/XBRL/target-field checks.
3. Harden schemas: require `suppressed_fields`, restrict known output sections, and consider `additionalProperties: false` where practical.
4. Replace happy-path-only fixtures with one realistic limited/fallback fixture per skill.
5. Refresh `agents/openai.yaml` so skill chips/default prompts mention QVeris-only data, `data_quality`, and no investment advice.
6. Rerun natural-language forward tests after those hardening changes.
