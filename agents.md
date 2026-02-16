# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code plugin (`bsv-skills@b-open-io`) providing 24 skills and 1 agent for BSV blockchain operations. Skills follow the open SKILL.md format from agentskills.io and work cross-platform (Claude Code, OpenCode, Cursor, Gemini CLI, etc.).

## Project Structure

```
bsv-skills/
├── .claude-plugin/plugin.json   # Plugin manifest (bump version here before push)
├── agents/bitcoin-specialist.md # Subagent for BSV tasks
├── skills/                      # 24 skill directories
│   └── <skill-name>/
│       ├── SKILL.md             # Required: frontmatter + instructions
│       ├── references/          # Detailed docs loaded on-demand
│       └── scripts/             # TypeScript utilities and tests
├── package.json                 # Dependencies (@bsv/sdk, bitcoin-backup, etc.)
└── assets/                      # Banner image
```

## Commands

```bash
bun test                         # Run all tests across skills
bun test skills/<name>/scripts/  # Run tests for a specific skill
```

## Publishing

Pushing to `master` publishes the plugin. Bump version in `.claude-plugin/plugin.json` before pushing. Update the plugin after push:

```bash
CLAUDECODE= claude plugin update bsv-skills@b-open-io
```

## Skill Architecture

Each skill follows progressive disclosure:

1. **Frontmatter** (name + description) - always in context, triggers skill loading
2. **SKILL.md body** - loaded when skill activates (keep under 2000 words)
3. **references/** - loaded on-demand for detailed docs
4. **scripts/** - executable TypeScript utilities, some with `.test.ts` companions

### Skill Conventions

- Frontmatter `description` uses third-person: "This skill should be used when..."
- Include specific trigger phrases in description for reliable activation
- Body uses imperative form, not second person
- Scripts use `@bsv/sdk` and `bun` runtime
- Tests colocated as `scripts/<name>.test.ts`
- `allowed-tools` in frontmatter restricts what tools the skill can request (e.g., `Bash(bun:*)`)

### Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with frontmatter
2. Add `scripts/` for executable utilities, `references/` for detailed docs
3. Update README.md skill table
4. Run tests: `bun test skills/<skill-name>/scripts/`

## Key Dependencies

- `@bsv/sdk` - Core BSV transaction building, cryptography
- `bitcoin-backup` - Encrypted .bep backup management
- `bmap-api-types` - BSocial API type definitions
- `@bopen-io/templates` - ScriptTemplate implementations

## Cross-Platform Compatibility

Skills (SKILL.md) work in any agentic tool -- Claude Code, OpenCode, Cursor, Gemini CLI, etc.

Agents in `agents/` are also cross-compatible. OpenCode natively reads Claude Code agent markdown files (frontmatter + body) with no conversion needed. Unknown frontmatter fields are silently ignored via `catchall`. See [OpenCode agents docs](https://opencode.ai/docs/agents/).

## Agent

`bitcoin-specialist` is the sole agent. It loads operational protocols via WebFetch from `b-open-io/prompts` repo at initialization. Lists available skills internally and delegates to them via the Skill tool.
