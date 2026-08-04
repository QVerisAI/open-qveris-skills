import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(testsDir, "..");
const validator = path.join(skillDir, "scripts", "validate_research_packet.py");
const python = process.platform === "win32" ? "python" : "python3";

function validArtifacts() {
  const trace = {
    tool_name: "qveris_finance.ref_security_master",
    params: { symbol: "AAPL" },
    status: "success",
    execution_id: "exec-1",
    fallback_used: false,
    missing_fields: [],
  };
  const symbols = ["AAPL", "MSFT", "NVDA"];
  const packet = {
    schema_version: "qveris.market-research-packet.v1",
    status: "complete_draft",
    workflow_stage: "complete",
    distribution_status: "not_authorized",
    controls: {
      dry_run: false,
      max_calls: 4,
      max_web_operations: 0,
      max_age: "P1D",
      budget_note: "test fixture",
      source_mode: "cap_only",
    },
    research_question: "Which peers warrant further research?",
    as_of: "2026-08-03T10:00:00+08:00",
    cutoff: {
      T0: "2026-08-03T10:00:00+08:00",
      CUT_OFF: "2026-08-03T10:00:00+08:00",
      effective_cutoff: "2026-08-03T10:00:00+08:00",
    },
    scope: { sector_or_theme: "test" },
    planned_universe: [],
    evidence_matrix: [],
    planned_calls: [],
    universe: symbols.map((symbol) => ({
      symbol,
      issuer: symbol,
      market: "US",
      exchange: "NASDAQ",
      asset_type: "Common Stock",
      currency: "USD",
      inclusion_reason: "frozen test universe",
      identity_status: "accepted",
    })),
    sources: [{
      source_id: "source-1",
      source_type: "qveris_finance",
      tool_name: trace.tool_name,
      execution_id: trace.execution_id,
      as_of: "2026-08-03T09:00:00+08:00",
    }],
    calculations: [{
      calculation_id: "calc-1",
      formula: "input * 2",
      inputs: [{ value: 1, source_id: "source-1" }],
      result: { value: 2 },
      currency: "USD",
      unit: "x",
      period_end: "2025-12-31",
      rounding: "none",
      check_status: "passed",
    }],
    claims: [
      {
        claim_id: "claim-1",
        type: "calculation",
        status: "supported",
        text: "Calculated observation.",
        source_ids: ["source-1"],
        calculation_ids: ["calc-1"],
      },
      {
        claim_id: "claim-2",
        type: "fact",
        status: "supported",
        text: "Observed fact.",
        source_ids: ["source-1"],
        calculation_ids: [],
      },
    ],
    peer_comps: symbols.map((symbol) => ({
      symbol,
      coverage_tier: "complete_comparable",
      factor_set: ["quality"],
      window_start: "2025-01-01",
      window_end: "2025-12-31",
      fiscal_period: "FY2025",
      measurement_basis: "annual",
      currency_convention: "USD",
    })),
    research_candidates: [{
      symbol: "AAPL",
      rank: 1,
      coverage_tier: "complete_comparable",
      support_claim_ids: ["claim-1", "claim-2"],
      counterevidence: "Alternative explanations remain.",
      main_risk: "Evidence may change.",
      next_check: "Refresh the aligned period.",
    }],
    gaps: [],
    review_gates: {
      comps_review: { status: "approved", reviewer: "reviewer", reviewed_at: "2026-08-03T09:00:00Z" },
      draft_review: { status: "waived", reviewer: "reviewer", reviewed_at: "2026-08-03T09:30:00Z" },
    },
    workflow_guard_status: "accepted",
    observed_call_count: 1,
    qveris_trace: [trace],
    web_trace: [],
    artifacts: [{ path: "note.md", sha256: "a".repeat(64) }],
    disclaimer: "Not investment advice.",
  };
  const sidecar = {
    artifact_version: "observed_calls.v1",
    observed_calls: [{
      request_kind: "capabilities/query",
      capability_id: "REF.SECURITY_MASTER",
      response: { capability_id: "REF.SECURITY_MASTER" },
      trace,
    }],
  };
  return { packet, sidecar };
}

function runValidator(packetPath, sidecarPath, webSidecarPath) {
  const args = [validator, packetPath];
  if (sidecarPath) args.push("--observed-calls", sidecarPath);
  if (webSidecarPath) args.push("--web-sources", webSidecarPath);
  return spawnSync(
    python,
    args,
    { encoding: "utf8" },
  );
}

