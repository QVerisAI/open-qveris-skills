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

test("news sentiment runner renders fixture report and trace", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-news-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  await runFixture("normal-news-sentiment.json", output, jsonOutput, trace);
  const report = readFileSync(output, "utf8");
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(skillRoot, "schemas/output.schema.json"), "utf8"));
  assert.match(report, /News Sentiment Radar/);
  assert.match(report, /Paid calls: 4/);
  assert.equal(traceJson.skill_id, "qveris-news-sentiment-radar");
  assert.deepEqual(validateSchema(schema, businessOutput), []);
  assert.equal(businessOutput.skill_id, "qveris-news-sentiment-radar");
  assert.equal(businessOutput.result.ticker, "NVDA");
  assert.equal(businessOutput.result.catalyst_status, "confirmed_evidence_set");
  assert.deepEqual(businessOutput.result.confirmation_roles, ["issuer_confirmation"]);
});

test("news sentiment runner surfaces missing provider data", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qveris-news-missing-"));
  const output = path.join(dir, "report.md");
  const jsonOutput = path.join(dir, "business-output.json");
  const trace = path.join(dir, "trace.json");
  await runFixture("missing-data-news-sentiment.json", output, jsonOutput, trace);
  const report = readFileSync(output, "utf8");
  const businessOutput = JSON.parse(readFileSync(jsonOutput, "utf8"));
  const traceJson = JSON.parse(readFileSync(trace, "utf8"));
  const schema = JSON.parse(readFileSync(path.join(skillRoot, "schemas/output.schema.json"), "utf8"));
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

test("news sentiment runner records skipped calls when paid-call budget is exhausted", async () => {
  const result = await executePlan(
    config,
    { ...defaults, tickers: ["AAPL", "MSFT"], maxPaidCalls: 0, maxCredits: 999 },
    {
      categories: {
        news_sentiment: {
          inspected: [
            { tool_id: "alphavantage.news_sentiment.query.v1.467a92c0", expected_cost: 2 },
            { tool_id: "eodhd.sentiments.list.v1.9ba159a0", expected_cost: 2 },
          ],
          discovered: [],
        },
        market_reaction: {
          inspected: [{ tool_id: "finnhub_io_api.stock.quote", expected_cost: 1 }],
          discovered: [],
        },
        filings: {
          inspected: [{ tool_id: "finnhub.stock.filings.retrieve.v1", expected_cost: 1 }],
          discovered: [],
        },
        issuer_confirmation: {
          inspected: [{ tool_id: "eodhd.news.retrieve.v1.fe8bf94c", expected_cost: 2 }],
          discovered: [],
        },
      },
    },
  );
  assert.equal(result.calls.length, 0);
  assert.ok(result.trace.length > 0);
  assert.ok(result.trace.every((row) => row.type === "call_skipped" && row.reason === "paid call budget exhausted"));
  assert.ok(result.trace.some((row) => row.target === "AAPL"));
  assert.ok(result.trace.some((row) => row.target === "MSFT"));
});

test("news issuer confirmation does not fall back to schema-incompatible filings tools", async () => {
  const issuerPlan = config.callPlan.find((plan) => plan.role === "issuer_confirmation");
  const result = await executePlan(
    { callPlan: [issuerPlan] },
    { ...defaults, ticker: "NVDA", maxPaidCalls: 1, maxCredits: 1 },
    {
      categories: {
        issuer_confirmation: {
          inspected: [
            { tool_id: "financialmodelingprep.stable.secfilingscompanysearch.symbol.retrieve.v1.5cf7397d", expected_cost: 1 },
            { tool_id: "alphavantage.news_sentiment.query.v1.467a92c0", expected_cost: 2 },
          ],
          discovered: [],
        },
      },
    },
  );
  assert.equal(result.calls.length, 0);
  assert.equal(result.trace[0].type, "call_skipped");
  assert.equal(result.trace[0].tool_id, "alphavantage.news_sentiment.query.v1.467a92c0");
  assert.notEqual(result.trace[0].tool_id, "financialmodelingprep.stable.secfilingscompanysearch.symbol.retrieve.v1.5cf7397d");
});
