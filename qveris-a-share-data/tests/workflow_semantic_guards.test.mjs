import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  adjacentReturns,
  effectiveCutoff,
  validateComparableRanking,
  validateFiscalEvidence,
  validateIdentityEvidence,
  validateNewsSentiment,
  validateTemporalEvidence,
} from "../scripts/qveris_workflow_guards.mjs";

test("uses min(T0, CUT_OFF) and rejects same-day post-T0 evidence", () => {
  const cutoff = effectiveCutoff({
    T0: "2026-07-28T14:11:00+08:00",
    CUT_OFF: "2026-07-28T23:59:59+08:00",
  });
  assert.equal(cutoff.status, "accepted");
  assert.equal(cutoff.source, "T0");
  const result = validateTemporalEvidence({
    timestamps: [{ field: "quote_time", value: "2026-07-28T15:10:00+08:00" }],
    T0: "2026-07-28T14:11:00+08:00",
    CUT_OFF: "2026-07-28T23:59:59+08:00",
    require_intraday_timestamp: true,
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.reason_code, "semantic_future_data");
});

test("rejects date-only real-time evidence when the cutoff is intraday", () => {
  const result = validateTemporalEvidence({
    timestamps: ["2026-07-28"],
    cut_off: "2026-07-28T14:11:00+08:00",
    require_intraday_timestamp: true,
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.reason_code, "semantic_timestamp_missing");
});

test("requires matching entity and market proof on every evidence row", () => {
  const missing = validateIdentityEvidence({
    expected_symbol: "600519.SH",
    expected_market: "CN",
    records: [{ price: 1400 }],
  });
  assert.equal(missing.reason_code, "semantic_entity_missing");

  const mixed = validateIdentityEvidence({
    expected_symbol: "600519.SH",
    expected_market: "CN",
    records: [{ symbol: "600519.SH", market: "CN" }, { symbol: "AAPL", market: "US" }],
  });
  assert.equal(mixed.status, "rejected");
  assert.equal(mixed.reason_code, "semantic_entity_mismatch");
});

test("accepts a matching A-share year-end annual period and rejects Q1 as annual", () => {
  const annual = validateFiscalEvidence({
    fiscal_year: 2025,
    fiscal_period: "FY",
    statement_basis: "annual",
    records: [{ period_end: "2025-12-31", statement_basis: "annual" }],
  });
  assert.equal(annual.status, "accepted");

  const quarter = validateFiscalEvidence({
    fiscal_year: 2025,
    fiscal_period: "FY",
    statement_basis: "annual",
    records: [{ period_end: "2025-03-31", statement_basis: "cumulative" }],
  });
  assert.equal(quarter.status, "rejected");
  assert.equal(quarter.reason_code, "semantic_period_mismatch");
});

test("rejects a claimed FQ comparison when period basis is missing", () => {
  const result = validateFiscalEvidence({
    fiscal_year: 2026,
    fiscal_period: "2026Q1",
    statement_basis: "single_quarter",
    records: [{ fiscal_period: "2026Q1", period_end: "2026-03-31" }],
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.reason_code, "semantic_period_basis_missing");
});

test("derives exactly N-1 adjacent returns from N prices", () => {
  const prices = Array.from({ length: 20 }, (_, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    close: 100 + index,
  }));
  const result = adjacentReturns({ prices });
  assert.equal(result.status, "accepted");
  assert.equal(result.observation_count, 20);
  assert.equal(result.return_count, 19);
  assert.equal(result.returns.length, 19);
});

test("rejects partially dated price series before calculating returns", () => {
  const result = adjacentReturns({ prices: [{ date: "2026-07-27", close: 100 }, { close: 101 }] });
  assert.equal(result.status, "rejected");
  assert.equal(result.reason_code, "invalid_price_dates");
});

test("does not rank rows with missing common factors or invalid denominators", () => {
  const result = validateComparableRanking({
    required_factors: ["momentum", { name: "roe", denominator_required: true }],
    rows: [
      {
        symbol: "600519.SH",
        window_start: "2026-06-01",
        window_end: "2026-07-28",
        factors: { momentum: 0.1, roe: { value: 0.2, denominator: 0, status: "valid" } },
      },
      {
        symbol: "300750.SZ",
        window_start: "2026-06-01",
        window_end: "2026-07-28",
        factors: { momentum: 0.05 },
      },
    ],
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.reason_code, "ranking_unsupported");
  assert.ok(result.gaps.some((gap) => gap.reason_code === "ranking_denominator_invalid"));
  assert.ok(result.gaps.some((gap) => gap.reason_code === "ranking_factor_missing"));
});

test("allows ranking only after common window, factors, and denominators validate", () => {
  const result = validateComparableRanking({
    required_factors: ["momentum", { name: "roe", denominator_required: true }],
    rows: ["600519.SH", "300750.SZ"].map((symbol, index) => ({
      symbol,
      window_start: "2026-06-01",
      window_end: "2026-07-28",
      factors: {
        momentum: { value: 0.1 - index * 0.02, status: "valid" },
        roe: { value: 0.2 - index * 0.03, numerator: 20, denominator: 100, status: "valid" },
      },
    })),
  });
  assert.equal(result.status, "accepted");
  assert.equal(result.rankable, true);
});

test("keeps one-source sentiment insufficient and scopes two-source sentiment to the sample", () => {
  const source = (publisher, sentiment, published_at = "2026-07-27T09:00:00+08:00") => ({
    final_url: `https://example.com/${publisher}`,
    publisher,
    published_at,
    accessed_at: "2026-07-28T10:00:00+08:00",
    body_sha256: publisher === "source-a" ? "a".repeat(64) : "b".repeat(64),
    issuer_match: true,
    window_match: true,
    sentiment,
    text_cue: `${publisher}-${sentiment}`,
  });
  const one = validateNewsSentiment({
    cut_off: "2026-07-28T14:11:00+08:00",
    sources: [source("source-a", "positive")],
  });
  assert.equal(one.status, "accepted");
  assert.equal(one.sentiment, "insufficient");
  assert.equal(one.market_wide, false);

  const two = validateNewsSentiment({
    cut_off: "2026-07-28T14:11:00+08:00",
    sources: [source("source-a", "positive"), source("source-b", "negative")],
  });
  assert.equal(two.status, "accepted");
  assert.equal(two.sentiment, "mixed");
  assert.equal(two.claim_scope, "qualifying_source_sample");
  assert.equal(two.market_wide, false);
});

test("counts syndicated copies with the same body only once", () => {
  const common = {
    published_at: "2026-07-27T09:00:00+08:00",
    accessed_at: "2026-07-28T10:00:00+08:00",
    body_sha256: "c".repeat(64),
    issuer_match: true,
    window_match: true,
    sentiment: "positive",
    text_cue: "same syndicated story",
  };
  const result = validateNewsSentiment({
    cut_off: "2026-07-28T14:11:00+08:00",
    sources: [
      { ...common, final_url: "https://a.example/story", publisher: "source-a" },
      { ...common, final_url: "https://b.example/story", publisher: "source-b" },
    ],
  });
  assert.equal(result.sentiment, "insufficient");
  assert.equal(result.independent_source_count, 1);
});

test("excludes post-cutoff news instead of using it for sentiment", () => {
  const result = validateNewsSentiment({
    cut_off: "2026-07-28T14:11:00+08:00",
    sources: [{
      final_url: "https://example.com/future",
      publisher: "source-a",
      published_at: "2026-07-28T15:10:00+08:00",
      accessed_at: "2026-07-28T15:11:00+08:00",
      body_sha256: "b".repeat(64),
      issuer_match: true,
      window_match: true,
      sentiment: "positive",
      text_cue: "future cue",
    }],
  });
  assert.equal(result.sentiment, "insufficient");
  assert.equal(result.independent_source_count, 0);
  assert.equal(result.excluded[0].reason_code, "semantic_future_data");
});

test("AlphaEar and A-Share Data ship byte-identical workflow guards", async () => {
  const local = await readFile(new URL("../scripts/qveris_workflow_guards.mjs", import.meta.url));
  const alpha = await readFile(new URL("../../qveris-alphaear-market-intelligence/scripts/qveris_workflow_guards.mjs", import.meta.url));
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  assert.equal(hash(local), hash(alpha));
});

test("both Skills mandate the workflow guards before final claims", async () => {
  const root = new URL("../../", import.meta.url);
  for (const skill of ["qveris-a-share-data", "qveris-alphaear-market-intelligence"]) {
    const instructions = await readFile(new URL(`${skill}/SKILL.md`, root), "utf8");
    const reference = await readFile(new URL(`${skill}/references/qveris-workflow-semantic-guards.md`, root), "utf8");
    assert.match(instructions, /effective_cutoff=min\(T0,CUT_OFF\)/);
    assert.match(instructions, /`N` prices (?:produce|yield) exactly `N-1` adjacent returns/);
    assert.match(instructions, /ranking_unsupported/);
    assert.match(instructions, /claim ledger/i);
    assert.match(instructions, /qveris-workflow-semantic-guards\.md/);
    assert.match(reference, /qveris_workflow_guards\.mjs/);
  }
});

test("tool maps keep disabled news and sentiment CAPs out of primary evidence", async () => {
  const root = new URL("../../", import.meta.url);
  const alpha = await readFile(new URL("qveris-alphaear-market-intelligence/references/qveris-tool-map.md", root), "utf8");
  const data = await readFile(new URL("qveris-a-share-data/references/qveris-tool-map.md", root), "utf8");
  assert.doesNotMatch(alpha, /\| News context \| `qveris_finance\.news_fin_tagged`/);
  assert.doesNotMatch(alpha, /\| Sentiment coverage \| `qveris_finance\.sentiment_text_signals`/);
  assert.doesNotMatch(data, /\| News \| `qveris_finance\.news_fin_tagged`/);
  for (const text of [alpha, data]) {
    assert.match(text, /Audited Web lane/);
    assert.match(text, /qualifying source sample|qualifying-source scope/);
  }
});

test("guard CLI returns machine-readable decisions", () => {
  const script = fileURLToPath(new URL("../scripts/qveris_workflow_guards.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [
    script,
    "returns",
    "--input-json",
    JSON.stringify({ prices: [100, 101, 102] }),
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.observation_count, 3);
  assert.equal(output.return_count, 2);
});
