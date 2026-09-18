import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { adaptFinanceParameters, executeFinanceCapability } from "../scripts/qveris_finance_adapter.mjs";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const marketDir = path.resolve(testsDir, "..");
const repoDir = path.resolve(marketDir, "..");
const serenityDir = path.join(repoDir, "qveris-serenity-supply-chain-research");

const sharedCapScripts = [
  "qveris_finance_adapter.mjs",
  "qveris_finance_client.mjs",
  "qveris_finance_tool.mjs",
  "qveris_sanitize.mjs",
  "qveris_workflow_guards.mjs",
];

const expectedBundleHashes = {
  "qveris_finance_adapter.mjs": "97c1089da398182b93e6d3158e2b4e45dd0f6d989d73016b3d54f5e6dd62dc8d",
  "qveris_finance_client.mjs": "ce8758dffb1fdd0bfaad18de0271202268a5ca40aaeac5613a606a7432078893",
  "qveris_finance_tool.mjs": "3b922338c01b757aaf9f257a382e9bdf3d3458aeff2c0cd2581463cac242d44c",
  "qveris_sanitize.mjs": "77dce831a750fca049ac541efc8c55901da5a661f2a61082f294304d4d2a6e8c",
  "qveris_workflow_guards.mjs": "e8fb590d58a53f27a3cb878d47cd6d3085db0e202fe0e7ff962578c0632c4164",
};

