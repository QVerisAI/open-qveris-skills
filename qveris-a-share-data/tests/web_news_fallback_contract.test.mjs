import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillUrl = new URL("../SKILL.md", import.meta.url);
const agentUrl = new URL("../agents/openai.yaml", import.meta.url);
const policyUrl = new URL("../references/qveris-web-news-sentiment-policy.md", import.meta.url);

test("limits Web Search to audited issuer news and qualitative sentiment", async () => {
  const skill = await readFile(skillUrl, "utf8");
  const policy = await readFile(policyUrl, "utf8");

  assert.match(skill, /source_mode=hybrid_web_news_sentiment/);
  assert.match(skill, /Never call `qveris_finance\.news_fin_tagged` or `qveris_finance\.sentiment_text_signals`/);
  assert.match(policy, /Do not call `qveris_finance\.news_fin_tagged` or `qveris_finance\.sentiment_text_signals`/);
  assert.match(policy, /including benchmark and replay/);
  assert.match(policy, /For replay, use the frozen bytes and metadata; do not silently re-fetch live pages/);
  assert.match(skill, /Search-result snippets alone are not evidence/);
  assert.match(skill, /body-content SHA-256/);
  assert.match(policy, /at least two independent/);
  assert.match(policy, /Do not emit a numeric sentiment score/);
  assert.match(policy, /Keep QVeris mandatory for identity, quotes, bars, financials, classifications, events, flows/);
});

test("advertises the narrow Web fallback without dropping QVeris structured data", async () => {
  const skill = await readFile(skillUrl, "utf8");
  const agent = await readFile(agentUrl, "utf8");

  assert.match(skill, /QVeris structured-data evidence/);
  assert.match(agent, /QVeris for structured finance data/);
  assert.match(agent, /audited Web Search only for issuer news and qualitative sentiment/);
});
