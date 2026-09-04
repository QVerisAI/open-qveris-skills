# Install Qveris Official Skill

## Prerequisites

A valid `QVERIS_API_KEY` is required. If the user has not provided one, **stop and ask**:

> Please provide your QVERIS_API_KEY. You can obtain one from https://qveris.ai

- Confirm Node.js 18+ is available.
- Confirm the user has provided a valid `QVERIS_API_KEY`.

## Steps

## Install Flow

### 1. Remove existing qveris skills

Before installing, remove any existing skills whose directory name starts with `qveris` under the skills folder.

**Bash (Linux / macOS / WSL):**

```bash
rm -rf ~/.openclaw/skills/qveris*
```

**PowerShell (Windows):**

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.openclaw\skills\qveris*" -ErrorAction SilentlyContinue
```

### 2. Download the full skill directory

Download the `qveris-official` skill definition and scripts from `https://qveris.ai/skill` so that all helper modules remain together.

**Bash (Linux / macOS / WSL):**

```bash
mkdir -p ~/.openclaw/skills/qveris-official/scripts
curl -fSL https://qveris.ai/skill/SKILL.md -o ~/.openclaw/skills/qveris-official/SKILL.md
curl -fSL https://qveris.ai/skill/scripts/qveris_tool.mjs -o ~/.openclaw/skills/qveris-official/scripts/qveris_tool.mjs
curl -fSL https://qveris.ai/skill/scripts/qveris_client.mjs -o ~/.openclaw/skills/qveris-official/scripts/qveris_client.mjs
curl -fSL https://qveris.ai/skill/scripts/qveris_env.mjs -o ~/.openclaw/skills/qveris-official/scripts/qveris_env.mjs
```

**PowerShell (Windows):**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.openclaw\skills\qveris-official\scripts"
Invoke-WebRequest -Uri "https://qveris.ai/skill/SKILL.md" -OutFile "$env:USERPROFILE\.openclaw\skills\qveris-official\SKILL.md"
Invoke-WebRequest -Uri "https://qveris.ai/skill/scripts/qveris_tool.mjs" -OutFile "$env:USERPROFILE\.openclaw\skills\qveris-official\scripts\qveris_tool.mjs"
Invoke-WebRequest -Uri "https://qveris.ai/skill/scripts/qveris_client.mjs" -OutFile "$env:USERPROFILE\.openclaw\skills\qveris-official\scripts\qveris_client.mjs"
Invoke-WebRequest -Uri "https://qveris.ai/skill/scripts/qveris_env.mjs" -OutFile "$env:USERPROFILE\.openclaw\skills\qveris-official\scripts\qveris_env.mjs"
```

### 3. Set the key for the current session

Use a session-scoped variable first. Do not modify shell startup files (`~/.bashrc`, `~/.zshrc`, or PowerShell `$PROFILE`) unless the user explicitly asks for persistent setup.

**Bash (Linux / macOS / WSL):**

```bash
curl -fSL https://qveris.ai/skills/qveris-official/SKILL.md -o ~/.openclaw/skills/qveris-official/SKILL.md
```

**PowerShell (Windows):**

```powershell
$env:QVERIS_API_KEY = "<USER_PROVIDED_KEY>"
```

### 4. Verify the installed files

All of these files should exist after the download.

**Bash (Linux / macOS / WSL):**

```bash
curl -fSL https://qveris.ai/skills/qveris-official/scripts/qveris_env.mjs -o ~/.openclaw/skills/qveris-official/scripts/qveris_env.mjs
curl -fSL https://qveris.ai/skills/qveris-official/scripts/qveris_client.mjs -o ~/.openclaw/skills/qveris-official/scripts/qveris_client.mjs
curl -fSL https://qveris.ai/skills/qveris-official/scripts/qveris_tool.mjs -o ~/.openclaw/skills/qveris-official/scripts/qveris_tool.mjs
```

**PowerShell (Windows):**

```powershell
@("SKILL.md", "scripts\qveris_tool.mjs", "scripts\qveris_client.mjs", "scripts\qveris_env.mjs") | ForEach-Object {
    $file = Split-Path $_ -Leaf
    if (Test-Path "$env:USERPROFILE\.openclaw\skills\qveris-official\$_") { Write-Host "$file OK" } else { Write-Host "$file MISSING" }
}
if ($env:QVERIS_API_KEY) { Write-Host "QVERIS_API_KEY is set" } else { Write-Host "QVERIS_API_KEY is NOT set" }
```

### 5. Verify the runtime entrypoint

Run the local CLI help and one discovery command.

**Bash (Linux / macOS / WSL):**

```bash
echo 'export QVERIS_API_KEY="<USER_PROVIDED_KEY>"' >> ~/.bashrc
source ~/.bashrc
```

**PowerShell (Windows):**

```powershell
node "$env:USERPROFILE\.openclaw\skills\qveris-official\scripts\qveris_tool.mjs" --help
node "$env:USERPROFILE\.openclaw\skills\qveris-official\scripts\qveris_tool.mjs" discover "stock price API" --limit 3
```

The help output should mention `discover`, `call`, and `inspect`.  
The discovery command should return tool candidates and a discovery ID.

## Behavior Rules

```bash
test -f ~/.openclaw/skills/qveris-official/SKILL.md && echo "SKILL.md OK" || echo "SKILL.md MISSING"
test -f ~/.openclaw/skills/qveris-official/scripts/qveris_env.mjs && echo "qveris_env.mjs OK" || echo "qveris_env.mjs MISSING"
test -f ~/.openclaw/skills/qveris-official/scripts/qveris_client.mjs && echo "qveris_client.mjs OK" || echo "qveris_client.mjs MISSING"
test -f ~/.openclaw/skills/qveris-official/scripts/qveris_tool.mjs && echo "qveris_tool.mjs OK" || echo "qveris_tool.mjs MISSING"
echo "QVERIS_API_KEY=${QVERIS_API_KEY:+is set}"
node ~/.openclaw/skills/qveris-official/scripts/qveris_tool.mjs discover "stock price" --limit 5
```

For **Bash / Zsh**, the target file is typically `~/.bashrc` or `~/.zshrc`. For **PowerShell**, the target file is `$PROFILE` and the line would be:

```powershell
$env:QVERIS_API_KEY = "<USER_PROVIDED_KEY>"
```

Default behavior is non-persistent session setup.
