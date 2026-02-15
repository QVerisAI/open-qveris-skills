# Weather Alerts

Weather alerts and air quality (AQI) skill for OpenClaw, powered by QVeris.

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

## Usage

```bash
export QVERIS_API_KEY="your-key"
node scripts/weather_alerts.mjs alerts --location London
node scripts/weather_alerts.mjs aqi --lat 39.9 --lon 116.4
node scripts/weather_alerts.mjs aqi-forecast --lat 39.9 --lon 116.4
```

Options: `--format json`, `--timeout N`.
