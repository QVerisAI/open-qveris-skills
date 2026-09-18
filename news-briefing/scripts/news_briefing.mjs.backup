#!/usr/bin/env node

/**
 * News Briefing Skill for OpenClaw
 * 
 * Features:
 * - Daily briefings (morning/evening)
 * - Article search across multiple sources
 * - Hot topic tracking
 * - Keyword monitoring
 * 
 * Data Sources: caidazi, xiaosu, X/Twitter
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_ROOT = path.resolve(__dirname, "..");
const CONFIG_DIR = path.join(SKILL_ROOT, "config");
const PREFS_FILE = path.join(CONFIG_DIR, "preferences.json");
const WATCHLIST_FILE = path.join(CONFIG_DIR, "watchlist.json");

// API Configuration
const QVERIS_BASE_URL = "https://qveris.ai/api/v1";
const QVERIS_API_KEY = process.env.QVERIS_API_KEY;

// Tool IDs
const TOOL_IDS = {
  xiaosu_search: "xiaosu.smartsearch.search.retrieve.v2.6c50f296_domestic",
  caidazi_wechat: "caidazi.wechat.query.v1.7393c41f",
  caidazi_news: "caidazi.news.query.v1.e76b9116",
  x_tweets_search: "x_developer.2.tweets.search.recent.retrieve.v2.f424c8f9"
};

// Default preferences
const DEFAULT_PREFERENCES = {
  interests: ["科技", "财经"],
  preferred_sources: ["caidazi", "xiaosu"],
  briefing_time: "08:00",
  language: "zh",
  summary_length: "medium"
};

const DEFAULT_WATCHLIST = {
  keywords: [],
  categories: []
};

/**
 * Timeout helper
 */
function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

/**
 * Get API Key
 */
function getApiKey() {
  if (!QVERIS_API_KEY) {
    throw new Error("QVERIS_API_KEY environment variable is required");
  }
  return QVERIS_API_KEY;
}

/**
 * Search tools on QVeris
 */
