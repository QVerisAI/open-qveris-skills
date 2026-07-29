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

test("portfolio risk runner renders fixture report and trace", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-portfolio-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  await runFixture("normal-portfolio-risk.json", output, jsonOutput, trace);
  const report = readFileSync(output, "utf8");
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(skillRoot, "schemas/output.schema.json"), "utf8"));
  assert.match(report, /Portfolio Risk Monitor/);
  assert.match(report, /Largest non-cash holding/);
  assert.equal(traceJson.skill_id, "qveris-portfolio-risk-monitor");
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.skill_id, "qveris-portfolio-risk-monitor");
  assert.equal(businessOutput.result.top_holding.symbol, "AAPL");
  assert.equal(businessOutput.result.concentration_scope, "non_cash_holdings");
  assert.ok(businessOutput.result.concentration_hhi > 0.25);
  assert.ok(businessOutput.result.risk_metrics);
  assert.ok(Array.isArray(businessOutput.result.holdings_risk));
  assert.equal(businessOutput.result.holdings_risk[0].symbol, "AAPL");
  assert.ok(Array.isArray(businessOutput.result.sector_exposure));
  assert.ok(businessOutput.result.risk_leaders);
  assert.equal(businessOutput.result.coverage_level, "partial");
  assert.equal(businessOutput.result.risk_metrics.observation_count, 5);
  assert.ok(!businessOutput.result.missing_metrics.includes("volatility"));
  assert.ok(!businessOutput.result.missing_metrics.includes("drawdown"));
  assert.ok(!businessOutput.result.missing_metrics.includes("correlation"));
  assert.equal(typeof businessOutput.result.risk_metrics.correlation_to_benchmark, "number");
  assert.ok(businessOutput.result.measurable_risks.includes("benchmark_correlation"));
});

test("portfolio risk runner surfaces missing provider data", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-portfolio-missing-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  await runFixture("missing-data-portfolio-risk.json", output, jsonOutput, trace);
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(skillRoot, "schemas/output.schema.json"), "utf8"));
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.ok(businessOutput.result.missing_data.some((item) => item.includes("quote_snapshot")));
  assert.equal(businessOutput.result.coverage_level, "partial");
  assert.ok(traceJson.trace.some((row) => row.type === "call_error" && row.role === "quote_snapshot"));
});

test("portfolio risk runner skips calls that would exceed credit budget", async () => {
  const result = await executePlan(
    {
      callPlan: [
        {
          role: "historical_prices",
          category: "quote_history",
          preferredToolIds: ["financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22"],
          buildParams: () => ({ symbol: "AAPL" }),
        },
      ],
    },
    { maxPaidCalls: 1, maxCredits: 5 },
    {
      categories: {
        quote_history: {
          inspected: [{ tool_id: "financialmodelingprep.stable.historicalpriceeod.full.retrieve.v1.b0c32b22", expected_cost: 24.2 }],
          discovered: [],
        },
      },
    },
  );
  assert.equal(result.calls.length, 0);
  assert.equal(result.usage.paid_calls, 0);
  assert.equal(result.usage.estimated_credits, 0);
  assert.equal(result.trace[0].reason, "credit budget would be exceeded");
  assert.equal(result.trace[0].role, "historical_prices");
});
