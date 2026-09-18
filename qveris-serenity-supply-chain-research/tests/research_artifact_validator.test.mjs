import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateSerenityArtifact } from "../scripts/validate_research_artifact.mjs";

const fixtureUrl = new URL("../fixtures/qveris/", import.meta.url);

async function fixtures() {
  const load = async (name) => JSON.parse(await readFile(new URL(name, fixtureUrl), "utf8"));
  return {
    output: await load("sample-output.json"),
    observed: await load("sample-output.observed-calls.json"),
    web: await load("sample-output.web-sources.json"),
  };
}

test("accepts a validity-recomputed artifact with matching CAP and Web sidecars", async () => {
  const { output, observed, web } = await fixtures();
  const result = validateSerenityArtifact(output, observed, web);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.computed_validity.status, "accepted");
});

test("rejects missing or mismatched sidecars", async () => {
  const { output, observed, web } = await fixtures();
  let result = validateSerenityArtifact(output, null, web);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("requires observed_calls.v1")));

  observed.observed_calls[0].trace.execution_id = "wrong-execution";
  result = validateSerenityArtifact(output, observed, web);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("row-for-row")));

  const reset = await fixtures();
  reset.web.web_sources[0].body_sha256 = "c".repeat(64);
  result = validateSerenityArtifact(reset.output, reset.observed, reset.web);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("does not match web_sources.v1")));
});

test("rejects sidecar routing leakage and unsupported ranking claims", async () => {
  const { output, observed, web } = await fixtures();
  observed.observed_calls[0].response.provider = "must-not-leak";
  let result = validateSerenityArtifact(output, observed, web);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("routing metadata")));

  const reset = await fixtures();
  reset.output.validity.candidate_ranking_allowed = true;
  result = validateSerenityArtifact(reset.output, reset.observed, reset.web);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("candidate ranking is not supported")));
});

test("keeps dry-run plans separate from evidence and Trace", async () => {
  const output = JSON.parse(await readFile(new URL("dry-run-output.json", fixtureUrl), "utf8"));
  let result = validateSerenityArtifact(output, null, null);
  assert.equal(result.valid, true, result.errors.join("\n"));

  output.evidence.push({ evidence_id: "invented", status: "accepted" });
  result = validateSerenityArtifact(output, null, null);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("dry_run=true forbids accepted evidence")));

  const clean = JSON.parse(await readFile(new URL("dry-run-output.json", fixtureUrl), "utf8"));
  result = validateSerenityArtifact(clean, null, { artifact_version: "web_sources.v1", web_sources: [{}] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("dry_run=true forbids Web operations in sidecars")));
});

test("enforces deterministic top-level status and validity mappings", async () => {
  const { output, observed, web } = await fixtures();
  output.data_quality.status = "partial";
  let result = validateSerenityArtifact(output, observed, web);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("status=initial_pass requires data_quality.status=initial_pass")));

  const reset = await fixtures();
  reset.output.data_quality.missing_fields = [];
  result = validateSerenityArtifact(reset.output, reset.observed, reset.web);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("status=initial_pass requires disclosed incomplete")));

  const rankingMismatch = await fixtures();
  rankingMismatch.output.validity.layer_ranking = [{ rank: 1, layer_id: "invented", priority_score: 99 }];
  result = validateSerenityArtifact(rankingMismatch.output, rankingMismatch.observed, rankingMismatch.web);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("layer ranking does not match computed validity")));

  const hardFailure = await fixtures();
  hardFailure.output.status = "degraded";
  hardFailure.output.data_quality.status = "partial";
  hardFailure.output.validity.status = "degraded";
  hardFailure.output.candidates = [{ symbol: "ZZZ", rank: 1 }];
  result = validateSerenityArtifact(hardFailure.output, hardFailure.observed, hardFailure.web);
  assert.equal(result.computed_validity.status, "rejected");
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("computed semantic rejection requires status=rejected")));
});

test("treats planned estimates as worst-case attempts and supports live budget exhaustion", async () => {
  const dryRun = JSON.parse(await readFile(new URL("dry-run-output.json", fixtureUrl), "utf8"));
  dryRun.planned_calls[0].call_estimate = 7;
  let result = validateSerenityArtifact(dryRun, null, null);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("worst-case required planned attempts")));

  dryRun.status = "budget_limited";
  dryRun.data_quality.status = "budget_limited";
  result = validateSerenityArtifact(dryRun, null, null);
  assert.equal(result.valid, true, result.errors.join("\n"));

  const live = await fixtures();
  live.output.status = "budget_limited";
  live.output.data_quality.status = "budget_limited";
  live.output.controls.max_calls = 1;
  live.output.evidence_matrix = [{ field: "valuation_inputs", required: true, status: "missing" }];
  result = validateSerenityArtifact(live.output, live.observed, live.web);
  assert.equal(result.valid, true, result.errors.join("\n"));

  live.output.status = "degraded";
  live.output.data_quality.status = "partial";
  result = validateSerenityArtifact(live.output, live.observed, live.web);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("exhausted observed attempts")));
});
