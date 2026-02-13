# QVeris Skill for OpenClaw

[中文文档](README.zh-CN.md) | English

A skill that enables OpenClaw to dynamically search and execute tools via the QVeris API.

## Features

- **Tool Discovery**: Search for APIs by describing what you need
- **Tool Execution**: Execute any discovered tool with parameters
- **Wide Coverage**: Access weather, stocks, search, currency, and thousands more APIs
- **Zero Extra Dependencies**: Uses only Node.js built-in `fetch` — no Python, no `uv`, no npm install

## Installation

### Prerequisites

- **Node.js 18+** (already present if you have OpenClaw installed)
- **QVERIS_API_KEY** — get your API key at https://qveris.ai

Set your API key:
```bash
export QVERIS_API_KEY="your-api-key-here"
```

### Install the Skill

**Option 1: Install via ClawdHub (Recommended)**
```bash
clawdhub install qveris
```

**Option 2: Install via NPX (For other coding agents)**
```bash
npx skills add hqman/qveris
```

**Option 3: Manual Installation**

Copy this folder to your OpenClaw skills directory:
```bash
cp -r qveris ~/.openclaw/skills/
```

## Usage

Once installed, OpenClaw will automatically use this skill when you ask questions about:
- Weather data
- Stock prices and market analysis
- Web searches
- Currency exchange rates
- And more...

### Manual Commands

```bash
# Search for tools
node scripts/qveris_tool.mjs search "stock price data"

# Execute a tool
node scripts/qveris_tool.mjs execute <tool_id> --search-id <id> --params '{"symbol": "AAPL"}'
```

## Author

[@hqmank](https://x.com/hqmank)

## License

MIT
