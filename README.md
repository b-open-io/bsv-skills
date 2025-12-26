# BSV Skills

Core BSV blockchain operations plugin for Claude Code.

## Skills

### Backup Management
- **encrypt-decrypt-backup** - Encrypt and decrypt `.bep` backup files using bitcoin-backup CLI
- **create-bap-identity** - Create new BAP identities (Type42 or Legacy) using bap CLI
- **manage-bap-backup** - List, export, and manage BAP identity backups

### Wallet Operations
- **wallet-send-bsv** - Send BSV transactions using @bsv/sdk
- **wallet-encrypt-decrypt** - Encrypt and decrypt messages using BSV keys

### On-Chain Social
- **bsocial-posts** - Create and read posts on BSocial protocol

### Utilities
- **check-bsv-price** - Get current BSV price from WhatsOnChain API
- **decode-bsv-transaction** - Decode BSV transaction hex
- **lookup-bsv-address** - Look up address information on blockchain

## Prerequisites

### CLI Tools

Install these globally:

```bash
# bitcoin-backup CLI
bun add -g bitcoin-backup

# bap CLI
git clone https://github.com/b-open-io/bap-cli.git
cd bap-cli && bun install && bun run build && bun link
```

### Environment Variables

- `FLOW_BACKUP_PASSPHRASE` - Passphrase for encrypting/decrypting backups

### Flow Convention

This plugin uses Flow's BSV operations convention:

```
/.flow/.bsv/
├── backups/         # Encrypted .bep backup files
├── temp/            # Temporary decrypted files (auto-cleanup)
└── config.json      # Backup registry
```

## Installation

```bash
/plugin marketplace add https://github.com/b-open-io/bsv-skills
/plugin install bsv-skills
```

## Usage

Skills are automatically available after installation. Claude will use them when appropriate for BSV blockchain operations.

## License

MIT
