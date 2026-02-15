---
name: term-translation
description: Term and phrase translation powered by QVeris. Query translations for given terms and target languages via Data.gov and similar providers.
env:
  - QVERIS_API_KEY
credentials:
  required:
    - QVERIS_API_KEY
  primary_env: QVERIS_API_KEY
  scope: read-only
  endpoint: https://qveris.ai/api/v1
network:
  outbound_hosts:
    - qveris.ai
auto_invoke: true
source: https://qveris.ai
examples:
  - "术语 hello world 翻译成中文"
  - "translate these terms to Spanish"
  - "多语言术语对照"
---

# Term Translation

Term/phrase translation via QVeris (e.g. Data.gov term_translation).

## What This Skill Does

- **Translate** – Get translations for one or more terms into specified language(s).

## Command Surface

- `node scripts/term_translation.mjs translate --terms hello,world --langs zh,es`
- `node scripts/term_translation.mjs translate --terms 碳中和 --langs en`

## Safety

Uses only `QVERIS_API_KEY`; read-only.
