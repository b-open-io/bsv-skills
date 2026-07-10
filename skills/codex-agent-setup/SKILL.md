---
name: codex-agent-setup
description: >-
  Explicit-only installer for the BSV Skills David Codex custom agent. Use ONLY
  when the user explicitly asks to install, update, check, uninstall, or set up
  the BSV Skills, David, or Bitcoin Codex agent, including "install David in
  Codex", "update the BSV Skills Codex agent", or "check bsv_skills_bitcoin".
  Never auto-invoke for ordinary BSV, Bitcoin, wallet, transaction, identity,
  mining, or blockchain requests.
disable-model-invocation: false
user-invocable: true
metadata:
  author: b-open-io
  version: "1.0.0"
  codex:
    disable-model-invocation: true
    explicit_invocation_only: true
    never_modify_global_config: true
---

# BSV Skills Codex Agent Setup

Install David's generated Codex adapter as a regular file. Run this skill only
after an explicit request to install, update, check, or uninstall David.

## Safety contract

- Default to the current project's `.codex/agents/` directory.
- Use `--user` only when the user explicitly requests a user-wide install.
- Never edit `~/.codex/config.toml` or any global Codex configuration.
- Never create plugin-cache symlinks or delete unrelated custom agents.
- Run `--check` when the user asks what would change.

## Commands

```bash
bash "${SKILL_DIR}/scripts/setup.sh" [--check|--uninstall|--force]
bash "${SKILL_DIR}/scripts/setup.sh" --user [--check|--uninstall|--force]
bash "${SKILL_DIR}/scripts/setup.sh" --target /custom/agents/directory
```

The installer manages only `bsv-skills-bitcoin.toml` and records ownership in
`.bsv-skills-agents.json`. An unmanaged collision is refused unless the user
explicitly authorizes `--force`.

After a successful install or update, tell the user to start a **new Codex
session**, then invoke David using the runtime name `bsv_skills_bitcoin`.

## Maintainer generation

```bash
bash "${SKILL_DIR}/scripts/generate.sh"
bash "${SKILL_DIR}/scripts/generate.sh" --check
```
