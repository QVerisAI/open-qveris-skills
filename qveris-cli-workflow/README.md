# QVeris CLI Workflow Skill

Skill documentation for the **`qveris` command-line client** (`@qverisai/cli`), for use by
OpenClaw, ClawHub, and other AI agents that can execute shell commands.

QVeris is a capability discovery and tool calling engine. Use `qveris discover` to find
specialized external API tools, `qveris inspect` to review their parameter schemas, and
`qveris call` to execute them. All requests are routed through the QVeris API.

## What It Does

- Discover tools for real-time data, historical sequences, structured reports, web
  extraction, PDF workflows, OCR, TTS, translation, image/video generation, and more
- Route every request through a single, zero-dependency binary (`qveris`)
- Auto-detect agent/script contexts (non-TTY, `--json`) and raise truncation thresholds
  accordingly
- Support region routing (global `qveris.ai` vs China `qveris.cn`) via the API key
  prefix — no manual base URL juggling

## Requirements

- Node.js 18+
- `QVERIS_API_KEY` (get one from https://qveris.ai for the global region or from
  https://qveris.cn for the China region)
- Either the `qveris` CLI installed globally, or `npx` available to run
  `npx @qverisai/cli …`

Set the API key in the current shell session:

```bash
# Linux / macOS / WSL
export QVERIS_API_KEY="sk-…"

# Windows PowerShell
$env:QVERIS_API_KEY = "sk-…"
```

Or run `qveris login` for an interactive flow that stores the key at
`~/.config/qveris/config.json` (respects `XDG_CONFIG_HOME`).

## Install

**Option 1: One-liner (recommended)**

```bash
curl -fsSL https://qveris.ai/cli/install | bash
```

**Option 2: npm global install**

```bash
npm install -g @qverisai/cli
```

**Option 3: Run without installing**

```bash
npx @qverisai/cli discover "stock price API"
```

**Option 4: Manual skill install**

Copy the full `qveris-cli-workflow/` directory (including `reference/`) into your
agent's skills directory. The path depends on the host agent — OpenClaw uses
`~/.openclaw/skills/`, Cursor uses `~/.cursor/skills/`, etc.

```bash
cp -R qveris-cli-workflow ~/.openclaw/skills/   # OpenClaw; substitute your agent's path
```

For a scripted install, see [`instruct.md`](./instruct.md).

## Usage

The standard flow is **discover → inspect → call**. `discover` returns tool candidates
and metadata (not data); `call` returns the execution result.

```bash
# Discover tools for a capability
qveris discover "stock price API"
qveris discover "text to image generation API" --limit 5

# Inspect a tool by index (from the last discover) or by tool_id
qveris inspect 1
qveris inspect alphavantage.quote.execute.v1

# Call the selected tool
qveris call 1 --params '{"symbol":"AAPL"}'
qveris call alphavantage.quote.execute.v1 --params '{"symbol":"AAPL"}'

# From a file or stdin (useful on Windows / for large payloads)
qveris call 1 --params @params.json
echo '{"symbol":"AAPL"}' | qveris call 1 --params -

# Dry-run (no credits consumed)
qveris call 1 --params '{"symbol":"AAPL"}' --dry-run

# Machine-readable output (agents / scripts)
qveris discover "weather forecast API" --json
qveris call 1 --params '{"city":"London"}' --json

# Full result, no truncation
qveris call 1 --params '{"city":"London"}' --max-size -1

# Generate a reusable snippet after a successful call
qveris call 1 --params '{"city":"London"}' --codegen curl      # bash + curl
qveris call 1 --params '{"city":"London"}' --codegen python    # Python + requests
qveris call 1 --params '{"city":"London"}' --codegen js        # Node.js + fetch
```

Account helpers:

```bash
qveris whoami     # auth status, key source, region
qveris credits    # credit balance
qveris doctor     # connectivity / node version / key self-check
```

## Agent pattern

```bash
# discover → select → call, all as pipeable JSON
TOOL=$(qveris discover "stock quote real-time API" --json | jq -r '.results[0].tool_id')
qveris call "$TOOL" --params '{"symbol":"AAPL"}' --json | jq '.result'
```

## Notes

- Write discovery queries as **English tool-type descriptions**, not factual
  questions or entity names (see [`SKILL.md`](./SKILL.md) for the full rule).
- Do not construct QVeris HTTP URLs manually; use the CLI — it handles
  authentication, region routing, and response shaping.
- Keep sensitive credentials and PII out of discovery queries and tool parameters.
- When `qveris` is not on `PATH`, fall back to `npx @qverisai/cli …`. When shell
  execution itself is unavailable, fall back to the `qveris-official` skill, which
  uses `http_request`.

## File Layout

| File | Purpose |
|---|---|
| [`SKILL.md`](./SKILL.md) | Core skill: when to use QVeris, discovery query rules, tool selection, cost & error recovery, common mistakes. |
| [`instruct.md`](./instruct.md) | Install / upgrade / first-time setup flow (Bash + PowerShell). |
| [`reference/commands.md`](./reference/commands.md) | Full reference for every `qveris` subcommand, global flag, and config. |
| [`reference/parameters.md`](./reference/parameters.md) | Passing `--params` across shells, validation, exit codes, large-result handling, debugging. |
| [`reference/examples.md`](./reference/examples.md) | Copy-pasteable end-to-end recipes by domain (crypto, stocks, earnings, image gen, …). |

## License

MIT
