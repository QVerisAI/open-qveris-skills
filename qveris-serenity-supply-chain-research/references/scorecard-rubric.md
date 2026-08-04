# Evidence-bound scorecard rubric

Use this rubric only after `serenity_validity.mjs` accepts at least three fully comparable candidates. A missing factor is not zero; it prevents scoring. A rating of zero requires accepted evidence that the measured property is absent or materially adverse.

## Formula

| Factor | Weight |
|---|---:|
| `demand_pressure` | 15 |
| `system_coupling` | 10 |
| `scarcity_mechanism` | 15 |
| `supplier_concentration` | 12 |
| `expansion_difficulty` | 12 |
| `evidence_quality` | 15 |
| `valuation_context` | 11 |
| `event_visibility` | 10 |

Factor points are `rating / 5 * weight`. Each fixed risk penalty subtracts `rating * 2`. The bounded result is 0–100 and represents research priority only.

Priority bands: 85–100 `Top research priority`; 70–84.99 `High research priority`; 55–69.99 `Worth tracking`; below 55 `Early lead or low priority`.

## Scarce-layer formula

| Criterion | Weight |
|---|---:|
| `constrained_function_criticality` | 35 |
| `scarcity_mechanism_strength` | 30 |
| `substitution_difficulty` | 20 |
| `evidence_quality` | 15 |

Each layer criterion is a `{rating, evidence_ids}` record. Layer priority is the sum of `rating / 5 * weight`, rounded to two decimals. Rank accepted layers by priority score descending and then `layer_id` ascending. Do not publish a layer ranking unless at least two layers pass the constrained-function, scarcity-mechanism, fixed-criterion, and two-independent-owner gates.

Layer anchors: `constrained_function_criticality` measures how necessary the function is to the causal chain; `scarcity_mechanism_strength` measures direct, current support for a concrete constraint; `substitution_difficulty` measures qualification, redesign, regulatory, performance, or capacity barriers to alternatives; `evidence_quality` applies the common evidence anchors below. A rating of 1 is narrow or readily bypassed, 3 is material and counterchecked, and 5 is independently corroborated and difficult to substitute or explain away.

## Common 0–5 anchors

- `0`: accepted evidence shows absence, invalidity, or a materially adverse condition.
- `1`: weak property with one narrow accepted observation and substantial contrary evidence.
- `2`: limited property; some accepted support, but important qualification or scope gaps remain.
- `3`: credible and repeatable support with at least one material countercheck.
- `4`: strong support across aligned records and more than one evidence owner where applicable.
- `5`: exceptional support, independently corroborated, current, and difficult to explain through a plausible alternative.

## Factor anchors

| Factor | Rating 1 | Rating 3 | Rating 5 |
|---|---|---|---|
| Demand pressure | early or narrow demand observation | repeated aligned customer/system evidence | broad, current, independently corroborated pressure |
| System coupling | optional or easily bypassed function | function matters to system performance | system cannot scale without the function and alternatives are constrained |
| Scarcity mechanism | proposed mechanism with weak measurement | one measured mechanism with countercheck | multiple measured mechanisms with independent corroboration |
| Supplier concentration | many qualified alternatives | limited qualified set | extremely concentrated qualified supply with explicit source scope |
| Expansion difficulty | routine capacity addition | meaningful qualification/capex/lead-time burden | long, specialized, regulated, or yield-limited expansion |
| Evidence quality | accepted but narrow/secondary evidence | mixed primary and independent evidence | current primary evidence plus independent corroboration and counterevidence |
| Valuation context | comparable valuation evidence is thin | aligned positive-denominator context exists | several aligned metrics show an unusual research question, without implying return |
| Event visibility | vague or undated monitoring item | dated event with observable verification fields | multiple dated, independently verifiable checkpoints |

## Penalties

The fixed penalties are `dilution_financing`, `governance`, `geopolitics`, `liquidity`, `hype_risk`, `accounting_quality`, `cyclicality`, and `alternative_design_risk`.

Use 0 only when accepted evidence supports no material penalty in the defined window. Ratings 1–2 are limited risks, 3 is material, 4 is severe, and 5 can invalidate the research priority. Every non-zero penalty requires accepted evidence IDs.

Do not publish a numeric score for one or two companies. Show evidence-bound factor notes without totals or ranks until a three-candidate comparable pool passes.
