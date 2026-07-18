---
name: qveris-tradermonty-trading-skills
description: QVeris risk/regime monitor adapted from candidate 10, Tradermonty Trading Skills. Use for portfolio risk review, market regime, sector rotation map, data-quality checking, and earnings calendar monitoring; trading actions are intentionally removed.
---

# QVeris Risk Regime Monitor

Use this skill as a risk/regime monitor adapted from the legacy Tradermonty Trading Skills project. Preserve portfolio risk, market regime, sector rotation, data quality, and earnings calendar structure; remove trade prep, action, execution, and account-permission semantics. Do not present this as a trading or execution skill in user-facing output.

Source record:

| Field | Value |
|---|---|
| Candidate number | 10 |
| Original repository | Tradermonty Trading Skills |
| GitHub URL | https://github.com/tradermonty/claude-trading-skills |
| License | MIT |
| Evaluation recent activity | 2026-07-06 |
| Local source snapshot | `third_party/source_repos/10-tradermonty-trading-skills` |
| Snapshot latest commit | `4d63990` on 2026-07-05 |

## Runtime Contract

- Use only `qveris_finance.*` CAP tools and `QVERIS_API_KEY`.
- Accept user-provided holdings as read-only context; never request brokerage login or account permissions.
- Accept `dry_run`, `max_calls`, `max_age`, and `budget_note`; if omitted in a natural-language request, default to `dry_run=false`, no hard `max_calls` limit, `max_age=P1D`, and a conservative budget note, then echo those controls.
- Use the bundled retry policy at `references/qveris-finance-retry-policy.md`; retry transient 5xx/transport failures at most 2 times, do not blind-retry 404s, and hard reject semantic mismatches.
- Include `qveris_trace` for every risk, market, sector, macro, and calendar claim.
- Data-quality checks must inspect `as_of`, `missing_fields`, `fallback_used`, and staleness on each QVeris payload.
- Treat raw QVeris response metadata as internal provenance only. `--safe-json` can still include `_meta.routing_decision`, candidate route IDs, provider IDs, or failover details; never paste raw `qveris_tool.mjs` output into a final report or fixture trace without sanitizing it first.
- Normalize trace provenance: `qveris_trace[].tool_name`, `qveris_trace[].capability_id`, and any human-readable trace labels must use only `qveris_finance.*` capability names. Drop `_meta.source_provider`, `_meta.routing_decision`, `_meta.failover_log`, candidate provider IDs, raw route IDs, and vendor/tool IDs from sanitized trace.
- In final user-facing output, do not name external providers even when explaining prohibited fallbacks; say "non-QVeris sources" or "external provider routes" instead.
- Suppress `analyst_target_price`, `target_price`, price-objective, upside, buy/sell, and recommendation fields even if a QVeris payload contains them.
- Sanity-check entity, market, date window, benchmark, and payload shape before using data; if a payload is stale, truncated, or semantically mismatched, mark it in `data_quality` and `missing_fields`.

## Evidence Gate

Read `references/qveris-finance-data-quality-rubric.md` before using QVeris payloads as evidence. A payload that succeeds transport but fails identity, date-window, benchmark, or proxy checks is hard rejected, not treated as a usable fallback.

- Use evidence status labels from the shared rubric: `complete`, `partial`, `proxy_only`, or `insufficient`.
- For holdings concentration, compute read-only metrics directly from user-provided weights before any CAP calls: `top1_weight`, `top2_weight`, `hhi = sum(weight^2)`, and `effective_holdings = 1 / hhi`. Label concentration as:
  - `high` when top1 is at least 35%, top2 is at least 60%, HHI is at least 0.25, or effective holdings are 4 or fewer.
  - `elevated` when top1 is 25%-35%, top2 is 45%-60%, HHI is 0.15-0.25, or effective holdings are 4-7.
  - `moderate` only when all concentration metrics are below the elevated thresholds.
  These labels are monitoring descriptors only; do not output a rebalance, trade, or target-weight instruction.