async function searchTools(query, limit = 10, timeoutMs = 25000) {
  const apiKey = getApiKey();
  const { signal, cleanup } = timeoutSignal(timeoutMs);
  
  try {
    const res = await fetch(`${QVERIS_BASE_URL}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, limit }),
      signal
    });
    
    if (!res.ok) {
      throw new Error(`Search failed (${res.status}): ${await res.text()}`);
    }
    
    return await res.json();
  } finally {
    cleanup();
  }
}

/**
 * Execute a tool on QVeris
 */
async function executeTool(toolId, searchId, parameters, maxResponseSize = 30000, timeoutMs = 25000) {
  const apiKey = getApiKey();
  const { signal, cleanup } = timeoutSignal(timeoutMs);
  
  try {
    const url = new URL(`${QVERIS_BASE_URL}/tools/execute`);
    url.searchParams.set("tool_id", toolId);
    
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        search_id: searchId,
        parameters,
        max_response_size: maxResponseSize
      }),
      signal
    });
    
    if (!res.ok) {
      throw new Error(`Execute failed (${res.status}): ${await res.text()}`);
    }
    
    return await res.json();
  } finally {
    cleanup();
  }
}

/**
 * Parse tool result payload
 */
function parseToolResult(rawResult) {
  // Check for truncated_content in result first
  const truncated = rawResult?.result?.truncated_content;
  
  if (truncated && typeof truncated === "string") {
    try {
      return JSON.parse(truncated);
    } catch {
      return truncated;
    }
  }
  
  // Fall back to regular data
  const payload = rawResult?.result?.data ?? rawResult?.data ?? rawResult?.result ?? rawResult ?? {};
  return payload;
}

/**
 * Load JSON file with fallback
 */
async function loadJson(filePath, fallback = {}) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    return fallback;
  }
}

/**
 * Save JSON file
 */
async function saveJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Search using Xiaosu (web search)
 */
async function searchXiaosu(query, options = {}) {
  try {
    const toolId = TOOL_IDS.xiaosu_search;
    
    const result = await executeTool(toolId, toolId, {
      q: query,
      count: options.limit || 10
    });
    
    const parsed = parseToolResult(result);
    
    // Extract web pages from xiaosu result
    if (parsed?.webPages?.value) {
      return parsed.webPages.value.map(item => ({
        title: item.name,
        source: item.siteName || new URL(item.url).hostname,
        published_at: item.datePublished || new Date().toISOString(),
        summary: item.snippet,
        url: item.url,
        score: item.score
      }));
    }
    
    return [];
  } catch (e) {
    console.error("Xiaosu search error:", e.message);
    return [];
  }
}

/**
 * Search caidazi for WeChat articles
 */
async function searchCaidazi(query, options = {}) {
  try {
    const toolId = TOOL_IDS.caidazi_wechat;
    
    const result = await executeTool(toolId, toolId, {
      input: query,
      limit: options.limit || 10
    });
    
    // Check if we need to fetch full content
    const fullContentUrl = result?.result?.full_content_file_url;
    let parsed;
    
    if (fullContentUrl) {
      // Fetch full content
      const fullRes = await fetch(fullContentUrl);
      if (fullRes.ok) {
        parsed = await fullRes.json();
      } else {
        // Fall back to truncated content
        parsed = parseToolResult(result);
      }
    } else {
      parsed = parseToolResult(result);
    }
    
    // Handle the result
    if (parsed?.code === 200 && parsed?.data?.hits) {
      return parsed.data.hits.map(hit => ({
        title: hit.source?.title || "无标题",
        source: hit.source?.siteName || "微信文章",
        published_at: hit.source?.effectiveTime || new Date().toISOString(),
        summary: hit.source?.body?.substring(0, 200) + "..." || hit.bodySegHighlight?.[0] || "暂无摘要",
        url: hit.source?.url || null,
        score: hit.score
      }));
    }
    
    return [];
  } catch (e) {
    console.error("Caidazi search error:", e.message);
    return [];
  }
}

/**
 * Get X/Twitter hot topics (using trending searches)
 */
async function getXHotTopics(options = {}) {
  try {
    // Use search with popular keywords to simulate trending
    const trendingKeywords = ["AI", "科技", "news", " breaking"];
    const allPosts = [];
    
    for (const keyword of trendingKeywords.slice(0, 2)) {
      const posts = await searchXPosts(keyword, { limit: 10 });
      allPosts.push(...posts);
    }
    
    // Extract hashtags and keywords from posts
    const hashtagCounts = {};
    allPosts.forEach(post => {
      const hashtags = post.text.match(/#[\w\u4e00-\u9fa5]+/g) || [];
      hashtags.forEach(tag => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    });
    
    // Convert to topics
    const topics = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, options.limit || 10)
      .map(([name, count]) => ({
        name: name,
        heat_score: count * 10,
        trend: "up",
        description: `Trending topic with ${count} mentions`,
        source: "x"
      }));
    
    return topics;
  } catch (e) {
    console.error("X hot topics error:", e.message);
    return [];
  }
}

/**
 * Search X/Twitter posts
 */
async function searchXPosts(query, options = {}) {
  try {
    const toolId = TOOL_IDS.x_tweets_search;
    
    const result = await executeTool(toolId, toolId, {
      query: query,
      max_results: Math.max(10, Math.min(options.limit || 10, 100))
    });
    
    const parsed = parseToolResult(result);
    const posts = parsed?.data || [];
    
    return posts.map(p => ({
      author: p.author_id || "Unknown",
      text: p.text || "",
      created_at: p.created_at || new Date().toISOString(),
      id: p.id
    }));
  } catch (e) {
    console.error("X search error:", e.message);
    return [];
  }
}

/**
 * Aggregate search from multiple sources
 */
async function aggregateSearch(query, sources, options = {}) {
  const results = {
    caidazi: [],
    xiaosu: [],
    x: []
  };

  const searchPromises = [];

  if (sources.includes("caidazi")) {
    searchPromises.push(
      searchCaidazi(query, options).then(data => { results.caidazi = data; })
    );
  }

  if (sources.includes("xiaosu")) {
    searchPromises.push(
      searchXiaosu(query, options).then(data => { results.xiaosu = data; })
    );
  }

  if (sources.includes("x")) {
    searchPromises.push(
      searchXPosts(query, options).then(data => { results.x = data; })
    );
  }

  await Promise.all(searchPromises);
  return results;
}

/**
 * Generate article summary
 */
function generateSummary(articles, maxLength = "medium") {
  const lengthMap = {
    short: 50,
    medium: 100,
    long: 200
  };
  
  const maxChars = lengthMap[maxLength] || 100;
  
  return articles.map(article => {
    const content = article.content || article.summary || article.text || "";
    const summary = content.length > maxChars 
      ? content.substring(0, maxChars) + "..."
      : content;
    
    return {
      ...article,
      generated_summary: summary
    };
  });
}

/**
 * Format date relative to now
 */
function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN");
}

/**
 * Output formatters
 */
const formatters = {
  markdown(data, type) {
    if (type === "search") {
      let output = `# 🔍 搜索结果: "${data.query}"\n\n`;
      
      const allArticles = [
        ...data.results.caidazi.map(a => ({ ...a, source: "caidazi" })),
        ...data.results.xiaosu.map(a => ({ ...a, source: "xiaosu" })),
        ...data.results.x.map(a => ({ ...a, source: "x" }))
      ];
      
      output += `共找到 **${allArticles.length}** 篇相关文章\n\n`;
      
      // Group by source
      if (data.results.caidazi.length > 0) {
        output += `## 📱 微信文章 (${data.results.caidazi.length})\n\n`;
        data.results.caidazi.forEach((article, i) => {
          output += `${i + 1}. **${article.title}**\n`;
          output += `   📅 ${formatRelativeTime(article.published_at || article.date)} | 🏢 ${article.source || "未知"}\n`;
          output += `   📝 ${article.summary || "暂无摘要"}\n`;
          if (article.url) output += `   🔗 ${article.url}\n`;
          output += `\n`;
        });
      }
      
      if (data.results.xiaosu.length > 0) {
        output += `## 🌐 全网新闻 (${data.results.xiaosu.length})\n\n`;
        data.results.xiaosu.forEach((article, i) => {
          output += `${i + 1}. **${article.title}**\n`;
          output += `   📅 ${formatRelativeTime(article.published_at || article.date)} | 🏢 ${article.source || "未知"}\n`;
          output += `   📝 ${article.summary || "暂无摘要"}\n`;
          if (article.url) output += `   🔗 ${article.url}\n`;
          output += `\n`;
        });
      }
      
      if (data.results.x.length > 0) {
        output += `## 💬 X/Twitter (${data.results.x.length})\n\n`;
        data.results.x.forEach((post, i) => {
          output += `${i + 1}. **@${post.author || "Unknown"}**\n`;
          output += `   📝 ${post.text?.substring(0, 100) || "无内容"}${post.text?.length > 100 ? "..." : ""}\n`;
          output += `   📅 ${formatRelativeTime(post.created_at)}\n\n`;
        });
      }
      
      return output;
    }
    
    if (type === "briefing") {
      let output = `# 📰 ${data.briefingType === "morning" ? "早报" : "晚报"}\n\n`;
      output += `📅 ${new Date().toLocaleDateString("zh-CN")}\n\n`;
      
      if (data.articles.length === 0) {
        output += "暂无新文章\n";
        return output;
      }
      
      // Group by topic
      const topics = [...new Set(data.articles.map(a => a.topic || "其他"))];
      
      topics.forEach(topic => {
        const topicArticles = data.articles.filter(a => (a.topic || "其他") === topic);
        output += `## ${topic}\n\n`;
        
        topicArticles.slice(0, 3).forEach((article, i) => {
          output += `${i + 1}. **${article.title}**\n`;
          output += `   📅 ${formatRelativeTime(article.published_at || article.date)} | 🏢 ${article.source || "未知"}\n`;
          output += `   📝 ${article.summary || "暂无摘要"}\n`;
          if (article.url) output += `   🔗 ${article.url}\n`;
          output += `\n`;
        });
      });
      
      return output;
    }
    
    if (type === "trending") {
      let output = `# 🔥 热门话题\n\n`;
      
      data.topics.forEach((topic, i) => {
        const heatEmoji = "🔥".repeat(Math.min(Math.floor((topic.heat_score || 50) / 20), 5));
        output += `${i + 1}. **${topic.name}** ${heatEmoji}\n`;
        output += `   📊 热度指数: ${topic.heat_score || "N/A"} | 📈 趋势: ${topic.trend === "up" ? "上升" : topic.trend === "down" ? "下降" : "稳定"}\n`;
        output += `   💡 ${topic.description || "暂无描述"}\n\n`;
      });
      
      return output;
    }
    
    return JSON.stringify(data, null, 2);
  },
  
  json(data) {
    return JSON.stringify(data, null, 2);
  },
  
  chat(data, type) {
    if (type === "search") {
      const allArticles = [
        ...data.results.caidazi.map(a => ({ ...a, source: "微信" })),
        ...data.results.xiaosu.map(a => ({ ...a, source: "新闻" })),
        ...data.results.x.map(a => ({ ...a, source: "X" }))
      ];
      
      let output = `🔍 找到 ${allArticles.length} 篇关于"${data.query}"的文章\n\n`;
      
      allArticles.slice(0, 5).forEach((article, i) => {
        output += `${i + 1}. ${article.title}\n`;
        output += `   📱 ${article.source} | 📅 ${formatRelativeTime(article.published_at || article.date)}\n`;
        output += `   ${article.summary?.substring(0, 80) || "暂无摘要"}...\n\n`;
      });
      
      if (allArticles.length > 5) {
        output += `... 还有 ${allArticles.length - 5} 篇更多文章\n`;
      }
      
      return output;
    }
    
    return formatters.markdown(data, type);
  },
  
  summary(data, type) {
    if (type === "search") {
      const total = data.results.caidazi.length + data.results.xiaosu.length + data.results.x.length;
      return `找到 ${total} 篇关于"${data.query}"的文章\n- 微信: ${data.results.caidazi.length}篇\n- 新闻: ${data.results.xiaosu.length}篇\n- X: ${data.results.x.length}篇`;
    }
    return formatters.markdown(data, type);
  }
};