test("Python packet validator accepts aligned evidence and rejects routing leakage", async (t) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "qveris-market-research-test-"));
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  const packetPath = path.join(tempDir, "packet.json");
  const sidecarPath = path.join(tempDir, "observed-calls.json");
  const { packet, sidecar } = validArtifacts();
  await Promise.all([
    writeFile(packetPath, JSON.stringify(packet), "utf8"),
    writeFile(sidecarPath, JSON.stringify(sidecar), "utf8"),
  ]);

  const accepted = runValidator(packetPath, sidecarPath);
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
  assert.equal(JSON.parse(accepted.stdout).valid, true);

  packet.qveris_trace[0].params.provider = "must-not-leak";
  await writeFile(packetPath, JSON.stringify(packet), "utf8");
  const rejected = runValidator(packetPath, sidecarPath);
  assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
  const result = JSON.parse(rejected.stdout);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("routing metadata")), result.errors.join("\n"));

  delete packet.qveris_trace[0].params.provider;
  sidecar.observed_calls[0].response.provider = "must-not-leak";
  await Promise.all([
    writeFile(packetPath, JSON.stringify(packet), "utf8"),
    writeFile(sidecarPath, JSON.stringify(sidecar), "utf8"),
  ]);
  const sidecarRejected = runValidator(packetPath, sidecarPath);
  assert.equal(sidecarRejected.status, 1, sidecarRejected.stderr || sidecarRejected.stdout);
  assert.ok(
    JSON.parse(sidecarRejected.stdout).errors.some((error) => error.includes("observed-call sidecar leaks routing metadata")),
  );
});

test("Python packet validator verifies audited Web evidence against web_sources.v1", async (t) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "qveris-market-web-test-"));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const fixtureDir = path.join(skillDir, "fixtures", "qveris");
  const packet = JSON.parse(await readFile(path.join(fixtureDir, "fallback-output.json"), "utf8"));
  const webSidecar = JSON.parse(await readFile(path.join(fixtureDir, "fallback-output.web-sources.json"), "utf8"));
  const packetPath = path.join(tempDir, "packet.json");
  const webSidecarPath = path.join(tempDir, "web-sources.json");
  await Promise.all([
    writeFile(packetPath, JSON.stringify(packet), "utf8"),
    writeFile(webSidecarPath, JSON.stringify(webSidecar), "utf8"),
  ]);

  const accepted = runValidator(packetPath, undefined, webSidecarPath);
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);

  webSidecar.web_sources[0].body_sha256 = "b".repeat(64);
  await writeFile(webSidecarPath, JSON.stringify(webSidecar), "utf8");
  const rejected = runValidator(packetPath, undefined, webSidecarPath);
  assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
  assert.ok(JSON.parse(rejected.stdout).errors.some((error) => error.includes("does not match web_sources.v1")));
});

test("Python packet validator keeps dry-run plans out of observed evidence", async (t) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "qveris-market-dry-run-test-"));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const packet = JSON.parse(await readFile(path.join(skillDir, "fixtures", "qveris", "dry-run-output.json"), "utf8"));
  const packetPath = path.join(tempDir, "dry-run.json");
  await writeFile(packetPath, JSON.stringify(packet), "utf8");
  let result = runValidator(packetPath);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  packet.observed_call_count = 1;
  packet.qveris_trace.push({
    tool_name: "qveris_finance.ref_security_master",
    params: { symbol: "EXAMPLE" },
    status: "success",
    execution_id: "invented",
    fallback_used: false,
    missing_fields: [],
  });
  await writeFile(packetPath, JSON.stringify(packet), "utf8");
  result = runValidator(packetPath);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.ok(JSON.parse(result.stdout).errors.some((error) => error.includes("dry_run=true forbids")));
});

test("Python packet validator rejects non-empty Web sidecars during dry runs", async (t) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "qveris-market-dry-run-web-test-"));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const fixtureDir = path.join(skillDir, "fixtures", "qveris");
  const packet = JSON.parse(await readFile(path.join(fixtureDir, "dry-run-output.json"), "utf8"));
  const webSidecar = JSON.parse(await readFile(path.join(fixtureDir, "fallback-output.web-sources.json"), "utf8"));
  const packetPath = path.join(tempDir, "dry-run.json");
  const webSidecarPath = path.join(tempDir, "web-sources.json");
  await Promise.all([
    writeFile(packetPath, JSON.stringify(packet), "utf8"),
    writeFile(webSidecarPath, JSON.stringify(webSidecar), "utf8"),
  ]);

  const result = runValidator(packetPath, undefined, webSidecarPath);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.ok(
    JSON.parse(result.stdout).errors.some((error) => error.includes("dry_run=true forbids non-empty web_sources.v1")),
  );
});

