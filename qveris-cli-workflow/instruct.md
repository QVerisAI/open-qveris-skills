# Install QVeris CLI Skill

This document covers the **install / upgrade / first-time setup** flow for the
`qveris` CLI and the `qveris-cli-workflow` skill files. For day-to-day usage,
see [`SKILL.md`](./SKILL.md) and the [`reference/`](./reference/) directory.

> **Skill directory path depends on the host agent.**
> The examples below use `~/.openclaw/skills/qveris-cli-workflow/`, which is
> the OpenClaw default. Substitute your agent's skill directory if different:
>  - Cursor: `~/.cursor/skills/qveris-cli-workflow/`
>  - Claude Code: `~/.claude/plugins/cache/.../skills/qveris-cli-workflow/`
>  - Other: consult your agent's documentation for the skills directory path.

## Prerequisites

A valid `QVERIS_API_KEY` is required. If the user has not provided one, **stop and ask**:

> Please provide your QVERIS_API_KEY. You can obtain one from https://qveris.ai
> (global region — key starts with `sk-…`) or https://qveris.cn (China region —
> key starts with `sk-cn-…`). The region is auto-detected from the key prefix.

- Confirm Node.js 18+ is available (`node --version`).
- Confirm the user has provided a valid `QVERIS_API_KEY`.

## Install Flow

### 0. Preflight — detect what's already there (ALWAYS run first)

**Do not install anything before running this step.** The goal is to skip
whatever is already working and only do the minimum needed.

**Bash (Linux / macOS / WSL):**

```bash
# Binary check
if qveris --version >/dev/null 2>&1; then
  echo "CLI_STATUS=installed"
else
  # npx fallback check (will not modify PATH)
  if npx --yes @qverisai/cli --version >/dev/null 2>&1; then
    echo "CLI_STATUS=npx_available"
  else
    echo "CLI_STATUS=missing"
  fi
fi

# Auth check (independent of the binary check)
if qveris whoami >/dev/null 2>&1; then
  echo "AUTH_STATUS=ok"
else
  echo "AUTH_STATUS=missing_or_invalid"
fi
```

**PowerShell (Windows):**

```powershell
$cliStatus = "missing"
if (Get-Command qveris -ErrorAction SilentlyContinue) {
  qveris --version *> $null
  if ($LASTEXITCODE -eq 0) { $cliStatus = "installed" }
}
if ($cliStatus -eq "missing" -and (Get-Command npx -ErrorAction SilentlyContinue)) {
  npx --yes @qverisai/cli --version *> $null
  if ($LASTEXITCODE -eq 0) { $cliStatus = "npx_available" }
}
Write-Host "CLI_STATUS=$cliStatus"

$authStatus = "missing_or_invalid"
if ($cliStatus -eq "installed") {
  qveris whoami *> $null
  if ($LASTEXITCODE -eq 0) { $authStatus = "ok" }
} elseif ($cliStatus -eq "npx_available") {
  npx --yes @qverisai/cli whoami *> $null
  if ($LASTEXITCODE -eq 0) { $authStatus = "ok" }
}
Write-Host "AUTH_STATUS=$authStatus"
```

**Branch on the results — do NOT run subsequent steps unconditionally:**

| `CLI_STATUS` | Action |
|---|---|
| `installed` | **Skip sections 1–2 entirely.** Jump to section 3 (skill definition) only if the skill files are not on disk yet, otherwise to section 4 (auth). |
| `npx_available` | **Skip section 2.** Record that every later command should be prefixed with `npx @qverisai/cli`. Ask the user whether they want a global install anyway. |
| `missing` | Ask the user for consent, then proceed with sections 1 and 2. |

| `AUTH_STATUS` | Action |
|---|---|
| `ok` | Skip section 4. |
| `missing_or_invalid` | Run section 4 (session-scoped env var or `qveris login`). |

**Only install when the user has explicitly consented.** Never silently run
`npm install -g` or the curl one-liner.

### 1. Remove existing qveris skills (only when reinstalling)

