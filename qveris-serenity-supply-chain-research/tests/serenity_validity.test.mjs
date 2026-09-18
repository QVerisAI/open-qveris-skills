import assert from "node:assert/strict";
import test from "node:test";

import { validateSerenityResearch } from "../scripts/serenity_validity.mjs";

const AS_OF = "2026-08-01T12:00:00Z";
const REQUIRED_FACTORS = ["demand_pressure", "scarcity_mechanism"];

function clone(value) {
  return structuredClone(value);
}

function capEvidence(symbol, suffix, overrides = {}) {
  return {
    evidence_id: `${symbol}:${suffix}`,
    status: "accepted",
    entity_or_topic: symbol,
    as_of: "2026-07-31T12:00:00Z",
    source_type: "qveris_finance",
    evidence_owner: `${symbol} original record owner`,
    tool_name: "qveris_finance.alt_supply_chain",
    symbol,
    execution_id: `${symbol}-${suffix}-execution`,
    window_start: "2026-01-01",
    window_end: "2026-07-31",
    fiscal_period: "FY2025",
    measurement_basis: "reported",
    currency_convention: "USD",
    ...overrides,
  };
}

function webEvidence(id, overrides = {}) {
  const result = {
    evidence_id: id,
    status: "accepted",
    entity_or_topic: "advanced cooling",
    published_at: "2026-07-30T08:00:00Z",
    source_type: "web",
    evidence_owner: "Example Publisher",
    query: "advanced cooling standard",
    final_url: `https://example.com/${id}`,
    title: "Advanced cooling standard",
    publisher_owner: "Example Publisher",
    accessed_at: "2026-07-31T08:00:00Z",
    independence_result: "independent",
    body_sha256: "a".repeat(64),
    issuer_or_topic_match: true,
    window_match: true,
    ...overrides,
  };
  if (!("evidence_owner" in overrides) && "publisher_owner" in overrides) result.evidence_owner = overrides.publisher_owner;
  return result;
}

function candidate(symbol) {
  return {
    symbol,
    market: "US",
    coverage_tier: "complete_comparable",
    window_start: "2026-01-01",
    window_end: "2026-07-31",
    fiscal_period: "FY2025",
    measurement_basis: "reported",
    currency_convention: "USD",
    identity_evidence_ids: [`${symbol}:identity`],
    factors: {
      demand_pressure: { rating: 4, evidence_ids: [`${symbol}:factor`] },
      scarcity_mechanism: { rating: 3, evidence_ids: [`${symbol}:factor`] },
    },
    counterevidence_ids: [`${symbol}:counter`],
    denominator_checks: [{ metric: "positive_operating_base", value: 1, evidence_ids: [`${symbol}:denominator`] }],
  };
}

function layerCriteria(evidenceIds, ratings = {}) {
  return {
    constrained_function_criticality: { rating: ratings.constrained_function_criticality ?? 4, evidence_ids: evidenceIds },
    scarcity_mechanism_strength: { rating: ratings.scarcity_mechanism_strength ?? 4, evidence_ids: evidenceIds },
    substitution_difficulty: { rating: ratings.substitution_difficulty ?? 3, evidence_ids: evidenceIds },
    evidence_quality: { rating: ratings.evidence_quality ?? 4, evidence_ids: evidenceIds },
  };
}

function validRankingInput() {
  const symbols = ["AAA", "BBB", "CCC"];
  return {
    as_of: AS_OF,
    required_factors: REQUIRED_FACTORS,
    evidence: symbols.flatMap((symbol) => [
      capEvidence(symbol, "identity", { tool_name: "qveris_finance.ref_security_master" }),
      capEvidence(symbol, "factor"),
      capEvidence(symbol, "denominator", { tool_name: "qveris_finance.fundamentals_is" }),
      capEvidence(symbol, "counter"),
    ]),
    layers: [],
    candidates: symbols.map(candidate),
    publish_candidate_ranking: true,
    publish_layer_ranking: false,
  };
}

function violationCodes(result) {
  return result.violations.map((item) => item.code);
}

function candidateGapCodes(result, symbol) {
  return result.candidate_decisions
    .find((item) => item.symbol === symbol)
    .gaps.map((item) => item.code);
}

test("allows ranking for three candidates with one validated comparison basis", () => {
  const result = validateSerenityResearch(validRankingInput());

  assert.equal(result.status, "accepted");
  assert.equal(result.candidate_ranking_allowed, true);
  assert.equal(result.comparable_candidate_count, 3);
  assert.deepEqual(result.candidate_decisions.map((item) => item.score_allowed), [true, true, true]);
  assert.deepEqual(result.violations, []);
});