/**
 * Generate daily briefing
 */
async function generateBriefing(type, options = {}) {
  const preferences = await loadJson(PREFS_FILE, DEFAULT_PREFERENCES);
  const sources = options.sources || preferences.preferred_sources;
  const interests = options.topics ? options.topics.split(",") : preferences.interests;
  
  const allArticles = [];
  
  for (const interest of interests) {
    try {
      const results = await aggregateSearch(interest, sources, { limit: 5, days: 1 });
      
      allArticles.push(
        ...results.caidazi.map(a => ({ ...a, topic: interest, source: "caidazi" })),
        ...results.xiaosu.map(a => ({ ...a, topic: interest, source: "xiaosu" })),
        ...results.x.map(a => ({ ...a, topic: interest, source: "x" }))
      );
    } catch (e) {
      console.error(`Error searching for ${interest}:`, e.message);
    }
  }
  
  // Deduplicate by title
  const seen = new Set();
  const uniqueArticles = allArticles.filter(a => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });
  
  // Sort by date
  uniqueArticles.sort((a, b) => {
    const dateA = new Date(a.published_at || a.date || 0);
    const dateB = new Date(b.published_at || b.date || 0);
    return dateB - dateA;
  });
  
  return {
    briefingType: type,
    date: new Date().toISOString(),
    articles: uniqueArticles.slice(0, options.limit || 20)
  };
}

