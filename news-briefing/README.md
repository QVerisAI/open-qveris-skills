# News Briefing

News and WeChat article search skill for OpenClaw, powered by QVeris.

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

## Usage

```bash
export QVERIS_API_KEY="your-key"
node scripts/news_briefing.mjs news --keyword 科技
node scripts/news_briefing.mjs wechat --keyword 投资
node scripts/news_briefing.mjs search --query 热点
```

Options: `--limit N`, `--format json`, `--timeout N`.
