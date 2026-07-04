import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, defaults } from "../scripts/run.mjs";
import { validateSchema } from "../scripts/lib/schema-validator.mjs";
import { executePlan, runSkill } from "../scripts/lib/qveris-runtime.mjs";

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function runFixture(fixtureName, output, jsonOutput, trace) {
  await runSkill(config, {
    ...defaults,
    fixture: path.join(skillRoot, "fixtures", fixtureName),
    output,
    jsonOutput,
    trace,
  });
}

test("quant factor runner renders fixture report and trace", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-factor-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  await runFixture("normal-factor-screen.json", output, jsonOutput, trace);
  const report = readFileSync(output, "utf8");
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(skillRoot, "schemas/output.schema.json"), "utf8"));
  assert.match(report, /Quant Factor Screen/);
  assert.match(report, /factor_set/);
  assert.equal(traceJson.skill_id, "qveris-quant-factor-screen");
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.skill_id, "qveris-quant-factor-screen");
  assert.equal(businessOutput.result.ranking_ready, true);
  assert.equal(businessOutput.result.coverage_level, "complete");
  assert.ok(Array.isArray(businessOutput.result.ranking_table));
  assert.equal(businessOutput.result.ranking_table.length, 2);
  assert.ok(businessOutput.result.ranking_table.every((row) => row.data_status === "complete"));
  assert.ok(businessOutput.result.factor_weights.valuation > 0);
  assert.ok(businessOutput.result.tie_break_rules.length > 0);
  assert.deepEqual(businessOutput.result.missing_outputs, []);
});

test("quant factor runner surfaces missing provider data", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-factor-missing-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  await runFixture("missing-data-factor-screen.json", output, jsonOutput, trace);
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(skillRoot, "schemas/output.schema.json"), "utf8"));
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.result.ranking_ready, false);
  assert.ok(Array.isArray(businessOutput.result.ranking_table));
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

test("quant factor runner applies documented tie-break rules", () => {
  const analysis = config.analyze({
    opts: { ...defaults, universe: ["AAA", "BBB"] },
    calls: [
      {
        role: "valuation_ratios",
        target: "AAA",
        ok: true,
        raw_result: { result: [{ priceEarningsRatio: 30 }] },
      },
      {
        role: "valuation_ratios",
        target: "BBB",
        ok: true,
        raw_result: { result: [{ priceEarningsRatio: 30 }] },
      },
      {
        role: "liquidity_float",
        target: "BBB",
        ok: true,
        raw_result: { result: [{ floatShares: 100000 }] },
      },
    ],
  });
  const ranked = analysis.result.ranking_table;
  assert.equal(ranked[0].symbol, "BBB");
  assert.equal(ranked[0].non_missing_factor_count, 2);
  assert.equal(ranked[1].symbol, "AAA");
  assert.equal(ranked[1].non_missing_factor_count, 1);
});

test("quant factor live run rejects under-budgeted large universes before QVeris calls", async () => {
  const largeUniverse = Array.from({ length: 50 }, (_, index) => `T${String(index + 1).padStart(2, "0")}`);
  await assert.rejects(
    () =>
      runSkill(config, {
        ...defaults,
        live: true,
        dryRun: false,
        universe: largeUniverse,
        maxPaidCalls: 25,
        maxCredits: 520,
      }),
    /Budget too low for complete quant factor screen/,
  );
});
