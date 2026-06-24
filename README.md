# Open QVeris Skills

This repository hosts **QVeris** ([`qveris.ai`](https://qveris.ai)) related bot/agent skills.

- **Feel free to use these skills**: Use them as-is, fork them, and adapt them for your own bots/agents.
- **Contributions welcome**: New skills, improvements, fixes, and documentation updates are encouraged.

## Repository structure

- **One skill per folder**: Each top-level folder represents a standalone skill.
- `qveris-official/`: The **official QVeris skill** (core capabilities — semantic tool discovery & unified execution).
  - Use it as a starting point: you can modify it (or ask your AI to modify it) to create **novel, useful skills** tailored to your workflow.
- `stock-copilot-pro/`: A **standalone global stock analysis skill** for ClawHub/OpenClaw style agents.
  - Includes multi-source routing (quote, fundamentals, technicals, sentiment), quality checks, and structured reports.
- `qveris-supply-chain-research/`: A **QVeris-powered supply-chain bottleneck research skill**.
  - Maps value-chain layers, calls QVeris finance/filings/news/company data capabilities, and ranks source-backed public-company research priorities.
- `qveris-equity-research-report/`: A **QVeris-powered equity research report skill**.
  - Builds source-backed company reports with fundamentals, valuation, filings, news, risks, and usage trace.
- `qveris-investment-committee/`: A **multi-lens investment committee skill**.
  - Debates quality, value, growth, sentiment, technical, macro, and risk evidence before producing a decision memo.
- `qveris-news-sentiment-radar/`: A **news and sentiment monitoring skill**.
  - Separates confirmed catalysts from noisy attention with QVeris news, social, filing, and quote calls.
- `qveris-quant-factor-screen/`: A **transparent factor-screening skill**.
  - Ranks stock universes by quality, momentum, valuation, liquidity, volatility, and news risk.
- `qveris-portfolio-risk-monitor/`: A **portfolio risk monitoring skill**.
  - Reviews concentration, drawdown, volatility, catalyst, news, and liquidity risks.
- `qveris-earnings-call-brief/`: A **financial results and transcript briefing skill**.
  - Summarizes earnings releases, transcripts, guidance, Q&A, market reaction, and missing evidence.
- **Additional QVeris finance skill pack**: 38 focused workflows covering macro, rates, inflation, yield curves, sector rotation, ETF flows, options volatility, insider transactions, SEC filings, short interest, dividends, credit spreads, commodities, FX, crypto, bank earnings, biotech catalysts, REITs, energy inventories, China policy, HK markets, emerging markets, analyst revisions, anomalies, liquidity stress, merger arbitrage, buybacks, guidance, earnings readthroughs, customer exposure, valuation comps, scenarios, factor regimes, hedging, risk parity, IPO lockups, ESG controversy, and alternative demand signals.
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
