---
name: developer-tools
description: Developer utilities powered by QVeris. IP lookup, IP location, and coordinate conversion via weather_api, amap, and related tools.
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
  - "IP 8.8.8.8 归属地"
  - "IP 地址查询"
  - "坐标转换 GPS 百度 高德"
---

# Developer Tools

IP lookup and coordinate conversion via QVeris.

## What This Skill Does

- **Ip** – IP to location / geo.
- **Convert** – Coordinate conversion (when tools available).

## Command Surface

- `node scripts/developer_tools.mjs ip --ip 8.8.8.8`
- `node scripts/developer_tools.mjs ip --ip 1.2.3.4`

## Safety

Uses only `QVERIS_API_KEY`; read-only.
