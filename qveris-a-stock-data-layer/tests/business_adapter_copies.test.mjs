import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SKILLS = [
  "qveris-a-share-data",
  "qveris-a-share-factor-screen",
  "qveris-a-stock-data-layer",
  "qveris-alphaear-market-intelligence",
  "qveris-anthropic-financial-services",
  "qveris-daymade-financial-data-suite",
  "qveris-finance-skills",
  "qveris-tradermonty-trading-skills",
  "qveris-uzi-equity-research",
];
const FILES = [
  "qveris_finance_adapter.mjs",
  "qveris_finance_client.mjs",
  "qveris_finance_tool.mjs",
  "qveris_sanitize.mjs",
];

test("all finance business Skills ship byte-identical standalone adapter bundles", async () => {
  const root = new URL("../../", import.meta.url);
  for (const file of FILES) {
    const records = await Promise.all(SKILLS.map(async (skill) => {
      const content = await readFile(new URL(`${skill}/scripts/${file}`, root));
      return { skill, hash: createHash("sha256").update(content).digest("hex") };
    }));
    assert.equal(new Set(records.map((record) => record.hash)).size, 1, `${file}: ${JSON.stringify(records)}`);
  }
});

test("every standalone business Skill CLI starts without qveris-official", () => {
  const root = new URL("../../", import.meta.url);
  for (const skill of SKILLS) {
    const script = fileURLToPath(new URL(`${skill}/scripts/qveris_finance_tool.mjs`, root));
    const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.equal(result.status, 0, `${skill}: ${result.stderr}`);
    assert.match(result.stdout, /Skill-owned audited adapter/);
  }
});

test("qveris-official no longer contains the finance adapter", async () => {
  const root = new URL("../../", import.meta.url);
  const skillText = await readFile(new URL("qveris-official/SKILL.md", root), "utf8");
  const toolText = await readFile(new URL("qveris-official/scripts/qveris_tool.mjs", root), "utf8");
  assert.doesNotMatch(skillText, /finance-parameter-adaptation|finance adapter/i);
  assert.doesNotMatch(toolText, /qveris_finance_adapter|--adapt/);
});

test("A-stock fallback policy allows only explicit canonical CAP downgrades", async () => {
  const policyUrl = new URL("../references/qveris-finance-capability-fallbacks.json", import.meta.url);
  const skillUrl = new URL("../SKILL.md", import.meta.url);
  const policy = JSON.parse(await readFile(policyUrl, "utf8"));
  const skillText = await readFile(skillUrl, "utf8");
  assert.equal(policy.schema_version, "qveris.finance-capability-fallback-policy.v1");
  assert.equal(policy.max_capabilities_per_chain, 3);
  assert.equal(new Set(policy.rules.map((rule) => rule.requested)).size, policy.rules.length);
  for (const rule of policy.rules) {
    assert.match(rule.requested, /^qveris_finance\.[a-z0-9_]+$/);
    assert.match(rule.fallback, /^qveris_finance\.[a-z0-9_]+$/);
    assert.notEqual(rule.requested, rule.fallback);
    assert.ok(["complete", "partial", "proxy_only"].includes(rule.evidence_status));
    assert.ok(rule.requirements.length > 0);
    assert.ok(rule.forbidden_claims.length > 0);
  }
  assert.match(skillText, /qveris-finance-capability-fallbacks\.json/);
  assert.match(skillText, /cap-query-chain/);
});
