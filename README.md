![BSV Skills](assets/banner.png)

BSV blockchain operations for Claude Code and AI agents. 25 skills covering wallets, identity, transactions, broadcasting, mining, and protocol implementation.

Built by [B-Open](https://github.com/b-open-io). Need hands-on help building on BSV? Check out [bopen.io](https://bopen.io) — our consultancy for blockchain development, wallet integration, and BSV application architecture.

Contributions welcome! Found a way to improve a skill or have a new one to add? Open a PR.

## Installation

**Full Plugin** (recommended - includes bitcoin-specialist agent):
```bash
/plugin install bsv-skills@b-open-io
```

**Skills Only** (for other agentic frameworks):
```bash
bunx skills add b-open-io/bsv-skills --skill wallet-brc100
bunx skills add b-open-io/bsv-skills --skill wallet-brc100-go
bunx skills add b-open-io/bsv-skills --skill wallet-send-bsv
bunx skills add b-open-io/bsv-skills --skill broadcast-arc
bunx skills add b-open-io/bsv-skills --skill wallet-encrypt-decrypt
bunx skills add b-open-io/bsv-skills --skill create-bap-identity
bunx skills add b-open-io/bsv-skills --skill manage-bap-backup
bunx skills add b-open-io/bsv-skills --skill encrypt-decrypt-backup
bunx skills add b-open-io/bsv-skills --skill message-signing
bunx skills add b-open-io/bsv-skills --skill bsv-standards
bunx skills add b-open-io/bsv-skills --skill key-derivation
bunx skills add b-open-io/bsv-skills --skill ordfs
bunx skills add b-open-io/bsv-skills --skill create-script-template
bunx skills add b-open-io/bsv-skills --skill review-script-template
bunx skills add b-open-io/bsv-skills --skill stratum-v1
bunx skills add b-open-io/bsv-skills --skill stratum-v2
bunx skills add b-open-io/bsv-skills --skill calculate-mining-difficulty
bunx skills add b-open-io/bsv-skills --skill junglebus
bunx skills add b-open-io/bsv-skills --skill bsocial
bunx skills add b-open-io/bsv-skills --skill check-bsv-price
bunx skills add b-open-io/bsv-skills --skill decode-bsv-transaction
bunx skills add b-open-io/bsv-skills --skill validate-bsv-script
bunx skills add b-open-io/bsv-skills --skill lookup-bsv-address
bunx skills add b-open-io/bsv-skills --skill lookup-block-info
bunx skills add b-open-io/bsv-skills --skill estimate-transaction-fee
```

## Skills

| Skill | Description | Triggers |
|-------|-------------|----------|
| **wallet-brc100** | BRC-100 wallet implementation + WalletClient + BEEF relay | "create wallet," "BRC-100," "WalletClient," "noSend," "BEEF" |
| **wallet-brc100-go** | BRC-100 wallet implementation (Go) | "go wallet," "golang wallet" |
| **wallet-send-bsv** | P2PKH transactions from WIF key | "send BSV," "send from WIF" |
| **broadcast-arc** | Broadcast transactions via ARC (GorillaPool / TAAL) | "broadcast via ARC," "arc.gorillapool.io," "broadcastMany" |
| **wallet-encrypt-decrypt** | ECDH encryption with BSV keys (AES-256-GCM) | "encrypt message," "ECDH," "decrypt" |
| **create-bap-identity** | BAP identity creation via bap CLI | "create identity," "BAP," "Type42" |
| **manage-bap-backup** | Export identities from .bep files | "export identity," "list members" |
| **encrypt-decrypt-backup** | Encrypted .bep backup management | "encrypt backup," "decrypt backup" |
| **message-signing** | BSM, BRC-77, and Sigma signing | "sign message," "verify signature" |
| **bsv-standards** | BRCs, BitCom protocols, token standards | "what is BRC," "MAP protocol," "AIP" |
| **key-derivation** | Type42, BIP32, BAP derivation patterns | "derive key," "BRC-42," "BIP32" |
| **ordfs** | ORDFS gateway API (ordfs.network) | "fetch ordinal," "on-chain content" |
| **create-script-template** | Author ScriptTemplate implementations | "create template," "script template" |
| **review-script-template** | Audit templates against best practices | "review template," "template audit" |
| **stratum-v1** | Stratum v1 protocol (JSON-RPC over TCP) | "stratum," "mining pool," "share submission" |
| **stratum-v2** | Stratum v2 binary protocol overview | "stratum v2," "binary protocol" |
| **calculate-mining-difficulty** | Target/bits/difficulty conversion | "mining difficulty," "hashrate" |
| **junglebus** | Real-time transaction streaming | "junglebus," "transaction stream," "GorillaPool" |
| **bsocial** | On-chain social protocol (posts, likes, follows) | "bsocial," "on-chain social," "BMAP" |
| **check-bsv-price** | Current price from WhatsOnChain | "BSV price," "current rate" |
| **decode-bsv-transaction** | Parse raw, EF, and BEEF transaction formats | "decode tx," "parse transaction," "decode BEEF" |
| **validate-bsv-script** | Analyze locking/unlocking scripts | "validate script," "script analysis" |
| **lookup-bsv-address** | Address balance, history, UTXOs | "address balance," "UTXOs," "address history" |
| **lookup-block-info** | Block data by height or hash | "block info," "block header" |
| **estimate-transaction-fee** | Fee calculation by size and rate | "transaction fee," "fee estimate" |

## Skill Categories

### Wallet Development
- **wallet-brc100** / **wallet-brc100-go** - Full BRC-100 wallet implementation, WalletClient, BEEF relay
- **wallet-send-bsv** - Build and sign P2PKH transactions from a WIF key
- **broadcast-arc** - Broadcast signed transactions via GorillaPool or TAAL ARC
- **wallet-encrypt-decrypt** - ECDH encryption/decryption with BSV keys

### Identity & Authentication
- **create-bap-identity** - Create BAP identities (Type42 or Legacy mode)
- **manage-bap-backup** - List members, export from .bep files
- **encrypt-decrypt-backup** - Encrypt/decrypt .bep backups
- **message-signing** - BSM, BRC-77, Sigma Protocol signing

### Standards Reference
- **bsv-standards** - BRC specifications, BitCom protocols, token standards
- **key-derivation** - BRC-42 (Type42), BRC-32 (BIP32), BAP derivation
- **ordfs** - ORDFS gateway API for on-chain content

### Script Templates
- **create-script-template** - Author new ScriptTemplate implementations
- **review-script-template** - Audit template code against best practices

### Mining
- **stratum-v1** - Stratum v1 protocol, job assignment, share submission
- **stratum-v2** - Stratum v2 binary protocol overview
- **calculate-mining-difficulty** - Target, bits, difficulty conversion

### On-Chain Data
- **junglebus** - Real-time transaction streaming from GorillaPool
- **bsocial** - Complete on-chain social protocol (posts, replies, likes, follows)

### Utilities
- **check-bsv-price** - Current price from WhatsOnChain
- **decode-bsv-transaction** - Parse transaction hex
- **validate-bsv-script** - Analyze locking/unlocking scripts
- **lookup-bsv-address** - Address balance, history, UTXOs
- **lookup-block-info** - Block data by height or hash
- **estimate-transaction-fee** - Fee calculation by size and rate

## Usage

Once installed, just ask Claude Code to help with BSV tasks:

```
"Help me create a BRC-100 wallet"
→ Uses wallet-brc100 skill

"Send 0.001 BSV to this address"
→ Uses wallet-send-bsv skill

"What is the Sigma protocol?"
→ Uses bsv-standards skill

"Stream transactions for this address"
→ Uses junglebus skill
```

You can also invoke skills directly:

```
/wallet-brc100
/bsv-standards
/check-bsv-price
```

## Prerequisites

Some skills require CLI tools:

```bash
# For backup operations
bun add -g bitcoin-backup

# For BAP identity operations
git clone https://github.com/b-open-io/bap-cli.git
cd bap-cli && bun install && bun run build && bun link
```

Set `BACKUP_PASSPHRASE` environment variable for backup encryption.

## Contributing

Found a way to improve a skill? Have a new skill to suggest? PRs and issues welcome!

Ideas for contributions:
- Improve existing skill instructions or frameworks
- Add new protocol implementations
- Fix typos or clarify confusing sections
- Suggest new skills (open an issue first to discuss)

## License

MIT
