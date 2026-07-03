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

## Update - 2026-07-03

The earlier blocker was narrowed after a second WSL inspection:

- `/home/wjh/.local/bin/openclaw` is still the OpenClaw game wrapper and is not the platform CLI.
- The platform CLI exists at `/home/wjh/matecode/QVerisAI-openclaw/node_modules/.bin/openclaw`.
- Version: `OpenClaw 2026.5.28 (e932160)`.

Using that platform CLI, the four skills were installed and run through OpenClaw's local natural-language agent path.

Validation profile:

- OpenClaw profile: `qveris-skill-e2e-20260703`
- Agent: `main`
- Model: `deepseek/deepseek-chat`
- Workspace: `/home/wjh/matecode/open-qveris-skills-qveris-research`

Result:

- OpenClaw CLI install test: complete.
- OpenClaw local natural-language agent test: complete.
- Real QVeris live calls: complete.
- Business JSON schema validation: passed for all four skills.

Detailed report:

- `references/openclaw-four-skill-natural-e2e-report.md`

Remaining distinction:

- This completes OpenClaw CLI local install-and-run validation.
- It still does not prove hosted Skill Hub UI discovery, ClawHub publication, or a remote Skill Hub production path.

Therefore the status is now:

- OpenClaw CLI E2E: complete.
- Skill Hub / ClawHub hosted E2E: pending unless a hosted test environment or publish/verify path is required.
