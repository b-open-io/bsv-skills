---
name: validate-bsv-script
description: Validate and analyze BSV locking/unlocking scripts for correctness and security using @bsv/sdk Script parsing.
allowed-tools: "Bash(bun:*)"
---

# Validate BSV Script

Validate and analyze BSV scripts for correctness, identify script types, and check for security issues.

## When to Use

- Validate a locking or unlocking script
- Identify script type (P2PKH, P2PK, multisig, etc.)
- Analyze script opcodes
- Check for potential security issues

## Usage

```bash
# Validate a script from hex
bun run skills/validate-bsv-script/scripts/validate.ts <script-hex>

# Specify script type
bun run skills/validate-bsv-script/scripts/validate.ts <script-hex> --type locking

# JSON output
bun run skills/validate-bsv-script/scripts/validate.ts <script-hex> --json

# Show help
bun run skills/validate-bsv-script/scripts/validate.ts --help
```

## Status

**Complete** - All tests passing, ready for use