/**
 * Get trending topics
 */
async function getTrending(options = {}) {
  const topics = [];
  
  if (!options.sources || options.sources.includes("x")) {
    try {
      const xTopics = await getXHotTopics({ limit: options.limit || 10 });
      topics.push(...xTopics);
    } catch (e) {
      console.error("Error getting X topics:", e.message);
    }
  }
  
  // Sort by heat score
  topics.sort((a, b) => (b.heat_score || 0) - (a.heat_score || 0));
  
  return {
    topics: topics.slice(0, options.limit || 10),
    timestamp: new Date().toISOString()
  };
}

/**
 * Manage watchlist
 */
async function manageWatchlist(action, options = {}) {
  const watchlist = await loadJson(WATCHLIST_FILE, DEFAULT_WATCHLIST);
  
  switch (action) {
    case "list":
      return watchlist;
      
    case "add":
      if (options.keyword && !watchlist.keywords.includes(options.keyword)) {
        watchlist.keywords.push(options.keyword);
        await saveJson(WATCHLIST_FILE, watchlist);
        return { success: true, message: `已添加关键词: ${options.keyword}`, watchlist };
      }
      return { success: false, message: "关键词已存在或未提供" };
      
    case "remove":
      if (options.keyword) {
        watchlist.keywords = watchlist.keywords.filter(k => k !== options.keyword);
        await saveJson(WATCHLIST_FILE, watchlist);
        return { success: true, message: `已移除关键词: ${options.keyword}`, watchlist };
      }
      return { success: false, message: "未提供关键词" };
      
    default:
      return { success: false, message: "未知操作" };
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};
  
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    const value = args[i + 1];
    options[key] = value;
  }
  
  return { command, options };
}

