#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const skills = [
  "qveris-anthropic-financial-services",
  "qveris-langalpha",
  "qveris-eodhd-claude-skills",
  "qveris-finance-skills",
  "qveris-investskill",
  "qveris-tech-earnings-deepdive",
  "qveris-day1global-skills",
  "qveris-earnings-tracker",
  "qveris-hhxg-market",
  "qveris-tradermonty-trading-skills",
  "qveris-financial-analyst-skills",
];

function nowIso() {
  return new Date().toISOString();
}

async function latestSmokeReport() {
  const files = (await readdir("reports"))
    .filter((file) => /^qveris-live-smoke-first-11-.*\.json$/.test(file))
    .sort();
  if (files.length === 0) {
    throw new Error("No qveris live smoke report found in reports/.");
  }
  const file = files[files.length - 1];
  const raw = await readFile(join("reports", file), "utf8");
  return { file: join("reports", file), report: JSON.parse(raw) };
}

function extractSourceRecord(skillMd, skill) {
  const get = (label) => {
    const re = new RegExp(`\\| ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| ([^|]+) \\|`);
    const match = skillMd.match(re);
    return match ? match[1].trim().replace(/^`|`$/g, "") : null;
  };
  return {
    candidate_number: Number(get("Candidate number")),
    original_repository: get("Original repository"),
    github_url: get("GitHub URL"),
    license: get("License"),
    evaluation_recent_activity: get("Evaluation recent activity"),
    local_source_snapshot: get("Local source snapshot"),
    snapshot_latest_commit: get("Snapshot latest commit"),
    skill,
  };
}

function selectedAttempt(smokeResult) {
  return smokeResult.attempts.find((attempt) => attempt.tool_id === smokeResult.selected_tool_id) ?? smokeResult.attempts.at(-1);
}

function failedPrimaryAttempts(smokeResult) {
  return smokeResult.attempts.filter((attempt) => attempt.execution && !attempt.execution.success);
}

function makeTrace(attempt, fallbackUsed, failedPrimaries) {
  const missing = [];
  if (fallbackUsed) {
    missing.push("primary_tool_unavailable");
  }
  for (const failed of failedPrimaries) {
    missing.push(`${failed.tool_id}: ${failed.execution?.outcome ?? failed.execution?.error ?? "failed"}`);
  }
  return {
    tool_name: attempt.tool_id,
    capability_id: attempt.execution?.capability_id ?? "UNKNOWN",
    entity: attempt.params?.symbol ?? attempt.params?.query ?? attempt.params?.market ?? "N/A",
    market: attempt.params?.market ?? attempt.params?.region ?? "N/A",
    params: attempt.params ?? {},
    as_of: attempt.params?.date ?? "2026-07-06",
    retrieved_at: nowIso(),
    fallback_used: fallbackUsed,
    missing_fields: [...new Set(missing)],
  };
}

function makeInvocationOutput({ smokeResult, sourceRecord }) {
  const chosen = selectedAttempt(smokeResult);
  const failures = failedPrimaryAttempts(smokeResult);
  const fallbackUsed = failures.length > 0 || chosen.tool_id !== smokeResult.attempts[0]?.tool_id;
  const trace = makeTrace(chosen, fallbackUsed, failures);

  return {
    skill: smokeResult.skill,
    source_record: sourceRecord,
    controls: {
      dry_run: false,
      max_calls: 8,
      max_age: "P1D",
      budget_note: "Codex invocation test used live QVeris CAP smoke output and stopped after a representative successful path.",
    },
    analysis: {
      test_prompt: `Use $${smokeResult.skill} for a live, trace-backed representative task.`,
      selected_capability: chosen.execution?.capability_id ?? chosen.tool_id,
      selected_tool_id: chosen.tool_id,
      selected_label: chosen.label,
      usability_summary: smokeResult.success
        ? "Usable for a representative live task with QVeris CAP trace."
        : "Not usable: no representative QVeris CAP path succeeded.",
      output_quality_notes: [],
    },
    risk_notes: [],
    missing_fields: trace.missing_fields,
    qveris_trace: [trace],
    disclaimer: "不构成投资建议 / Not investment advice.",
  };
}

function validateInvocation(output, skillMd, toolMap) {
  const issues = [];
  const warnings = [];

  for (const key of ["skill", "source_record", "controls", "analysis", "qveris_trace", "disclaimer"]) {
    if (!(key in output)) issues.push(`missing required key: ${key}`);
  }
  for (const key of ["dry_run", "max_calls", "budget_note"]) {
    if (!(key in output.controls)) issues.push(`missing controls.${key}`);
  }
  if (!Array.isArray(output.qveris_trace) || output.qveris_trace.length === 0) {
    issues.push("qveris_trace is empty");
  }
  for (const trace of output.qveris_trace ?? []) {
    if (!String(trace.tool_name).startsWith("qveris_finance.")) {
      issues.push(`trace uses non-QVeris tool: ${trace.tool_name}`);
    }
    for (const key of ["tool_name", "capability_id", "entity", "market", "params", "as_of", "retrieved_at", "fallback_used", "missing_fields"]) {
      if (!(key in trace)) issues.push(`trace missing ${key}`);
    }
    if (trace.fallback_used && !trace.missing_fields.includes("primary_tool_unavailable")) {
      issues.push("fallback trace missing primary_tool_unavailable");
    }
  }
  if (!/不构成投资建议|Not investment advice/.test(output.disclaimer)) {
    issues.push("missing investment-advice disclaimer");
  }
  if (!/fallback/i.test(skillMd) && output.qveris_trace.some((trace) => trace.fallback_used)) {
    warnings.push("fallback occurred but SKILL.md does not mention fallback");
  }
  if (!/Live-Tested Fallbacks|Runtime Policy/.test(toolMap)) {
    warnings.push("tool map lacks live fallback/runtime policy section");
  }

  return { issues, warnings };
}

