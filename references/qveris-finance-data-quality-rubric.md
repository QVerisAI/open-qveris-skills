# QVeris Finance Data-Quality Rubric

Use this rubric for every QVeris finance skill before turning a CAP payload into evidence.

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
- Reject inconsistent statement fields. If same-period CF net income materially conflicts with IS net income, exclude CF from aligned tables and mark `statement_semantic_mismatch`.
- Reject stale same-day evidence. Monthly, delayed, or stale rates/index data may be used only as lagged proxy evidence, not as same-day market confirmation.

## Fallback Boundaries

- Treat transport success as insufficient by itself. A successful payload that fails this rubric is unusable evidence, not a fallback success.
- Use `news_fin_tagged` as qualitative context only when sentiment, cluster, or transcript routes fail. Do not derive numeric sentiment, strong catalysts, or directional risk conclusions from tagged news alone.
- Use `event_calendar_macro` as macro-event context only. Do not present it as actual-vs-forecast macro surprise unless a callable actual-vs-forecast CAP succeeds.
- Use VIX, rates, or liquid ETF bars as market-regime proxies only when primary index or breadth evidence fails and the proxy passes identity/window checks.
- Use trailing manual valuation calculations only when required QVeris fields are present. Label them as calculated trailing inputs; do not infer forward multiples without consensus or derived-ratio evidence.

## Trace And Output

- Default to a Markdown user report with concise trace tables. Put full machine-readable `qveris_trace` JSON only in an appendix, schema fixture, or when the user asks for it.
- Every rejected payload must appear in `data_quality.warnings` or `missing_fields` with a product-readable reason such as `semantic_mismatch`, `insufficient_observations`, `overbroad_news`, `stale_proxy`, or `statement_semantic_mismatch`.
- End user-facing reports with `Not investment advice.`