test("rejects publication when fewer than three candidates are comparable", () => {
  const input = validRankingInput();
  input.candidates = input.candidates.slice(0, 2);

  const result = validateSerenityResearch(input);

  assert.equal(result.status, "rejected");
  assert.equal(result.candidate_ranking_allowed, false);
  assert.equal(result.comparable_candidate_count, 2);
  assert.ok(violationCodes(result).includes("ranking_unsupported"));
});

test("rejects future evidence and removes the affected candidate from scoring", () => {
  const input = validRankingInput();
  input.evidence.find((item) => item.evidence_id === "AAA:factor").as_of = "2026-08-02T00:00:00Z";

  const result = validateSerenityResearch(input);
  const futureViolation = result.violations.find((item) => item.code === "semantic_future_data");

  assert.equal(futureViolation?.evidence_id, "AAA:factor");
  assert.equal(result.candidate_decisions[0].score_allowed, false);
  assert.ok(candidateGapCodes(result, "AAA").includes("evidence_ref_rejected"));
  assert.equal(result.candidate_ranking_allowed, false);
});

test("does not score a candidate with a missing factor or missing factor evidence", () => {
  const missingFactor = validRankingInput();
  delete missingFactor.candidates[0].factors.scarcity_mechanism;
  let result = validateSerenityResearch(missingFactor);

  assert.equal(result.candidate_decisions[0].score_allowed, false);
  assert.ok(candidateGapCodes(result, "AAA").includes("factor_missing"));

  const missingEvidence = validRankingInput();
  missingEvidence.candidates[0].factors.scarcity_mechanism.evidence_ids = [];
  result = validateSerenityResearch(missingEvidence);

  assert.equal(result.candidate_decisions[0].score_allowed, false);
  assert.ok(candidateGapCodes(result, "AAA").includes("evidence_refs_missing"));
  assert.equal(result.candidate_ranking_allowed, false);
});

test("rejects factor evidence belonging to another security", () => {
  const input = validRankingInput();
  input.candidates[0].factors.demand_pressure.evidence_ids = ["BBB:factor"];

  const result = validateSerenityResearch(input);

  assert.equal(result.candidate_decisions[0].score_allowed, false);
  assert.ok(candidateGapCodes(result, "AAA").includes("semantic_entity_mismatch"));
  assert.equal(result.candidate_ranking_allowed, false);
});

test("requires identity CAP evidence and a positive finite denominator", () => {
  const missingIdentity = validRankingInput();
  missingIdentity.candidates[0].identity_evidence_ids = ["AAA:factor"];
  let result = validateSerenityResearch(missingIdentity);
  assert.equal(result.candidate_decisions[0].score_allowed, false);
  assert.ok(candidateGapCodes(result, "AAA").includes("identity_cap_evidence_missing"));

  const invalidDenominator = validRankingInput();
  invalidDenominator.candidates[0].denominator_checks[0].value = 0;
  result = validateSerenityResearch(invalidDenominator);
  assert.equal(result.candidate_decisions[0].score_allowed, false);
  assert.ok(candidateGapCodes(result, "AAA").includes("denominator_nonpositive"));
});

test("rejects ranking when otherwise complete candidates use different comparison bases", () => {
  const input = validRankingInput();
  input.candidates[2].currency_convention = "HKD";
  input.evidence.find((item) => item.evidence_id === "CCC:factor").currency_convention = "HKD";
  input.evidence.find((item) => item.evidence_id === "CCC:denominator").currency_convention = "HKD";

  const result = validateSerenityResearch(input);

  assert.equal(result.status, "rejected");
  assert.equal(result.comparable_candidate_count, 3);
  assert.deepEqual(result.candidate_decisions.map((item) => item.score_allowed), [true, true, true]);
  assert.equal(result.candidate_ranking_allowed, false);
  assert.ok(violationCodes(result).includes("comparison_basis_mismatch"));
  assert.ok(violationCodes(result).includes("ranking_unsupported"));
});

test("rejects candidate labels that are not proven by underlying comparison evidence", () => {
  const input = validRankingInput();
  input.candidates[0].currency_convention = "HKD";

  const result = validateSerenityResearch(input);

  assert.equal(result.candidate_decisions[0].score_allowed, false);
  assert.ok(candidateGapCodes(result, "AAA").includes("factor_comparison_basis_unproven"));
  assert.ok(candidateGapCodes(result, "AAA").includes("denominator_comparison_basis_unproven"));
  assert.equal(result.candidate_ranking_allowed, false);
});

