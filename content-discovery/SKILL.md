---
name: content-discovery
description: Content and product discovery powered by QVeris. Taobao product search, Xiaohongshu notes, and Kuaishou video search via justoneapi.
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
  - "淘宝 手机 搜索"
  - "小红书 美妆 笔记"
  - "快手 视频 搜索"
  - "好物推荐 种草"
---

# Content Discovery

Product and social content search via QVeris (Taobao, Xiaohongshu, Kuaishou).

## What This Skill Does

- **Taobao** – Product search.
- **Xiaohongshu** – Note search.
- **Kuaishou** – Video search.

## Command Surface

- `node scripts/content_discovery.mjs taobao --keyword 手机`
- `node scripts/content_discovery.mjs xiaohongshu --keyword 美妆`
- `node scripts/content_discovery.mjs kuaishou --keyword 美食`

## Safety

Uses only `QVERIS_API_KEY`; read-only.
