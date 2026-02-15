---
name: weather-alerts
description: Weather alerts and air quality (AQI) powered by QVeris. Active alerts by location, current and forecast air pollution via WeatherAPI and OpenWeather.
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
  - "北京天气预警"
  - "上海空气质量 AQI"
  - "London weather alerts"
  - "某地空气污染预报"
---

# Weather Alerts

Weather alerts and air quality via QVeris (WeatherAPI, OpenWeather). Complements generic weather skills with alerts and AQI.

## What This Skill Does

- **Alerts** – Active weather alerts for a location (city name, lat/lon, or IP).
- **AQI** – Current air pollution / AQI for coordinates.
- **Forecast AQI** – Air pollution forecast (when available).

## Command Surface

- `node scripts/weather_alerts.mjs alerts --location London`
- `node scripts/weather_alerts.mjs aqi --lat 39.9 --lon 116.4`
- `node scripts/weather_alerts.mjs aqi-forecast --lat 39.9 --lon 116.4`

## Safety

Uses only `QVERIS_API_KEY`; read-only.
