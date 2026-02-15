---
name: news-briefing
description: News and WeChat article search powered by QVeris. Hot topics, keyword news, public account articles, and X news via caidazi, xiaosu, x_developer.
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
  - "搜索今日科技热点"
  - "茅台 基金 相关资讯"
  - "微信公众号文章 关键词"
  - "X 新闻搜索"
---

# News Briefing

News and WeChat article search via QVeris (caidazi, xiaosu, X news).

## What This Skill Does

- **News** – Keyword/news search (industry, keyword, time).
- **WeChat** – Public account article search.
- **Smart search** – General smart search.

## Command Surface

- `node scripts/news_briefing.mjs news --keyword 科技`
- `node scripts/news_briefing.mjs wechat --keyword 投资`
- `node scripts/news_briefing.mjs search --query 热点`

## Safety

Uses only `QVERIS_API_KEY`; read-only.
