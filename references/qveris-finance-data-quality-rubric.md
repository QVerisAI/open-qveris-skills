# QVeris Finance Data-Quality Rubric

Use this rubric for every QVeris finance skill before turning a CAP payload into evidence.
Read `qveris-finance-retry-policy.md` with this rubric when a CAP call fails, returns the wrong shape, or needs a fallback.

## Evidence Status

- `complete`: primary QVeris evidence is available, fresh enough for the request, and passes identity, window, and shape checks.
- `partial`: some primary evidence is unavailable, stale, or rejected, but remaining QVeris evidence can support a narrower statement.
- `proxy_only`: only weaker proxy evidence is usable; keep conclusions low confidence and label the proxy clearly.
- `insufficient`: evidence is missing or rejected, so the requested conclusion is not supported.

## Hard Rejects

- Reject identity mismatches. Returned symbol, company name, exchange, market, asset type, index name, or benchmark must match the requested entity. Mark mismatches as `semantic_mismatch`.
- Reject wrong benchmark payloads. If an index or benchmark request such as `SPX` returns a non-index security, do not use it as index evidence.
- Reject thin time windows. For a multi-day bars request, fewer than 2 observations cannot support return, trend, correlation, realized volatility, drawdown, liquidity, or VaR calculations.
- Reject unaligned statements. IS, BS, CF, and segment data must share fiscal year, fiscal period, and period ending before appearing in an aligned table.
- Reject requested-period mismatches. If the request asks for a specific annual/FY period and a statement CAP returns a latest-quarter or TTM-shaped payload instead, do not use it as evidence for the requested period.
- Reject inconsistent statement fields. If same-period CF net income materially conflicts with IS net income, exclude CF from aligned tables and mark `statement_semantic_mismatch`.
- Reject stale same-day evidence. Monthly, delayed, or stale rates/index data may be used only as lagged proxy evidence, not as same-day market confirmation.

## Material Mismatch Thresholds

Use these thresholds until the finance team replaces them with a stricter house standard:

| Check | Default threshold | Action |
|---|---:|---|
| Same-period CF net income vs IS net income | greater than 5% relative difference and greater than USD 100 million absolute difference | Reject CF from aligned tables and mark `statement_semantic_mismatch`. |
| Same-period revenue across statement-like payloads | greater than 3% relative difference and greater than USD 100 million absolute difference | Reject the conflicting payload from aligned tables. |
| Period ending date | any mismatch for aligned IS/BS/CF tables | Reject the unmatched payload for aligned analysis. |
| Fiscal year or fiscal period label | any mismatch for aligned tables | Reject the unmatched payload for aligned analysis. |

When a field is cumulative in one payload and point-in-time in another, do not normalize it by guesswork. Mark `measurement_basis_unclear` unless a QVeris field explicitly documents the basis.

## Fallback Boundaries

- Treat transport success as insufficient by itself. A successful payload that fails this rubric is unusable evidence, not a fallback success.
- Use `news_fin_tagged` as qualitative context only when sentiment, cluster, or transcript routes fail. Do not derive numeric sentiment, strong catalysts, or directional risk conclusions from tagged news alone.
- Use `event_calendar_macro` as macro-event context only. Do not present it as actual-vs-forecast macro surprise unless a callable actual-vs-forecast CAP succeeds.
- Use VIX, rates, or liquid ETF bars as market-regime proxies only when primary index or breadth evidence fails and the proxy passes identity/window checks.
- Use trailing manual valuation calculations only when required QVeris fields are present. Label them as calculated trailing inputs; do not infer forward multiples without consensus or derived-ratio evidence.
- When a statement period mismatch occurs, retry once with stricter documented parameters if `cap-detail` shows they are supported, such as `fiscal_year`, `fiscal_period`, `period_type`, `period`, and `limit`. If the retried payload still does not match, mark the requested statement missing with a product-readable reason such as `FY2025 cash flow missing due to period mismatch`.

## Trace And Output

- Default to a Markdown user report with concise trace tables. Put full machine-readable `qveris_trace` JSON only in an appendix, schema fixture, or when the user asks for it.
- Every rejected payload must appear in `data_quality.warnings` or `missing_fields` with a product-readable reason such as `semantic_mismatch`, `period_mismatch`, `insufficient_observations`, `overbroad_news`, `stale_proxy`, or `statement_semantic_mismatch`.
- End user-facing reports with `Not investment advice.`
