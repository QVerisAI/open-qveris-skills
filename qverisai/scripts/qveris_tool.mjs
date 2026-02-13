#!/usr/bin/env node
/**
 * QVeris Tool Search & Execution CLI
 *
 * Search for tools by capability and execute them via QVeris API.
 * Uses only Node.js built-in APIs (fetch) — zero external dependencies.
 *
 * Usage:
 *   node scripts/qveris_tool.mjs search "weather forecast"
 *   node scripts/qveris_tool.mjs execute <tool_id> --search-id <id> --params '{"city": "London"}'
 */

const BASE_URL = "https://qveris.ai/api/v1";

function getApiKey() {
  const key = process.env.QVERIS_API_KEY;
  if (!key) {
    console.error("Error: QVERIS_API_KEY environment variable not set");
    console.error("Get your API key at https://qveris.ai");
    process.exit(1);
  }
  return key;
}

async function searchTools(query, limit = 10, timeoutMs = 30000) {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`HTTP Error: ${response.status}`);
      console.error(text);
      process.exit(1);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function executeTool(toolId, searchId, parameters, maxResponseSize = 20480, timeoutMs = 60000) {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(`${BASE_URL}/tools/execute`);
    url.searchParams.set("tool_id", toolId);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        search_id: searchId,
        parameters,
        max_response_size: maxResponseSize,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`HTTP Error: ${response.status}`);
      console.error(text);
      process.exit(1);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function displaySearchResults(result) {
  const searchId = result.search_id ?? "N/A";
  const tools = result.results ?? [];
  const total = result.total ?? tools.length;

  console.log(`\nSearch ID: ${searchId}`);
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

function displayExecutionResult(result) {
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
  if (Object.keys(data).length > 0) {
    console.log("\nResult:");
    console.log(JSON.stringify(data, null, 2));
  }
}

function printUsage() {
  console.log(`QVeris Tool Search & Execution CLI

Usage:
  node scripts/qveris_tool.mjs search <query> [options]
  node scripts/qveris_tool.mjs execute <tool_id> --search-id <id> [options]

Commands:
  search <query>     Search for tools matching a capability description
  execute <tool_id>  Execute a specific tool with parameters

Options:
  --limit N          Max results for search (default: 10)
  --search-id ID     Search ID from previous search (required for execute)
  --params JSON      Tool parameters as JSON string (default: "{}")
  --max-size N       Max response size in bytes (default: 20480)
  --timeout N        Request timeout in seconds (default: 30 for search, 60 for execute)
  --json             Output raw JSON instead of formatted display
  --help             Show this help message

Examples:
  node scripts/qveris_tool.mjs search "weather forecast API"
  node scripts/qveris_tool.mjs execute openweathermap_current_weather --search-id abc123 --params '{"city": "London"}'`);
}

function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const command = args[0];
  const parsed = { command, json: false };

  if (command === "search") {
    if (args.length < 2) {
      console.error("Error: search command requires a query argument");
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
  } else if (command === "execute") {
    if (args.length < 2) {
      console.error("Error: execute command requires a tool_id argument");
      process.exit(1);
    }
    parsed.toolId = args[1];
    parsed.searchId = null;
    parsed.params = "{}";
    parsed.maxSize = 20480;
    parsed.timeout = 60;

    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--search-id" && i + 1 < args.length) {
        parsed.searchId = args[++i];
      } else if (args[i] === "--params" && i + 1 < args.length) {
        parsed.params = args[++i];
      } else if (args[i] === "--max-size" && i + 1 < args.length) {
        parsed.maxSize = parseInt(args[++i], 10);
      } else if (args[i] === "--timeout" && i + 1 < args.length) {
        parsed.timeout = parseInt(args[++i], 10);
      } else if (args[i] === "--json") {
        parsed.json = true;
      }
    }

    if (!parsed.searchId) {
      console.error("Error: --search-id is required for execute command");
      process.exit(1);
    }
  } else {
    console.error(`Error: unknown command '${command}'. Use 'search' or 'execute'.`);
    process.exit(1);
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv);

  try {
    if (args.command === "search") {
      const result = await searchTools(args.query, args.limit, args.timeout * 1000);
      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displaySearchResults(result);
      }
    } else if (args.command === "execute") {
      let params;
      try {
        params = JSON.parse(args.params);
      } catch (e) {
        console.error(`Invalid JSON in --params: ${e.message}`);
        process.exit(1);
      }
      const result = await executeTool(args.toolId, args.searchId, params, args.maxSize, args.timeout * 1000);
      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displayExecutionResult(result);
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
