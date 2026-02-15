---
name: location-service
description: Location and POI search powered by QVeris. Nearby POI, keyword place search, POI detail, and IP location via Amap and Baidu Map.
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
  - "北京朝阳区附近餐厅"
  - "上海浦东加油站"
  - "IP 地址归属地查询"
  - "某地点详情 营业时间 电话"
---

# Location Service

POI and IP location via QVeris (Amap, Baidu Map).

## What This Skill Does

- **Around** – Nearby POI (restaurant, gas, bank, etc.) by location/keyword.
- **Search** – Place keyword search in a city.
- **Detail** – POI detail (hours, phone, etc.).
- **Ip** – IP to location.

## Command Surface

- `node scripts/location_service.mjs around --location 116.4,39.9 --keyword 餐厅`
- `node scripts/location_service.mjs search --keyword 加油站 --city 上海`
- `node scripts/location_service.mjs detail --id <poi_id>`
- `node scripts/location_service.mjs ip --ip 8.8.8.8`

## Safety

Uses only `QVERIS_API_KEY`; read-only.
