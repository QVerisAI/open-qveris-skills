# Term Translation

Term and phrase translation for OpenClaw, powered by QVeris.

## Requirements

- Node.js 18+
- `QVERIS_API_KEY`

## Usage

```bash
export QVERIS_API_KEY="your-key"
node scripts/term_translation.mjs translate --terms hello,world --langs zh,es
node scripts/term_translation.mjs translate --terms 碳中和 --langs en
```

Options: `--format json`, `--timeout N`.
