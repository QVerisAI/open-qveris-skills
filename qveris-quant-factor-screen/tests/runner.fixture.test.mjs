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

test("quant factor runner renders fixture report and trace", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-factor-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  execFileSync(process.execPath, [
    "qveris-quant-factor-screen/scripts/run.mjs",
    "--fixture",
    "qveris-quant-factor-screen/fixtures/normal-factor-screen.json",
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
  const schema = JSON.parse(readFileSync(path.join(root, "qveris-quant-factor-screen/schemas/output.schema.json"), "utf8"));
  assert.match(report, /Quant Factor Screen/);
  assert.match(report, /factor_set/);
  assert.equal(traceJson.skill_id, "qveris-quant-factor-screen");
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.skill_id, "qveris-quant-factor-screen");
  assert.equal(businessOutput.result.ranking_ready, false);
});

test("quant factor runner surfaces missing provider data", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-factor-missing-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  execFileSync(process.execPath, [
    "qveris-quant-factor-screen/scripts/run.mjs",
    "--fixture",
    "qveris-quant-factor-screen/fixtures/missing-data-factor-screen.json",
    "--output",
    output,
    "--json-output",
    jsonOutput,
    "--trace",
    trace,
  ], { cwd: root, encoding: "utf8" });
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(root, "qveris-quant-factor-screen/schemas/output.schema.json"), "utf8"));
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.result.ranking_ready, false);
  assert.ok(businessOutput.result.missing_data.some((item) => item.includes("valuation_ratios")));
  assert.ok(traceJson.trace.some((row) => row.type === "call_error" && row.role === "valuation_ratios"));
});

test("quant factor runner skips calls that would exceed credit budget", async () => {
  const result = await executePlan(
    {
      callPlan: [
        {
          role: "valuation_ratios",
          category: "fundamentals_valuation",
          preferredToolIds: ["financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef"],
          buildParams: () => ({ symbol: "AAPL" }),
        },
      ],
    },
    { maxPaidCalls: 1, maxCredits: 5 },
    {
      categories: {
        fundamentals_valuation: {
          inspected: [{ tool_id: "financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef", expected_cost: 24.2 }],
          discovered: [],
        },
      },
    },
  );
  assert.equal(result.calls.length, 0);
  assert.equal(result.usage.paid_calls, 0);
  assert.equal(result.usage.estimated_credits, 0);
  assert.equal(result.trace[0].reason, "credit budget would be exceeded");
  assert.equal(result.trace[0].role, "valuation_ratios");
});
