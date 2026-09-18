---
name: news-briefing
description: News briefing and WeChat article search skill for OpenClaw. Aggregates news from multiple sources (caidazi, xiaosu, X/Twitter) to provide personalized news briefings, topic tracking, and article search. Use when users need news updates, WeChat article search, topic monitoring, or daily news briefings.
env:
  - QVERIS_API_KEY
credentials:
  required:
    - QVERIS_API_KEY
  primary_env: QVERIS_API_KEY
  scope: read-only
  endpoint: https://qveris.ai/api/v1
network:
  outbound_hosts:
    - qveris.ai
auto_invoke: true
source: https://qveris.ai
examples:
  - "Generate morning news briefing"
  - "Search for articles about artificial intelligence"
  - "Track trending topics"
  - "Monitor news about Tesla"
---

# News Briefing

个性化新闻简报与微信文章搜索 Skill。

## SEO Keywords

OpenClaw, news briefing skill, AI news assistant, 新闻简报, 微信文章搜索, 热点追踪, 早报晚报, 资讯聚合, QVeris API, caidazi, xiaosu, X news

## Supported Capabilities

- **每日简报** (`brief`): 基于用户兴趣生成个性化早报/晚报
- **文章搜索** (`search`): 搜索特定主题的微信文章和新闻
- **热点追踪** (`trending`): 获取当前热门话题和趋势
- **话题监控** (`watch`): 监控特定关键词或主题的新文章
- **多源聚合**: caidazi 微信文章、xiaosu 搜索、X/Twitter 新闻
- **多格式输出**: `markdown`, `json`, `chat`

## Data Sources

- Core MCP/API gateway: `qveris.ai` (`QVERIS_API_KEY`)
- 已集成数据源 (全部通过 QVeris API):
  | 数据源 | 工具 ID | 功能 |
  |--------|---------|------|
  | **菜大全** | `caidazi.wechat.query.v1.7393c41f` | 微信文章搜索 |
  | **小苏** | `xiaosu.smartsearch.search.retrieve.v2.6c50f296_domestic` | 全网网页搜索 |
  | **X/Twitter** | `x_developer.2.tweets.search.recent.retrieve.v2.f424c8f9` | 推文搜索 |

## What This Skill Does

News Briefing 执行端到端的新闻获取和分析:

1. **用户意图识别**: 区分简报、搜索、追踪等不同需求
2. **多源数据聚合**: 同时查询微信文章、全网新闻、X 资讯
3. **内容质量过滤**: 去重、时效性检查、来源可信度评估
4. **个性化排序**: 基于用户兴趣偏好对结果排序
5. **智能摘要**: 生成长文章的关键要点摘要
6. **主题聚类**: 将相关文章按主题分组

输出包括:
- 结构化的文章列表（标题、来源、时间、摘要）
- 主题分类和标签
- 关键要点提取
- 相关话题推荐
- 可操作的阅读建议

## Key Advantages

- **多源聚合**: 微信 + 全网 + X 三源合一
- **中文优化**: 针对中文新闻和微信文章优化
- **智能去重**: 相似文章智能合并
- **时间感知**: 优先展示最新、最相关的内容
- **轻量高效**: 专为快速简报场景设计

## Core Workflow

1. **解析用户输入**: 识别查询类型（简报/搜索/追踪）和主题
2. **并行数据获取**: 同时调用多个数据源
   - caidazi: 微信文章、研究报告
   - xiaosu: 全网新闻搜索
   - X: 社交媒体热点
3. **数据清洗**: 去重、过滤、格式化
4. **内容增强**: 生成摘要、提取关键词、分类主题
5. **个性化排序**: 根据用户偏好调整结果顺序
6. **格式化输出**: 生成 markdown/json/chat 格式报告

## Command Surface

Primary script: `scripts/news_briefing.mjs`

### 生成每日简报
```bash
node scripts/news_briefing.mjs brief --type morning
node scripts/news_briefing.mjs brief --type evening --format chat
node scripts/news_briefing.mjs brief --topics "科技,财经" --limit 10
```

