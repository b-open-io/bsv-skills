---
name: encrypt-decrypt-backup
description: This skill should be used when the user asks to "encrypt backup", "decrypt .bep file", "bitcoin-backup CLI", "backup wallet", "Touch ID password cache", "upgrade backup iterations", or needs to encrypt/decrypt BSV backup files using the bbackup CLI.
allowed-tools: "Bash(bun:*)"
---

# Encrypt/Decrypt Backup

Encrypt and decrypt BSV backup files using the bitcoin-backup CLI (`bbackup`).

## When to Use

- Encrypt wallet JSON to secure `.bep` backup file
- Decrypt `.bep` backup to read wallet data
- Create BAP identity backups
- Secure ordinals keys and payment keys
- Store sensitive BSV data encrypted at rest

## Supported Backup Types

All backups use `.bep` format (AES-256-GCM encryption):

- **BapMasterBackup** - BAP identity (Type42 or Legacy)
- **BapAccountBackup** - Individual BAP account key
- **WifBackup** - Single private key
- **OneSatBackup** - Ordinals + Payment + Identity keys
- **VaultBackup** - Encrypted vault
- **YoursWalletBackup** - Yours Wallet format
- **YoursWalletZipBackup** - Yours Wallet ZIP format

## Usage

Run the encrypt or decrypt scripts:

```bash
# Encrypt a wallet JSON file
bun run /path/to/skills/encrypt-decrypt-backup/scripts/encrypt.ts wallet.json output.bep

# Decrypt a backup file
bun run /path/to/skills/encrypt-decrypt-backup/scripts/decrypt.ts backup.bep

# Decrypt to specific output file
bun run /path/to/skills/encrypt-decrypt-backup/scripts/decrypt.ts backup.bep wallet.json
```

## Flow's BSV Convention

This skill follows agent's BSV backup convention:

**Storage Location**: `/.flow/.bsv/`
- `backups/` - Encrypted .bep files
- `temp/` - Temporary decrypted files (auto-cleanup)
- `config.json` - Backup registry

**Security**:
- Never hardcodes passwords
- 600k PBKDF2 iterations for strong encryption

## Password Handling

Scripts accept passwords in two ways (priority order):
1. **Command-line argument** - Pass password directly for interactive use
2. **Environment variable** - Set `BACKUP_PASSPHRASE` for automation/CI

## Requirements

- `bbackup` CLI installed globally: `bun add -g bitcoin-backup`

## CLI Reference

The bitcoin-backup CLI provides four commands:

- `bbackup enc <input> -p <password> -o <output>` - Encrypt JSON to .bep
- `bbackup dec <input> -p <password> -o <output>` - Decrypt .bep to JSON
- `bbackup upg <input> -p <password> -o <output>` - Upgrade legacy backups
- `bbackup forget <file>` - Remove cached Touch ID password

## Touch ID Password Caching (macOS arm64)

On Apple Silicon Macs, `bbackup` can cache passwords in the Secure Enclave via `@1sat/vault`:

- `bbackup enc backup.json -o backup.bep --touchid` — encrypt and cache the password
- `bbackup dec backup.bep --touchid` — decrypt using cached password (Touch ID prompt)
- `bbackup forget backup.bep` — remove cached password

Requires macOS arm64 with Xcode Command Line Tools. Cached passwords are hardware-bound and cannot be extracted.

## Error Handling

- Password too short (min 8 chars) - Returns error
- Invalid backup structure - Validation error
- Wrong password - Decryption fails with error
- Auto-detects backup type and iteration count