- Require at least 2 observations for multi-day bars before computing return, trend, correlation, realized volatility, drawdown, liquidity, VaR, or portfolio risk metrics.
- Reject index or benchmark payloads whose returned symbol, name, or asset type does not match the requested benchmark; mark `semantic_mismatch`.
- Treat VIX, rates, and liquid ETF bars as proxy-only regime evidence unless primary index and breadth evidence pass validation.
- Treat `qveris_finance.news_fin_tagged` as qualitative context only. Do not derive strong risk direction, strong catalysts, or numeric sentiment from tagged news alone.
- Use `qveris_finance.risk_beta_vol` as beta/vol monitor evidence when available, but do not present it as a full portfolio risk model without usable bars, benchmark, and correlation inputs.
- Keep invalid, failed, rejected, unavailable, or weak-relevance CAPs out of `Primary Evidence`. Put them only in `Data Quality And Missing Fields`, `missing_fields`, `Proxy Evidence`, or `Trace Appendix` with reason codes such as `capability_unavailable`, `semantic_mismatch`, `entity_mix`, `weak_relevance`, or `insufficient_observations`.
- Apply issuer relevance checks to every news, ownership, and sector proxy row. If returned text refers to another entity or a broad theme rather than the resolved holding, mark `entity_mix` or `weak_relevance` and do not use it for a risk, catalyst, or sector-rotation conclusion.
- Summarize long QVeris payloads in full-workflow reports. If a response is truncated or too large for a compact table, mark `payload_summarized` or `payload_truncated` and offer a single-capability note for inspection.

## CAP Invocation

- Prefer native `qveris_finance.*` CAP functions when the environment exposes them.
- If native functions are not exposed but the repo script is available, execute standardized CAP calls from the repository root with `node qveris-official/scripts/qveris_tool.mjs cap-query qveris_finance.<capability_name> --param key=value --safe-json`. Use repeatable `--param` flags for shell-safe parameters; reserve `--params '<json>'` for complex nested payloads.
- Treat that CLI as the public CAP adapter: it resolves the current CAP ID and live cap-detail, allow-lists/coerces params, normalizes A-share symbols, and may retry once with error-guided or minimal params. Build artifacts and report Trace only from its `final_params`, `observed_calls`, and `qveris_trace`; never copy the requested params over an observed retry.
- Equivalent HTTP route: `POST https://qveris.ai/api/v1/capabilities/query` with `capability_id`, structured `parameters`, and `strategy: "best"`.
- Use `cap-search` or `GET /capabilities/search` only when the CAP ID or parameter contract is uncertain; use `cap-detail` or `GET /capabilities/{capability_id}` to verify fields.
- Use legacy QVeris `/search` plus `/tools/execute` only when the standardized CAP endpoint is unavailable; mark `legacy_cap_shim_used` in `data_quality.warnings` and keep trace names normalized to `qveris_finance.*`.
- Build a sanitized `qveris_trace` object from the call result. Keep capability name, normalized params, success/failure, retry/fallback status, validation result, and missing fields. Exclude raw `_meta.routing_decision`, provider lists, candidate route IDs, and any source-provider names even if they appear in `--safe-json`.

## Workflows

1. Portfolio risk: start with user holdings, concentration metrics, `qveris_finance.ref_symbology` or `qveris_finance.ref_security_master`, `qveris_finance.ref_classification_industry`, and `qveris_finance.risk_beta_vol` when available. Call `qveris_finance.mkt_bars_adjusted` only when enough observations are needed for return/volatility/correlation calculations; reject thin windows.
2. Market regime: treat `qveris_finance.index_levels` and `qveris_finance.mkt_breadth_internals` as conditional primary routes because live tests showed 503s and semantic mismatches. Use `cap-detail` before promoting them to primary evidence, and otherwise use validated `qveris_finance.index_vix`, `qveris_finance.rates_govt_benchmark`, or liquid ETF bars as `proxy_only`.
3. Sector rotation: use `qveris_finance.ref_classification_industry` first. Call `qveris_finance.mkt_top_movers` or `qveris_finance.index_constituents` only after `cap-detail` confirms params and returned rows identify the requested sector, index, or constituent universe.
4. Data-quality checker: validate `as_of`, `missing_fields`, `fallback_used`, and staleness for each payload.
5. Earnings calendar: `qveris_finance.event_calendar_earnings`.

