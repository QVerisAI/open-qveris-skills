import test from "node:test";
import assert from "node:assert/strict";

import { adaptDirectParameters } from "../scripts/qveris_direct_runtime.mjs";
import { buildDirectLiveE2ePlan, filterDirectLiveE2ePlan, mergeSelectedToolSchema } from "../../scripts/run_qveris_finance_direct_live_e2e.mjs";

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
  assert.match(plan.cases[1].query, /codes startdate enddate interval and cps/);
  assert.equal(plan.cases[1].search_limit, 20);
  assert.equal(plan.cases[1].params.indicators, "close,volume");
  assert.equal(plan.cases[1].estimate.expectedBillableQuantity, 4_050);
  assert.equal(plan.cases[1].max_response_size, 150_000);
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
