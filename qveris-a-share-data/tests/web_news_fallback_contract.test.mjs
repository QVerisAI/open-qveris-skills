import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillUrl = new URL("../SKILL.md", import.meta.url);
const agentUrl = new URL("../agents/openai.yaml", import.meta.url);

test("limits Web Search to audited issuer news and qualitative sentiment", async () => {
  const skill = await readFile(skillUrl, "utf8");

  assert.match(skill, /source_mode=hybrid_news_web/);
  assert.match(skill, /source_mode=qveris_only[\s\S]*forbids all Web Search/);
  assert.match(skill, /instead of `qveris_finance\.news_fin_tagged` and `qveris_finance\.sentiment_text_signals`/);
  assert.match(skill, /Search-result snippets alone are not evidence/);
  assert.match(skill, /body-content SHA-256/);
  assert.match(skill, /at least two independent issuer-matched, in-window opened sources/);
  assert.match(skill, /Do not emit a numeric sentiment score/);
  assert.match(skill, /Do not use Web Search for quotes, bars, financial statements, ratios, classifications, events, rankings, flows/);
});

test("advertises the narrow Web fallback without dropping QVeris structured data", async () => {
  const skill = await readFile(skillUrl, "utf8");
  const agent = await readFile(agentUrl, "utf8");

  assert.match(skill, /QVeris structured-data evidence/);
  assert.match(agent, /QVeris for structured finance data/);
  assert.match(agent, /audited Web Search only for issuer news and qualitative sentiment/);
});
