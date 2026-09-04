# QVeris Third-Party Finance Beta Skills - 2026-07-09

## Summary

This release adds three QVeris-only beta skills adapted from third-party finance skill repositories:

| Candidate | Source repo | QVeris skill | License |
|---:|---|---|---|
| 42 | https://github.com/RKiding/Awesome-finance-skills | `qveris-alphaear-market-intelligence` | Apache-2.0 |
| 37 | https://github.com/daymade/claude-code-skills | `qveris-daymade-financial-data-suite` | MIT |
| 34 | https://github.com/wbh604/UZI-Skill | `qveris-uzi-equity-research` | MIT |

The skills are beta quality-gated: natural-language usable, QVeris-only, Markdown-first, trace-backed, and designed to degrade honestly when QVeris CAP data is unavailable or semantically invalid.

## What Changed

- Added one QVeris skill per source repository.
- Added local shared references for the finance data-quality rubric, retry policy, CAP registry snapshot, and each skill-specific QVeris tool map.
- Added JSON fixtures for sample, fallback, and budget-limited paths.
- Added Markdown examples and natural-language prompt examples.
- Added the new skills to README installation and example-prompt sections.
- Added the new skills to default finance fixture and Markdown report validation.

## Runtime Contract

- Runtime data source is `qveris_finance.*` only.
- The repository `qveris-official` CLI is a repo-root development fallback when native QVeris tools are not exposed.
- Standalone copied skill folders require either native `qveris_finance.*` tools or a copied `qveris-official` folder.
- Trace rows expose normalized `qveris_finance.*` tool and capability names only.
- User reports default to Markdown with Summary, Evidence, Analysis, Data Quality And Missing Fields, Trace Appendix, and `Not investment advice.`

## Remaining Beta Caveats

- CAP live availability can still vary by route, date, market, and parameter shape.
- AlphaEar forecast and signal tooling is intentionally downgraded to monitoring context.
- Daymade data pipelines are implemented as QVeris data-quality packs and daily-monitor reports, not as direct external SDK pipelines.
- UZI valuation, LHB, and trap-risk flows are method audits and monitoring notes, not trading conclusions.
- Specialty A-share, sector, pharma, sentiment, research, cluster, and flow capabilities remain conditional unless current `cap-detail` confirms callable fields and returned payloads pass semantic validation.

## Validation

Expected validation commands:

```bash
python3 /mnt/c/Users/19072/.codex/skills/.system/skill-creator/scripts/quick_validate.py qveris-alphaear-market-intelligence
python3 /mnt/c/Users/19072/.codex/skills/.system/skill-creator/scripts/quick_validate.py qveris-daymade-financial-data-suite
python3 /mnt/c/Users/19072/.codex/skills/.system/skill-creator/scripts/quick_validate.py qveris-uzi-equity-research
python3 scripts/validate_qveris_finance_fixtures.py
make validate-finance-reports
```