## Output Requirements

- Return a Markdown user report by default, not a single large JSON object.
- Use this report structure: `Summary`, `Monitoring Read`, `Primary Evidence`, `Proxy Evidence`, `Exposure Or Sector Notes`, `Data Quality And Missing Fields`, `What This Can Support`, `What This Cannot Support`, and `Trace Appendix`.
- Put the monitoring interpretation and risk explanation before trace details, with an evidence status label for each major conclusion.
- Use a two-layer trace: concise user-facing evidence table by default, full `qveris_trace` JSON only in the appendix when useful, when the user asks for machine-readable output, or when preparing schema fixtures.
- If `max_calls`, `dry_run`, or budget constraints prevent the main workflow from running, return a budget-limited Markdown report: state what was not called, do not infer regime or risk metrics, and list the next QVeris calls that would be needed.
- Label the artifact as risk/regime monitoring, not trading advice or trade preparation.
- Include concentration metrics when user holdings include weights: top holding, top-two weight, HHI, effective holdings, and the threshold bucket used. Keep the wording descriptive and avoid portfolio actions.
- Do not call fragile regime routes reflexively. If `qveris_finance.index_levels`, `qveris_finance.mkt_breadth_internals`, or SPY/liquid-ETF bars return wrong assets, 503s, stale data, or fewer than 2 bars, hard reject them for primary regime or multi-day risk metrics. Use VIX/rates/liquid ETF proxies only as limited fallbacks and lower confidence. Treat macro actual-vs-forecast as unavailable unless `cap-detail` confirms a callable CAP; use `qveris_finance.event_calendar_macro` only as weaker macro-event context.
- For proxy evidence, still trace the QVeris capability: VIX as `qveris_finance.index_vix`, rates as `qveris_finance.rates_govt_benchmark`, and liquid ETF/index proxy bars as `qveris_finance.mkt_bars_adjusted` or `qveris_finance.index_levels` according to the QVeris route used. Never copy underlying provider route names into prose or `qveris_trace`.
- Derive `fallback_used` from QVeris `_meta.failover_log` as well as explicit fallback tool choices.
- Do not output trade prep, execution plan, rebalance instruction, buy/sell point, or target price commitment.
- Include `data_quality` with status, stale fields, out-of-window events, and suppressed fields when applicable.
- End with a final non-empty line that is exactly `Not investment advice.`. Do not add a Chinese, bilingual, translated, or prefixed disclaimer line.

## Prohibited Capabilities

Do not use non-QVeris finance data providers, brokerage/account permissions, trade prep/action/execution, SEC scraping, browser automation, cookies, login state, third-party API keys, automated trading, wallet/swap, buy/sell points, portfolio action instructions, or target price commitments. Provider names are listed in the source record only for internal migration context; do not repeat them in final output.

## References

- Read `references/qveris-tool-map.md` before choosing tool calls.
- Read `references/qveris-finance-data-quality-rubric.md` before treating payloads as evidence.
- Read `references/qveris-finance-retry-policy.md` when a CAP call fails, needs retry, or needs fallback classification.
- Check `references/qveris-finance-cap-registry-snapshot-2026-07-07.md` when deciding whether a capability belongs on the primary path.
- Use `examples/default-markdown-report.md` as the primary user-facing output example.
- Use `fixtures/qveris/sample-output.json`, `fixtures/qveris/fallback-output.json`, and `fixtures/qveris/budget-limited-output.json` as schema fixtures only.
- Use `examples/natural-language-prompts.md` for copyable natural-language test prompts.
- Use `examples/natural-language-test-output-2026-07-07.md` as a dated reviewer output record.
- Run `scripts/validate_qveris_finance_report.py <markdown-report>` on generated reviewer reports when updating examples or fixtures.
