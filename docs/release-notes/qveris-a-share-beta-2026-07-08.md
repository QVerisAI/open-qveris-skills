# QVeris A-Share Beta Skills - 2026-07-08

This beta release adds three QVeris-native A-share skills:

- `qveris-a-stock-data-layer`
- `qveris-a-share-factor-screen`
- `qveris-a-share-data`

## What Is Ready

- Natural-language skill invocation after installing `qveris-official` and the skill folders into `~/.codex/skills`, or in a runtime with native `qveris_finance.*` tools.
- Clean WSL Codex end-to-end checks using natural-language prompts for all three skills.
- Fresh WSL Codex end-to-end reruns after the latest agent metadata, fixture/schema, ticker-suffix, heading, and encoding-guardrail changes.
- QVeris-only finance CAP routing in the skill instructions.
- Default Markdown user reports.
- Evidence, data-quality, missing-field, and trace appendix sections.
- No buy/sell, target price, upside/downside, rebalance, or execution-plan output.
- Static Markdown report validation and JSON fixture/schema contract validation in CI via `make validate-finance-reports`.
- `agents/openai.yaml` prompts reviewed for `.SH/.SZ` conventions, coverage-note behavior, `tool_runtime_missing`, trace, data-quality, and missing-field defaults.

## Live Verification Summary

Live smoke tests on 2026-07-08 produced usable QVeris evidence for:

- A-share identity and security master
- quote snapshots
- adjusted and EOD bars
- industry classification
- earnings and corporate-event calendars
- lock-up calendar
- stock-level order-size flow
- top movers as proxy context
- IPO calendar context
- share structure
- tagged news

The fresh factor-screen rerun confirmed that the skill suppresses ranking when factor comparability fails and returns coverage notes instead.

The skills also correctly degrade when QVeris evidence is unavailable, empty, thin, or semantically mismatched.

## Known Beta Limits

These routes or fields are not promoted to complete user-facing evidence yet:

- LHB / Dragon Tiger
- northbound and cross-border flow
- concept heat
- CN ETF option chain
- CAP-based sentiment score
- CAP-based technical indicators
- non-empty analyst research reports
- non-empty news clusters
- sector capital flow unless returned rows explicitly identify sector or concept fields
- any text field that contains mojibake or replacement-character artifacts; those fields are treated as `encoding_artifact` and excluded from user-facing evidence

## Evidence Files

- `reports/qveris-a-share-live-verification-evidence-2026-07-08.md`
- `qveris-a-stock-data-layer/examples/natural-language-live-output-2026-07-08.md`
- `qveris-a-stock-data-layer/examples/codex-clean-e2e-output-2026-07-08.md`
- `qveris-a-stock-data-layer/examples/codex-fresh-e2e-output-2026-07-08.md`
- `qveris-a-share-factor-screen/examples/natural-language-live-output-2026-07-08.md`
- `qveris-a-share-factor-screen/examples/codex-clean-e2e-output-2026-07-08.md`
- `qveris-a-share-factor-screen/examples/codex-fresh-e2e-output-2026-07-08.md`
- `qveris-a-share-data/examples/natural-language-live-output-2026-07-08.md`
- `qveris-a-share-data/examples/codex-clean-e2e-output-2026-07-08.md`
- `qveris-a-share-data/examples/codex-fresh-e2e-output-2026-07-08.md`

`reports/` is git-ignored in this repository, so include those evidence reports with `git add -f` if they should be committed.
