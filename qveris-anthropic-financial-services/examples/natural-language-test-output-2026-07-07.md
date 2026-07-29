# Natural Language Test Output - 2026-07-07

## Prompt

```text
用 qveris-anthropic-financial-services 看 NVDA 最新财报 context memo。
```

## Summary

Evidence status: `partial`.

The skill produced a Markdown earnings context memo from QVeris CAP evidence. It resolved NVDA, used available quote, consensus, statement, and news context, and refused to state beat/miss because actual surprise evidence was unavailable. It also refused to invent management call commentary because transcript evidence was unavailable.

## Evidence Used

| Area | Evidence status | User-facing handling |
|---|---|---|
| Entity and quote | `complete` | Used for context only. |
| Consensus | `partial` | Used as expectation context, not surprise evidence. |
| Income statement and balance sheet | `complete` | Used when fiscal period matched. |
| Cash flow | `partial` | Used only after period and semantic checks; mismatches stay out of aligned tables. |
| Transcript | `insufficient` | No management quotes. |
| News | `proxy_only` | Qualitative context only. |

Unavailable, rejected, or weak-relevance CAPs were kept out of this evidence table and reported below.

## Data Quality And Missing Fields

| Field | Status | Handling |
|---|---|---|
| `earnings_actual_surprise` | missing after repeated `503` | No beat/miss conclusion. |
| `transcripts_earnings_call` | missing after repeated `503` | No management quotes or call-summary claims. |
| `fundamentals_segment` | missing after repeated `503` | No segment-level conclusion. |
| `news_fin_tagged` | available but truncated | Qualitative context only. |
| `research_analyst_reports` | gated for issuer/document relevance | Weak academic or technical matches would be marked `weak_relevance`, not analyst evidence. |
| Long payloads | summarized | Mark `payload_summarized` or `payload_truncated` instead of expanding raw rows. |

## Trace Appendix

| qveris_finance capability | Parameters | Status | Fallback |
|---|---|---|---|
| `qveris_finance.ref_symbology` | `symbol=NVDA`, `market=US` | success after retry | none |
| `qveris_finance.event_calendar_earnings` | `symbol=NVDA`, `market=US` | success | supports event context |
| `qveris_finance.earnings_actual_surprise` | `symbol=NVDA`, `market=US` | failed after retries, `503` | calendar plus consensus only |
| `qveris_finance.estimates_consensus` | `symbol=NVDA`, `market=US` | success | expectation context |
| `qveris_finance.fundamentals_is` | `symbol=NVDA`, `market=US`, `period=quarterly`, `limit=4` | success | none |
| `qveris_finance.fundamentals_bs` | `symbol=NVDA`, `market=US`, `period=quarterly`, `limit=4` | success | none |
| `qveris_finance.fundamentals_cf` | `symbol=NVDA`, `market=US`, `period=quarterly`, `limit=4` | success with data-quality checks | none |
| `qveris_finance.transcripts_earnings_call` | `symbol=NVDA`, `market=US` | failed after retries, `503` | `qveris_finance.news_fin_tagged` context only |
| `qveris_finance.news_fin_tagged` | `symbol=NVDA`, `market=US`, recent window | success, truncated | qualitative context |

## What This Cannot Support

This output cannot support beat/miss, management quotes, target-price language, investment advice, or trading action.

Not investment advice.
