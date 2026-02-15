# Open QVeris Skills

This repository hosts **QVeris** ([`qveris.ai`](https://qveris.ai)) related bot/agent skills.

- **Feel free to use these skills**: Use them as-is, fork them, and adapt them for your own bots/agents.
- **Contributions welcome**: New skills, improvements, fixes, and documentation updates are encouraged.

## Repository structure

- **One skill per folder**: Each top-level folder represents a standalone skill.
- `qverisai/`: The **baseline QVeris skill** (core capabilities).
  - Use it as a starting point: you can modify it (or ask your AI to modify it) to create **novel, useful skills** tailored to your workflow.
- `stock-copilot-pro/`: A **standalone global stock analysis skill** for ClawHub/OpenClaw style agents.
  - Includes multi-source routing (quote, fundamentals, technicals, sentiment), quality checks, and structured reports.

## Getting started

- Pick a skill folder (for example `qverisai/`) and follow its README:
  - See `qverisai/README.md`
- Skills that call QVeris APIs typically require:
  - `QVERIS_API_KEY` (get one from [`qveris.ai`](https://qveris.ai))

## Contributing

- Add a new folder for a new skill (or improve an existing one).
- Include clear documentation (a `README.md` and/or `SKILL.md`) describing:
  - What the skill does
  - Required environment variables / credentials
  - Example prompts / usage

## License

MIT — see `LICENSE`.

