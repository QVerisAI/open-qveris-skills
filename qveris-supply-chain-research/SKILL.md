---
name: qveris-supply-chain-research
description: QVeris-powered supply-chain bottleneck research skill for investment agents. Use when the user asks for AI infrastructure, semiconductor, CPO, advanced packaging, data-center power, robotics, industrial, A-share/HK/US stock theme scans, single-company thesis challenges, candidate ranking, or evidence-backed research on scarce supply-chain layers. Requires QVERIS_API_KEY and uses QVeris Discover, Inspect, and Call to fetch live market, filings, financial statement, news, social, and company data. Research support only; no trade execution.
---

# QVeris Supply Chain Research

Turn an investment agent into a QVeris-powered supply-chain bottleneck researcher.

This skill helps agents move from a market story to a source-backed research priority list:

`theme -> system change -> value-chain layers -> scarce layer -> public companies -> QVeris evidence -> ranking -> risks -> next verification`

Use it for research support, not personalized investment advice or trade execution.

## Core Rule

Use QVeris for live or structured facts. Do not rely on model memory for current prices, filings, company facts, estimates, news, or market-moving events.

Use this QVeris flow:

1. **Discover** with `POST /search`: search for the needed tool type, such as `stock quote API`, `financial statement API`, `SEC filings API`, `company news API`, `earnings transcript API`, `A-share company announcement API`, or `social sentiment API`.
2. **Inspect** with `POST /tools/by-ids`: verify coverage, required parameters, latency, success rate, output shape, and billing rule before calling.
3. **Call** with `POST /tools/execute`: execute selected tools, then cite which QVeris capabilities were used.

Discovery queries must describe API capability types in English. They are not factual questions.

## Research Workflow

### 1. Set Scope

Identify:

- market: US, HK, A-share, Taiwan, Japan, Korea, Europe, global, or private-company map;
- theme: AI infrastructure, semiconductors, optical interconnect, CPO, advanced packaging, data-center power, cooling, robotics, materials, equipment, biotech manufacturing, defense electronics, or the user's topic;
- time window: use 3-12 months for "now" unless the user says otherwise.

### 2. Translate Story Into System Change

Explain the concrete constraint:

- power;
- bandwidth;
- latency;
- heat;
- yield;
- purity;
- reliability;
- cycle time;
- packaging density;
- grid connection;
- qualification or regulation.

### 3. Map Value Chain Before Companies

Rank layers first:

1. downstream demand;
2. system integrators;
3. modules and subsystems;
4. chips and devices;
5. process and packaging;
6. equipment and testing;
7. materials and consumables;
8. physical infrastructure.

Only name companies after the scarce layers are clear.

### 4. Build Candidate Universe With QVeris

For broad theme scans, aim for at least 20 companies before filtering to the final 3-7. Include obvious leaders and less obvious upstream suppliers.

Use QVeris calls for:

- quote and market data;
- financial statements and valuation context;
- company profile and segment exposure;
- filings, announcements, transcripts, and investor presentations;
- news, research reports, trade publication signals, or social signals when available.

### 5. Grade Evidence

Use this evidence ladder:

- **Strong**: filings, exchange announcements, official transcripts, annual/interim/quarterly reports, official orders/contracts, regulatory/project records, patents, standards, or technical documents.
- **Medium**: reputable financial media, trade publications, industry association data, company product pages, specialist analysis with visible assumptions, or public supplier/customer cross-checks.
- **Weak**: social posts, forum discussions, screenshots, unattributed channel checks, or price action without fundamental evidence.
- **Needs checking**: important claim not yet verified by available tools.

Never rank a company as a top candidate on weak evidence alone.

### 6. Rank Priorities

Separate **scarce-layer priority** from **company priority**.

Rank companies by:

- demand pressure;
- closeness to scarce layer;
- supplier concentration;
- expansion difficulty;
- evidence quality;
- valuation disconnect;
- timing;
- financing, governance, geopolitics, liquidity, and hype risk.

Use `scripts/bottleneck_scorecard.py` only as a local repeatability aid. It does not replace QVeris evidence.

### 7. Explain Failure Conditions

For every top candidate, include:

- what exactly the company constrains or supplies;
- why it ranks here;
- QVeris-backed evidence;
- missing proof;
- what would make the view weaker.

## Output Contract

For theme scans, start with the layers:

```text
Start with the layers: [layer 1], [layer 2], [layer 3]. The best research path is to identify who controls the hard-to-scale parts, then verify that control with QVeris-backed evidence.
```

Chinese:

```text
先排产业链层级，再排公司。我会优先看这几层：[层级 1]、[层级 2]、[层级 3]。原因是这些地方更接近真实扩产约束。接下来用 QVeris 验证公司事实、公告、财务和新闻证据。
```

Use a compact table for final candidates:

| Field | Required content |
|---|---|
| Layer | scarce layer or value-chain position |
| Company | ticker, market, company name |
| Why here | ranking reason |
| QVeris evidence | source-backed facts and capability names |
| Main risk | strongest reason the view could be wrong |
| Next check | exact next source or metric to verify |

End with:

- QVeris capabilities used;
- estimated paid Call count;
- research-only disclosure.

## QVeris API Calls

Use either native QVeris tools when available or HTTP:

```http
POST https://qveris.ai/api/v1/search
Authorization: Bearer ${QVERIS_API_KEY}
Content-Type: application/json

{"query":"stock quote and financial statement API","limit":10}
```

```http
POST https://qveris.ai/api/v1/tools/by-ids
Authorization: Bearer ${QVERIS_API_KEY}
Content-Type: application/json

{"tool_ids":["<tool_id>"],"search_id":"<optional_search_id>"}
```

```http
POST https://qveris.ai/api/v1/tools/execute?tool_id=<tool_id>
Authorization: Bearer ${QVERIS_API_KEY}
Content-Type: application/json

{"search_id":"<search_id>","parameters":{"symbol":"NVDA"},"max_response_size":20480}
```

## Safety

- Do not invent prices, filings, customers, contracts, market caps, or financial metrics.
- Do not present research ranking as a buy/sell order.
- Do not use rumors as proof.
- Do not expose API keys or include them in output.
- State when a conclusion is an initial pass because QVeris calls were unavailable or insufficient.

## Attribution

This QVeris skill uses public supply-chain bottleneck research patterns and is compatible with the methodology direction popularized by open community projects such as `muxuuu/serenity-skill` under MIT license. The QVeris data-routing workflow, prompts, manifest, and agent guide are QVeris-specific.
