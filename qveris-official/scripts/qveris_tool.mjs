#!/usr/bin/env node
/**
 * QVeris Capability Discovery & Tool Calling CLI
 *
 * Discover tools by capability and call them through QVeris.
 * Uses local modules and built-in Node.js web APIs only.
 *
 * SECURITY MANIFEST:
 *   Credential used: QVERIS_API_KEY (only)
 *   External endpoint: https://qveris.ai/api/v1 (only)
 *   Local file reads: none
 *   Local file writes: none
 *
 * Usage:
 *   node scripts/qveris_tool.mjs discover "weather forecast"
 *   node scripts/qveris_tool.mjs call <tool_id> --discovery-id <id> --param city=London
 *   node scripts/qveris_tool.mjs inspect <tool_id1> [tool_id2 ...]
 */

import { readQverisApiKey } from "./qveris_env.mjs";
import * as qverisClient from "./qveris_client.mjs";
import {
  executeFinanceCapability,
  inspectFinanceCapability,
} from "./qveris_finance_adapter.mjs";
import {
  isLikelyLegacyFinanceRouteIdentifier,
  sanitizeProviderRouteMetadata,
} from "./qveris_sanitize.mjs";

const {
  callTool,
  discoverTools,
  getBaseUrl,
  inspectToolsByIds,
  listCapabilities,
  searchCapabilities,
} = qverisClient;

function parseParamValue(rawValue) {
  const value = String(rawValue ?? "");
  if (value === "") {
    return "";
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseParamOverride(rawAssignment) {
  const assignment = String(rawAssignment ?? "");
  const separatorIndex = assignment.indexOf("=");
  if (separatorIndex <= 0) {
    throw new Error(`Invalid --param '${assignment}'. Use KEY=VALUE, for example --param symbol=AAPL.`);
  }
  const key = assignment.slice(0, separatorIndex).trim();
  if (!key) {
    throw new Error(`Invalid --param '${assignment}'. Parameter key must not be empty.`);
  }
  return [key, parseParamValue(assignment.slice(separatorIndex + 1))];
}

function parseCommandParams(paramsJson, paramOverrides) {
  let params;
  try {
    params = JSON.parse(paramsJson);
  } catch (e) {
    throw new Error(`Invalid JSON in --params: ${e.message}`);
  }

  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new Error("--params must decode to a JSON object.");
  }

  for (const override of paramOverrides ?? []) {
    const [key, value] = parseParamOverride(override);
    params[key] = value;
  }
  return params;
}

function readParamArg(args, index) {
  if (index + 1 >= args.length) {
    console.error("Error: --param requires KEY=VALUE or KEY VALUE");
    process.exit(1);
  }
  const first = args[index + 1];
  if (first.includes("=")) {
    return { assignment: first, nextIndex: index + 1 };
  }
  if (index + 2 >= args.length || args[index + 2].startsWith("--")) {
    console.error("Error: --param KEY requires a VALUE");
    process.exit(1);
  }
  return { assignment: `${first}=${args[index + 2]}`, nextIndex: index + 2 };
}

function normalizeLegacyArgs(rawArgs) {
  const args = [...rawArgs];
  const warnings = new Set();
  const commandAliases = {
    search: "discover",
    execute: "call",
    invoke: "call",
    "get-by-ids": "inspect",
    "list-capabilities": "cap-list",
    "search-capabilities": "cap-search",
    "capability-search": "cap-search",
    "capability-detail": "cap-detail",
    "get-capability": "cap-detail",
    "query-capability": "cap-query",
    "capability-query": "cap-query",
    "cap-call": "cap-query",
  };

  if (args.length > 0 && commandAliases[args[0]]) {
    warnings.add(`'${args[0]}' is deprecated; use '${commandAliases[args[0]]}' instead.`);
    args[0] = commandAliases[args[0]];
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--search-id") {
      warnings.add("'--search-id' is deprecated; use '--discovery-id' instead.");
      args[i] = "--discovery-id";
    }
  }

  return { args, warnings: [...warnings] };
}

