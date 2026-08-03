#!/usr/bin/env node
/** Run the three audited direct-finance Skills with one cumulative budget ledger. */

import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { summarizeObservedUsage } from "../qveris-a-share-data-direct/scripts/qveris_direct_runtime.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = join(rootDir, "qveris-a-share-data-direct", "scripts", "qveris_direct_runtime.mjs");

function offsetDate(dateTag, days) {
  const timestamp = Date.parse(`${dateTag}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid date: ${dateTag}`);
  return new Date(timestamp + (days * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

function utcDateTag(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function observedFixedHoliday(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() - 1);
  else if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function nthWeekday(year, month, weekday, occurrence) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCDate(1 + ((7 + weekday - date.getUTCDay()) % 7) + ((occurrence - 1) * 7));
  return date.toISOString().slice(0, 10);
}

function lastWeekday(year, month, weekday) {
  const date = new Date(Date.UTC(year, month, 0));
  date.setUTCDate(date.getUTCDate() - ((7 + date.getUTCDay() - weekday) % 7));
  return date.toISOString().slice(0, 10);
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = ((19 * a) + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + (2 * e) + (2 * i) - h - k) % 7;
  const m = Math.floor((a + (11 * h) + (22 * l)) / 451);
  const month = Math.floor((h + l - (7 * m) + 114) / 31);
  const day = ((h + l - (7 * m) + 114) % 31) + 1;
  return utcDateTag(year, month, day);
}

export function usEquityHolidays(year) {
  const easter = easterSunday(year);
  return [
    observedFixedHoliday(year, 1, 1),
    nthWeekday(year, 1, 1, 3),
    nthWeekday(year, 2, 1, 3),
    offsetDate(easter, -2),
    lastWeekday(year, 5, 1),
    observedFixedHoliday(year, 6, 19),
    observedFixedHoliday(year, 7, 4),
    nthWeekday(year, 9, 1, 1),
    nthWeekday(year, 11, 4, 4),
    observedFixedHoliday(year, 12, 25),
  ].sort();
}

export function buildDirectLiveE2ePlan({ dateTag = new Date().toISOString().slice(0, 10) } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTag)) throw new Error("dateTag must use YYYY-MM-DD");
  const startDate = offsetDate(dateTag, -60);
  const year = Number(dateTag.slice(0, 4));
  const usHolidays = [...new Set([year - 1, year, year + 1].flatMap(usEquityHolidays))].sort();
  return {
    plan_version: "qveris.direct-live-e2e.v1",
    date: dateTag,
    budget: {
      max_calls: 12,
      max_credits: 120,
      max_rows: 1_000,
      max_billable_quantity: 10_000,
    },
    cases: [
      {
        skill: "qveris-a-share-data-direct",
        case_id: "a-share-adjusted-bars",
        query: "China A-share historical daily adjusted price and volume bars by stock code and date range",
        selector: "Dividend Adjusted Price Chart|historicalpriceeod\\.dividendadjusted",
        params: { symbol: "600519.SH", start_date: startDate, end_date: dateTag },
        enum_maps: {},
        estimate: { expectedRows: 45, expectedBillableQuantity: 1, creditsPerUnit: 0, fixedCredits: 30 },
        validation: { kind: "adjusted_bars", expectedSymbol: "600519.SH", startDate, endDate: dateTag, requestedCount: 20, adjustment: "forward" },
      },
      {
        skill: "qveris-a-share-factor-screen-direct",
        case_id: "a-share-factor-batch-bars",
        query: "China A-share historical quotation API for batch security codes using codes startdate enddate interval and cps forward adjustment",
        search_limit: 20,
        selector: "cn_financial_pro\\.history_quotation|history quotation",
        params: {
          symbols: ["600519.SH", "300750.SZ", "002594.SZ"],
          start_date: startDate,
          end_date: dateTag,
          interval: "1d",
          adjustment: "forward",
          indicators: "close,volume",
        },
        enum_maps: { interval: { "1d": "D" }, cps: { forward: "2" } },
        estimate: { expectedRows: 135, expectedBillableQuantity: 4_050, creditsPerUnit: 0, fixedCredits: 6 },
        max_response_size: 150_000,
        validation: {
          kind: "adjusted_bar_groups",
          expectedSymbols: ["600519.SH", "300750.SZ", "002594.SZ"],
          startDate,
          endDate: dateTag,
          requestedCount: 20,
          adjustment: "forward",
        },
      },
      {
        skill: "qveris-alphaear-market-intelligence-direct",
        case_id: "tsla-quote",
        query: "US stock latest quote current price change percent and source timestamp",
        selector: "finnhub_io_api\\.stock\\.quote",
        params: { symbol: "TSLA" },
        enum_maps: {},
        estimate: { expectedRows: 1, expectedBillableQuantity: 1, creditsPerUnit: 0, fixedCredits: 5 },
        validation: {
          kind: "quote",
          expectedSymbol: "TSLA",
          identitySource: "request",
          maxAgeMs: 7 * 24 * 60 * 60 * 1000,
          marketSession: { timeZone: "America/New_York", openTime: "09:30", holidays: usHolidays },
        },
      },
      {
        skill: "qveris-alphaear-market-intelligence-direct",
        case_id: "tsla-income-statement",
        query: "US listed company annual income statement revenue operating income net income and reported currency",
        selector: "alphavantage\\.income_statement\\.retrieve",
        params: { symbol: "TSLA", function: "INCOME_STATEMENT" },
        enum_maps: {},
        estimate: { expectedRows: 1, expectedBillableQuantity: 1, creditsPerUnit: 0, fixedCredits: 5 },
        max_response_size: 100_000,
        validation: {
          kind: "records",
          expectedSymbol: "TSLA",
          expectedCurrency: "USD",
          requiredFields: ["symbol", "annualReports"],
          recordPath: "annualReports",
          minRecords: 1,
        },
      },
    ],
  };
}

export function filterDirectLiveE2ePlan(plan, only = null) {
  if (!only) return plan;
  const requested = [...new Set(String(only).split(",").map((value) => value.trim()).filter(Boolean))];
  const known = new Set(plan.cases.map((testCase) => testCase.case_id));
  const unknown = requested.filter((caseId) => !known.has(caseId));
  if (unknown.length > 0) throw new Error(`Unknown direct live E2E case: ${unknown.join(", ")}`);
  const requestedSet = new Set(requested);
  return { ...plan, cases: plan.cases.filter((testCase) => requestedSet.has(testCase.case_id)) };
}

async function readUsage(artifactPaths) {
  const calls = [];
  for (const artifactPath of new Set(artifactPaths)) {
    try {
      const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
      if (artifact?.artifact_version !== "observed_calls.v1" || !Array.isArray(artifact.observed_calls)) {
        throw new Error(`Invalid observed-call artifact: ${artifactPath}`);
      }
      calls.push(...artifact.observed_calls);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return summarizeObservedUsage(calls);
}

function budgetWithUsage(limits, usage) {
  return {
    ...limits,
    used_calls: usage.calls,
    used_credits: usage.credits,
    used_rows: usage.rows,
    used_billable_quantity: usage.billable_quantity,
  };
}

function runRuntime(args) {
  const result = spawnSync(process.execPath, [runtimePath, ...args], {
    cwd: rootDir,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`Direct runtime failed (${args[0]}): ${result.stderr.trim() || result.stdout.trim()}`);
  }
  return JSON.parse(result.stdout);
}

function selectTool(results, selectorSource, caseId) {
  const selector = new RegExp(selectorSource, "i");
  const selected = (results ?? []).find((item) => selector.test(`${item?.tool_id ?? ""} ${item?.name ?? ""} ${item?.description ?? ""}`));
  if (!selected?.tool_id) throw new Error(`No inspected tool matched ${caseId}`);
  return selected;
}

function descriptionText(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return Object.values(value).filter((item) => typeof item === "string").join(" ");
  return "";
}

export function mergeSelectedToolSchema(schema, selectedTool = {}) {
  const discoveryDescription = descriptionText(selectedTool.description);
  const sampleParameters = selectedTool?.examples?.sample_parameters ?? {};
  const enrich = (name, descriptor = {}) => {
    const identifier = ["symbol", "ticker", "code", "security_code", "symbols", "tickers", "codes", "security_codes"].includes(name);
    if (!identifier) return { ...descriptor };
    const inspectedDescription = descriptionText(descriptor.description);
    const sample = sampleParameters[name];
    return {
      ...descriptor,
      description: [inspectedDescription, discoveryDescription].filter(Boolean).join(" "),
      ...(sample === undefined ? {} : { examples: [...(Array.isArray(descriptor.examples) ? descriptor.examples : []), sample] }),
    };
  };
  if (Array.isArray(schema)) return schema.map((descriptor) => enrich(String(descriptor?.name ?? descriptor?.key ?? ""), descriptor));
  if (schema?.properties && typeof schema.properties === "object") {
    return { ...schema, properties: Object.fromEntries(Object.entries(schema.properties).map(([name, descriptor]) => [name, enrich(name, descriptor)])) };
  }
  return schema;
}

async function runCase(testCase, { limits, artifactPaths, artifactPath }) {
  const common = ["--skill", testCase.skill, "--case-id", testCase.case_id, "--artifact", artifactPath];
  let usage = await readUsage(artifactPaths);
  const search = runRuntime([
    "search", "--query", testCase.query,
    "--limit", String(testCase.search_limit ?? 10),
    "--budget", JSON.stringify(budgetWithUsage(limits, usage)),
    ...common,
  ]);
  if (search.observed_call.status !== "success") throw new Error(`Discovery rejected for ${testCase.case_id}: ${search.observed_call.missing_fields.join(",")}`);
  const selected = selectTool(search.response.results, testCase.selector, testCase.case_id);
  const searchId = search.response.search_id;

  usage = await readUsage(artifactPaths);
  const inspected = runRuntime([
    "inspect", "--tool-id", selected.tool_id, "--search-id", searchId,
    "--budget", JSON.stringify(budgetWithUsage(limits, usage)),
    ...common,
  ]);
  if (inspected.observed_call.status !== "success") throw new Error(`Inspection rejected for ${testCase.case_id}`);
  const descriptor = (inspected.response.results ?? []).find((item) => item.tool_id === selected.tool_id) ?? inspected.response.results?.[0];
  const inspectedSchema = descriptor?.input_schema ?? descriptor?.parameters_schema ?? descriptor?.params;
  if (!inspectedSchema) throw new Error(`Inspected schema missing for ${testCase.case_id}`);
  const schema = mergeSelectedToolSchema(inspectedSchema, selected);

  usage = await readUsage(artifactPaths);
  const executed = runRuntime([
    "execute", "--tool-id", selected.tool_id, "--search-id", searchId,
    "--params", JSON.stringify(testCase.params),
    "--schema", JSON.stringify(schema),
    "--enum-maps", JSON.stringify(testCase.enum_maps),
    "--validation", JSON.stringify(testCase.validation),
    "--estimate", JSON.stringify(testCase.estimate),
    "--budget", JSON.stringify(budgetWithUsage(limits, usage)),
    ...(testCase.max_response_size ? ["--max-response-size", String(testCase.max_response_size)] : []),
    ...common,
  ]);
  return {
    skill: testCase.skill,
    case_id: testCase.case_id,
    status: executed.observed_call.status,
    missing_fields: executed.observed_call.missing_fields,
    tool_id: selected.tool_id,
    search_id: searchId,
    billing: executed.observed_call.billing,
    usage: executed.observed_call.usage,
    artifact: artifactPath,
  };
}

function argValue(argv, flag, fallback = null) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : fallback;
}

async function main(argv = process.argv.slice(2)) {
  const dateTag = argValue(argv, "--date", new Date().toISOString().slice(0, 10));
  const plan = filterDirectLiveE2ePlan(buildDirectLiveE2ePlan({ dateTag }), argValue(argv, "--only"));
  if (argv.includes("--dry-run")) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  if (!process.env.QVERIS_API_KEY) throw new Error("QVERIS_API_KEY environment variable not set");
  const outputDir = resolve(argValue(argv, "--output-dir", join(rootDir, "artifacts", `direct-live-e2e-${dateTag}`)));
  await mkdir(outputDir, { recursive: true });
  const caseArtifactPaths = plan.cases.map((testCase) => join(outputDir, `${testCase.case_id}-observed_calls.json`));
  const priorArtifactPaths = (await readdir(outputDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith("-observed_calls.json"))
    .map((entry) => join(outputDir, entry.name));
  const artifactPaths = [...new Set([...priorArtifactPaths, ...caseArtifactPaths])];
  const results = [];
  for (let index = 0; index < plan.cases.length; index += 1) {
    try {
      const result = await runCase(plan.cases[index], { limits: plan.budget, artifactPaths, artifactPath: caseArtifactPaths[index] });
      results.push(result);
      console.log(`${result.case_id}: ${result.status} (${result.missing_fields.join(",") || "validated"})`);
    } catch (error) {
      const result = {
        skill: plan.cases[index].skill,
        case_id: plan.cases[index].case_id,
        status: "failed",
        missing_fields: ["runner_error"],
        error: error instanceof Error ? error.message : String(error),
        artifact: caseArtifactPaths[index],
      };
      results.push(result);
      console.error(`${result.case_id}: failed (runner_error)`);
    }
  }
  const usage = await readUsage(artifactPaths);
  const summary = { ...plan, recorded_at: new Date().toISOString(), usage, results };
  await writeFile(join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(`summary: ${join(outputDir, "summary.json")}`);
  if (results.some((result) => result.status !== "success")) throw new Error("One or more direct live E2E cases did not pass semantic validation; see summary.json");
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
