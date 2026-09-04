# QVeris Skill

QVeris skill documentation for OpenClaw and other AI agents using https://qveris.cn.

QVeris is a capability discovery and tool calling engine. Use `discover` to find specialized external API tools, then use `call` to run the selected tool through QVeris.

## What It Does

- Discover tools for real-time data, historical sequences, structured reports, web extraction, PDF workflows, OCR, TTS, translation, image/video generation, and more
- Route all requests through the QVeris API instead of constructing provider-specific endpoints
- Return structured JSON results suitable for agent workflows
- Use only built-in Node.js web APIs plus local helper modules

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

Set the API key in your current shell session:

```bash
export QVERIS_API_KEY="your-api-key-here"
```

## Install

**Option 1: Via ClawHub (recommended)**

```bash
npx clawhub install qveris-cn
```

**Option 2: Manual**

Copy the full `qveris-cn/` directory into your OpenClaw skills directory so the helper modules remain next to `qveris_tool.mjs`:

```bash
cp -R qveris-cn ~/.openclaw/skills/
```

## Usage

Manual usage follows a two-step flow: discover first, then call.

`discover` returns tool candidates and metadata, not final data results. `call` returns the execution result.

```bash
# Discover tools for a capability
node scripts/qveris_tool.mjs discover "stock price API"
node scripts/qveris_tool.mjs discover "text to image generation API" --limit 5

# Call the selected tool
node scripts/qveris_tool.mjs call <tool_id> --discovery-id <discovery_id> --params '{"symbol": "AAPL"}'

# Inspect a known tool by ID
node scripts/qveris_tool.mjs inspect <tool_id>

# Output raw JSON
node scripts/qveris_tool.mjs discover "weather forecast API" --json
node scripts/qveris_tool.mjs call <tool_id> --discovery-id <discovery_id> --params '{"city": "London"}' --json
```

## Notes

- Write discovery queries as English capability descriptions for best results
- Do not construct API URLs manually; use the provided script
- Keep sensitive credentials and PII out of discovery queries and tool parameters

## License

MIT
