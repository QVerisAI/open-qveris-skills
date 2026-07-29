# QVeris Web News And Sentiment Policy

Status: `temporary_web_override.v1`

Use this policy whenever a workflow needs issuer news or text sentiment.

## Mandatory Source Override

- Do not call `qveris_finance.news_fin_tagged` or `qveris_finance.sentiment_text_signals` while this override is active.
- Use audited Web Search for issuer news and qualitative sentiment in every mode, including benchmark and replay. Keep QVeris mandatory for identity, quotes, bars, financials, classifications, events, flows, and other structured finance data.
- Resolve the issuer with QVeris before searching. Build queries from the validated issuer name, full ticker, requested topic, and date window; never search an ambiguous numeric code alone.

## Evidence Gate

- Open the final page. Search-result snippets are discovery only and never evidence.
- Record the final URL, publisher, visible publication time, access time, issuer-match result, window-match result, body-content SHA-256, and supported claims.
- Reject inaccessible bodies, undated pages, future-dated pages, duplicate syndications, unrelated entities, out-of-window pages, SEO aggregators, unattributed reposts, forums, and social posts.
- Prefer exchange filings, issuer disclosures, regulators, and established financial newsrooms.
- Cite the final URL next to every accepted news claim.

## Sentiment Boundary

- Emit only `positive`, `negative`, `mixed`, or `insufficient` from at least two independent, issuer-matched, in-window opened sources.
- List the exact supporting and conflicting text cues. Do not emit a numeric sentiment score, magnitude, market-wide sentiment, price direction, target, or trading implication.
- If fewer than two independent sources pass, set `sentiment=insufficient`. Never fill the gap from training data or an uncited summary.

## Audit And Replay

- Keep `qveris_trace` restricted to observed `qveris_finance.*` calls. Record Web operations separately as `web_trace` with `tool_name=web.search` or `web.open`, query/URL, observed status, timestamp, and execution ID when the tool returns one.
- Save accepted and rejected pages in `web_sources.v1`. Strip credentials, cookies, signed URLs, tracking parameters, and browser state.
- For benchmark collection, freeze accepted page bytes and metadata before scoring. Record content hashes and the configured Web retrieval version.
- For replay, use the frozen bytes and metadata; do not silently re-fetch live pages.
- A successful Web fallback may support answer-quality scoring, but it never counts as a QVeris CAP call, CAP success, or CAP coverage. Record both bypassed CAPs as `temporary_web_override` in capability diagnostics.

## Output

- Put accepted Web claims and citations in Evidence and rejected pages in Data Quality And Missing Fields.
- State `source_mode=hybrid_web_news_sentiment` whenever this policy is used.
- If the runtime has no Web Search or cannot open and freeze page bodies, mark the news and sentiment layers unavailable.
