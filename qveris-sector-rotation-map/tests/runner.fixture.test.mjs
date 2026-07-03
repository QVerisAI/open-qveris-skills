import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSchema } from "../../qveris-finance-common/schema-validator.mjs";
import { executePlan } from "../../qveris-finance-common/runner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("sector rotation runner renders fixture report and trace", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-sector-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  execFileSync(process.execPath, [
    "qveris-sector-rotation-map/scripts/run.mjs",
    "--fixture",
    "qveris-sector-rotation-map/fixtures/normal-sector-rotation.json",
    "--output",
    output,
    "--json-output",
    jsonOutput,
    "--trace",
    trace,
  ], { cwd: root, encoding: "utf8" });
  const report = readFileSync(output, "utf8");
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(root, "qveris-sector-rotation-map/schemas/output.schema.json"), "utf8"));
  assert.match(report, /Sector Rotation Map/);
  assert.match(report, /Rotation proxy set/);
  assert.equal(traceJson.skill_id, "qveris-sector-rotation-map");
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.skill_id, "qveris-sector-rotation-map");
  assert.equal(businessOutput.result.phase_labels_ready, true);
  assert.ok(Array.isArray(businessOutput.result.rotation_quadrants));
  assert.ok(Array.isArray(businessOutput.result.momentum_scores));
  assert.ok(!businessOutput.result.missing_outputs.includes("rotation_quadrants"));
  assert.ok(!businessOutput.result.missing_outputs.includes("benchmark_relative_history"));
  assert.ok(!businessOutput.result.missing_outputs.includes("flow_or_revision_confirmation"));
  assert.ok(Array.isArray(businessOutput.result.benchmark_relative_history));
  assert.equal(businessOutput.result.benchmark_relative_history.length, 2);
});

test("sector rotation runner surfaces missing provider data", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-sector-missing-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  execFileSync(process.execPath, [
    "qveris-sector-rotation-map/scripts/run.mjs",
    "--fixture",
    "qveris-sector-rotation-map/fixtures/missing-data-sector-rotation.json",
    "--output",
    output,
    "--json-output",
    jsonOutput,
    "--trace",
    trace,
  ], { cwd: root, encoding: "utf8" });
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(root, "qveris-sector-rotation-map/schemas/output.schema.json"), "utf8"));
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.result.phase_labels_ready, false);
  assert.ok(businessOutput.result.missing_outputs.includes("rotation_quadrants"));
  assert.ok(businessOutput.result.missing_data.some((item) => item.includes("etf_performance")));
  assert.ok(traceJson.trace.some((row) => row.type === "call_error" && row.role === "etf_performance"));
});

test("sector rotation runner skips calls that would exceed credit budget", async () => {
  const result = await executePlan(
    {
      callPlan: [
        {
          role: "sector_performance_snapshot",
          category: "sector_snapshot",
          preferredToolIds: ["financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159"],
          buildParams: () => ({ date: "2026-07-02" }),
        },
      ],
    },
    { maxPaidCalls: 1, maxCredits: 5 },
    {
      categories: {
        sector_snapshot: {
          inspected: [{ tool_id: "financialmodelingprep.stable.sectorperformancesnapshot.retrieve.v1.5ca7b159", expected_cost: 24.2 }],
          discovered: [],
        },
      },
    },
  );
  assert.equal(result.calls.length, 0);
  assert.equal(result.usage.paid_calls, 0);
  assert.equal(result.usage.estimated_credits, 0);
  assert.equal(result.trace[0].reason, "credit budget would be exceeded");
  assert.equal(result.trace[0].role, "sector_performance_snapshot");
});
