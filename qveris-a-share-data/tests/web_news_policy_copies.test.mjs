import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const skills = [
  "qveris-a-share-data",
  "qveris-a-share-factor-screen",
  "qveris-a-stock-data-layer",
  "qveris-alphaear-market-intelligence",
  "qveris-daymade-financial-data-suite",
  "qveris-uzi-equity-research",
];

test("all six benchmarked Skills ship the canonical Web news and sentiment policy", async () => {
  const canonical = await readFile(new URL("shared/qveris-web-news-sentiment-policy.md", root));
  for (const skill of skills) {
    const policy = await readFile(new URL(`${skill}/references/qveris-web-news-sentiment-policy.md`, root));
    const instructions = await readFile(new URL(`${skill}/SKILL.md`, root), "utf8");
    assert.deepEqual(policy, canonical, `${skill} policy copy drifted`);
    assert.match(instructions, /qveris-web-news-sentiment-policy\.md/, `${skill} does not load the policy`);
  }
});

test("all six Skills ship the refreshed CAP snapshot and gate market-wide routes", async () => {
  const snapshotName = "qveris-finance-cap-registry-snapshot-2026-07-07.md";
  const canonical = await readFile(new URL(`references/${snapshotName}`, root));
  const canonicalText = canonical.toString("utf8");
  assert.match(canonicalText, /ESTIMATES\.CONSENSUS` passed three independent production queries/);
  assert.match(canonicalText, /Do not call `qveris_finance\.index_constituents` for universe membership/);
  assert.match(canonicalText, /`qveris_finance\.mkt_top_movers` \| conditional/);
  assert.match(canonicalText, /market=CN/);
  assert.match(canonicalText, /freshness_unverified/);

  for (const skill of skills) {
    const snapshot = await readFile(new URL(`${skill}/references/${snapshotName}`, root));
    assert.deepEqual(snapshot, canonical, `${skill} CAP snapshot copy drifted`);
  }

  const factor = await readFile(new URL("qveris-a-share-factor-screen/SKILL.md", root), "utf8");
  const aShare = await readFile(new URL("qveris-a-share-data/SKILL.md", root), "utf8");
  const dataLayer = await readFile(new URL("qveris-a-stock-data-layer/SKILL.md", root), "utf8");
  assert.match(factor, /Never call `qveris_finance\.index_constituents`/);
  for (const [skill, instructions] of [["qveris-a-share-data", aShare], ["qveris-a-stock-data-layer", dataLayer]]) {
    assert.match(instructions, /Call `qveris_finance\.mkt_top_movers`/i, `${skill} does not conditionally restore top movers`);
    assert.match(instructions, /market=CN/, `${skill} does not force mainland routing`);
    assert.match(instructions, /freshness_unverified/, `${skill} does not disclose missing freshness metadata`);
    assert.match(instructions, /never as capital flow, sector heat, breadth, or a limit-up\/limit-down pool/i);
    assert.doesNotMatch(instructions, /Never call `qveris_finance\.mkt_top_movers`/);
  }
});
