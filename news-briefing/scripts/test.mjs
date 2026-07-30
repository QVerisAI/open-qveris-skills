#!/usr/bin/env node

/**
 * Test suite for news-briefing skill
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, "news_briefing.mjs");

const API_KEY = process.env.QVERIS_API_KEY;

if (!API_KEY) {
  console.error("❌ QVERIS_API_KEY environment variable is required");
  console.log("Please set: export QVERIS_API_KEY=\"your-api-key\"");
  process.exit(1);
}

function runCommand(args) {
  const cmd = `export QVERIS_API_KEY="${API_KEY}" && node ${SCRIPT_PATH} ${args}`;
  try {
    return execSync(cmd, { encoding: "utf-8", cwd: __dirname });
  } catch (e) {
    return e.stdout || e.message;
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    return false;
  }
}

console.log("🧪 Running News Briefing Skill Tests\n");

let passed = 0;
let total = 0;

// Test 1: Help command
total++;
if (test("Help command shows usage", () => {
  const output = runCommand("");
  if (!output.includes("Usage:")) throw new Error("Usage not found");
  if (!output.includes("brief")) throw new Error("brief command not found");
  if (!output.includes("search")) throw new Error("search command not found");
})) passed++;

// Test 2: Search command with xiaosu
total++;
if (test("Search command returns results", () => {
  const output = runCommand('search --query "人工智能" --sources xiaosu --limit 3');
  if (!output.includes("搜索结果")) throw new Error("Search results not found");
  if (!output.includes("baike.baidu.com") && !output.includes("news.cctv.com")) {
    throw new Error("Expected sources not found");
  }
})) passed++;

// Test 3: Search with chat format
total++;
if (test("Search with chat format", () => {
  const output = runCommand('search --query "科技" --sources xiaosu --format chat --limit 3');
  if (!output.includes("找到")) throw new Error("Results count not found");
})) passed++;

// Test 4: Search with summary format
total++;
if (test("Search with summary format", () => {
  const output = runCommand('search --query "财经" --sources xiaosu --format summary');
  if (!output.includes("找到")) throw new Error("Summary not found");
  if (!output.includes("新闻:")) throw new Error("Source breakdown not found");
})) passed++;

// Test 5: Brief command
total++;
if (test("Brief command generates briefing", () => {
  const output = runCommand('brief --type morning --topics "科技" --sources xiaosu --limit 3');
  if (!output.includes("早报")) throw new Error("Morning brief header not found");
  if (!output.includes("科技")) throw new Error("Topic not found");
})) passed++;

// Test 6: Watchlist commands
total++;
if (test("Watchlist add/remove/list", () => {
  // Clear watchlist first
  runCommand('watch --action remove --keyword "测试关键词"');
  
  // Add keyword
  const addOutput = runCommand('watch --action add --keyword "测试关键词"');
  if (!addOutput.includes("已添加")) throw new Error("Add failed");
  
  // List
  const listOutput = runCommand('watch --action list');
  if (!listOutput.includes("测试关键词")) throw new Error("Keyword not in list");
  
  // Remove
  const removeOutput = runCommand('watch --action remove --keyword "测试关键词"');
  if (!removeOutput.includes("已移除")) throw new Error("Remove failed");
})) passed++;

// Test 7: Trending command
total++;
if (test("Trending command returns topics or empty gracefully", () => {
  const output = runCommand('trending --limit 5');
  if (!output.includes("热门话题")) throw new Error("Trending header not found");
})) passed++;

console.log(`\n📊 Test Results: ${passed}/${total} passed`);

if (passed === total) {
  console.log("🎉 All tests passed!");
  process.exit(0);
} else {
  console.log("⚠️ Some tests failed");
  process.exit(1);
}
