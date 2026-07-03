# OpenClaw / Skill Hub E2E Check

Date: 2026-07-03

Scope:

- `qveris-news-sentiment-radar`
- `qveris-portfolio-risk-monitor`
- `qveris-quant-factor-screen`
- `qveris-sector-rotation-map`

## Result

OpenClaw / Skill Hub platform E2E is still pending.

The local machine has a `qveris` CLI, which can Discover / Inspect / Call QVeris tools, but that is not the same as validating these skills through the OpenClaw / Skill Hub user path.

The local WSL command named `openclaw` is not the OpenClaw platform CLI. It starts a game/runtime process and fails while looking for `CLAW.REZ`:

```text
ERROR: [VOpen] Could not load Rez archive: CLAW.REZ
ERROR: [InitializeResources] Failed to initialize resource cachce from resource file: CLAW.REZ
```

Therefore this environment cannot currently prove:

- Skill Hub can discover these four `qveris.skill.json` manifests.
- OpenClaw can install and invoke the skills.
- OpenClaw passes user inputs into `scripts/run.mjs` correctly.
- OpenClaw can read and render the generated Markdown report.
- OpenClaw or Skill Hub can consume the new `--json-output` business result JSON.

## Verified Instead

The following have been validated locally:

- Deterministic runner syntax.
- Fixture regression tests.
- Output JSON schema validation.
- QVeris live smoke tests through the runner.
- Codex-side E2E artifacts.

## Required To Complete Platform E2E

To finish this step, provide one of the following:

- A working OpenClaw / Skill Hub CLI command for installing and invoking a local skill directory.
- A documented Skill Hub test environment and credentials.
- A desktop automation path for OpenClaw that can install the branch version of this repo and run a skill with captured output.

Until then, the four skills should remain `preview`, not `published`.
