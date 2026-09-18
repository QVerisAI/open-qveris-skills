# Skill-owned finance CAP bundle

This skill carries the standalone finance bundle aligned to the reviewed installed A-share data, market-intelligence, and factor-screen architecture. Release `2026-08-03.1` derives from baseline `2026-07-29.1` and adds conservative `.BJ` identity/fallback handling to both new skills.

| File | SHA-256 |
|---|---|
| `qveris_finance_adapter.mjs` | `97c1089da398182b93e6d3158e2b4e45dd0f6d989d73016b3d54f5e6dd62dc8d` |
| `qveris_finance_client.mjs` | `ce8758dffb1fdd0bfaad18de0271202268a5ca40aaeac5613a606a7432078893` |
| `qveris_finance_tool.mjs` | `3b922338c01b757aaf9f257a382e9bdf3d3458aeff2c0cd2581463cac242d44c` |
| `qveris_sanitize.mjs` | `77dce831a750fca049ac541efc8c55901da5a661f2a61082f294304d4d2a6e8c` |
| `qveris_workflow_guards.mjs` | `e8fb590d58a53f27a3cb878d47cd6d3085db0e202fe0e7ff962578c0632c4164` |

The five files form one atomic bundle: client transport, logical CAP resolution and parameter adaptation, CLI entry point, recursive sanitization, and shared semantic guards. Do not update one copy independently. Copy all five, update the pinned hashes, and rerun the cross-skill architecture tests.

Workflow-specific validators remain outside this shared bundle. They are responsible for converting a transport success into accepted, degraded, or rejected research evidence.

For Beijing Stock Exchange securities, prefer the exchange-qualified symbol returned by the identity CAP. The adapter recognizes explicit `.BJ` and conservatively maps bare codes beginning in `4` or `8`; ambiguous bare `9` codes are never guessed.
