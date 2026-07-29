#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const COMPLETE = "complete_comparable";

export function validateFactorScreenContract(contract) {
  const violations = [];
  const add = (severity, code, path, message) => violations.push({ severity, code, path, message });

  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    return result([{ severity: "reject", code: "invalid_contract", path: "$", message: "contract must be an object" }], false, []);
  }

  const asOf = parseDate(contract.as_of);
  const cutoff = parseDate(contract.cutoff);
  if (asOf === null) add("reject", "missing_as_of", "$.as_of", "as_of must be a valid timestamp");
  if (cutoff === null) add("reject", "missing_cutoff", "$.cutoff", "cutoff must be a valid timestamp");
  if (asOf !== null && cutoff !== null && cutoff > asOf && contract.post_hoc_enabled !== true) {
    add("reject", "cutoff_after_as_of", "$.cutoff", "cutoff cannot be later than as_of unless post_hoc_enabled=true");
  }

  const securities = Array.isArray(contract.securities) ? contract.securities : [];
  if (securities.length === 0) add("degrade", "empty_universe", "$.securities", "no validated securities are available");
  const bySecurity = new Map();

  securities.forEach((security, index) => {
    const path = `$.securities[${index}]`;
    const name = String(security?.security ?? "").trim();
    if (!name) add("reject", "missing_security", `${path}.security`, "security is required");
    else bySecurity.set(name, security);

    const identity = security?.identity;
    const proof = Array.isArray(identity?.proof) ? identity.proof.map(normalize) : [];
    if (identity?.status !== "matched") {
      add("reject", "semantic_entity_mismatch", `${path}.identity.status`, "entity-scoped factor evidence requires matched identity");
    } else if (!proof.some((field) => ["symbol", "code", "issuer_name"].includes(field))) {
      add("reject", "semantic_entity_missing", `${path}.identity.proof`, "identity proof must include returned symbol/code or matched issuer_name");
    }

    const observations = Array.isArray(security?.observations) ? security.observations : [];
    observations.forEach((observation, observationIndex) => {
      const observed = parseDate(observation?.date);
      const observationPath = `${path}.observations[${observationIndex}].date`;
      if (observed === null) {
        add("reject", "missing_date_proof", observationPath, "observation date is missing or invalid");
        return;
      }
      if (cutoff !== null && observed > cutoff) {
        add("reject", "semantic_future_data", observationPath, "observation is later than cutoff");
      }
      if (observation?.phase !== "post_hoc" && asOf !== null && observed > asOf) {
        add("reject", "screen_lookahead", observationPath, "screen observation is later than as_of");
      }
    });

    validateBars(security?.bars, path, add);
    const financialPeriods = Array.isArray(security?.financial_periods) ? security.financial_periods : [];
    financialPeriods.forEach((period, periodIndex) => validateFinancialPeriod(period, `${path}.financial_periods[${periodIndex}]`, add));
  });

  const rankingStructurallyAllowed = validateRanking(contract.ranking, bySecurity, add);
  validateSentiment(contract.sentiment, add);
  const securityDecisions = securities.map((security, index) => {
    const prefix = `$.securities[${index}]`;
    const relevant = violations.filter(({ path }) => path === prefix || path.startsWith(`${prefix}.`));
    const status = relevant.some(({ severity }) => severity === "reject")
      ? "rejected"
      : relevant.some(({ severity }) => severity === "degrade") ? "degraded" : "accepted";
    return {
      security: String(security?.security ?? ""),
      status,
      violation_codes: [...new Set(relevant.map(({ code }) => code))],
    };
  });
  const rankedMembers = new Set(Array.isArray(contract.ranking?.members) ? contract.ranking.members.map(String) : []);
  const rankedSecurityBlocked = securityDecisions.some(({ security, status }) => rankedMembers.has(security) && status !== "accepted");
  const rankingBlocked = violations.some(({ severity, code }) => severity === "reject" && !code.startsWith("sentiment_"));
  return result(violations, rankingStructurallyAllowed && !rankingBlocked && !rankedSecurityBlocked, securityDecisions);
}

function validateBars(bars, path, add) {
  if (bars == null) return;
  const count = integer(bars.observation_count);
  const intervals = integer(bars.return_interval_count);
  const lookback = integer(bars.lookback_intervals);
  if (count === null || count < 0) {
    add("reject", "invalid_observation_count", `${path}.bars.observation_count`, "observation_count must be a non-negative integer");
    return;
  }
  const expectedIntervals = Math.max(0, count - 1);
  if (intervals !== expectedIntervals) {
    add("reject", "return_interval_mismatch", `${path}.bars.return_interval_count`, `${count} price observations produce exactly ${expectedIntervals} adjacent return intervals`);
  }
  if (lookback !== null && count < lookback + 1) {
    add("degrade", "insufficient_lookback_observations", `${path}.bars`, `${lookback} return intervals require at least ${lookback + 1} price observations`);
  }
}

