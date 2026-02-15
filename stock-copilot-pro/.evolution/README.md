# Evolution State

This directory is used for runtime self-learning state.

## Files

- `tool-evolution.json`: generated/updated by `scripts/stock_copilot_pro.mjs`
- `run*.json`: optional local debug outputs (not required for release)

## What It Stores

- Learned `tool_id` entries per capability bucket
- Success/failure counters
- Average execution latency
- Priority queue order for next runs

## What It Must NOT Store

- `QVERIS_API_KEY`
- `Authorization` headers
- Raw full API payloads
- Any user secret or credential

## Behavior

- If the file is missing or corrupted, the script auto-recovers with empty state.
- Learning policy is aggressive: one successful execution can enroll a tool into queue.
- For release upload, keep `tool-evolution.json` if you want a pre-warmed experience.