function displayDiscoveryResults(result) {
  const discoveryId = result.search_id ?? "N/A";
  const tools = result.results ?? [];
  const total = result.total ?? tools.length;

  console.log(`\nDiscovery ID: ${discoveryId}`);
  console.log(`Found ${total} tools\n`);

  if (tools.length === 0) {
    console.log("No tools found.");
    return;
  }

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const toolId = tool.tool_id ?? "N/A";
    const name = tool.name ?? "N/A";
    const desc = tool.description ?? "N/A";

    const stats = tool.stats ?? {};
    let successRate = stats.success_rate ?? "N/A";
    let avgTime = stats.avg_execution_time_ms ?? "N/A";

    if (typeof successRate === "number") {
      successRate = `${Math.round(successRate * 100)}%`;
    }
    if (typeof avgTime === "number") {
      avgTime = `${avgTime.toFixed(1)}ms`;
    }

    console.log(`[${i + 1}] ${name}`);
    console.log(`    ID: ${toolId}`);
    console.log(`    ${desc.length > 100 ? desc.slice(0, 100) + "..." : desc}`);
    console.log(`    Success: ${successRate} | Avg Time: ${avgTime}`);

    const params = tool.params ?? [];
    if (params.length > 0) {
      const required = params.filter((p) => p.required).map((p) => p.name);
      const optional = params.filter((p) => !p.required).map((p) => p.name);
      if (required.length > 0) {
        console.log(`    Required: ${required.join(", ")}`);
      }
      if (optional.length > 0) {
        const shown = optional.slice(0, 5).join(", ");
        console.log(`    Optional: ${shown}${optional.length > 5 ? "..." : ""}`);
      }
    }

    const examples = tool.examples ?? {};
    if (examples.sample_parameters) {
      console.log(`    Example: ${JSON.stringify(examples.sample_parameters)}`);
    }

    console.log();
  }
}

function displayCallResult(result) {
  const success = result.success ?? false;
  const execTime = result.elapsed_time_ms ?? "N/A";
  const cost = result.cost ?? 0;

  console.log(`\n${success ? "Success" : "Failed"}`);
  console.log(`Time: ${execTime}ms | Cost: ${cost}`);

  if (!success) {
    const error = result.error_message ?? "Unknown error";
    console.log(`Error: ${error}`);
  }

  const data = result.result ?? {};
  const fullContentUrl = typeof data.full_content_file_url === "string" ? data.full_content_file_url : null;

  if (fullContentUrl) {
    console.log("\nLarge result notice:");
    console.log("  The inline payload may be incomplete.");
    console.log(`  Full content URL: ${fullContentUrl}`);
    console.log("  Use a separate approved retrieval path if your environment has one.");
    const { truncated_content, full_content_file_url, ...displayData } = data;
    if (Object.keys(displayData).length > 0) {
      console.log("\nResult (truncated_content omitted — use the URL above for complete data):");
      console.log(JSON.stringify(displayData, null, 2));
    }
  } else if (Object.keys(data).length > 0) {
    console.log("\nResult:");
    console.log(JSON.stringify(data, null, 2));
  }
}

function displayCapabilityResults(result) {
  const searchId = result.search_id ?? "N/A";
  const capabilities = result.results ?? [];
  const total = result.total ?? capabilities.length;

  if (result.search_id) {
    console.log(`\nSearch ID: ${searchId}`);
  }
  console.log(`Found ${total} capabilities\n`);

  if (capabilities.length === 0) {
    console.log("No capabilities found.");
    return;
  }

  for (let i = 0; i < capabilities.length; i++) {
    const cap = capabilities[i];
    const capabilityId = cap.capability_id ?? "N/A";
    const name = cap.name_en ?? cap.name ?? "N/A";
    const desc = cap.description ?? "N/A";

    console.log(`[${i + 1}] ${name}`);
    console.log(`    Capability ID: ${capabilityId}`);
    console.log(`    ${desc.length > 100 ? desc.slice(0, 100) + "..." : desc}`);

    const params = cap.params ?? [];
    if (params.length > 0) {
      const required = params.filter((p) => p.required).map((p) => p.name);
      const optional = params.filter((p) => !p.required).map((p) => p.name);
      if (required.length > 0) {
        console.log(`    Required: ${required.join(", ")}`);
      }
      if (optional.length > 0) {
        const shown = optional.slice(0, 5).join(", ");
        console.log(`    Optional: ${shown}${optional.length > 5 ? "..." : ""}`);
      }
    }

    const examples = cap.examples ?? {};
    if (examples.sample_parameters) {
      console.log(`    Example: ${JSON.stringify(examples.sample_parameters)}`);
    }

    if (typeof cap.relevance_score === "number") {
      console.log(`    Relevance: ${cap.relevance_score.toFixed(3)}`);
    }

    console.log();
  }
}