test("accepts audited Web evidence and rejects missing hash, owner, or relevance", () => {
  const base = {
    as_of: AS_OF,
    required_factors: ["evidence_quality"],
    evidence: [webEvidence("web:1")],
    layers: [],
    candidates: [],
    publish_candidate_ranking: false,
    publish_layer_ranking: false,
  };

  assert.equal(validateSerenityResearch(base).status, "accepted");

  const cases = [
    [{ body_sha256: "not-a-sha256" }, "body_hash_invalid"],
    [{ publisher_owner: "" }, "publisher_owner_missing"],
    [{ issuer_or_topic_match: false }, "web_relevance_rejected"],
    [{ window_match: false }, "web_relevance_rejected"],
  ];
  for (const [override, expectedCode] of cases) {
    const input = clone(base);
    Object.assign(input.evidence[0], override);
    const result = validateSerenityResearch(input);
    assert.equal(result.status, "degraded");
    assert.ok(violationCodes(result).includes(expectedCode), `expected ${expectedCode}`);
  }
});

test("requires two independent evidence owners for an accepted scarce layer", () => {
  const input = {
    as_of: AS_OF,
    required_factors: ["evidence_quality"],
    evidence: [
      webEvidence("web:owner-a:1", { publisher_owner: "Owner A" }),
      webEvidence("web:owner-a:2", { publisher_owner: "Owner A" }),
    ],
    layers: [{
      layer_id: "cooling-manifold",
      constrained_function: "move heat out of high-density racks",
      scarcity_mechanisms: ["qualification time"],
      evidence_ids: ["web:owner-a:1", "web:owner-a:2"],
      criteria: layerCriteria(["web:owner-a:1", "web:owner-a:2"]),
    }],
    candidates: [],
    publish_candidate_ranking: false,
    publish_layer_ranking: false,
  };

  let result = validateSerenityResearch(input);
  assert.equal(result.layer_decisions[0].status, "degraded");
  assert.ok(result.layer_decisions[0].gaps.some((item) => item.code === "layer_evidence_not_independent"));

  input.evidence[1].publisher_owner = "Owner B";
  input.evidence[1].evidence_owner = "Owner B";
  result = validateSerenityResearch(input);
  assert.equal(result.layer_decisions[0].status, "accepted");
  assert.deepEqual(result.layer_decisions[0].gaps, []);

  input.evidence = [
    capEvidence("AAA", "owner-one", { evidence_owner: "Same filing owner" }),
    capEvidence("AAA", "owner-two", { evidence_owner: "Same filing owner" }),
  ];
  input.layers[0].evidence_ids = ["AAA:owner-one", "AAA:owner-two"];
  input.layers[0].criteria = layerCriteria(["AAA:owner-one", "AAA:owner-two"]);
  result = validateSerenityResearch(input);
  assert.equal(result.layer_decisions[0].status, "degraded");
  assert.ok(result.layer_decisions[0].gaps.some((item) => item.code === "layer_evidence_not_independent"));
});

test("computes scarce-layer ranking from the fixed evidence-bound rubric", () => {
  const evidence = [
    webEvidence("layer-a:1", { publisher_owner: "Owner A1" }),
    webEvidence("layer-a:2", { publisher_owner: "Owner A2" }),
    webEvidence("layer-b:1", { publisher_owner: "Owner B1" }),
    webEvidence("layer-b:2", { publisher_owner: "Owner B2" }),
  ];
  const input = {
    as_of: AS_OF,
    required_factors: ["evidence_quality"],
    evidence,
    layers: [
      {
        layer_id: "layer-a",
        constrained_function: "perform function A",
        scarcity_mechanisms: ["qualification time"],
        evidence_ids: ["layer-a:1", "layer-a:2"],
        criteria: layerCriteria(["layer-a:1", "layer-a:2"], {
          constrained_function_criticality: 5,
          scarcity_mechanism_strength: 5,
          substitution_difficulty: 4,
          evidence_quality: 5,
        }),
      },
      {
        layer_id: "layer-b",
        constrained_function: "perform function B",
        scarcity_mechanisms: ["specialized equipment"],
        evidence_ids: ["layer-b:1", "layer-b:2"],
        criteria: layerCriteria(["layer-b:1", "layer-b:2"], {
          constrained_function_criticality: 4,
          scarcity_mechanism_strength: 3,
          substitution_difficulty: 3,
          evidence_quality: 4,
        }),
      },
    ],
    candidates: [],
    publish_candidate_ranking: false,
    publish_layer_ranking: true,
  };

  const result = validateSerenityResearch(input);

  assert.equal(result.status, "accepted");
  assert.equal(result.layer_ranking_allowed, true);
  assert.deepEqual(result.layer_ranking, [
    { rank: 1, layer_id: "layer-a", priority_score: 96 },
    { rank: 2, layer_id: "layer-b", priority_score: 70 },
  ]);
});
