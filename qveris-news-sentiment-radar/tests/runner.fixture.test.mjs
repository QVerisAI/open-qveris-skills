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

test("news sentiment runner renders fixture report and trace", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-news-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  execFileSync(process.execPath, [
    "qveris-news-sentiment-radar/scripts/run.mjs",
    "--fixture",
    "qveris-news-sentiment-radar/fixtures/normal-news-sentiment.json",
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
  const schema = JSON.parse(readFileSync(path.join(root, "qveris-news-sentiment-radar/schemas/output.schema.json"), "utf8"));
  assert.match(report, /News Sentiment Radar/);
  assert.match(report, /Paid calls: 2/);
  assert.equal(traceJson.skill_id, "qveris-news-sentiment-radar");
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.skill_id, "qveris-news-sentiment-radar");
  assert.equal(businessOutput.result.ticker, "NVDA");
});

test("news sentiment runner surfaces missing provider data", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-news-missing-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  execFileSync(process.execPath, [
    "qveris-news-sentiment-radar/scripts/run.mjs",
    "--fixture",
    "qveris-news-sentiment-radar/fixtures/missing-data-news-sentiment.json",
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
  const schema = JSON.parse(readFileSync(path.join(root, "qveris-news-sentiment-radar/schemas/output.schema.json"), "utf8"));
  assert.match(report, /Observed 0 raw records/);
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.result.signal_level, "insufficient_data");
  assert.ok(businessOutput.result.missing_data.some((item) => item.includes("market_news_sentiment")));
  assert.ok(traceJson.trace.some((row) => row.type === "call_error" && row.role === "filings_check"));
});

test("news sentiment runner skips calls that would exceed credit budget", async () => {
  const result = await executePlan(
    {
      callPlan: [
        {
          role: "market_news_sentiment",
          category: "news_sentiment",
          preferredToolIds: ["alphavantage.news_sentiment.query.v1.467a92c0"],
          buildParams: () => ({ tickers: "NVDA" }),
        },
      ],
    },
    { maxPaidCalls: 1, maxCredits: 1 },
    {
      categories: {
        news_sentiment: {
          inspected: [{ tool_id: "alphavantage.news_sentiment.query.v1.467a92c0", expected_cost: 2 }],
          discovered: [],
        },
      },
    },
  );
  assert.equal(result.calls.length, 0);
  assert.equal(result.usage.paid_calls, 0);
  assert.equal(result.usage.estimated_credits, 0);
  assert.equal(result.trace[0].reason, "credit budget would be exceeded");
  assert.equal(result.trace[0].role, "market_news_sentiment");
});
