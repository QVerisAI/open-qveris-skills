# A-Share Factor-Screen Validity Contract

Apply this contract before publishing a factor value, cross-sectional rank, historical evaluation, or sentiment conclusion. Build the contract only from validated evidence and saved observations, then run:

```bash
node {baseDir}/scripts/factor_screen_validity.mjs --json '<contract-json>'
```

Treat the validator result as a floor, not a substitute for financial judgment. A `rejected` result forbids the affected evidence; a rank is forbidden specifically when `ranking_allowed=false`. A `degraded` result permits only the narrower statement returned by the gate. Apply the returned `security_decisions` to every factor-table row: a security with a `rejected` or `degraded` decision cannot remain `complete_comparable` until the affected factor is removed or corrected and the contract is validated again.

## Contract Shape

```json
{
  "as_of": "2026-07-20T15:00:00+08:00",
  "cutoff": "2026-07-20T15:00:00+08:00",
  "post_hoc_enabled": false,
  "securities": [
    {
      "security": "600519.SH",
      "identity": {
        "status": "matched",
        "proof": ["symbol", "exchange", "asset_type"]
      },
      "observations": [
        {"date": "2026-07-17", "phase": "screen"}
      ],
      "bars": {
        "observation_count": 20,
        "return_interval_count": 19,
        "lookback_intervals": 19
      },
      "financial_periods": [
        {
          "requested_fiscal_year": 2025,
          "requested_period": "FY",
          "returned_period_end": "2025-12-31",
          "returned_fiscal_period": null,
          "statement_basis": "annual",
          "claimed_complete": true
        }
      ],
      "coverage_tier": "complete_comparable",
      "valid_factor_set": ["momentum_19d", "quality_fy2025"]
    }
  ],
  "ranking": {
    "published": false,
    "members": [],
    "common_factor_set": []
  },
  "sentiment": {
    "status": "insufficient",
    "scope": "issuer_sample",
    "independent_source_count": 1
  }
}
```

## Hard Rejects

- Put every dated item used by the screen into `observations`, including bars, quotes, classification effective dates, statement/report dates, events, and Web publications. An omitted date is not a way around the temporal gate; if a dated claim has no verifiable date, reject that claim as `missing_date_proof`.
- Reject `cutoff > as_of` unless an explicit post-hoc evaluation is requested with `post_hoc_enabled=true`. Reject every screen observation later than `as_of` and every observation later than `cutoff`. Post-hoc observations may be later than `as_of` only when `phase=post_hoc`; never feed them back into the screen.
- Reject entity-scoped evidence unless identity is `matched` and proof contains a returned symbol/code or an explicitly matched issuer name. Do not require a symbol on market-wide or list-shaped rows, but do not attach those rows to one security without issuer proof.
- For `N` ordered price observations, require exactly `N-1` adjacent return intervals. Never label 20 prices as 20 returns.
- Reject a published rank unless it has at least 3 members, every member is `complete_comparable`, and every member uses exactly the declared `common_factor_set`, window, fiscal period, measurement basis, and market convention.
- Reject claims of a complete requested FQ unless the returned quarter or quarter-end proves that FQ. A matching `YYYY-12-31` with annual basis is valid FY proof; it is not FQ proof.
- Reject market-wide or universe-wide sentiment conclusions derived only from issuer-news samples. Never convert qualitative Web cues into a numeric sentiment score.

## Degraded Use

- An FY payload with a matching annual year but no requested FQ may support an FY-only statement; label the FQ component missing and keep it out of quarterly comparison.
- Fewer than `lookback_intervals + 1` price observations may support a latest-point note, but not the requested return, volatility, momentum, drawdown, or rank component.
- Fewer than two independent, opened, issuer-matched, in-window Web sources requires `sentiment.status=insufficient`. Describe the retrieved sample only; do not generalize beyond it.
- A partially covered security remains `partial_not_ranked`, `proxy_only`, or `insufficient`. Never renormalize a smaller denominator into the same rank as complete members.
- A rejected or degraded security-level input invalidates the affected factor component. Recompute the coverage tier and common denominator before reporting; do not leave the row `complete_comparable` merely because the overall rank was suppressed.

## Output Language

- Say “the retrieved issuer-news sample contains ...” rather than “overall sentiment is ...” when scope is limited.
- Say “FY evidence is available; FQ comparison is unavailable” rather than “financial periods are fully comparable” when quarter proof is missing.
- Say “no rank produced” and list the failed gate. Do not present coverage tiers or source order as an implicit ranking.
