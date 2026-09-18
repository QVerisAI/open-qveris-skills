# QVeris CLI — End-to-End Examples

Copy-pasteable recipes for common agent patterns. For the high-level workflow, see [`../SKILL.md`](../SKILL.md); for full command/flag reference, see [`commands.md`](./commands.md).

---

## Quick Start

### Tier 1 — Installed `qveris` binary

```bash
qveris --version                                    # confirm availability
qveris whoami                                       # confirm auth
qveris discover "weather forecast API" --json       # discover
qveris inspect 1 --json                             # inspect result #1
qveris call 1 --params '{"city":"London","units":"metric"}' --json
```

### Tier 2 — `npx @qverisai/cli` (no install)

```bash
export QVERIS_API_KEY="sk-…"
npx @qverisai/cli discover "weather forecast API" --json
npx @qverisai/cli call 1 --params '{"city":"London"}' --json
```

### Windows PowerShell

```powershell
$env:QVERIS_API_KEY = "sk-…"
qveris discover "weather forecast API" --json
# For non-trivial JSON, use stdin to avoid quoting:
@"
{"city":"London","units":"metric"}
"@ | qveris call 1 --params -
```

---

## Canonical Agent Pattern (discover → inspect → call)

```bash
# 1. Discover; capture the top tool_id
TOOL=$(qveris discover "stock quote real-time API" --json | jq -r '.results[0].tool_id')

# 2. Inspect to confirm parameters
qveris inspect "$TOOL" --json | jq '.results[0].params'

# 3. Call with structured params
qveris call "$TOOL" --params '{"symbol":"AAPL"}' --json \
  | jq '{success, result, cost, elapsed_time_ms}'
```

---

## Recipes by Domain

### Live crypto prices

```bash
qveris discover "crypto pricing API" --json
qveris inspect 1 --json
qveris call 1 --params '{"symbols":["BTC","ETH","SOL"],"vs_currency":"USD"}' --json \
  | jq '.result'
```

### Real-time stock quote

```bash
qveris discover "stock quote real-time API" --json
qveris call 1 --params '{"symbol":"NVDA"}' --json | jq '.result'
```

### Company earnings report

```bash
qveris discover "company earnings report API" --json
qveris call 1 --params '{"ticker":"NVDA","period":"quarterly","limit":4}' --json \
  | jq '.result.reports'
```

### Text-to-image (expensive — dry-run first)

```bash
TOOL=$(qveris discover "text to image generation API" --json | jq -r '.results[0].tool_id')

qveris call "$TOOL" --params '{
  "prompt":"minimalist SaaS hero illustration, isometric, purple gradient",
  "aspect_ratio":"16:9"
}' --dry-run --json                                # validate + preview cost

qveris call "$TOOL" --params '{
  "prompt":"minimalist SaaS hero illustration, isometric, purple gradient",
  "aspect_ratio":"16:9"
}' --json | jq -r '.result.image_url'
```

### Academic paper search

```bash
qveris discover "academic paper search API" --json
qveris call 1 --params '{
  "query":"multi-agent large language models",
  "year_from":2025,
  "limit":20
}' --json | jq '.result.papers[] | {title, year, venue}'
```

### Web search (when no web search tool is configured)

```bash
qveris discover "web search API" --json
qveris call 1 --params '{"query":"EU AI Act compliance 2026","max_results":10}' --json \
  | jq '.result.results[] | {title, url, snippet}'
```

### Weather forecast

```bash
qveris discover "weather forecast API" --json
qveris call 1 --params '{"city":"Beijing","units":"metric","days":3}' --json \
  | jq '.result'
```

### PDF text extraction (from a URL)

```bash
qveris discover "PDF extraction API" --json
qveris call 1 --params '{"url":"https://example.com/report.pdf"}' --max-size -1 --json \
  | jq -r '.result.text'
```

### OCR on an image URL

```bash
qveris discover "OCR API" --json
qveris call 1 --params '{"image_url":"https://example.com/receipt.jpg","language":"en"}' --json \
  | jq -r '.result.text'
```

---

## Handling Large Results

If a `call` response carries `full_content_file_url`, the inline payload is truncated:

```bash
# Approach A — re-run without truncation
qveris call 1 --params @params.json --max-size -1 --json > full.json

# Approach B — download from the returned URL
URL=$(qveris call 1 --params @params.json --json | jq -r '.full_content_file_url')
curl -fsSL -o full.json "$URL"
jq '.' full.json
```

---

## Code Generation (reuse in your own scripts)

After a successful call, emit a reusable snippet:

```bash
qveris call 1 --params '{"city":"London"}' --codegen curl      # bash + curl
qveris call 1 --params '{"city":"London"}' --codegen python    # Python + requests
qveris call 1 --params '{"city":"London"}' --codegen js        # Node.js + fetch
```

---

## Account Helpers

```bash
qveris whoami --json       # auth status, key source, region
qveris credits --json      # credit balance
qveris doctor              # connectivity / Node / key self-check, no credits used
```
