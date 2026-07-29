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

test("sector rotation runner renders fixture report and trace", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-sector-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  await runFixture("normal-sector-rotation.json", output, jsonOutput, trace);
  const report = readFileSync(output, "utf8");
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(skillRoot, "schemas/output.schema.json"), "utf8"));
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
  assert.ok(!businessOutput.result.missing_outputs.includes("news_catalyst_confirmation"));
  assert.ok(Array.isArray(businessOutput.result.benchmark_relative_history));
  assert.equal(businessOutput.result.benchmark_relative_history.length, 2);
});

test("sector rotation runner surfaces missing provider data", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-sector-missing-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  await runFixture("missing-data-sector-rotation.json", output, jsonOutput, trace);
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(skillRoot, "schemas/output.schema.json"), "utf8"));
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

test("sector rotation runner maps ticker watchlists to sector proxies", () => {
  const summary = config.inputSummary({ ...defaults, sectors: [], tickers: ["AAPL", "NVDA", "TSLA"] });
  assert.deepEqual(summary.sector_proxies, ["XLK", "XLY"]);
  assert.deepEqual(summary.requested_tickers, ["AAPL", "NVDA", "TSLA"]);
});

test("sector rotation readiness stays partial when a requested proxy has no signal", () => {
  const analysis = config.analyze({
    opts: { ...defaults, sectors: ["XLK", "XLY"], benchmark: "SPY", asOf: "2026-07-02", windowDays: 30 },
    calls: [
      {
        role: "proxy_price_history",
        target: "XLK",
        ok: true,
        raw_result: {
          result: {
            historical: [
              { date: "2026-06-01", close: 100 },
              { date: "2026-07-01", close: 110 },
            ],
          },
        },
      },
    ],
  });
  assert.equal(analysis.result.phase_labels_ready, false);
  assert.ok(analysis.result.missing_outputs.includes("partial_rotation_quadrants"));
  assert.ok(analysis.result.missing_data.some((item) => item.includes("sector_signal/XLY")));
});

test("sector rotation business output surfaces skipped ETF performance source", () => {
  const analysis = config.analyze({
    opts: { ...defaults, sectors: ["XLK"], benchmark: "SPY", asOf: "2026-07-02", windowDays: 30 },
    calls: [
      {
        role: "proxy_price_history",
        target: "XLK",
        ok: true,
        raw_result: {
          result: {
            historical: [
              { date: "2026-06-01", close: 100 },
              { date: "2026-07-01", close: 110 },
            ],
          },
        },
      },
      {
        role: "benchmark_price_history",
        target: "SPY",
        ok: true,
        raw_result: {
          result: {
            historical: [
              { date: "2026-06-01", close: 100 },
              { date: "2026-07-01", close: 105 },
            ],
          },
        },
      },
      {
        role: "news_catalyst_confirmation",
        target: "XLK",
        ok: true,
        raw_result: { result: [{ title: "Technology catalyst context", overall_sentiment_label: "Bullish" }] },
      },
    ],
    trace: [{ type: "call_skipped", role: "etf_performance", target: "XLK", reason: "no inspected tool candidate" }],
  });
  assert.ok(analysis.result.missing_outputs.includes("etf_performance_source"));
  assert.ok(analysis.result.missing_data.some((item) => item.includes("etf_performance/XLK: skipped")));
});