**Skip this section if `CLI_STATUS=installed` or `npx_available` and the
existing skill files at `~/.openclaw/skills/qveris-cli-workflow/` are current.** Only
remove when the user is re-installing to fix a broken or stale skill.

**Bash (Linux / macOS / WSL):**

```bash
rm -rf ~/.openclaw/skills/qveris*
```

**PowerShell (Windows):**

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.openclaw\skills\qveris*" -ErrorAction SilentlyContinue
```

### 2. Install the `qveris` CLI binary (skip if preflight reports `installed`)

Pick **one** of the following methods. Prefer the one-liner for end users and
`npm i -g` for CI / reproducible environments.

**Option A — Official one-liner (Linux / macOS / WSL):**

```bash
curl -fsSL https://qveris.ai/cli/install | bash
```

**Option B — npm global install (any platform):**

```bash
npm install -g @qverisai/cli
```

**Option C — No install (run via `npx` on demand):**

```bash
npx @qverisai/cli --version
```

If the user chooses Option C, every subsequent command in this skill should be
prefixed with `npx @qverisai/cli` instead of `qveris`.

After this step, re-run the Section 0 preflight to confirm `CLI_STATUS=installed`
(or `npx_available`) before continuing.

### 3. Download the skill definition (skip if files already present and current)

The skill metadata (`SKILL.md`, `README.md`, and the `reference/` directory)
lives separately from the binary so agents can discover and route to it.

**Bash (Linux / macOS / WSL):**

```bash
SKILL_DIR=~/.openclaw/skills/qveris-cli-workflow    # substitute your agent's skill dir
mkdir -p "$SKILL_DIR/reference"
curl -fSL https://qveris.ai/skills/qveris-cli-workflow/SKILL.md               -o "$SKILL_DIR/SKILL.md"
curl -fSL https://qveris.ai/skills/qveris-cli-workflow/README.md              -o "$SKILL_DIR/README.md"
curl -fSL https://qveris.ai/skills/qveris-cli-workflow/reference/commands.md  -o "$SKILL_DIR/reference/commands.md"
curl -fSL https://qveris.ai/skills/qveris-cli-workflow/reference/parameters.md -o "$SKILL_DIR/reference/parameters.md"
curl -fSL https://qveris.ai/skills/qveris-cli-workflow/reference/examples.md  -o "$SKILL_DIR/reference/examples.md"
```

**PowerShell (Windows):**

```powershell
$SkillDir = "$env:USERPROFILE\.openclaw\skills\qveris-cli-workflow"   # substitute your agent's skill dir
New-Item -ItemType Directory -Force -Path "$SkillDir\reference" | Out-Null
Invoke-WebRequest -Uri "https://qveris.ai/skills/qveris-cli-workflow/SKILL.md"                -OutFile "$SkillDir\SKILL.md"
Invoke-WebRequest -Uri "https://qveris.ai/skills/qveris-cli-workflow/README.md"               -OutFile "$SkillDir\README.md"
Invoke-WebRequest -Uri "https://qveris.ai/skills/qveris-cli-workflow/reference/commands.md"   -OutFile "$SkillDir\reference\commands.md"
Invoke-WebRequest -Uri "https://qveris.ai/skills/qveris-cli-workflow/reference/parameters.md" -OutFile "$SkillDir\reference\parameters.md"
Invoke-WebRequest -Uri "https://qveris.ai/skills/qveris-cli-workflow/reference/examples.md"   -OutFile "$SkillDir\reference\examples.md"
```

### 4. Set the key for the current session (skip if preflight reports `AUTH_STATUS=ok`)

Use a session-scoped variable first. **Do not** modify shell startup files
(`~/.bashrc`, `~/.zshrc`, PowerShell `$PROFILE`) unless the user explicitly asks
for persistent setup.

**Bash (Linux / macOS / WSL):**

```bash
export QVERIS_API_KEY="<USER_PROVIDED_KEY>"
```

**PowerShell (Windows):**

```powershell
$env:QVERIS_API_KEY = "<USER_PROVIDED_KEY>"
```

Alternatively, run the interactive login flow, which stores the key at
`~/.config/qveris/config.json` (respects `XDG_CONFIG_HOME`):

```bash
qveris login
# or non-interactively:
qveris login --token "<USER_PROVIDED_KEY>"
```

### 5. Verify the installation

Run the local CLI help, a self-check, and one discovery command. `qveris doctor`
does **not** consume credits and is safe to run on every first-time setup.

**Bash (Linux / macOS / WSL):**

```bash
qveris --version
qveris doctor
qveris whoami
qveris discover "stock price API" --limit 3 --json | head -c 400
```

**PowerShell (Windows):**

```powershell
qveris --version
qveris doctor
qveris whoami
qveris discover "stock price API" --limit 3 --json
```

Expected outcomes:

- `qveris --version` prints a semver like `0.4.0`.
- `qveris doctor` reports OK for Node, key, region, and connectivity.
- `qveris whoami` prints the key source (`env` / `config` / `flag`) and the
  detected region (`global` or `cn`).
- `qveris discover … --json` returns a JSON object with `search_id` and a
  non-empty `results` array.

If `qveris` is not on `PATH`, substitute `npx @qverisai/cli` everywhere and
confirm by running `npx @qverisai/cli --version`.

### 6. (Optional) Persistent setup

Only run this step when the user **explicitly asks** to persist credentials.

**Bash / Zsh:**

```bash
echo 'export QVERIS_API_KEY="<USER_PROVIDED_KEY>"' >> ~/.bashrc   # or ~/.zshrc
source ~/.bashrc
```

**PowerShell (`$PROFILE`):**

```powershell
Add-Content -Path $PROFILE -Value '$env:QVERIS_API_KEY = "<USER_PROVIDED_KEY>"'
. $PROFILE
```

Default behavior is non-persistent session setup.

## Behavior Rules

1. **Always run Section 0 (preflight) first.** Never invoke install commands
   before confirming what is missing. If `CLI_STATUS=installed` and
   `AUTH_STATUS=ok`, jump straight to Section 5 verification and stop.
2. **Never install silently.** When the preflight reports `missing`, ask the
   user for consent and let them choose between global install, curl one-liner,
   or the `npx` fallback.
3. **Never commit or echo the full API key** into logs, transcripts, or files
   outside the user's own shell session. Mask it in any output you show the
   user (e.g., `sk-…abcd`).
4. **Never modify shell startup files** (`~/.bashrc`, `~/.zshrc`, `$PROFILE`)
   unless the user explicitly opts in — see Section 6.
5. **Default to `qveris …`**; only fall back to `npx @qverisai/cli …` when the
   binary is missing but `npx` works.
6. **Verify with `qveris doctor`** on first use — it catches missing keys, stale
   Node versions, and network/region mismatches without consuming credits.
7. **Cache the preflight result** for the current session so follow-up turns do
   not re-probe or re-install.
8. If installation fails on every tier, fall back to the `qveris-official` skill
   (HTTP-based) and inform the user why.

## Troubleshooting First-Time Setup

| Symptom | Likely cause | Fix |
|---|---|---|
| `qveris --version` → command not found | Binary not on PATH | Re-open the shell (global install), or use `npx @qverisai/cli`. |
| `qveris whoami` → exit 78 | `QVERIS_API_KEY` not set in this shell | `export QVERIS_API_KEY="sk-…"` (or `$env:QVERIS_API_KEY` on PowerShell) or `qveris login`. |
| `qveris whoami` → exit 77 | Invalid key or zero credits | `qveris credits`; if zero, top up at the dashboard. If invalid, re-login. |
| `qveris doctor` → connectivity error | Network / proxy / region mismatch | Check `QVERIS_BASE_URL`; `sk-cn-…` keys must hit `qveris.cn`, `sk-…` must hit `qveris.ai`. |
| `npx --yes @qverisai/cli --version` hangs | First-time npx cache warm-up on slow network | Wait 30–60 s; subsequent calls reuse the cache. |

For day-to-day debugging after install, see
[`reference/parameters.md#debugging--observability`](./reference/parameters.md#debugging--observability).
