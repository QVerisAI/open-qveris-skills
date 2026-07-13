# Summary

The source repo snapshot was read before generating this QVeris version. The QVeris skill preserves strategy catalog, hard-filter, score/coverage-tier, source-health, and T+N evaluation concepts, but replaces all source packages and external analyzers with `qveris_finance.*` evidence gates. Rank is allowed only when comparability gates pass.

# Screen Results

| Source concept | QVeris behavior |
|---|---|
| `screen` | Research candidate pool with factor coverage |
| hard filters | Applied only when required QVeris fields validate |
| score/coverage tier | Computed from validated components only; rank only when the same factor set, window, period, and market convention are comparable across at least 3 securities |
| saved runs | Report metadata unless persistence exists |
| T+N evaluation | Historical post-hoc evaluation only |

# Evidence

Primary routes include `qveris_finance.ref_symbology`, `qveris_finance.mkt_bars_adjusted`, `qveris_finance.fundamentals_derived_ratios`, `qveris_finance.ref_classification_industry`, and `qveris_finance.news_fin_tagged`.

# Analysis

The screen should never turn a research rank or coverage tier into an action. If sentiment, theme heat, full-market coverage, or factor comparability is unavailable, the output remains partial and the missing fields are explicit.

# Data Quality And Missing Fields

`data_quality.status`: `partial`

Missing fields: `full_market_universe`, `theme_heat`, `sentiment_score`, `cross_sectional_rank_if_not_comparable`, `post_hoc_window_if_not_requested`.

# Trace Appendix

| tool_name | params | status | execution_id | fallback_used | missing_fields |
|---|---|---|---|---|---|

Observed call count: `0`. Required calls above are a plan, not trace rows.

Not investment advice.
