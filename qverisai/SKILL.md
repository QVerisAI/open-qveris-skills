---
name: qverisai
description: Search and execute dynamic tools via QVeris API. Use when needing to find and call external APIs/tools dynamically — covers weather, search, stocks, finance, economics, geolocation, AIGC, news, social media, health data, and thousands more. Requires QVERIS_API_KEY environment variable.
env:
  - QVERIS_API_KEY
requirements:
  env_vars:
    - QVERIS_API_KEY
credentials:
  primary: QVERIS_API_KEY
  scope: read-only
  endpoint: https://qveris.ai/api/v1
auto_invoke: true
source: https://qveris.ai
examples:
  - "Show me current weather in Tokyo"
  - "Search for latest tech news"
  - "Check Tesla stock price"
  - "Analyze Apple's financial data"
  - "What is the US GDP growth rate"
  - "Generate an image of a sunset over mountains"
  - "Get trending topics on Twitter"
  - "Find clinical trials for diabetes treatment"
---

# QVeris Tool Search & Execution

QVeris provides dynamic tool discovery and execution - search for tools by capability, then execute them with parameters.

## Setup

Requires environment variable:
- `QVERIS_API_KEY` - Get from https://qveris.ai

No additional dependencies — uses Node.js built-in `fetch`.

## Security

- **Credential**: Only `QVERIS_API_KEY` is accessed. No other env vars or secrets are read.
- **Network**: API key is sent only to `https://qveris.ai/api/v1` over HTTPS. No other endpoints are contacted.
- **Storage**: The key is never logged, cached, or written to disk.
- **Recommendation**: Use a scoped, revocable API key. Monitor usage at https://qveris.ai.

## Quick Start

### Search for tools
```bash
node scripts/qveris_tool.mjs search "weather forecast API"
```

### Execute a tool
```bash
node scripts/qveris_tool.mjs execute openweathermap_current_weather --search-id <id> --params '{"city": "London", "units": "metric"}'
```

## Script Usage

```
node scripts/qveris_tool.mjs <command> [options]

Commands:
  search <query>     Search for tools matching a capability description
  execute <tool_id>  Execute a specific tool with parameters

Options:
  --limit N          Max results for search (default: 10)
  --search-id ID     Search ID from previous search (required for execute)
  --params JSON      Tool parameters as JSON string
  --max-size N       Max response size in bytes (default: 20480)
  --timeout N        Request timeout in seconds (default: 30 for search, 60 for execute)
  --json             Output raw JSON instead of formatted display
```

## Workflow

1. **Search**: Describe the capability needed (not specific parameters)
   - Good: "weather forecast API"
   - Bad: "get weather for London"

2. **Select**: Review tools by `success_rate` and `avg_execution_time`

3. **Execute**: Call tool with `tool_id`, `search_id`, and `parameters`

## Example Session

```bash
# Find weather tools
node scripts/qveris_tool.mjs search "current weather data"

# Execute with returned tool_id and search_id
node scripts/qveris_tool.mjs execute openweathermap_current_weather \
  --search-id abc123 \
  --params '{"city": "Tokyo", "units": "metric"}'
```

## Use Cases

- **Weather**: Get current weather, forecasts for any location
- **Search**: Web search, information retrieval
- **Stocks & Finance**: Query stock prices, historical data, earnings calendars
- **Economics**: GDP, inflation rates, economic indicators
- **Geolocation**: IP lookup, geocoding, reverse geocoding
- **AIGC**: Image generation, text-to-speech, AI content creation
- **News**: Headlines, article search, trending topics
- **Social Media**: Trending topics, post analytics, engagement data
- **Health Data**: Clinical trials, drug info, health statistics
- **And more**: QVeris aggregates thousands of API tools
