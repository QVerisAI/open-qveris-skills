# QVeris A-Share User-Readiness Evidence - 2026-07-08

This note records the user-readiness work for the three QVeris A-share beta skills:

| Skill | Source candidate | Original repository | QVeris skill role |
|---|---:|---|---|
| `qveris-a-stock-data-layer` | 58 | https://github.com/simonlin1212/a-stock-data | Broad A-share data-layer coverage note |
| `qveris-a-share-factor-screen` | 32 | https://github.com/ZhuLinsen/alphasift | A-share factor coverage and research screen |
| `qveris-a-share-data` | 57 | https://github.com/shouldnotappearcalm/a-share-skill | Quote, bars, technical-context, event, sector, and news read |

## What Was Completed

- Added README entry points so users can choose the right A-share skill, install `qveris-official` when needed, and see current beta boundaries.
- Added a release note at `docs/release-notes/qveris-a-share-beta-2026-07-08.md`.
- Added CI workflow `.github/workflows/validate-finance-reports.yml` to run `make validate-finance-reports`.
- Made each skill installable as a self-contained Codex skill by including local `references/` copies for the shared data-quality rubric, retry policy, and CAP registry snapshot.
- Added WSL clean Codex end-to-end output records for all three skills:
  - `qveris-a-stock-data-layer/examples/codex-clean-e2e-output-2026-07-08.md`
  - `qveris-a-share-factor-screen/examples/codex-clean-e2e-output-2026-07-08.md`
  - `qveris-a-share-data/examples/codex-clean-e2e-output-2026-07-08.md`
- Added fresh WSL Codex end-to-end output records after the latest `agents/openai.yaml`, JSON fixture/schema, `.SH/.SZ`, heading, and encoding-guardrail updates:
  - `qveris-a-stock-data-layer/examples/codex-fresh-e2e-output-2026-07-08.md`
  - `qveris-a-share-factor-screen/examples/codex-fresh-e2e-output-2026-07-08.md`
  - `qveris-a-share-data/examples/codex-fresh-e2e-output-2026-07-08.md`
- Added both clean and fresh e2e records to `make validate-finance-reports`.
- Added JSON fixture/schema validation for the six finance skills covered by `make validate-finance-reports`.
- Reviewed and updated each A-share `agents/openai.yaml` default prompt so it reflects `.SH/.SZ`, coverage-note behavior, `tool_runtime_missing`, heading, trace, and missing-field expectations.
- Added an explicit `encoding_artifact` guardrail so mojibake or replacement-character text fields are excluded from user-facing evidence and recorded in `missing_fields` / `data_quality`.

## Clean WSL Codex Evidence

The three skills were installed into the WSL Codex skill directory before the clean run:

```text
/home/wjh/.codex/skills/qveris-a-stock-data-layer
/home/wjh/.codex/skills/qveris-a-share-factor-screen
/home/wjh/.codex/skills/qveris-a-share-data
```

WSL native Codex discovery confirmed all three skills were visible:

```text
qveris-a-share-data: yes
qveris-a-share-factor-screen: yes
qveris-a-stock-data-layer: yes
```

The clean end-to-end runs used natural-language prompts, not hand-written JSON calls. The outputs show the expected user-facing contract:

- Markdown report by default.
- QVeris-only trace labels using `qveris_finance.*`.
- No web fallback.
- No provider names in the user-facing trace.
- No buy/sell, target price, upside/downside, rebalance, or execution plan.
- Partial CAP failures become `missing_fields` and `data_quality` entries instead of fabricated facts.

Fresh reruns were executed from WSL native Codex after the latest skill edits. They used natural-language prompts and produced validator-clean Markdown reports:

```text
qveris-a-share-data/examples/codex-fresh-e2e-output-2026-07-08.md
qveris-a-share-factor-screen/examples/codex-fresh-e2e-output-2026-07-08.md
qveris-a-stock-data-layer/examples/codex-fresh-e2e-output-2026-07-08.md
```

The factor-screen fresh output did not emit a cross-sectional rank because comparability gates failed; it returned coverage notes and per-name missing fields instead.

## Validation Evidence

`make validate-finance-reports` passed in WSL after adding the clean e2e records:

