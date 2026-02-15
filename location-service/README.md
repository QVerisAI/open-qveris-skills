# Location Service

POI and IP location skill for OpenClaw, powered by QVeris (Amap, Baidu Map).

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

## Usage

```bash
export QVERIS_API_KEY="your-key"
node scripts/location_service.mjs around --location 116.4,39.9 --keyword 餐厅
node scripts/location_service.mjs search --keyword 加油站 --city 上海
node scripts/location_service.mjs detail --id <poi_id>
node scripts/location_service.mjs ip --ip 8.8.8.8
```

Options: `--limit N`, `--format json`, `--timeout N`.
