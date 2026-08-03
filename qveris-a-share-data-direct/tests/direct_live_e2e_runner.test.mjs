import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { adaptDirectParameters } from "../scripts/qveris_direct_runtime.mjs";
import { buildDirectLiveE2ePlan, filterDirectLiveE2ePlan, mergeSelectedToolSchema } from "../../scripts/run_qveris_finance_direct_live_e2e.mjs";

const runnerPath = fileURLToPath(new URL("../../scripts/run_qveris_finance_direct_live_e2e.mjs", import.meta.url));

async function runMockedLiveCase({ executeData, seedOutputDir } = {}) {
  const outputDir = seedOutputDir ?? await mkdtemp(join(tmpdir(), "qveris-direct-runner-"));
  const mockFetch = `globalThis.fetch=async(url)=>{const path=new URL(url).pathname;let body;if(path.endsWith("/search"))body={search_id:"search-1",results:[{tool_id:"historicalpriceeod.dividendadjusted",description:"A-share adjusted bars"}]};else if(path.endsWith("/tools/by-ids"))body={results:[{tool_id:"historicalpriceeod.dividendadjusted",input_schema:{required:["symbol"],properties:{symbol:{type:"string"},start_date:{type:"string"},end_date:{type:"string"}}}}]};else body={result:{status_code:200,data:${JSON.stringify(executeData ?? [])}},billing:{list_amount_credits:0}};return new Response(JSON.stringify(body),{status:200,headers:{"content-type":"application/json"}})}`;
  const result = spawnSync(process.execPath, [
    runnerPath,
    "--only", "a-share-adjusted-bars",
    "--date", "2026-08-03",
    "--output-dir", outputDir,
  ], {
    encoding: "utf8",
    env: {
      ...process.env,
      QVERIS_API_KEY: "test",
      QVERIS_PROXY_REEXEC: "1",
      NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(mockFetch)}`,
    },
  });
  const summary = JSON.parse(await readFile(join(outputDir, "summary.json"), "utf8"));
  return { outputDir, result, summary };
}

test("builds one bounded live plan covering all three direct finance skills", () => {
  const plan = buildDirectLiveE2ePlan({ dateTag: "2026-07-31" });
  assert.equal(plan.cases.length, 4);
  assert.deepEqual(
    [...new Set(plan.cases.map((item) => item.skill))].sort(),
    [
      "qveris-a-share-data-direct",
      "qveris-a-share-factor-screen-direct",
      "qveris-alphaear-market-intelligence-direct",
    ],
  );
  assert.deepEqual(plan.cases.map((item) => item.validation.kind), [
    "adjusted_bars",
    "adjusted_bar_groups",
    "quote",
    "records",
  ]);
  assert.equal(plan.budget.max_credits, 120);
  assert.equal(plan.budget.max_calls, 12);
  assert.equal(plan.cases[0].params.end_date, "2026-07-31");
  assert.equal(plan.cases[0].params.start_date, "2026-06-01");
  assert.equal(plan.cases[0].validation.requestedCount, 20);
  assert.match(plan.cases[1].query, /codes startdate enddate interval and cps/);
  assert.equal(plan.cases[1].search_limit, 20);
  assert.equal(plan.cases[1].params.indicators, "close,volume");
  assert.equal(plan.cases[1].estimate.expectedBillableQuantity, 4_050);
  assert.equal(plan.cases[1].max_response_size, 150_000);
  assert.equal(plan.cases[1].validation.requestedCount, 20);
  assert.equal(plan.cases[3].max_response_size, 100_000);
  assert.equal(plan.cases[2].validation.marketSession.timeZone, "America/New_York");
  assert.ok(plan.cases[2].validation.marketSession.holidays.includes("2026-07-03"));
  assert.ok(plan.cases[2].validation.marketSession.holidays.includes("2026-11-26"));
  assert.equal(JSON.stringify(plan).includes("QVERIS_API_KEY"), false);
});

test("preserves discovery symbol conventions when inspection returns a generic parameter description", () => {
  const schema = mergeSelectedToolSchema(
    [{ name: "symbol", type: "string", required: true, description: "query parameter: symbol" }],
    {
      description: "Use FMP exchange suffixes: Shanghai uses .SS (for example 600519.SS); .SH is not supported.",
      examples: { sample_parameters: { symbol: "AAPL" } },
    },
  );
  const adapted = adaptDirectParameters({ parameters: { symbol: "600519.SH" }, schema });
  assert.equal(adapted.final_parameters.symbol, "600519.SS");
});

test("can rerun only failed live cases without repeating a successful paid case", () => {
  const plan = filterDirectLiveE2ePlan(buildDirectLiveE2ePlan({ dateTag: "2026-07-31" }), "a-share-factor-batch-bars,tsla-quote");
  assert.deepEqual(plan.cases.map((item) => item.case_id), ["a-share-factor-batch-bars", "tsla-quote"]);
  assert.throws(() => filterDirectLiveE2ePlan(plan, "unknown-case"), /Unknown direct live E2E case/);
});

test("exits nonzero when semantic validation rejects a live case", async () => {
  const run = await runMockedLiveCase({ executeData: [] });
  try {
    assert.equal(run.summary.results[0].status, "rejected");
    assert.notEqual(run.result.status, 0, run.result.stdout);
  } finally {
    await rm(run.outputDir, { recursive: true, force: true });
  }
});

test("does not pass a sixty-day historical-bars case with only one observation", async () => {
  const run = await runMockedLiveCase({
    executeData: [{ symbol: "600519.SH", date: "2026-08-01", adj_close: 100 }],
  });
  try {
    assert.equal(run.summary.results[0].status, "rejected");
    assert.notEqual(run.result.status, 0, run.result.stdout);
  } finally {
    await rm(run.outputDir, { recursive: true, force: true });
  }
});

test("selective reruns include every prior case artifact in the output-directory budget", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "qveris-direct-runner-budget-"));
  await writeFile(join(outputDir, "tsla-quote-observed_calls.json"), JSON.stringify({
    artifact_version: "observed_calls.v1",
    observed_calls: [{ request_kind: "tools/execute", usage: { credits: 119, rows: 0, billable_quantity: 0 } }],
  }));
  const run = await runMockedLiveCase({
    seedOutputDir: outputDir,
    executeData: [{ symbol: "600519.SH", date: "2026-08-01", adj_close: 100 }],
  });
  try {
    assert.equal(run.summary.usage.credits, 119);
    assert.notEqual(run.result.status, 0, "the remaining one-credit budget cannot admit a 30-credit case");
  } finally {
    await rm(run.outputDir, { recursive: true, force: true });
  }
});