### 搜索文章
```bash
node scripts/news_briefing.mjs search --query "人工智能"
node scripts/news_briefing.mjs search --query "特斯拉" --sources caidazi,xiaosu
node scripts/news_briefing.mjs search --query "AI" --days 7 --limit 20
```

### 获取热点
```bash
node scripts/news_briefing.mjs trending
node scripts/news_briefing.mjs trending --category tech
node scripts/news_briefing.mjs trending --sources x
```

### 管理监控列表
```bash
node scripts/news_briefing.mjs watch --action list
node scripts/news_briefing.mjs watch --action add --keyword "比特币"
node scripts/news_briefing.mjs watch --action remove --keyword "特斯拉"
```

## Output Modes

- `markdown` (default): 人类可读的格式化报告
- `json`: 机器可读的完整数据结构
- `chat`: 适合聊天应用的简洁分段输出
- `summary`: 仅包含关键要点的精简模式

## Filter Options

- `--sources caidazi,xiaosu,x`: 指定数据源
- `--days N`: 限定时间范围（最近 N 天）
- `--limit N`: 限制结果数量
- `--category tech|finance|sports|...`: 分类过滤
- `--min-score 0-100`: 最小相关度分数

## Configuration

用户偏好存储在 `config/preferences.json`:
```json
{
  "interests": ["科技", "财经", "AI"],
  "preferred_sources": ["caidazi", "xiaosu"],
  "briefing_time": "08:00",
  "language": "zh",
  "summary_length": "medium"
}
```

监控关键词存储在 `config/watchlist.json`:
```json
{
  "keywords": ["人工智能", "特斯拉"],
  "categories": ["tech", "finance"]
}
```

## Safety and Disclosure

- 仅使用 `QVERIS_API_KEY`
- 仅通过 HTTPS 调用 QVeris API
- 不在日志或输出中存储 API 密钥
- 用户偏好存储在本地 `config/` 目录
- 仅供参考，不构成投资建议

## Daily Brief Analysis Guide

生成简报时，按以下结构组织内容：

### 早报结构
1. **📰 今日头条** (3-5条)
   - 最重要的新闻，一句话总结
2. **💡 深度精选** (2-3篇)
   - 值得细读的文章，附简短推荐理由
3. **🔥 热点追踪**
   - 持续关注话题的最新进展
4. **📊 数据速览**
   - 关键数字和趋势

### 晚报结构
1. **📈 今日回顾**
   - 当天重要事件总结
2. **📰 新增资讯**
   - 晚间发布的重要新闻
3. **🔮 明日关注**
   - 预告次日重要事件
4. **💭 观点摘录**
   - 有价值的评论和分析

### 质量标准
- 优先展示高可信度来源
- 每个主题最多3篇文章，避免信息过载
- 包含时间戳和来源链接
- 关键数字必须准确
- 保持客观中立，不添加主观臆断

## Article Search Guide

搜索文章时，提供结构化的结果：

### 结果结构
1. **找到 N 篇相关文章**
2. **按主题分组展示**:
   - 主题名称
   - 相关文章列表（标题、来源、时间、摘要）
3. **筛选建议**:
   - 如果时间范围太广，建议缩小
   - 如果结果太少，建议扩大关键词
4. **相关搜索推荐**:
   - 基于当前搜索推荐相关主题

### 文章卡片格式
```
📄 文章标题
🏢 来源 | 📅 2024-01-15 | ⏱️ 阅读约3分钟
📝 摘要: ...
🔗 链接
```

## Hot Topics Guide

热点追踪输出格式：

1. **🔥 实时热点** (Top 5-10)
   - 话题名称
   - 热度指数
   - 代表性文章标题
   - 发展趋势（上升/下降/稳定）

2. **📊 趋势分析**
   - 新兴话题
   - 持续热度话题
   - 话题分类分布

3. **💡 洞察建议**
   - 值得关注的趋势
   - 可能的发展预测
