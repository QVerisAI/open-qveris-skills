# Content Discovery

Product and social content search for OpenClaw, powered by QVeris (Taobao, Xiaohongshu, Kuaishou).

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

## Usage

```bash
export QVERIS_API_KEY="your-key"
node scripts/content_discovery.mjs taobao --keyword 手机
node scripts/content_discovery.mjs xiaohongshu --keyword 美妆
node scripts/content_discovery.mjs kuaishou --keyword 美食
```

Options: `--limit N`, `--format json`, `--timeout N`.