function validateFinancialPeriod(period, path, add) {
  const year = integer(period?.requested_fiscal_year);
  const requested = normalize(period?.requested_period).toUpperCase();
  const returned = normalize(period?.returned_fiscal_period).toUpperCase();
  const periodEnd = normalize(period?.returned_period_end);
  const basis = normalize(period?.statement_basis);
  const complete = period?.claimed_complete === true;
  const endYear = /^\d{4}-\d{2}-\d{2}$/.test(periodEnd) ? Number(periodEnd.slice(0, 4)) : null;
  const monthDay = endYear === null ? "" : periodEnd.slice(5);

  if (year === null || !requested) {
    add("reject", "missing_requested_period", path, "requested fiscal year and period are required");
    return;
  }
  const fyProven = requested === "FY"
    && ((returned === "FY" && (endYear === null || endYear === year))
      || (endYear === year && monthDay === "12-31" && basis === "annual"));
  const quarterEnd = { Q1: "03-31", Q2: "06-30", Q3: "09-30", Q4: "12-31" }[requested];
  const fqProven = Boolean(quarterEnd)
    && ((returned === requested && (endYear === null || endYear === year))
      || (endYear === year && monthDay === quarterEnd && basis !== "annual"));
  if (fyProven || fqProven) return;

  const code = quarterEnd ? "fiscal_quarter_unproven" : "fiscal_period_mismatch";
  const message = quarterEnd
    ? `${requested} ${year} is not proven by the returned fiscal label or quarter end`
    : `FY ${year} is not proven by a matching annual label or YYYY-12-31 annual period end`;
  add(complete ? "reject" : "degrade", code, path, message);
}

function validateRanking(ranking, bySecurity, add) {
  if (!ranking || ranking.published !== true) return false;
  const members = Array.isArray(ranking.members) ? ranking.members.map(String) : [];
  const common = normalizedSet(ranking.common_factor_set);
  let allowed = true;
  if (members.length < 3) {
    add("reject", "ranking_too_few_members", "$.ranking.members", "a published rank requires at least 3 comparable securities");
    allowed = false;
  }
  if (common.length === 0) {
    add("reject", "ranking_missing_common_denominator", "$.ranking.common_factor_set", "a published rank requires a non-empty common factor set");
    allowed = false;
  }
  for (const member of members) {
    const security = bySecurity.get(member);
    if (!security) {
      add("reject", "ranking_unknown_member", "$.ranking.members", `rank member ${member} is not in the validated universe`);
      allowed = false;
      continue;
    }
    if (security.coverage_tier !== COMPLETE) {
      add("reject", "ranking_incomplete_member", `$.ranking.members.${member}`, `rank member ${member} is not complete_comparable`);
      allowed = false;
    }
    if (!sameSet(normalizedSet(security.valid_factor_set), common)) {
      add("reject", "ranking_denominator_mismatch", `$.ranking.members.${member}`, `rank member ${member} does not use the declared common factor set`);
      allowed = false;
    }
  }
  return allowed;
}

function validateSentiment(sentiment, add) {
  if (sentiment == null) return;
  const count = integer(sentiment.independent_source_count) ?? 0;
  const status = normalize(sentiment.status);
  const scope = normalize(sentiment.scope);
  if (["market", "market_wide", "universe", "overall"].includes(scope)) {
    add("reject", "sentiment_scope_overreach", "$.sentiment.scope", "issuer-news samples cannot support market-wide or universe-wide sentiment");
  }
  if (count < 2 && status !== "insufficient") {
    add("reject", "sentiment_sample_too_small", "$.sentiment.status", "fewer than 2 independent accepted sources requires sentiment=insufficient");
  } else if (count < 2) {
    add("degrade", "sentiment_insufficient", "$.sentiment", "describe only the retrieved sample and do not emit a directional sentiment conclusion");
  }
}

function result(violations, rankingAllowed, securityDecisions) {
  const rejected = violations.some((item) => item.severity === "reject");
  const degraded = violations.some((item) => item.severity === "degrade");
  return {
    contract_version: "qveris.a-share-factor-screen.validity.v1",
    status: rejected ? "rejected" : degraded ? "degraded" : "accepted",
    ranking_allowed: rankingAllowed,
    security_decisions: securityDecisions,
    violations,
  };
}

function parseDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function integer(value) {
  return Number.isInteger(value) ? value : null;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizedSet(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(normalize).filter(Boolean))].sort();
}

function sameSet(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function main(argv) {
  const jsonIndex = argv.indexOf("--json");
  const inputIndex = argv.indexOf("--input");
  let raw;
  if (jsonIndex >= 0) raw = argv[jsonIndex + 1];
  else if (inputIndex >= 0) raw = await readFile(argv[inputIndex + 1], "utf8");
  else throw new Error("usage: factor_screen_validity.mjs --json '<contract-json>' | --input <path>");
  if (raw === undefined) throw new Error("missing contract JSON");
  const output = validateFactorScreenContract(JSON.parse(raw));
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (output.status === "rejected") process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  });
}
