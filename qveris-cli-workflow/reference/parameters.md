# QVeris CLI — Parameters, Exit Codes & Large Results

Operational reference for calling tools reliably: how to pass parameters across shells, how to interpret exit codes, and how to handle results that exceed the inline truncation budget. For high-level workflow, see [`../SKILL.md`](../SKILL.md).

---

## Passing `--params`

The CLI accepts JSON in three input modes. Pick the mode that avoids shell quoting hell.

### Inline JSON (POSIX shells — bash / zsh / WSL)

Wrap the whole JSON in **single quotes** so the shell does not interpret `"` or `$`:

```bash
qveris call 1 --params '{"symbol":"AAPL","limit":10}'
```

### Inline JSON (Windows PowerShell)

PowerShell's quoting rules are different. Two robust options:

```powershell
# Option A — single-quoted string with escaped double quotes
qveris call 1 --params '{\"symbol\":\"AAPL\",\"limit\":10}'

# Option B — here-string piped via stdin (preferred for anything non-trivial)
@"
{"symbol":"AAPL","limit":10}
"@ | qveris call 1 --params -
```

### From a file

Best for complex payloads (nested objects, long prompts, multi-line strings):

```bash
qveris call 1 --params @params.json
```

### From stdin

Pipe-friendly, avoids quoting issues on any platform:

```bash
echo '{"symbol":"AAPL"}' | qveris call 1 --params -
cat params.json | qveris call 1 --params -
```

---

## Parameter Validation Checklist

Before calling a tool:

1. **Run `qveris inspect <id|index> --json`** if you have not seen the tool before. Use the `examples.sample_parameters` as a starting template.
2. **Fill every required parameter** (`required: true` in the schema).
3. **Validate types and formats**:
   - Strings quoted: `"London"`.
   - Numbers unquoted: `42`, not `"42"`.
   - Booleans: `true` / `false`, not `"true"`.
   - Dates: ISO 8601 (`"2026-01-15"`) unless the schema says otherwise.
   - Identifiers: use the canonical form the schema expects (e.g., `"AAPL"`, not `"Apple"`; `"BTC-USD"`, not `"Bitcoin"`).
   - Geo: `lat` / `lng` numbers, or a city name — follow the schema.
4. **Extract structured values** from the user's natural-language request. Do not pass sentences as parameter values (`{"query":"what is AAPL price"}` is wrong — the schema expects `{"symbol":"AAPL"}`).
5. **Validate with `--dry-run`** for expensive tools (media generation, long-form TTS) before spending credits.

---

## Exit Codes

Use these when scripting the CLI or branching in an agent loop.

| Exit code | Meaning | Action |
|-----------|---------|--------|
| `0`  | Success | — |
| `2`  | Usage error (bad arguments) | Fix the command invocation. |
| `69` | Service unavailable | Retry after brief backoff (5–15 s). |
| `75` | Temporary failure (timeout, rate limit) | Retry after brief backoff; on repeated failure, switch tool. |
| `77` | Auth error (invalid key, insufficient credits) | `qveris whoami`, then `qveris credits` or `qveris login`. |
| `78` | Config error (missing key) | Set `QVERIS_API_KEY` or run `qveris login`. |

Any other non-zero exit code → read the `error_message` field in the `--json` output (or the formatted `Error:` line) and follow the Error Recovery ladder in [`../SKILL.md`](../SKILL.md).

---

## Large Result Handling

Some tool calls produce results larger than the inline truncation budget (default 4 KB TTY / 20 KB piped). The CLI handles this by uploading the full payload to object storage and returning a temporary URL.

When the `call` response contains a non-null `full_content_file_url`:

- **Treat the inline `result` as potentially incomplete.** Conclusions drawn from a truncated preview alone (when a full-content URL is present) may be wrong.
- The URL is valid for **~120 minutes**.
- Options to retrieve the full payload, in preference order:

  1. **Re-run with `--max-size -1`** to embed the entire response inline:

     ```bash
     qveris call 1 --params @params.json --max-size -1 --json
     ```

  2. **Download the URL locally** (the CLI usually prints a `curl -o result.json '<url>'` hint):

     ```bash
     curl -fsSL -o result.json '<full_content_file_url>'
     jq '.' result.json
     ```

  3. **Use an approved retrieval tool** (e.g., `http_request`) if available in the agent environment.

- If no retrieval path is available, **tell the user** the result was truncated and expose the `full_content_file_url` so they can fetch it themselves.

---

## Credits & Cost Visibility

Every `call` response includes:

- `cost` — credits consumed by **this** call.
- `credits_remaining` — balance after the call.

You can also query the balance at any time without running a tool:

```bash
qveris credits           # pretty-printed
qveris credits --json    # { "balance": 1234, "currency": "credits" }
```

Use `--dry-run` to validate parameters at zero cost:

```bash
qveris call 1 --params @params.json --dry-run --json
```

A successful dry-run returns `{"success": true, "would_cost": N, "result": null}` — no credits are consumed.

---

## Debugging & Observability

If a call behaves unexpectedly and the error message is not enough:

```bash
qveris doctor                    # connectivity, Node version, key, region — no credits used
qveris --version                 # confirm binary version
qveris whoami --json             # which key source / region is active
```

For request tracing (when supported by the installed CLI version):

- Set `QVERIS_DEBUG=1` to print request / response diagnostics to stderr.
- Every `call` response carries a server-side `request_id` in the JSON body — include it if you open a support ticket.