function displayCapabilityDetail(result) {
  const capabilityId = result.capability_id ?? "N/A";
  const name = result.name_en ?? result.name ?? "N/A";
  const desc = result.description ?? "N/A";

  console.log(`\n${name}`);
  console.log(`Capability ID: ${capabilityId}`);
  if (result.detail_source) {
    console.log(`Detail source: ${result.detail_source}`);
  }
  if (result.detail_warning) {
    console.log(`Detail warning: ${result.detail_warning}`);
  }
  console.log(desc);

  const params = result.params ?? [];
  if (params.length > 0) {
    console.log("\nParameters:");
    for (const param of params) {
      const required = param.required ? "required" : "optional";
      const type = param.type ?? "unknown";
      const description = param.description ? ` - ${param.description}` : "";
      console.log(`  - ${param.name} (${type}, ${required})${description}`);
    }
  }

  const rawFieldSpec = result.field_spec ?? [];
  const fieldSpec = Array.isArray(rawFieldSpec)
    ? rawFieldSpec
    : [...(rawFieldSpec.required ?? []), ...(rawFieldSpec.optional ?? [])];
  if (fieldSpec.length > 0) {
    console.log("\nFields:");
    for (const field of fieldSpec.slice(0, 30)) {
      const type = field.type ? ` (${field.type})` : "";
      console.log(`  - ${field.name}${type}`);
    }
    if (fieldSpec.length > 30) {
      console.log(`  ... ${fieldSpec.length - 30} more fields`);
    }
  }

  if (result.examples?.sample_parameters) {
    console.log("\nExample parameters:");
    console.log(JSON.stringify(result.examples.sample_parameters, null, 2));
  }
}

function displayCapabilityQueryResult(result) {
  const success = result.success ?? false;
  const execTime = result.elapsed_time_ms ?? "N/A";
  const cost = result.cost ?? 0;
  const capabilityId = result.capability_id ?? "N/A";

  console.log(`\n${success ? "Success" : "Failed"}`);
  console.log(`Capability ID: ${capabilityId}`);
  console.log(`Time: ${execTime}ms | Cost: ${cost}`);

  if (!success) {
    const error = result.error_message ?? result.error ?? "Unknown error";
    console.log(`Error: ${error}`);
  }

  if (result.data !== undefined) {
    console.log("\nData:");
    console.log(JSON.stringify(sanitizeProviderRouteMetadata(result.data), null, 2));
  } else if (result.result !== undefined) {
    console.log("\nResult:");
    console.log(JSON.stringify(sanitizeProviderRouteMetadata(result.result), null, 2));
  }

  if (result._meta) {
    console.log("\nMetadata (provider route fields omitted; use --json for raw metadata):");
    console.log(JSON.stringify(sanitizeProviderRouteMetadata(result._meta), null, 2));
  }
}

function displayFinanceAdapterResult(execution) {
  const resolution = execution.resolution ?? {};
  console.log("\nFinance CAP adapter");
  console.log(`Resolved: ${resolution.requested_capability ?? "N/A"} -> ${resolution.capability_id ?? "N/A"}`);
  console.log(`Detail source: ${resolution.detail_source ?? "N/A"}`);
  if (resolution.detail_warning) {
    console.log(`Detail warning: ${resolution.detail_warning}`);
  }
  console.log(`Final params: ${JSON.stringify(execution.final_params ?? {})}`);

  const dropped = execution.parameter_audit?.dropped_params ?? [];
  if (dropped.length > 0) {
    console.log(`Dropped params: ${dropped.map((item) => `${item.name} (${item.reason})`).join(", ")}`);
  }

  displayCapabilityQueryResult(execution.response ?? {});
  console.log("\nTrace (tool_name | params | status | execution_id | fallback_used | missing_fields):");
  for (const row of execution.qveris_trace ?? []) {
    console.log([
      row.tool_name,
      JSON.stringify(row.params),
      row.status,
      row.execution_id ?? "null",
      String(row.fallback_used),
      JSON.stringify(row.missing_fields),
    ].join(" | "));
  }
}

