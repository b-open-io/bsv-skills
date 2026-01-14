# BRC Specification Index

Complete index of BSV Request for Comments (BRC) standards.

**Official Source**: https://bsv.brc.dev/

## Key Derivation (BRC-32 to BRC-96)

| BRC | Title | Description |
|-----|-------|-------------|
| BRC-32 | BIP32 Key Derivation | Legacy HD wallet key derivation |
| BRC-42 | BSV Key Derivation | Type42 ECDH-based key derivation |
| BRC-43 | Security Levels | Protocol IDs, key IDs, counterparties |
| BRC-44 | Security Levels/Apps | Application-level security |
| BRC-69 | Key Linkage Revelation | Revealing key associations to verifiers |
| BRC-72 | Linkage Protection | Encrypting linkage data in transit |
| BRC-75 | Mnemonic for Master Key | BIP39 mnemonic to single private key |
| BRC-77 | SignedMessage | Enhanced message signing (BRC-77 algorithm) |
| BRC-93 | Linkage Limitations | Limitations of BRC-69 method 1 |
| BRC-96 | Schnorr Verification | Zero-knowledge proof for shared secrets |

## Wallet Standards (BRC-1 to BRC-31)

| BRC | Title | Description |
|-----|-------|-------------|
| BRC-1 | Transaction Envelope | Standard transaction format/wrapper |
| BRC-2 | Message Encryption | ECIES-based encryption standard |
| BRC-3 | Certificate Handling | X.509-like certificate operations |
| BRC-8 | BEEF Format | Binary Encoded Envelope Format |
| BRC-29 | Paymail | Human-readable payment addresses |
| BRC-31 | Authrite | Authentication and authorization |

## Transaction Standards (BRC-8 to BRC-12)

| BRC | Title | Description |
|-----|-------|-------------|
| BRC-8 | BEEF | Binary Encoded Envelope Format |
| BRC-10 | Transaction Fees | Fee calculation guidelines |
| BRC-11 | TSC Proofs | Transaction inclusion proofs |
| BRC-12 | Raw Transaction | Raw transaction format |

## Script Templates (BRC-45 to BRC-60)

| BRC | Title | Description |
|-----|-------|-------------|
| BRC-45 | R-Puzzle | Hash puzzle using R value |
| BRC-48 | Pay to Push Drop | Token output template |
| BRC-52 | Push TX | Transaction embedding |
| BRC-56 | sCrypt Templates | sCrypt smart contract templates |

## Overlay Networks (BRC-22 to BRC-28)

| BRC | Title | Description |
|-----|-------|-------------|
| BRC-22 | Overlay Networks | Network topology standard |
| BRC-23 | Service Discovery | Finding overlay services |
| BRC-24 | Topic Managers | Managing overlay topics |
| BRC-25 | Lookup Services | Data lookup infrastructure |

## Wallet Toolbox (BRC-100+)

| BRC | Title | Description |
|-----|-------|-------------|
| BRC-100 | Wallet Conformance | Standard wallet implementation |
| BRC-101 | Key Operations | Key management standards |
| BRC-102 | Transaction Building | Transaction construction |
| BRC-103 | Certificate Actions | Certificate operations |

## Lookup by Topic

### Authentication & Signing
- BRC-31 (Authrite) - Authentication
- BRC-42 (Type42) - Key derivation
- BRC-77 (SignedMessage) - Enhanced signatures
- BRC-96 (Schnorr) - Zero-knowledge proofs

### Payments
- BRC-1 (Envelope) - Transaction format
- BRC-29 (Paymail) - Payment addressing
- BRC-48 (Push Drop) - Token payments

### Privacy
- BRC-42 (Type42) - Private key derivation
- BRC-69 (Key Linkage) - Selective disclosure
- BRC-72 (Protection) - Encrypted linkage

### Smart Contracts
- BRC-45 (R-Puzzle) - Hash puzzles
- BRC-48 (Push Drop) - Token scripts
- BRC-56 (sCrypt) - Contract templates

### Infrastructure
- BRC-22 (Overlays) - Network topology
- BRC-23 (Discovery) - Service finding
- BRC-25 (Lookup) - Data access

## How to Read BRC URLs

Format: `https://bsv.brc.dev/{category}/{number}`

Examples:
- `https://bsv.brc.dev/key-derivation/0042` - BRC-42
- `https://bsv.brc.dev/wallet/0029` - BRC-29 (Paymail)
- `https://bsv.brc.dev/scripts/0048` - BRC-48

## Categories on bsv.brc.dev

| Category | URL Path | Content |
|----------|----------|---------|
| Key Derivation | `/key-derivation/` | BRC-32, BRC-42, BRC-43, etc. |
| Wallet | `/wallet/` | BRC-1, BRC-2, BRC-29, etc. |
| Transactions | `/transactions/` | BRC-8, BRC-10, BRC-11, etc. |
| Scripts | `/scripts/` | BRC-45, BRC-48, BRC-56, etc. |
| Overlays | `/overlays/` | BRC-22, BRC-23, BRC-24, etc. |
| Peer-to-Peer | `/peer-to-peer/` | Direct communication specs |

## Implementation Status

Most BRCs are implemented in:

| Package | Coverage |
|---------|----------|
| `@bsv/sdk` | Core BRCs (key derivation, signing, encryption) |
| `@bsv/wallet-toolbox` | BRC-100 conformant wallet |
| `@bopen-io/templates` | Script templates (BRC-48, etc.) |

## Related Standards

BRCs build on or reference:
- **BIP32**: HD wallet derivation (basis for BRC-32)
- **BIP39**: Mnemonic phrases (basis for BRC-75)
- **ECIES**: Encryption (used in BRC-2)
- **Schnorr**: Signatures (used in BRC-96)
