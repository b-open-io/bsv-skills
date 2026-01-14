---
name: manage-bap-backup
description: This skill should be used when the user asks to "list BAP members", "export BAP identity", "view BAP backup", "manage BAP backup", or needs to work with encrypted .bep BAP identity files using the bap CLI.
allowed-tools: "Bash(bun:*)"
---

# Manage BAP Backup

Manage BAP identity backups using the `bap` CLI.

## When to Use

- List all member identities in a master BAP backup
- Export a specific member identity to separate backup
- View backup metadata and structure
- Extract member keys for specific use cases

## Operations

**List Members**: View all member identities in master backup
**Export Member**: Extract a specific member to separate `.bep` file
**View Details**: Show backup type, identity count, metadata

## Usage

```bash
# List all members in backup (with password argument)
bun run /path/to/skills/manage-bap-backup/scripts/list.ts identity.bep mypassword

# List with environment variable
BACKUP_PASSPHRASE=mypassword bun run /path/to/skills/manage-bap-backup/scripts/list.ts identity.bep

# Export specific member by index
bun run /path/to/skills/manage-bap-backup/scripts/export-member.ts identity.bep 0 output.bep mypassword

# Show help
bun run /path/to/skills/manage-bap-backup/scripts/list.ts --help
bun run /path/to/skills/manage-bap-backup/scripts/export-member.ts --help
```

## Password Handling

Scripts accept passwords in two ways (priority order):
1. **Command-line argument** - Pass password directly for interactive use
2. **Environment variable** - Set `BACKUP_PASSPHRASE` for automation/CI

## Requirements

- `bap` CLI installed globally:
  ```bash
  git clone https://github.com/b-open-io/bap-cli.git
  cd bap-cli && bun install && bun run build && bun link
  ```

## CLI Reference

```bash
# List members
bap list <backup.bep> --password <pass>

# Export member
bap member <backup.bep> --password <pass> --index <n> --output <output.bep>

# Export all members
bap export <backup.bep> --password <pass>
```

## Related

- **Authentication**: BAP identities can be used for OAuth authentication with Sigma Identity. See `@sigma-auth/better-auth-plugin` for integration patterns.