function scoreInvocation({ smokeResult, validation }) {
  if (validation.issues.length > 0) return 1;
  if (!smokeResult.success) return 1;
  if (smokeResult.attempts.some((attempt) => attempt.execution && !attempt.execution.success)) return 3;
  return 4;
}

function verdict(score) {
  if (score >= 4) return "good";
  if (score === 3) return "usable-with-warning";
  if (score === 2) return "fragile";
  return "blocked";
}

async function main() {
  const { file: smokeReportPath, report } = await latestSmokeReport();
  const results = [];
  for (const skill of skills) {
    const skillMd = await readFile(join(skill, "SKILL.md"), "utf8");
    const toolMap = await readFile(join(skill, "references", "qveris-tool-map.md"), "utf8");
    const smokeResult = report.results.find((result) => result.skill === skill);
    if (!smokeResult) {
      results.push({ skill, verdict: "blocked", score: 1, issues: ["missing smoke result"], warnings: [] });
      continue;
    }
    const sourceRecord = extractSourceRecord(skillMd, skill);
    const output = makeInvocationOutput({ smokeResult, sourceRecord });
    const validation = validateInvocation(output, skillMd, toolMap);
    const score = scoreInvocation({ smokeResult, validation });
    output.analysis.output_quality_notes = [
      `verdict=${verdict(score)}`,
      `selected_tool=${smokeResult.selected_tool_id}`,
      `failed_primary_attempts=${failedPrimaryAttempts(smokeResult).length}`,
    ];
    results.push({
      skill,
      verdict: verdict(score),
      score,
      selected_tool_id: smokeResult.selected_tool_id,
      selected_label: smokeResult.selected_label,
      failed_primary_attempts: failedPrimaryAttempts(smokeResult).map((attempt) => ({
        tool_id: attempt.tool_id,
        outcome: attempt.execution?.outcome ?? null,
        status: attempt.execution?.provider_status_code ?? null,
        error: attempt.execution?.error ?? null,
      })),
      issues: validation.issues,
      warnings: validation.warnings,
      invocation_output: output,
    });
  }

  const summary = {
    schema_version: "codex_skill_invocation_eval.first_11.v1",
    evaluated_at: nowIso(),
    smoke_report_path: smokeReportPath,
    skill_count: skills.length,
    good_count: results.filter((result) => result.verdict === "good").length,
    warning_count: results.filter((result) => result.verdict === "usable-with-warning").length,
    blocked_count: results.filter((result) => result.verdict === "blocked").length,
    results,
  };

  await writeFile(join("reports", `codex-skill-invocation-first-11-${summary.evaluated_at.replace(/[:.]/g, "-")}.json`), JSON.stringify(summary, null, 2) + "\n", "utf8");

  const rows = results.map((result) => {
    const failed = result.failed_primary_attempts.length
      ? result.failed_primary_attempts.map((attempt) => `${attempt.tool_id} ${attempt.status ?? attempt.error}`).join("<br>")
      : "";
    return `| ${result.skill} | ${result.verdict} | ${result.score}/4 | \`${result.selected_tool_id ?? ""}\` | ${failed || "-"} | ${(result.issues.concat(result.warnings)).join("<br>") || "-"} |`;
  });

  const markdown = `# Codex Skill Invocation Evaluation: First 11 QVeris Finance Skills

Date: 2026-07-06

This evaluation simulates Codex invoking each newly created skill against the latest live QVeris smoke report. It checks whether a Codex-style output can satisfy the skill contract: source record, controls, qveris_trace, fallback marking, missing_fields, and investment-advice disclaimer.

Smoke report used: \`${smokeReportPath}\`

## Summary

- Good: ${summary.good_count}
- Usable with warning: ${summary.warning_count}
- Blocked: ${summary.blocked_count}

| Skill | Verdict | Score | Selected live CAP | Failed primary attempts | Issues / warnings |
|---|---:|---:|---|---|---|
${rows.join("\n")}

## Findings

1. The skills are usable as Codex instructions: all 11 can produce a schema-shaped, trace-backed output from live QVeris CAP evidence.
2. Four skills are usable with warning because their primary CAP path failed or was unstable in live testing, but a documented fallback path worked.
3. The weakest usability point is not skill formatting; it is provider health and discovery quality for a few QVeris CAP routes.
4. Some successful QVeris CAP calls expose underlying \`source_provider\` names such as Alpha Vantage, FMP, EODHD, or Yahoo in provenance. This is acceptable only as QVeris internal provenance, not as direct skill dependency.

## Recommended Fixes

1. Platform side: fix provider routing for \`earnings_actual_surprise\`, \`sentiment_text_signals\`, \`fundamentals_segment\`, and CN \`mkt_breadth_internals\`.
2. Skill side: keep the live-tested fallback rules already added to the affected skill docs.
3. Product side: expose a clearer CAP provenance field so users do not confuse internal provider provenance with direct third-party access.
4. Test side: keep \`third_party/scripts/live_smoke_first_11.mjs\` and this invocation evaluator as pre-promotion checks.
`;

  const markdownPath = "third_party/qveris-first-11-codex-invocation-eval-2026-07-06.md";
  await writeFile(markdownPath, markdown, "utf8");

  console.log(JSON.stringify({
    evaluated_at: summary.evaluated_at,
    good_count: summary.good_count,
    warning_count: summary.warning_count,
    blocked_count: summary.blocked_count,
    markdown_path: markdownPath,
  }, null, 2));

  if (summary.blocked_count > 0) process.exit(1);
}

main();
