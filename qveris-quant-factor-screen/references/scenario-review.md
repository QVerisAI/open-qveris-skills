# Live Scenario Review

Date: 2026-07-03

Purpose: SOP evidence for reproducible live business scenarios. Each scenario was run with `--live`, a paid-call budget, JSON output, a Markdown report, and a call trace.

## Coverage Matrix

| Scenario | Business question | Artifacts | Paid calls | Credits | Result |
| --- | --- | --- | --- | --- | --- |
| Scenario 01 | Mega-cap growth factor smoke screen | `artifacts/factor-live-smoke.*` | 4 | 51.4 | Schema-valid preview output; quote and complete ranking coverage partial. |
| Scenario 02 | Semiconductor factor screen | `artifacts/scenario-02-semis.*` | 4 | 51.4 | Schema-valid output; ratios, float, and BBANDS succeeded; quote failed. |
| Scenario 03 | Defensive quality factor screen | `artifacts/scenario-03-defensive-quality.*` | 4 | 51.4 | Schema-valid output; ratios, float, and BBANDS succeeded; quote failed. |

## Repro Commands

```bash
node qveris-quant-factor-screen/scripts/run.mjs \
  --live \
  --universe NVDA,AMD,AVGO,INTC,QCOM \
  --market US \
  --window-days 90 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 80 \
  --output qveris-quant-factor-screen/artifacts/scenario-02-semis.md \
  --json-output qveris-quant-factor-screen/artifacts/scenario-02-semis-output.json \
  --trace qveris-quant-factor-screen/artifacts/scenario-02-semis-trace.json

node qveris-quant-factor-screen/scripts/run.mjs \
  --live \
  --universe JNJ,PG,KO,PEP,WMT \
  --market US \
  --window-days 90 \
  --as-of 2026-07-03 \
  --max-paid-calls 4 \
  --max-credits 80 \
  --output qveris-quant-factor-screen/artifacts/scenario-03-defensive-quality.md \
  --json-output qveris-quant-factor-screen/artifacts/scenario-03-defensive-quality-output.json \
  --trace qveris-quant-factor-screen/artifacts/scenario-03-defensive-quality-trace.json
```

## Execution Evidence

| Scenario | Task | Provider/tool | OK | Credits | execution_id |
| --- | --- | --- | --- | --- | --- |
| Semiconductors | valuation_ratios | FMP `financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef` | true | 24.2 | `85d3af15-780d-4d42-9c6d-dfe260621bfd` |
| Semiconductors | liquidity_float | FMP `financialmodelingprep.stable.sharesfloat.retrieve.v1.9fdd1e4f` | true | 24.2 | `257cb4af-c47f-45dd-844e-6ac6fcc2feaf` |
| Semiconductors | quote_snapshot | Finnhub `finnhub_io_api.stock.quote` | false | 1 | `5d335fce-5660-4ed4-9674-a67d045b77a2` |
| Semiconductors | momentum_or_volatility | Alpha Vantage `alphavantage.technical-indicators.bbands.v1` | true | 2 | `64b2b1b7-8f18-4f22-82b1-19440f82c109` |
| Defensive quality | valuation_ratios | FMP `financialmodelingprep.stable.ratios.retrieve.v1.bd1624ef` | true | 24.2 | `c5413160-7a21-452f-9853-af8acac095ff` |
| Defensive quality | liquidity_float | FMP `financialmodelingprep.stable.sharesfloat.retrieve.v1.9fdd1e4f` | true | 24.2 | `bf37530f-5665-4458-8e15-1613d3539914` |
| Defensive quality | quote_snapshot | Finnhub `finnhub_io_api.stock.quote` | false | 1 | `122af3ff-20c0-4440-b9ec-c2d953890994` |
| Defensive quality | momentum_or_volatility | Alpha Vantage `alphavantage.technical-indicators.bbands.v1` | true | 2 | `3dcb53a8-0a47-44e1-8137-96632c476866` |

## Notes

- FMP ratios and shares-float calls were reliable but expensive; budget guardrails should prioritize them deliberately.
- Alpha Vantage BBANDS succeeded and provides a low-cost technical context signal.
- Finnhub quote returned unsuccessful status in both scenarios; live quote fallback should be added before production use.
- Current preview output does not yet produce a full ranking table, normalized factor scores, factor weights, or tie-break rules from all returned inputs.
