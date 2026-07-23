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