function printUsage() {
  const baseUrl = getBaseUrl();
  console.log(`QVeris Capability Discovery & Tool Calling CLI

Usage:
  node scripts/qveris_tool.mjs cap-list [options]
  node scripts/qveris_tool.mjs cap-search <query> [options]
  node scripts/qveris_tool.mjs cap-detail <capability_id|qveris_finance.name> [options]
  node scripts/qveris_tool.mjs cap-query <capability_id|qveris_finance.name> --param symbol=AAPL [options]
  node scripts/qveris_tool.mjs discover <query> [options]
  node scripts/qveris_tool.mjs call <tool_id> --discovery-id <id> [options]
  node scripts/qveris_tool.mjs inspect <tool_id> [tool_id2 ...] [options]

Commands:
  cap-list                   List standardized capabilities
  cap-search <query>         Search standardized capabilities by keyword/semantics
  cap-detail <id>            Inspect one standardized capability
  cap-query <id>             Execute a standardized capability via /capabilities/query
  discover <query>            Discover tool candidates for a capability description
  call <tool_id>              Call the selected tool through QVeris
  inspect <id> [id2 ...]      Inspect tool details before reuse or calling

Notes:
  cap-query is preferred for qveris_finance.* workflows because it uses capability_id + parameters
  cap-detail/cap-query resolve qveris_finance.* names from the live finance catalog; no static CAP ID map is used
  cap-query filters against live cap-detail, coerces declared types, normalizes A-share symbols, retries one parameter failure with error-guided or minimal params, and records exact final params plus Trace
  discover returns tool candidates and metadata, not final data results
  call returns the execution result
  all requests are routed to ${baseUrl}

Options:
  --domain DOMAIN   Capability domain for cap-list/cap-search (default: finance for cap-search)
  --page N          Page for cap-list (default: 1)
  --page-size N     Page size for cap-list (default: 50)
  --limit N          Max results for discover (default: 10)
  --discovery-id ID  Discovery ID from previous discover (required for call, optional for inspect)
  --search-id ID     Search ID from cap-search for cap-query traceability
  --params JSON      Tool parameters as JSON string (default: "{}")
  --param KEY=VALUE  Repeatable shell-friendly parameter override; values are JSON-parsed when possible
  --strategy NAME    Capability routing strategy: best, cheapest, or balanced (default: best)
  --max-size N       Max response size in bytes (default: 20480)
  --timeout N        Request timeout in seconds (default: 30 for discover/inspect, 60 for call)
  --json             Output JSON instead of formatted display; finance adapter output is always sanitized
  --safe-json        Output JSON with provider route metadata removed
  --help             Show this help message

Examples:
  node scripts/qveris_tool.mjs cap-search "end of day bars" --domain finance
  node scripts/qveris_tool.mjs cap-detail qveris_finance.mkt_bars_eod
  node scripts/qveris_tool.mjs cap-query qveris_finance.mkt_l1_rt --param symbol=AAPL --safe-json
  node scripts/qveris_tool.mjs cap-query MKT.BARS.EOD --param symbol=AAPL --param start_date=2026-01-01 --param end_date=2026-01-03
  node scripts/qveris_tool.mjs discover "weather forecast API"
  node scripts/qveris_tool.mjs call openweathermap.weather.execute.v1 --discovery-id abc123 --param city=London
  node scripts/qveris_tool.mjs inspect openweathermap.weather.execute.v1`);
}