const sharedReferences = [
  "cap-bundle-provenance.md",
  "qveris-finance-cap-registry-snapshot-2026-07-07.md",
  "qveris-finance-data-quality-rubric.md",
  "qveris-finance-retry-policy.md",
  "qveris-web-news-sentiment-policy.md",
  "qveris-workflow-semantic-guards.md",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

test("the two skills carry byte-identical skill-owned CAP bundles", async () => {
  for (const script of sharedCapScripts) {
    const [marketBytes, serenityBytes] = await Promise.all([
      readFile(path.join(marketDir, "scripts", script)),
      readFile(path.join(serenityDir, "scripts", script)),
    ]);

    assert.equal(
      sha256(marketBytes),
      sha256(serenityBytes),
      `${script} drifted between the two skill-owned bundles`,
    );
    assert.equal(
      sha256(marketBytes),
      expectedBundleHashes[script],
      `${script} drifted from finance bundle release 2026-08-03.1`,
    );
  }
});

test("the two skills carry byte-identical shared finance policies", async () => {
  for (const reference of sharedReferences) {
    const [marketBytes, serenityBytes] = await Promise.all([
      readFile(path.join(marketDir, "references", reference)),
      readFile(path.join(serenityDir, "references", reference)),
    ]);
    assert.equal(sha256(marketBytes), sha256(serenityBytes), `${reference} drifted between skills`);
  }
});

test("runnable skill code contains no legacy discovery or execution route", async () => {
  const legacyRoute = /["'`]\/(?:search|tools\/execute)(?:[?"'`\s]|$)/i;
  const legacyHelper = /\bqveris_(?:search|inspect|call)\b/i;

  for (const skillDir of [marketDir, serenityDir]) {
    const scriptsDir = path.join(skillDir, "scripts");
    const entries = await readdir(scriptsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(?:mjs|js|cjs|py|sh)$/i.test(entry.name)) continue;
      const source = await readFile(path.join(scriptsDir, entry.name), "utf8");
      assert.doesNotMatch(source, legacyRoute, `${skillDir}/${entry.name} contains a legacy API route`);
      assert.doesNotMatch(source, legacyHelper, `${skillDir}/${entry.name} contains a legacy helper call`);
    }
  }
});

test("both SKILL contracts retain the common CAP and audit invariants", async () => {
  const sharedRequirements = [
    /Skill-owned `scripts\/qveris_finance_adapter\.mjs`/i,
    /Never call `\/capabilities\/query` directly/i,
    /Use only `QVERIS_API_KEY`/i,
    /effective_cutoff=min\(T0,CUT_OFF\)/,
    /observed_calls\.v1/,
    /Not investment advice\./,
  ];
  const traceHeader = "| tool_name | params | status | execution_id | fallback_used | missing_fields |";

  for (const skillDir of [marketDir, serenityDir]) {
    const skill = await readFile(path.join(skillDir, "SKILL.md"), "utf8");
    for (const requirement of sharedRequirements) {
      assert.match(skill, requirement, `${path.basename(skillDir)}/SKILL.md lost ${requirement}`);
    }
    assert.ok(skill.includes(traceHeader), `${path.basename(skillDir)}/SKILL.md lost the exact Trace schema`);
  }
});

test("workflow-specific deterministic gates stay explicit", async () => {
  const [marketSkill, serenitySkill] = await Promise.all([
    readFile(path.join(marketDir, "SKILL.md"), "utf8"),
    readFile(path.join(serenityDir, "SKILL.md"), "utf8"),
  ]);

  for (const requirement of [
    /validate_research_packet\.py/,
    /at least three peers/i,
    /two review gates/i,
    /distribution_status=not_authorized/,
  ]) {
    assert.match(marketSkill, requirement, `market-research contract lost ${requirement}`);
  }

  for (const requirement of [
    /serenity_validity\.mjs/,
    /at least three candidates/i,
    /Do not convert a missing factor to zero/i,
    /ranking_allowed=true/,
  ]) {
    assert.match(serenitySkill, requirement, `serenity contract lost ${requirement}`);
  }
});

test("market contract locks cutoff aliases and dry-run budget semantics", async () => {
  const [skill, workflow, packetContract, schemaText] = await Promise.all([
    readFile(path.join(marketDir, "SKILL.md"), "utf8"),
    readFile(path.join(marketDir, "references", "market-research-workflow.md"), "utf8"),
    readFile(path.join(marketDir, "references", "research-packet-contract.md"), "utf8"),
    readFile(path.join(marketDir, "schemas", "output.schema.json"), "utf8"),
  ]);

  for (const [label, contract] of [["SKILL", skill], ["workflow", workflow], ["packet", packetContract]]) {
    assert.match(
      contract,
      /(?:as_of[\s\S]{0,240}bind[\s\S]{0,120}CUT_OFF|bind[\s\S]{0,240}as_of[\s\S]{0,120}CUT_OFF)/i,
      `${label} lost the as_of-to-CUT_OFF binding`,
    );
    assert.match(contract, /call_estimate[\s\S]{0,300}worst-case[\s\S]{0,300}retr(?:y|ies)/i, `${label} lost worst-case retry budgeting`);
    assert.match(contract, /rank[\s\S]{0,80}score[\s\S]{0,80}final_score/i, `${label} lost the Gate 1 priority-field ban`);
    assert.match(contract, /non-empty `web_sources\.v1`/i, `${label} lost the dry-run Web-sidecar ban`);
  }

  const schema = JSON.parse(schemaText);
  assert.match(schema.properties.as_of.description, /binds to CUT_OFF/i);
  assert.match(schema.properties.planned_calls.items.properties.call_estimate.description, /Worst-case[\s\S]*retry/i);
  assert.deepEqual(
    schema.properties.evidence_matrix.items.properties.status.enum,
    ["observed", "calculated", "estimated", "not_applicable", "missing"],
  );
});

test("the aligned adapter treats explicit and unambiguous Beijing codes as A-share identities", async () => {
  const detail = {
    params: [
      { name: "symbol", type: "string", required: true },
      { name: "market", type: "string", required: true },
    ],
    field_spec: { required: ["symbol"] },
  };
  const adapted = adaptFinanceParameters({ detail, parameters: { symbol: "430047.BJ" }, context: {} });
  assert.deepEqual(adapted.parameters, { symbol: "430047.BJ", market: "CN" });

  const attempted = [];
  const transport = {
    async listCapabilities() { return { capabilities: [{ capability_id: "REF.SECURITY_MASTER" }], total: 1 }; },
    async getCapability() { return detail; },
    async queryCapability({ parameters }) {
      attempted.push(parameters.symbol);
      if (parameters.symbol === "430047") {
        return { success: false, status_code: 422, error_message: "symbol format invalid; allowed exchange-qualified symbol" };
      }
      return { success: true, execution_id: "bj-exec", result: { data: { symbol: parameters.symbol, market: "CN" } } };
    },
  };
  const result = await executeFinanceCapability({
    capability: "qveris_finance.ref_security_master",
    parameters: { symbol: "430047" },
    context: { market: "CN" },
    transport,
  });
  assert.equal(result.success, true);
  assert.deepEqual(attempted, ["430047", "430047.BJ"]);
  assert.equal(result.final_params.symbol, "430047.BJ");
  assert.equal(result.qveris_trace[1].fallback_used, true);
});
