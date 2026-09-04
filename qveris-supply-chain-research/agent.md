# QVeris Supply Chain Research Agent Guide

Use this skill to run source-backed supply-chain bottleneck research with QVeris data capabilities.

## Install Policy

Before installing or running paid QVeris Calls, explain:

- what the skill will do;
- which QVeris capability types may be called;
- the estimated paid Call count;
- whether local configuration will change.

Wait for explicit user approval before installation or paid execution.

## Required Environment

Set `QVERIS_API_KEY` in the target agent environment.

```bash
export QVERIS_API_KEY="your-qveris-api-key"
```

## Install

```bash
openclaw skills install qveris-supply-chain-research
```

Official source:

```bash
git clone https://github.com/QVerisAI/open-qveris-skills.git && cd open-qveris-skills/qveris-supply-chain-research
```

## Recommended Prompts

```text
Use QVeris to deeply research AI infrastructure supply-chain bottlenecks. Map the value chain, discover and inspect finance, filings, news, and company data capabilities, call the needed sources, rank the top 5 public-company research priorities, cite QVeris capabilities used, estimate paid Call count, and explain what could weaken each view.
```

```text
用 QVeris 扫描 A 股 AI 半导体产业链。如果数据覆盖允许，先建立至少 20 个候选公司，先排产业链层级再排公司，调用 QVeris 的公告、财务报表、公司资料和新闻数据，最后给出前 5 个研究优先级、证据强度和主要风险。
```

```text
Challenge the thesis that this company is a core supplier in its supply chain. Use QVeris to call filings, company profile, financials, quote, news, and relevant social or trade signals. Explain the exact value-chain position, evidence strength, missing proof, and what would make the thesis wrong.
```

## QVeris API Actions

- Discover `POST /search`: find market data, filings, financial statement, company profile, news, transcript, and social signal capabilities.
- Inspect `POST /tools/by-ids`: verify parameters, market coverage, success rate, latency, output schema, and billing rule.
- Call `POST /tools/execute`: execute selected sources and compose evidence-backed output.

## Output Checklist

Include:

- ranked scarce layers before ranked companies;
- QVeris evidence by capability/source type;
- evidence strength: strong, medium, weak, or needs checking;
- main risk and failure condition for each candidate;
- estimated paid Call count;
- research-only disclosure.