function parseArgs(argv) {
  const normalized = normalizeLegacyArgs(argv.slice(2));
  const args = normalized.args;

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  for (const warning of normalized.warnings) {
    console.error(`Deprecated: ${warning}`);
  }

  const command = args[0];
  const parsed = { command, json: false, safeJson: false };

  if (command === "cap-list") {
    parsed.domain = null;
    parsed.page = 1;
    parsed.pageSize = 50;
    parsed.timeout = 30;

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--domain" && i + 1 < args.length) {
        parsed.domain = args[++i];
      } else if (args[i] === "--page" && i + 1 < args.length) {
        parsed.page = parseInt(args[++i], 10);
      } else if (args[i] === "--page-size" && i + 1 < args.length) {
        parsed.pageSize = parseInt(args[++i], 10);
      } else if (args[i] === "--timeout" && i + 1 < args.length) {
        parsed.timeout = parseInt(args[++i], 10);
      } else if (args[i] === "--json") {
        parsed.json = true;
      } else if (args[i] === "--safe-json") {
        parsed.safeJson = true;
      }
    }
  } else if (command === "cap-search") {
    if (args.length < 2) {
      console.error("Error: cap-search command requires a query argument");
      process.exit(1);
    }
    parsed.query = args[1];
    parsed.domain = "finance";
    parsed.limit = 5;
    parsed.timeout = 30;

    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--domain" && i + 1 < args.length) {
        parsed.domain = args[++i];
      } else if (args[i] === "--limit" && i + 1 < args.length) {
        parsed.limit = parseInt(args[++i], 10);
      } else if (args[i] === "--timeout" && i + 1 < args.length) {
        parsed.timeout = parseInt(args[++i], 10);
      } else if (args[i] === "--json") {
        parsed.json = true;
      } else if (args[i] === "--safe-json") {
        parsed.safeJson = true;
      }
    }
  } else if (command === "cap-detail") {
    if (args.length < 2) {
      console.error("Error: cap-detail command requires a capability_id argument");
      process.exit(1);
    }
    parsed.capabilityId = args[1];
    parsed.timeout = 30;

    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--timeout" && i + 1 < args.length) {
        parsed.timeout = parseInt(args[++i], 10);
      } else if (args[i] === "--json") {
        parsed.json = true;
      } else if (args[i] === "--safe-json") {
        parsed.safeJson = true;
      }
    }
  } else if (command === "cap-query") {
    if (args.length < 2) {
      console.error("Error: cap-query command requires a capability_id argument");
      process.exit(1);
    }
    parsed.capabilityId = args[1];
    parsed.params = "{}";
    parsed.paramOverrides = [];
    parsed.strategy = "best";
    parsed.searchId = null;
    parsed.timeout = 60;

    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--params" && i + 1 < args.length) {
        parsed.params = args[++i];
      } else if (args[i] === "--param") {
        const param = readParamArg(args, i);
        parsed.paramOverrides.push(param.assignment);
        i = param.nextIndex;
      } else if (args[i] === "--strategy" && i + 1 < args.length) {
        parsed.strategy = args[++i];
      } else if (args[i] === "--search-id" && i + 1 < args.length) {
        parsed.searchId = args[++i];
      } else if (args[i] === "--timeout" && i + 1 < args.length) {
        parsed.timeout = parseInt(args[++i], 10);
      } else if (args[i] === "--json") {
        parsed.json = true;
      } else if (args[i] === "--safe-json") {
        parsed.safeJson = true;
      }
    }
  } else if (command === "discover") {
    if (args.length < 2) {
      console.error("Error: discover command requires a query argument");
      process.exit(1);
    }
    parsed.query = args[1];
    parsed.limit = 10;
    parsed.timeout = 30;

    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--limit" && i + 1 < args.length) {
        parsed.limit = parseInt(args[++i], 10);
      } else if (args[i] === "--timeout" && i + 1 < args.length) {
        parsed.timeout = parseInt(args[++i], 10);
      } else if (args[i] === "--json") {
        parsed.json = true;
      }
    }
  } else if (command === "call") {
    if (args.length < 2) {
      console.error("Error: call command requires a tool_id argument");
      process.exit(1);
    }
    parsed.toolId = args[1];
    parsed.discoveryId = null;
    parsed.params = "{}";
    parsed.paramOverrides = [];
    parsed.maxSize = 20480;
    parsed.timeout = 60;

    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--discovery-id" && i + 1 < args.length) {
        parsed.discoveryId = args[++i];
      } else if (args[i] === "--params" && i + 1 < args.length) {
        parsed.params = args[++i];
      } else if (args[i] === "--param") {
        const param = readParamArg(args, i);
        parsed.paramOverrides.push(param.assignment);
        i = param.nextIndex;
      } else if (args[i] === "--max-size" && i + 1 < args.length) {
        parsed.maxSize = parseInt(args[++i], 10);
      } else if (args[i] === "--timeout" && i + 1 < args.length) {
        parsed.timeout = parseInt(args[++i], 10);
      } else if (args[i] === "--json") {
        parsed.json = true;
      }
    }

    if (!parsed.discoveryId) {
      console.error("Error: --discovery-id is required for call command");
      process.exit(1);
    }
  } else if (command === "inspect") {
    if (args.length < 2) {
      console.error("Error: inspect command requires at least one tool_id argument");
      process.exit(1);
    }
    parsed.toolIds = [];
    parsed.discoveryId = null;
    parsed.timeout = 30;

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--discovery-id" && i + 1 < args.length) {
        parsed.discoveryId = args[++i];
      } else if (args[i] === "--timeout" && i + 1 < args.length) {
        parsed.timeout = parseInt(args[++i], 10);
      } else if (args[i] === "--json") {
        parsed.json = true;
      } else if (!args[i].startsWith("--")) {
        parsed.toolIds.push(args[i]);
      }
    }

    if (parsed.toolIds.length === 0) {
      console.error("Error: inspect command requires at least one tool_id argument");
      process.exit(1);
    }
  } else {
    console.error(
      `Error: unknown command '${command}'. Use 'cap-list', 'cap-search', 'cap-detail', 'cap-query', 'discover', 'call', or 'inspect'.`,
    );
    process.exit(1);
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv);
  if (
    args.command === "call"
    && isLikelyLegacyFinanceRouteIdentifier(args.toolId)
  ) {
    console.error(
      "Error: legacy raw finance routes are disabled. Use cap-query with a qveris_finance.* alias or canonical CAP ID; if the CAP is unavailable, report capability_unavailable.",
    );
    process.exit(2);
  }
  const apiKey = readQverisApiKey();

  try {
    if (args.command === "cap-list") {
      const result = await listCapabilities({
        apiKey,
        domain: args.domain,
        page: args.page,
        pageSize: args.pageSize,
        timeoutMs: args.timeout * 1000,
      });
      if (args.json || args.safeJson) {
        console.log(JSON.stringify(args.safeJson ? sanitizeProviderRouteMetadata(result) : result, null, 2));
      } else {
        displayCapabilityResults(result);
      }
    } else if (args.command === "cap-search") {
      const result = await searchCapabilities({
        apiKey,
        query: args.query,
        domain: args.domain,
        limit: args.limit,
        timeoutMs: args.timeout * 1000,
      });
      if (args.json || args.safeJson) {
        console.log(JSON.stringify(args.safeJson ? sanitizeProviderRouteMetadata(result) : result, null, 2));
      } else {
        displayCapabilityResults(result);
      }
    } else if (args.command === "cap-detail") {
      const result = await inspectFinanceCapability({
        client: qverisClient,
        apiKey,
        requestedCapability: args.capabilityId,
        timeoutMs: args.timeout * 1000,
      });
      if (args.json || args.safeJson) {
        console.log(JSON.stringify(sanitizeProviderRouteMetadata(result), null, 2));
      } else {
        displayCapabilityDetail(result);
      }
    } else if (args.command === "cap-query") {
      let params;
      try {
        params = parseCommandParams(args.params, args.paramOverrides);
      } catch (e) {
        console.error(e.message);
        process.exit(1);
      }
      const result = await executeFinanceCapability({
        client: qverisClient,
        apiKey,
        requestedCapability: args.capabilityId,
        parameters: params,
        strategy: args.strategy,
        searchId: args.searchId,
        timeoutMs: args.timeout * 1000,
      });
      if (args.safeJson || args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displayFinanceAdapterResult(result);
      }
    } else if (args.command === "discover") {
      const result = await discoverTools({
        apiKey,
        query: args.query,
        limit: args.limit,
        timeoutMs: args.timeout * 1000,
      });
      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displayDiscoveryResults(result);
      }
    } else if (args.command === "call") {
      let params;
      try {
        params = parseCommandParams(args.params, args.paramOverrides);
      } catch (e) {
        console.error(e.message);
        process.exit(1);
      }
      const result = await callTool({
        apiKey,
        toolId: args.toolId,
        discoveryId: args.discoveryId,
        parameters: params,
        maxResponseSize: args.maxSize,
        timeoutMs: args.timeout * 1000,
      });
      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displayCallResult(result);
      }
    } else if (args.command === "inspect") {
      const result = await inspectToolsByIds({
        apiKey,
        toolIds: args.toolIds,
        discoveryId: args.discoveryId,
        timeoutMs: args.timeout * 1000,
      });
      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displayDiscoveryResults(result);
      }
    }
  } catch (e) {
    if (e.name === "AbortError") {
      console.error("Error: Request timed out");
    } else {
      console.error(`Error: ${e.message}`);
    }
    process.exit(1);
  }
}

main();
