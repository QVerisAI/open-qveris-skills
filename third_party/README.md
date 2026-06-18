# Third-party QVeris Featured Skill Candidates

This directory is reserved for third-party skills that are being evaluated or
adapted for QVeris Featured Skills.

## Admission Rules

A third-party skill can be added here only when all of these are true:

1. **License is safe for MIT re-publication after modification.**
   Prefer MIT, Apache-2.0, BSD, ISC, CC0, Unlicense, or equivalent permissive
   licenses. GPL/AGPL/LGPL/MPL or missing licenses require manual legal review
   and should not be adopted by default.
2. **Repository has quality and traction.**
   Look for stars/forks, recent activity, clear README, tests, examples, and a
   visible skill or agent structure.
3. **QVeris is required.**
   The adapted skill must acquire data through QVeris search/execute tools. A
   skill that can run entirely without QVeris does not qualify as a Featured
   Skill candidate.
4. **Agent-friendly.**
   The skill should be usable from mainstream agent tools such as OpenClaw,
   Claude Code, Codex, Cursor, or a generic skill runner.
5. **Actually testable.**
   A candidate branch must include install instructions and at least one mocked
   test or real QVeris smoke test before it is announced.

## Directory Layout

Use category subdirectories:

```text
third_party/
  finance/
    owner-repo/
      SKILL.md
      README.md
      candidate.json
      scripts/
      tests/
```

The `candidate.json` file should preserve the discovery record and source URL.

## Discovery Workflow

Apply DB schema:

```bash
uv run qcli skill third-party apply-db --db-url "$ADMIN_DATABASE_URL"
```

Discover candidates:

```bash
GITHUB_TOKEN=... \
uv run qcli skill third-party discover \
  --min-stars 50 \
  --per-query 10 \
  --write-db \
  --db-url "$ADMIN_DATABASE_URL"
```

When good candidates are found, send a Feishu notification:

```bash
uv run qcli skill third-party discover --notify
```

Notification target defaults to the website dev group:

```text
oc_24bb246da6cef8b3fbf2cfc6cbeb0f0d
```

Use `--chat-id` to override.

## Scaffold A Candidate

From a JSONL discovery record:

```bash
uv run qcli skill third-party scaffold \
  reports/third-party-skill-candidates.jsonl \
  --output-root /path/to/open-qveris-skills \
  --category finance \
  --branch feat/third-party-owner-repo
```

From a GitHub repository URL:

```bash
uv run qcli skill third-party scaffold \
  https://github.com/owner/repo \
  --output-root /path/to/open-qveris-skills \
  --category finance
```

The generated directory is an evaluation skeleton. The implementation must still
replace direct API calls with QVeris search/execute calls and pass tests before
the skill can be promoted.