/**
 * Main entry point
 */
async function main() {
  const { command, options } = parseArgs();
  
  if (!command) {
    console.log(`
News Briefing Skill for OpenClaw

Usage:
  node news_briefing.mjs <command> [options]

Commands:
  brief    生成每日简报
  search   搜索文章
  trending 获取热门话题
  watch    管理监控列表

Options:
  --type morning|evening     简报类型 (默认: morning)
  --query <text>             搜索关键词
  --sources <list>           数据源 (caidazi,xiaosu,x)
  --topics <list>            关注主题 (逗号分隔)
  --days <n>                 时间范围 (默认: 7)
  --limit <n>                结果数量限制 (默认: 10)
  --format markdown|json|chat|summary  输出格式 (默认: markdown)
  --action list|add|remove   监控列表操作
  --keyword <text>           监控关键词

Examples:
  node news_briefing.mjs brief --type morning
  node news_briefing.mjs search --query "人工智能" --sources caidazi,xiaosu
  node news_briefing.mjs trending --limit 10
  node news_briefing.mjs watch --action add --keyword "特斯拉"
`);
    return;
  }
  
  try {
    let result;
    let outputType;
    
    switch (command) {
      case "brief":
        result = await generateBriefing(options.type || "morning", options);
        outputType = "briefing";
        break;
        
      case "search":
        if (!options.query) {
          console.error("错误: 请提供搜索关键词 (--query)");
          process.exit(1);
        }
        const sources = options.sources ? options.sources.split(",") : ["caidazi", "xiaosu"];
        result = {
          query: options.query,
          results: await aggregateSearch(options.query, sources, options)
        };
        outputType = "search";
        break;
        
      case "trending":
        result = await getTrending(options);
        outputType = "trending";
        break;
        
      case "watch":
        result = await manageWatchlist(options.action || "list", options);
        outputType = "watchlist";
        break;
        
      default:
        console.error(`未知命令: ${command}`);
        process.exit(1);
    }
    
    const format = options.format || "markdown";
    const formatter = formatters[format] || formatters.markdown;
    console.log(formatter(result, outputType));
    
  } catch (error) {
    console.error("错误:", error.message);
    if (error.message.includes("QVERIS_API_KEY")) {
      console.error("\n请设置环境变量: export QVERIS_API_KEY=\"your-api-key\"");
    }
    process.exit(1);
  }
}

main();