```text
ok: qveris-a-stock-data-layer/examples/default-markdown-report.md
ok: qveris-a-stock-data-layer/examples/natural-language-test-output-2026-07-08.md
ok: qveris-a-stock-data-layer/examples/natural-language-live-output-2026-07-08.md
ok: qveris-a-stock-data-layer/examples/codex-clean-e2e-output-2026-07-08.md
ok: qveris-a-stock-data-layer/examples/codex-fresh-e2e-output-2026-07-08.md
ok: qveris-a-share-factor-screen/examples/default-markdown-report.md
ok: qveris-a-share-factor-screen/examples/natural-language-test-output-2026-07-08.md
ok: qveris-a-share-factor-screen/examples/natural-language-live-output-2026-07-08.md
ok: qveris-a-share-factor-screen/examples/codex-clean-e2e-output-2026-07-08.md
ok: qveris-a-share-factor-screen/examples/codex-fresh-e2e-output-2026-07-08.md
ok: qveris-a-share-data/examples/default-markdown-report.md
ok: qveris-a-share-data/examples/natural-language-test-output-2026-07-08.md
ok: qveris-a-share-data/examples/natural-language-live-output-2026-07-08.md
ok: qveris-a-share-data/examples/codex-clean-e2e-output-2026-07-08.md
ok: qveris-a-share-data/examples/codex-fresh-e2e-output-2026-07-08.md
```

JSON fixtures for the three A-share skills also parsed successfully:

```text
ok: qveris-a-share-data/fixtures/qveris/budget-limited-output.json
ok: qveris-a-share-data/fixtures/qveris/fallback-output.json
ok: qveris-a-share-data/fixtures/qveris/sample-output.json
ok: qveris-a-share-factor-screen/fixtures/qveris/budget-limited-output.json
ok: qveris-a-share-factor-screen/fixtures/qveris/fallback-output.json
ok: qveris-a-share-factor-screen/fixtures/qveris/sample-output.json
ok: qveris-a-stock-data-layer/fixtures/qveris/budget-limited-output.json
ok: qveris-a-stock-data-layer/fixtures/qveris/fallback-output.json
ok: qveris-a-stock-data-layer/fixtures/qveris/sample-output.json
```

The CI validator now checks JSON fixtures against each skill's `schemas/output.schema.json`, including `qveris_trace.tool_name` and `qveris_trace.capability_id` normalization to `qveris_finance.*`.

Scoped whitespace validation for the A-share skill deliverables passed:

```text
git diff --check -- Makefile README.md references/qveris-finance-cap-registry-snapshot-2026-07-07.md references/qveris-finance-retry-policy.md docs/release-notes/qveris-a-share-beta-2026-07-08.md docs/evidence/qveris-a-share-user-readiness-evidence-2026-07-08.md .github/workflows/validate-finance-reports.yml qveris-a-share-data qveris-a-share-factor-screen qveris-a-stock-data-layer
```

## User-Ready Behavior

These beta skills are ready for controlled user testing when the user expects an auditable research note rather than a complete A-share data terminal. A natural-language user can ask:

```text
Use qveris-a-share-data to make a 30-day quote, bars, technical-context, event, and news read for 600519.SH.
Use qveris-a-share-factor-screen to run a research screen for 600519.SH, 000001.SZ, and 000858.SZ.
Use qveris-a-stock-data-layer to make an A-share data-layer coverage note for 600519.SH.
```

The skills should automatically apply:

- QVeris-only data acquisition.
- Markdown user report output.
- Trace-backed evidence.
- Missing-field and data-quality disclosure.
- Hard rejection for wrong entity, wrong window, wrong fiscal period, stale payload, too-thin bars, and noisy tagged news.
- Investment-advice suppression.

## Remaining Beta Limits

These are product/data-platform limits, not blockers for beta usage:

- A-share specialty CAPs are not complete enough to promise full coverage for LHB, northbound/cross-border flow, concept heat, CN ETF option chains, CAP sentiment score, CAP technical indicators, non-empty research reports, or non-empty news clusters.
- Some QVeris routes returned 503, 422, empty payloads, stale timestamps, or semantic mismatches during live smoke testing.
- The skills intentionally keep those fields conditional or missing until current `cap-detail` and live output prove the route and fields.
- Full GA should wait for repeated clean-session tests across more symbols, markets, and trading days.

Bottom line: the three skills are natural-language usable, QVeris-only, auditable, and honest under data degradation. They are beta-ready, while long-tail A-share CAP depth remains the main path to GA.
