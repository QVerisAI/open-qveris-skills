# QVeris Third-Party Finance Beta Evidence - 2026-07-09

## Source Snapshots

| Candidate | Source repo | Local snapshot | Snapshot commit |
|---:|---|---|---|
| 42 | https://github.com/RKiding/Awesome-finance-skills | `third_party/source_repos/42-awesome-finance-skills` | `853f09b` on 2026-03-29 |
| 37 | https://github.com/daymade/claude-code-skills | `third_party/source_repos/37-daymade-claude-code-skills` | `d2d566f` on 2026-07-06 |
| 34 | https://github.com/wbh604/UZI-Skill | `third_party/source_repos/34-uzi-skill` | `fce996c` on 2026-07-07 |

`third_party/source_repos/` is ignored by the repository and used as a local evaluation cache, so the PR carries adaptation files and evidence rather than vendored source trees.

## Adaptation Notes

| Source | Preserved intent | Removed or downgraded runtime behavior |
|---|---|---|
| AlphaEar | Stock lookup, price/fundamental context, news, sentiment, signal monitoring, structured report writing. | Direct public feeds, local models, local databases, prediction markets, and forecasts. Forecast-like outputs are downgraded to monitoring notes. |
| Daymade Financial Suite | Financial data collection, strict no-default missing-field handling, structured news/research/event pipelines, industry or pharma daily monitor. | Direct SDKs, direct public endpoints, credential setup, chat delivery, and non-QVeris source routing. |
| UZI-Skill | Deep equity research, valuation frameworks, LHB/flow context, trap-risk review, IC-style report surface. | Persona voting, action-oriented conclusions, local scripts/caches, browser fallback, target outputs, and trading instructions. |

## Product Contract

The three skills should work from natural-language requests without the user repeating safety constraints. Each skill knows to:

- Use QVeris finance CAP evidence only.
- Produce Markdown user reports by default.
- Include concise trace in the report and full trace in fixtures or appendix when needed.
- Mark missing fields and data quality when CAP calls fail, return empty payloads, or pass transport but fail semantic validation.
- Avoid investment advice, target output, upside/downside, buy/sell language, rebalancing, and execution plans.

## Technical Contract

Each new skill includes:

- `SKILL.md`
- `agents/openai.yaml`
- `references/qveris-tool-map.md`
- `references/qveris-finance-data-quality-rubric.md`
- `references/qveris-finance-retry-policy.md`
- `references/qveris-finance-cap-registry-snapshot-2026-07-07.md`
- `schemas/output.schema.json`
- `fixtures/qveris/sample-output.json`
- `fixtures/qveris/fallback-output.json`
- `fixtures/qveris/budget-limited-output.json`
- `examples/default-markdown-report.md`
- `examples/natural-language-prompts.md`
- `examples/natural-language-test-output-2026-07-09.md`
- `examples/codex-fresh-live-output-2026-07-09.md`

## Reviewer Fixes Applied

- `limited` and `budget_limited` are now formally defined in the shared data-quality rubric and the three bundled skill copies. User-facing evidence status should prefer `complete`, `partial`, `proxy_only`, or `insufficient`; `limited` remains mainly a `data_quality.status` value.
- Static default examples no longer put planned or required calls in `Evidence` or `Trace Appendix`. They place required next calls in Data Quality And Missing Fields, and Trace Appendix states that no live trace exists for the static example.
- Fresh live output records were added for all three skills. The live CAP attempts returned `fetch failed`, so the outputs show `Evidence status: insufficient`, `data_quality.status: limited`, missing fields, and real failed trace rows.
- Default `max_calls` policy was intentionally left unchanged in this batch.
- AlphaEar sentiment output is now framed as a sentiment coverage check unless `qveris_finance.sentiment_text_signals` returns issuer-matched non-empty signal/text cue/score fields.
- Daymade financial packs now document canonical valuation aliases and same-period IS/CF semantic reconciliation before aligned table use.
- UZI A-share research now includes an A-share availability matrix and one-attempt canonical CAP ID fallback for explicitly requested LHB/flow layers when discovery is unavailable.
- Sanitized JSON trace fixtures and schemas no longer allow `source_provider`; the fixture validator fails if provider fields appear.