test("Python packet validator rejects candidate ranks and scores at the comps review gate", async (t) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "qveris-market-gate-one-test-"));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const packetPath = path.join(tempDir, "packet.json");
  const sidecarPath = path.join(tempDir, "observed-calls.json");
  const { packet, sidecar } = validArtifacts();
  packet.status = "partial";
  packet.workflow_stage = "awaiting_comps_review";
  packet.review_gates = {
    comps_review: { status: "pending", reviewer: "", reviewed_at: "", notes: "" },
    draft_review: { status: "pending", reviewer: "", reviewed_at: "", notes: "" },
  };
  await writeFile(sidecarPath, JSON.stringify(sidecar), "utf8");

  for (const field of ["rank", "score", "final_score"]) {
    delete packet.research_candidates[0].rank;
    delete packet.research_candidates[0].score;
    delete packet.research_candidates[0].final_score;
    packet.research_candidates[0][field] = field === "rank" ? 1 : 0.5;
    await writeFile(packetPath, JSON.stringify(packet), "utf8");

    const result = runValidator(packetPath, sidecarPath);
    assert.equal(result.status, 1, result.stderr || result.stdout);
    const errors = JSON.parse(result.stdout).errors;
    assert.ok(
      errors.some((error) => error.includes("awaiting_comps_review forbids candidate rank/score/final_score")),
      `${field}: ${errors.join("\n")}`,
    );
    assert.ok(errors.some((error) => error.includes(field)), `${field}: ${errors.join("\n")}`);
  }
});

test("Python packet validator accepts budget exhaustion with required missing evidence", async (t) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "qveris-market-budget-exhaustion-test-"));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const packetPath = path.join(tempDir, "packet.json");
  const sidecarPath = path.join(tempDir, "observed-calls.json");
  const { packet, sidecar } = validArtifacts();
  packet.status = "budget_limited";
  packet.workflow_stage = "awaiting_comps_review";
  packet.controls.max_calls = 1;
  packet.evidence_matrix = [{ field: "valuation_inputs", required: true, status: "missing" }];
  delete packet.research_candidates[0].rank;
  packet.review_gates = {
    comps_review: { status: "pending", reviewer: "", reviewed_at: "", notes: "" },
    draft_review: { status: "pending", reviewer: "", reviewed_at: "", notes: "" },
  };
  await Promise.all([
    writeFile(packetPath, JSON.stringify(packet), "utf8"),
    writeFile(sidecarPath, JSON.stringify(sidecar), "utf8"),
  ]);

  const result = runValidator(packetPath, sidecarPath);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).valid, true);

  packet.status = "partial";
  await writeFile(packetPath, JSON.stringify(packet), "utf8");
  const wrongStatus = runValidator(packetPath, sidecarPath);
  assert.equal(wrongStatus.status, 1, wrongStatus.stderr || wrongStatus.stdout);
  assert.ok(
    JSON.parse(wrongStatus.stdout).errors.some((error) => error.includes("exhausted observed attempts")),
  );

  packet.status = "budget_limited";
  packet.evidence_matrix[0].status = "observed";
  await writeFile(packetPath, JSON.stringify(packet), "utf8");
  const noRequiredGap = runValidator(packetPath, sidecarPath);
  assert.equal(noRequiredGap.status, 1, noRequiredGap.stderr || noRequiredGap.stdout);
  assert.ok(
    JSON.parse(noRequiredGap.stdout).errors.some((error) => error.includes("budget_limited requires either")),
  );
});

test("Python packet validator budgets planned calls as worst-case attempts", async (t) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "qveris-market-planned-budget-test-"));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const packet = JSON.parse(await readFile(path.join(skillDir, "fixtures", "qveris", "dry-run-output.json"), "utf8"));
  const packetPath = path.join(tempDir, "dry-run.json");
  packet.planned_calls[0].call_estimate = 9;
  await writeFile(packetPath, JSON.stringify(packet), "utf8");

  const wrongStatus = runValidator(packetPath);
  assert.equal(wrongStatus.status, 1, wrongStatus.stderr || wrongStatus.stdout);
  assert.ok(
    JSON.parse(wrongStatus.stdout).errors.some((error) => error.includes("worst-case required planned attempts")),
  );

  packet.status = "budget_limited";
  await writeFile(packetPath, JSON.stringify(packet), "utf8");
  const accepted = runValidator(packetPath);
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
  assert.equal(JSON.parse(accepted.stdout).valid, true);
});
