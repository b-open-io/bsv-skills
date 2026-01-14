![BSV Skills](assets/banner.png)

Core BSV blockchain operations plugin for Claude Code.

## Installation

```bash
/plugin marketplace add https://github.com/b-open-io/bsv-skills
/plugin install bsv-skills
```

## Skills

### Standards & Protocols
- **bsv-standards** - Comprehensive BSV standards reference (BRCs, BitCom protocols, tokens, identity)
- **key-derivation** - BRC-42 (Type42), BRC-32 (BIP32), and BAP key derivation patterns
- **ordfs** - ORDFS gateway for on-chain content access (ordfs.network API)

### Script Templates
- **create-script-template** - Create new templates for b-open-io/ts-templates
- **review-script-template** - Validate and audit template implementations

### Backup Management
- **encrypt-decrypt-backup** - Encrypt and decrypt `.bep` backup files using bitcoin-backup CLI
- **create-bap-identity** - Create new BAP identities (Type42 or Legacy) using bap CLI
- **manage-bap-backup** - List, export, and manage BAP identity backups

### Wallet Operations
- **wallet-brc100** - Comprehensive BRC-100 wallet development guide (TypeScript - @bsv/wallet-toolbox)
- **wallet-brc100-go** - Comprehensive BRC-100 wallet development guide (Go - go-wallet-toolbox)
- **wallet-send-bsv** - Send BSV transactions using @bsv/sdk
- **wallet-encrypt-decrypt** - Encrypt and decrypt messages using BSV keys

### Message Signing
- **message-signing** - BSM, BRC-77, and Sigma signing protocols with @bsv/sdk and sigma-protocol

### On-Chain Social
- **bsocial-posts** - Create and read posts on BSocial protocol

### Mining (Stratum Protocol)
- **stratum-v1** - Stratum v1 mining protocol implementation guide (JSON-RPC over TCP)
- **stratum-v2** - Stratum v2 binary protocol overview (encryption, job declaration)
- **calculate-mining-difficulty** - Calculate and analyze BSV mining difficulty from targets, bits, and network data

### Utilities
- **check-bsv-price** - Get current BSV price from WhatsOnChain API
- **decode-bsv-transaction** - Decode BSV transaction hex
- **estimate-transaction-fee** - Estimate fees for BSV transactions based on size and fee rates
- **lookup-block-info** - Retrieve detailed block information by height or hash
- **lookup-bsv-address** - Look up address information on blockchain
- **validate-bsv-script** - Validate and analyze BSV scripts for correctness and security

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

- `BACKUP_PASSPHRASE` - Passphrase for encrypting/decrypting backups

### Flow Convention

This plugin uses Flow's BSV operations convention:

```
/.flow/.bsv/
├── backups/         # Encrypted .bep backup files
├── temp/            # Temporary decrypted files (auto-cleanup)
└── config.json      # Backup registry
```

## Usage

Skills are automatically available after installation. Claude will use them when appropriate for BSV blockchain operations.

## License

MIT