## Finance Data-Quality Rules

Hard rejects are treated as normal paths:

- Wrong entity, market, asset type, benchmark, or currency.
- Wrong date window or fiscal period.
- Annual/FY statement requests returning latest-quarter or TTM-shaped payloads after stricter retry.
- Fewer than 2 bars supporting a multi-day metric.
- Empty relevant fields, weak research relevance, entity-mixed news, or corrupted text.
- Empty sentiment `signal`, `text_cue`, score, or label fields cannot support a sentiment read.
- Tagged news used as numeric sentiment, strong catalyst, or directional risk without a stronger QVeris sentiment or cluster result.

## CAP Caveats Remaining

These capabilities remain beta or conditional until live `cap-detail` and payload validation confirm them for the current run:

- News clusters and sentiment scores.
- A-share LHB, large-order flow, northbound flow, concept heat, sector heat, lock-up and limit-move details.
- CN ETF option chains and technical indicator CAPs.
- Non-empty analyst or research reports with validated issuer/report/date fields.
- Pharma or sector daily specialty fields.
- Forecast-like or prediction-style outputs.

The skill-side behavior is complete for beta: unsupported or unstable CAPs become `missing_fields` and `data_quality` warnings rather than invented analysis.

## Validation Evidence

Recorded locally on 2026-07-09:

| Check | Result |
|---|---|
| `python3 third_party/source_repos/42-awesome-finance-skills/skills/skill-creator/scripts/quick_validate.py qveris-alphaear-market-intelligence` | `Skill is valid!` |
| `python3 third_party/source_repos/42-awesome-finance-skills/skills/skill-creator/scripts/quick_validate.py qveris-daymade-financial-data-suite` | `Skill is valid!` |
| `python3 third_party/source_repos/42-awesome-finance-skills/skills/skill-creator/scripts/quick_validate.py qveris-uzi-equity-research` | `Skill is valid!` |
| `python3 scripts/validate_qveris_finance_fixtures.py qveris-alphaear-market-intelligence qveris-daymade-financial-data-suite qveris-uzi-equity-research` | `ok: 9 QVeris finance JSON fixtures validated` |
| `python3 scripts/validate_qveris_finance_fixtures.py` | `ok: 27 QVeris finance JSON fixtures validated` |
| `python3 scripts/validate_qveris_finance_report.py --self-test` | `ok: self-test` |
| New-skill Markdown report validation | 9 new report examples passed |
| `make validate-finance-reports` | Passed across the existing six finance skills plus the three new skills |
| Provider leak grep on new examples and fixtures | No matches |
| Advice/action-word grep on new Markdown examples | No matches |
| Naked A-share ticker grep on new Markdown examples | No matches |
| Mojibake grep on new skill files and docs | No matches |
| Installed-copy check under current Codex skills directory | Three new `SKILL.md` files and local shared references present |
| `git diff --check` | Passed; Git reported line-ending warnings only |
| Minimal live CAP smoke for `qveris_finance.ref_symbology` / `qveris_finance.ref_security_master` | Attempted from PowerShell with a QVeris credential present; all three calls returned `fetch failed` |

The unrelated untracked `docs/evidence/qveris-a-share-three-skills-complete-report-2026-07-08.md` file was intentionally left outside this batch.

Live CAP smoke commands attempted:

```text
node qveris-official/scripts/qveris_tool.mjs cap-query qveris_finance.ref_symbology --param symbol=TSLA --param market=US --safe-json
node qveris-official/scripts/qveris_tool.mjs cap-query qveris_finance.ref_security_master --param symbol=NVDA --param market=US --safe-json
node qveris-official/scripts/qveris_tool.mjs cap-query qveris_finance.ref_symbology --param symbol=600519.SH --param market=CN --safe-json
```

All three returned `Error: fetch failed`. This does not invalidate the beta package; it confirms the need for the built-in failure path: limited retry, `missing_fields`, `data_quality`, and no inferred facts.
