# QVeris CLI — Command Reference

Full reference for every `qveris` subcommand, global flag, and configuration detail. For high-level workflow, see [`../SKILL.md`](../SKILL.md).

---

## Core Commands

| Command | Description |
|---------|-------------|
| `qveris discover <query> [--limit N] [--json]` | Find capabilities by **capability-type description**. Prints tool name, provider, `tool_id`, description, relevance / success / latency / cost. |
| `qveris inspect <id\|index> [<id2> …] [--json]` | Print full tool details: parameters (type, required, description, enum values), example, provider info. |
| `qveris call <id\|index> --params <json\|@file\|-> [--dry-run] [--codegen curl\|python\|js] [--max-size N] [--json]` | Execute a capability. Returns result, execution time, cost, remaining credits. |

**`<index>`** is the 1-based position from the most recent `discover` output (the CLI remembers the last discovery session on disk).
**`<id>`** is the full `tool_id` (e.g., `alphavantage.quote.execute.v1`).

### `qveris discover`

```bash
qveris discover "<english capability description>" [--limit N] [--json]
```

- `--limit N`  limit the number of candidates (default: 10)
- `--json`     machine-readable output (recommended for agents)

Returns JSON of shape:

```json
{
  "search_id": "disc_abc123",
  "results": [
    {
      "tool_id": "alphavantage.quote.execute.v1",
      "name": "Alpha Vantage Quote",
      "description": "Real-time stock quote by symbol",
      "stats": {
        "success_rate": 0.97,
        "avg_execution_time_ms": 820,
        "avg_cost": 1
      },
      "params": [
        { "name": "symbol", "type": "string", "required": true, "description": "Ticker symbol, e.g. AAPL" }
      ],
      "examples": {
        "sample_parameters": { "symbol": "AAPL" }
      }
    }
  ]
}
```

### `qveris inspect`

```bash
qveris inspect 1 --json
qveris inspect alphavantage.quote.execute.v1 --json
qveris inspect 1 2 3 --json    # inspect multiple in one call
```

Same result shape as `discover.results[*]` but with full parameter schemas, enums, and sample values.

### `qveris call`

```bash
qveris call 1 --params '{"symbol":"AAPL"}' --json
qveris call alphavantage.quote.execute.v1 --params @params.json --json
echo '{"symbol":"AAPL"}' | qveris call 1 --params - --json
```

Key flags:

- `--dry-run`                    Validate parameters without consuming credits (recommended before expensive calls).
- `--codegen curl|python|js`     After a successful call, emit a reusable snippet for that language/client.
- `--max-size N`                 Response size limit in bytes (`-1` = unlimited). Defaults: 4 KB in TTY, 20 KB in pipes / with `--json`.
- `--json`                       Machine-readable output.

Returns JSON of shape:

```json
{
  "success": true,
  "result": { "...tool-specific payload..." },
  "elapsed_time_ms": 842,
  "cost": 1,
  "credits_remaining": 1234,
  "error_message": null,
  "full_content_file_url": null
}
```

---

## Account & Configuration

| Command | Description |
|---------|-------------|
| `qveris login [--token <key>]` | Authenticate. Interactive region selection; `--token` for non-interactive. |
| `qveris logout` | Remove stored key. |
| `qveris whoami` | Show current auth status, key source (`env` / `config` / `flag`), and region. |
| `qveris credits` | Show credit balance. |
| `qveris doctor` | Self-check: Node version, key presence, region, connectivity. Does **not** consume credits. |
| `qveris config list\|set\|get\|reset\|path` | Manage `~/.config/qveris/config.json`. |
| `qveris completions bash\|zsh\|fish` | Shell completion scripts. |
| `qveris interactive` | REPL mode (discover / inspect / call / codegen in one session). |

---

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` / `-j` | Machine-readable JSON output (recommended for agents). |
| `--api-key <key>` | Override API key for a single command. |
| `--timeout <seconds>` | Request timeout. |
| `--max-size <bytes>` | Response size limit (`-1` = unlimited). |
| `--no-color` | Disable ANSI colors. |
| `--base-url <url>` | Override the API base URL (advanced — usually set via `QVERIS_BASE_URL`). |
| `--version` / `-V` | Print version. |
| `--help` / `-h` | Show help. |

---

## Credential Resolution Order

`--api-key` flag > `QVERIS_API_KEY` env var > config file (`~/.config/qveris/config.json`, respects `XDG_CONFIG_HOME`).

## Region Selection

| Key prefix | Region | Base URL |
|------------|--------|----------|
| `sk-…`     | Global | `https://qveris.ai/api/v1` |
| `sk-cn-…`  | China  | `https://qveris.cn/api/v1` |

Override via `QVERIS_REGION=cn` or `QVERIS_BASE_URL=https://custom.endpoint/api/v1` or `--base-url`.

---

## Running via `npx` (no install)

Everywhere you see `qveris …`, you can substitute `npx @qverisai/cli …`:

```bash
npx @qverisai/cli --version
npx @qverisai/cli discover "weather forecast API" --json
npx @qverisai/cli call 1 --params '{"city":"London"}' --json
```

The first invocation downloads the package to the npx cache; subsequent calls reuse it.
