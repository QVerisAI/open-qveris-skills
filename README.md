# Open QVeris Skills

This repository hosts **QVeris** ([`qveris.ai`](https://qveris.ai)) related bot/agent skills.

- **Feel free to use these skills**: Use them as-is, fork them, and adapt them for your own bots/agents.
- **Contributions welcome**: New skills, improvements, fixes, and documentation updates are encouraged.

## Repository structure

- **One skill per folder**: Each top-level folder represents a standalone skill.
- `qveris-official/`: The **official QVeris skill** (core capabilities — semantic tool discovery & unified execution).
  - Use it as a starting point: you can modify it (or ask your AI to modify it) to create **novel, useful skills** tailored to your workflow.
- **QVeris A-share beta skills**:
  - `qveris-a-stock-data-layer/`: Broad China A-share data-layer reports for quotes, bars, fundamentals, news, events, flow-like context, and specialty A-share fields. Specialty fields degrade honestly when QVeris CAP evidence is missing.
  - `qveris-a-share-factor-screen/`: China A-share research screens and factor coverage notes. It produces research candidate pools, not rankings or recommendations when evidence is not comparable.
  - `qveris-a-share-data/`: China A-share quote, history, technical-context, event, sector, A+H/IPO timeline, and news data reads. Technical indicators are descriptive and never trade signals.
- **QVeris third-party finance beta skills**:
  - `qveris-alphaear-market-intelligence/`: QVeris-only adaptation of #42 Awesome Finance Skills / AlphaEar for stock context, news, sentiment availability, signal-monitor notes, and Markdown reports.
  - `qveris-daymade-financial-data-suite/`: QVeris-only adaptation of #37 Daymade Financial Suite for financial data packs, news/research/event structuring, A-share news reads, and sector or pharma daily monitors.
  - `qveris-uzi-equity-research/`: QVeris-only adaptation of #34 UZI-Skill for equity research method audits, valuation-input coverage, LHB/flow context, and trap-risk monitoring without investment advice.
  - `qveris-crypto-market-radar/`: Read-only adaptation of #23 GMGN Skills for crypto identity, spot, history, descriptive technical context, rankings, market mood, and whale monitoring. Wallet, swap, order, and signing features are removed.
- **Direct QVeris variants (no finance CAP layer)**:
  - `qveris-a-share-data-direct/`: Direct QVeris discovery/execution variant of the A-share data skill.
  - `qveris-a-share-factor-screen-direct/`: Direct QVeris discovery/execution variant of the A-share factor-screen skill.
  - `qveris-alphaear-market-intelligence-direct/`: Direct QVeris discovery/execution variant of the AlphaEar market-intelligence skill.
- `stock-copilot-pro/`: A **standalone global stock analysis skill** for ClawHub/OpenClaw style agents.
  - Includes multi-source routing (quote, fundamentals, technicals, sentiment), quality checks, and structured reports.
- `third_party/`: Evaluation area for third-party skills being adapted into QVeris Featured Skills.
  - Candidates must have a permissive license, visible quality/traction, and a clear QVeris data-acquisition path.
  - Discovery and tracking are handled by `qcli skill third-party` from the `quaestio-cli` repository.
- **Planned skills**: Development and testing are currently underway.
  - `exchange-rate/` – Real-time forex rate and amount conversion.
  - `stock-analyzer/` – A-share/global quote, fundamentals, history, smart stock picking.
  - `crypto-tracker/` – Crypto price, markets, conversion (CoinMarketCap, CoinGecko).
  - `news-briefing/` – News and WeChat article search (caidazi, xiaosu, X news).
  - `location-service/` – POI and IP location (Amap, Baidu Map).
  - `movie-guide/` – Movie/TV details and reviews (IMDb, NYT).
  - `developer-tools/` – IP lookup and geo.
  - `content-discovery/` – Taobao, Xiaohongshu, Kuaishou search.
  - `weather-alerts/` – Weather alerts and air quality (AQI) by location.
  - `term-translation/` – Term/phrase translation (e.g. Data.gov).
  - `food-nutrition/` – Food search and nutrition (USDA FoodData Central).
  - `sports-score/` – Sports leagues, games, standings (API-Sports, Api-Football).

## Getting started

- Pick a skill folder (for example `qveris-official/`) and follow its README:
  - See `qveris-official/README.md`
- Skills that call QVeris APIs typically require:
  - `QVERIS_API_KEY` (get one from [`qveris.ai`](https://qveris.ai))

### Using the A-share beta skills

Install `qveris-official` plus the desired A-share skill folders into your Codex skills directory, or run Codex from an environment that indexes this repository's skill folders:

```bash
mkdir -p ~/.codex/skills
cp -a qveris-official ~/.codex/skills/
cp -a qveris-a-share-data ~/.codex/skills/
cp -a qveris-a-share-factor-screen ~/.codex/skills/
cp -a qveris-a-stock-data-layer ~/.codex/skills/
cp -a qveris-alphaear-market-intelligence ~/.codex/skills/
cp -a qveris-daymade-financial-data-suite ~/.codex/skills/
cp -a qveris-uzi-equity-research ~/.codex/skills/
cp -a qveris-crypto-market-radar ~/.codex/skills/
```

To use direct QVeris tool discovery and execution instead of the finance CAP layer, install the corresponding `-direct` skill instead of its CAP-based counterpart:

```bash
cp -a qveris-a-share-data-direct ~/.codex/skills/
cp -a qveris-a-share-factor-screen-direct ~/.codex/skills/
cp -a qveris-alphaear-market-intelligence-direct ~/.codex/skills/
```

The direct variants require `QVERIS_API_KEY`. Set `QVERIS_BASE_URL` when the active deployment does not use the default `https://qveris.ai/api/v1`. Each direct skill ships the same audited Node.js runtime for host validation, schema-aware parameter adaptation, cost/row preflight, adjusted-bar normalization, recursive sanitization, timeout attribution, and `observed_calls.v1` sidecars. Native `qveris_discover` / `qveris_call` or `http_request` remain degraded fallback tiers when that runtime cannot run. The direct variants intentionally do not use `qveris_finance.*`, capability IDs, or `/capabilities/query`.

Standalone installs should either run in a Codex runtime that exposes native `qveris_finance.*` tools or include `qveris-official`. The repository CLI fallback (`qveris-official/scripts/qveris_tool.mjs`) is a repo-root development path; a copied QVeris finance skill folder alone is not enough for that fallback.

Example prompts:

```text
Use qveris-a-share-data to make a 30-day quote, bars, technical-context, event, and news read for 600519.SH.
Use qveris-a-share-factor-screen to run a research screen for 600519.SH, 000001.SZ, and 000858.SZ.
Use qveris-a-stock-data-layer to make an A-share data-layer coverage note for 600519.SH.
Use qveris-alphaear-market-intelligence to make a TSLA market-intelligence note with sentiment availability and trace appendix.
Use qveris-daymade-financial-data-suite to collect an NVDA QVeris-only financial data pack with missing_fields and data_quality.
Use qveris-uzi-equity-research to audit valuation-method input coverage for 600519.SH without target output or trading action.
Use qveris-crypto-market-radar to compare BTC, ETH, and SOL over one aligned 30-day window without transaction actions or forecasts.
Use qveris-a-share-data-direct to make a direct-QVeris 30-day data read for 600519.SH.
Use qveris-a-share-factor-screen-direct to run a direct-QVeris research screen for 600519.SH, 000001.SZ, and 000858.SZ.
Use qveris-alphaear-market-intelligence-direct to make a direct-QVeris TSLA market-intelligence note.
```

Current beta caveat: A-share CAP coverage is partial. Live verification on 2026-07-08 showed usable evidence for quotes, EOD bars, industry classification, calendar events, lock-up, stock-level order-size flow, top movers, IPO calendar context, share structure, and tagged news. Some routes still degraded or failed in smoke tests, including LHB, northbound/cross-border flow, concept heat, CN ETF option chain, CAP-based sentiment score, CAP-based technical indicators, non-empty research reports, and non-empty news clusters. The skills are designed to mark these fields missing instead of inventing data.

Current third-party finance beta caveat: #42, #37, and #34 preserve workflow intent from the source repositories but do not carry their direct data dependencies into runtime. AlphaEar forecasts, Daymade specialty pipelines, and UZI LHB/trap layers are QVeris-only and conditional; when a QVeris CAP is unavailable, stale, empty, or semantically mismatched, the skills mark missing fields instead of inventing a full analysis.

## Local development (not part of published skill package)

Local integration files live under `dev-infra/` and are intentionally kept
outside skill folders such as `stock-copilot-pro/`.

Reuse repository root `.env.local` for all local workflows (`skill-dev` and
optional `openclaw` compose profile). No extra `.env` files are required under
`dev-infra/`.

- Bring up dev container: `make up`
- Check runtime: `make check`
- Run smoke regression (`allow-degraded` for live API variance): `make smoke`
- Bring up OpenClaw too: `make up-full`
- Stop containers: `make down`

Repository root `.env.local` is git-ignored by default to avoid accidental key
commits.

## Contributing

- Add a new folder for a new skill (or improve an existing one).
- Include clear documentation (a `README.md` and/or `SKILL.md`) describing:
  - What the skill does
  - Required environment variables / credentials
  - Example prompts / usage

## Third-party Skill Discovery

Use `qcli skill third-party` from the `quaestio-cli` repository to search GitHub
for skill candidates, score them, save the analysis to the `admin` database
schema, and scaffold evaluation branches:

```bash
uv run qcli skill third-party apply-db --db-url "$ADMIN_DATABASE_URL"

GITHUB_TOKEN=... \
uv run qcli skill third-party discover \
  --min-stars 50 \
  --per-query 10 \
  --write-db \
  --db-url "$ADMIN_DATABASE_URL" \
  --notify
```

Candidates are evaluated under `third_party/<category>/<owner-repo>/`. A
candidate can become a Featured Skill only after direct third-party data access
has been replaced by QVeris tool search/execute calls and real smoke tests pass.

## License

MIT — see `LICENSE`.
