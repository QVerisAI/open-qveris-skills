#!/usr/bin/env node

import {
  executeFinanceCapability,
  resolveFinanceCapability,
} from "./qveris_finance_adapter.mjs";
import {
  financeTransport,
  listCapabilities,
  readQverisApiKey,
} from "./qveris_finance_client.mjs";
import { sanitizeProviderRouteMetadata } from "./qveris_sanitize.mjs";

const VERSION = "qveris-business-finance-tool/1.0.0";
const argv = process.argv.slice(2);

if (argv.includes("--version") || argv[0] === "version") {
  console.log(VERSION);
  process.exit(0);
}
if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
  console.log(`Business Skill QVeris finance adapter

Usage:
  qveris_finance_tool.mjs cap-list [--page N] [--page-size N]
  qveris_finance_tool.mjs cap-detail <qveris_finance.name|CAP.ID>
  qveris_finance_tool.mjs cap-query <qveris_finance.name|CAP.ID> [--params JSON] [--param KEY=VALUE] [--context-json JSON]

Every cap-query uses the Skill-owned audited adapter. Raw provider routes are unsupported.`);
  process.exit(0);
}

const command = argv[0];
const apiKey = readQverisApiKey();
const transport = financeTransport(apiKey);

try {
  if (command === "cap-list") {
    output(await listCapabilities({
      apiKey,
      domain: "finance",
      page: integerFlag("--page", 1),
      pageSize: integerFlag("--page-size", 100),
      timeoutMs: integerFlag("--timeout", 30) * 1000,
    }));
  } else if (command === "cap-detail") {
    requireCapability();
    const resolved = await resolveFinanceCapability({
      capability: argv[1],
      transport,
      timeoutMs: integerFlag("--timeout", 30) * 1000,
    });
    output({ ...resolved.detail, canonical_name: resolved.canonical_name, detail_hash: resolved.detail_hash });
  } else if (["cap-query", "call", "query"].includes(command)) {
    requireCapability();
    const result = await executeFinanceCapability({
      capability: argv[1],
      parameters: parametersFromArgs(),
      context: objectFlag("--context-json", {}),
      transport,
      strategy: stringFlag("--strategy", "best"),
      searchId: stringFlag("--search-id", undefined),
      timeoutMs: integerFlag("--timeout", 60) * 1000,
    });
    output(result);
  } else {
    throw new Error(`Unsupported command '${command}'.`);
  }
} catch (error) {
  console.error(`Error: ${error?.message ?? String(error)}`);
  process.exit(1);
}

function requireCapability() {
  if (!argv[1] || argv[1].startsWith("--")) throw new Error(`${command} requires a capability name.`);
}

function parametersFromArgs() {
  const parameters = objectFlag("--params", {});
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] !== "--param") continue;
    const token = argv[++index];
    if (!token) throw new Error("--param requires KEY=VALUE.");
    let name;
    let rawValue;
    if (token.includes("=")) {
      const separator = token.indexOf("=");
      name = token.slice(0, separator);
      rawValue = token.slice(separator + 1);
    } else {
      name = token;
      rawValue = argv[++index];
    }
    if (!name || rawValue === undefined) throw new Error("--param requires KEY=VALUE.");
    try { parameters[name] = JSON.parse(rawValue); } catch { parameters[name] = rawValue; }
  }
  return parameters;
}

function objectFlag(name, fallback) {
  const raw = stringFlag(name, undefined);
  if (raw === undefined) return { ...fallback };
  let value;
  try { value = JSON.parse(raw); } catch (error) { throw new Error(`${name} is invalid JSON: ${error.message}`); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must decode to a JSON object.`);
  return value;
}

function stringFlag(name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] !== undefined ? argv[index + 1] : fallback;
}

function integerFlag(name, fallback) {
  const value = Number(stringFlag(name, fallback));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function output(value) {
  console.log(JSON.stringify(sanitizeProviderRouteMetadata(value), null, 2));
}
