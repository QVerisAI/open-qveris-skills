import assert from "node:assert/strict";
import test from "node:test";

import { validateFactorScreenContract } from "../scripts/factor_screen_validity.mjs";

function security(symbol, overrides = {}) {
  return {
    security: symbol,
    identity: { status: "matched", proof: ["symbol", "exchange", "asset_type"] },
    observations: [{ date: "2026-07-17", phase: "screen" }],
    bars: { observation_count: 20, return_interval_count: 19, lookback_intervals: 19 },
    financial_periods: [{
      requested_fiscal_year: 2025,
      requested_period: "FY",
      returned_period_end: "2025-12-31",
      returned_fiscal_period: null,
      statement_basis: "annual",
      claimed_complete: true,
    }],
    coverage_tier: "complete_comparable",
    valid_factor_set: ["momentum_19d", "quality_fy2025"],
    ...overrides,
  };
}

function contract(overrides = {}) {
  return {
    as_of: "2026-07-20T15:00:00+08:00",
    cutoff: "2026-07-20T15:00:00+08:00",
    post_hoc_enabled: false,
    securities: [security("600519.SH"), security("300750.SZ"), security("002594.SZ")],
    ranking: {
      published: true,
      members: ["600519.SH", "300750.SZ", "002594.SZ"],
      common_factor_set: ["momentum_19d", "quality_fy2025"],
    },
    sentiment: { status: "mixed", scope: "issuer_sample", independent_source_count: 2 },
    ...overrides,
  };
}

test("accepts a comparable three-security screen", () => {
  const output = validateFactorScreenContract(contract());
  assert.equal(output.status, "accepted");
  assert.equal(output.ranking_allowed, true);
});

test("rejects lookahead data even when it is before a later cutoff", () => {
  const input = contract({ cutoff: "2026-07-21T15:00:00+08:00" });
  input.securities[0].observations = [{ date: "2026-07-21T10:00:00+08:00", phase: "screen" }];
  const output = validateFactorScreenContract(input);
  assert.equal(output.status, "rejected");
  assert.ok(output.violations.some(({ code }) => code === "cutoff_after_as_of"));
  assert.ok(output.violations.some(({ code }) => code === "screen_lookahead"));
});

test("allows a later cutoff only for separated post-hoc observations", () => {
  const input = contract({
    cutoff: "2026-07-21T15:00:00+08:00",
    post_hoc_enabled: true,
    ranking: { published: false, members: [], common_factor_set: [] },
  });
  input.securities[0].observations = [{ date: "2026-07-21T10:00:00+08:00", phase: "post_hoc" }];
  const output = validateFactorScreenContract(input);
  assert.equal(output.status, "accepted");
  assert.equal(output.violations.length, 0);
});

test("rejects 20 prices described as 20 return intervals", () => {
  const input = contract();
  input.securities[0].bars.return_interval_count = 20;
  const output = validateFactorScreenContract(input);
  assert.equal(output.ranking_allowed, false);
  assert.equal(output.security_decisions[0].status, "rejected");
  assert.ok(output.violations.some(({ code }) => code === "return_interval_mismatch"));
});

test("blocks ranking when 20 prices are honestly counted but cannot support a 20-interval factor", () => {
  const input = contract();
  input.securities[0].bars.lookback_intervals = 20;
  const output = validateFactorScreenContract(input);
  assert.equal(output.status, "degraded");
  assert.equal(output.security_decisions[0].status, "degraded");
  assert.equal(output.ranking_allowed, false);
  assert.ok(output.violations.some(({ code }) => code === "insufficient_lookback_observations"));
});

test("degrades an explicitly partial unproven fiscal quarter", () => {
  const input = contract({ ranking: { published: false, members: [], common_factor_set: [] } });
  input.securities[0].financial_periods = [{
    requested_fiscal_year: 2025,
    requested_period: "Q2",
    returned_period_end: "2025-12-31",
    returned_fiscal_period: null,
    statement_basis: "annual",
    claimed_complete: false,
  }];
  const output = validateFactorScreenContract(input);
  assert.equal(output.status, "degraded");
  assert.ok(output.violations.some(({ code, severity }) => code === "fiscal_quarter_unproven" && severity === "degrade"));
});

test("rejects an unproven fiscal quarter claimed as complete", () => {
  const input = contract();
  input.securities[0].financial_periods[0] = {
    requested_fiscal_year: 2025,
    requested_period: "Q2",
    returned_period_end: "2025-12-31",
    returned_fiscal_period: null,
    statement_basis: "annual",
    claimed_complete: true,
  };
  const output = validateFactorScreenContract(input);
  assert.ok(output.violations.some(({ code, severity }) => code === "fiscal_quarter_unproven" && severity === "reject"));
});

test("rejects ranking across different factor denominators", () => {
  const input = contract();
  input.securities[1].valid_factor_set = ["momentum_19d"];
  const output = validateFactorScreenContract(input);
  assert.equal(output.ranking_allowed, false);
  assert.ok(output.violations.some(({ code }) => code === "ranking_denominator_mismatch"));
});

test("rejects missing entity proof and wrong entity status", () => {
  const input = contract();
  input.securities[0].identity = { status: "matched", proof: ["exchange"] };
  input.securities[1].identity = { status: "mismatched", proof: ["symbol"] };
  const output = validateFactorScreenContract(input);
  assert.ok(output.violations.some(({ code }) => code === "semantic_entity_missing"));
  assert.ok(output.violations.some(({ code }) => code === "semantic_entity_mismatch"));
});

test("allows only insufficient sentiment for a one-source issuer sample", () => {
  const rejected = validateFactorScreenContract(contract({
    sentiment: { status: "positive", scope: "issuer_sample", independent_source_count: 1 },
  }));
  assert.ok(rejected.violations.some(({ code }) => code === "sentiment_sample_too_small"));

  const degraded = validateFactorScreenContract(contract({
    ranking: { published: false, members: [], common_factor_set: [] },
    sentiment: { status: "insufficient", scope: "issuer_sample", independent_source_count: 1 },
  }));
  assert.equal(degraded.status, "degraded");
});

test("rejects market-wide sentiment inferred from issuer samples", () => {
  const output = validateFactorScreenContract(contract({
    sentiment: { status: "mixed", scope: "market_wide", independent_source_count: 4 },
  }));
  assert.ok(output.violations.some(({ code }) => code === "sentiment_scope_overreach"));
  assert.equal(output.ranking_allowed, true, "an unrelated sentiment wording error must not invalidate an otherwise valid factor rank");
});
