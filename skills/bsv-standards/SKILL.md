---
name: bsv-standards
description: This skill should be used when the user asks about any BRC standard (BRC-1 through BRC-113), "what is BRC-61", "what is BRC-42", "what is BEEF", "what is BUMP", "Compound Merkle Path", "Merkle proof format", "what is MAP protocol", "what is AIP", "what is B protocol", "what are BSV standards", "what is SIGMA", "what is BAP", "what is paymail", "what is 1Sat Ordinals", "what is BSV-20", "what is STAS", "lookup BRC", "BitCom protocols", "what is bitcoin-auth", "what is bitcoin-backup", "what is bitcoin-image", "what is Bitcoin Schema", "what is DPP", "what is PacketPay", "what is Authrite", "what is PIKE", "what is P2PKH", "what is Push Drop", "overlay network", "SPV", "outpoint format", "what is ORDFS", "Mandala token", or needs to understand any BSV ecosystem standard, protocol, or specification. Covers all 12 BRC categories: Wallet, Transactions, Scripts, Key Derivation, Payments, Overlays, Peer-to-Peer, Tokens, Outpoints, Opinions, State Machines, and Apps.
user-invocable: false
---

# BSV Standards & Protocols Reference

Comprehensive index of BSV blockchain standards, protocols, and specifications.

## Quick Reference

| Category | Standards | Description |
|----------|-----------|-------------|
| **BRCs** | BRC-1 to BRC-100+ | Official BSV Request for Comments |
| **BitCom** | AIP, MAP, B, BAP, SIGMA | Data protocols using Bitcoin addresses as prefixes |
| **Tokens** | BSV-20, BSV-21, STAS | Fungible token standards |
| **Ordinals** | 1Sat Ordinals | NFT inscriptions on BSV |
| **Identity** | Paymail, BAP | Identity and addressing standards |
| **Off-Chain** | bitcoin-auth, bitcoin-backup, bitcoin-image | Authentication, backup, URL standards |
| **Data Schema** | Bitcoin Schema, Ord Schema | Standardized on-chain data structures |

## Official BRC Standards

**Reference**: https://bsv.brc.dev/ -- 100+ standards across 12 categories.

For the complete index of every BRC, consult **`references/brc-index.md`**.

### Key Categories

| Category | Key BRCs | Description |
|----------|----------|-------------|
| **Wallet** | BRC-1 to BRC-7, BRC-46, BRC-50, BRC-53, BRC-56, BRC-65, BRC-66, BRC-73, BRC-97-100, BRC-109, BRC-111-112 | Wallet-to-app interface, transaction creation, encryption, baskets, labels, certificates |
| **Transactions** | BRC-8, BRC-9, BRC-10-13, BRC-30, BRC-58, BRC-61, BRC-62, BRC-67, BRC-71, BRC-74, BRC-76, BRC-83, BRC-95-96 | TX formats (BEEF, EF, Raw), Merkle proofs (CMP, BUMP, JSON, Binary), SPV |
| **Scripts** | BRC-14-19, BRC-21, BRC-47, BRC-48, BRC-106 | P2PKH, R-Puzzle, Push Drop, Push TX, Multi-Sig, Script formats |
| **Key Derivation** | BRC-32, BRC-42-44, BRC-69, BRC-72, BRC-75, BRC-84, BRC-86, BRC-93-94 | BIP32, Type42/BKDS, protocol IDs, key linkage, mnemonics, Schnorr |
| **Payments** | BRC-27-29, BRC-41, BRC-54-55, BRC-70, BRC-105 | DPP, Paymail, PacketPay, service monetization |
| **Overlays** | BRC-22-26, BRC-64, BRC-81, BRC-87-88, BRC-101 | Overlay sync, CHIP, CLAP, lookup, SHIP/SLAP |
| **Peer-to-Peer** | BRC-31, BRC-33-34, BRC-52, BRC-63, BRC-68, BRC-77-78, BRC-82, BRC-85, BRC-103-104 | Authrite, PeerServ, identity certificates, PIKE, message signing |
| **Tokens** | BRC-45, BRC-79, BRC-92, BRC-107-108, BRC-113 | UTXO tokens, Mandala, identity-linked tokens |
| **Outpoints** | BRC-36-37 | Outpoint format, spending instructions |
| **Opinions** | BRC-49, BRC-51, BRC-57, BRC-59, BRC-80, BRC-89-91, BRC-110 | UX guidance, scalability, Web 3.0 vision |
| **State Machines** | BRC-60 | Event chains in Bitcoin |
| **Apps** | BRC-102 | deployment-info.json spec |

## BitCom Protocols

Data protocols using Bitcoin addresses as OP_RETURN prefixes.

### AIP (Author Identity Protocol)

**Prefix**: `15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva`
Signs content with Bitcoin addresses for verifiable authorship. Similar to Sigma protocol but does not require inputs.
```
OP_RETURN | <data> | AIP_PREFIX | "BITCOIN_ECDSA" | <address> | <signature>
```

**Use cases**: Content authentication, author verification

### MAP (Magic Attribute Protocol)

**Prefix**: `1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5`

Key-value metadata storage on-chain.

```
OP_RETURN | MAP_PREFIX | "SET" | "key1" | "value1" | "key2" | "value2"
```

**Commands**: SET, DEL, ADD, SELECT

**Use cases**: Metadata, tags, attributes, social data

### B (Binary) Protocol

**Prefix**: `19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut`

Arbitrary file storage on-chain.

```
OP_RETURN | B_PREFIX | <data> | <media-type> | <encoding> | [filename]
```

**Use cases**: Images, documents, any binary data

### BAP (Bitcoin Attestation Protocol)

**Prefix**: `1BAPSuaPnfGnSBM3GLV9yhxUdYe4vGbdMT`

Identity attestation and management.

```
OP_RETURN | BAP_PREFIX | "ID" | <identity-key> | <address> | [attributes]
```

**Use cases**: Identity creation, attestations, key rotation

### SIGMA

**Prefix**: `SIGMA`

Transaction-bound signatures for OP_RETURN data.

```
OP_RETURN | <data> | SIGMA | <algorithm> | <address> | <signature> | <vin>
```

**Algorithms**: BSM (Bitcoin Signed Message), BRC-77 (SignedMessage)

**Use cases**: Multi-party signing, transaction authentication

## Token Standards

### BSV-20

Fungible tokens using inscription format.

```json
{"p":"bsv-20","op":"deploy","tick":"TOKEN","max":"21000000","lim":"1000"}
{"p":"bsv-20","op":"mint","tick":"TOKEN","amt":"1000"}
{"p":"bsv-20","op":"transfer","tick":"TOKEN","amt":"100"}
```

**Operations**: deploy, mint, transfer, burn

### BSV-21

Enhanced fungible tokens with contract control.

**Features**: Programmable supply, transfer rules, metadata

### STAS (Simplified Token And Smart Contracts)

Native token protocol using Bitcoin script-level enforcement.

**Website**: https://www.stastoken.com/
**Documentation**: https://docs.stastoken.com/

**Features**:
- Script-enforced token transfers (no indexer required for validation)
- Fungible and non-fungible token support
- Atomic swaps and contract capabilities
- Native Bitcoin script validation

### Run (Defunct)

Early BSV token protocol (runonbitcoin.com - no longer operational).

**Status**: Abandoned protocol from early BSV days. Stored data on-chain using B protocol, so historical artifacts remain accessible via ORDFS (ordfs.network).

## Ordinals (1Sat Ordinals)

NFT inscriptions using ordinal theory on BSV.

### Inscription Format

```
OP_0 OP_IF "ord" OP_1 <content-type> OP_0 <content> OP_ENDIF
```

### Key Concepts

- **Inscription**: Data embedded in transaction scripts
- **Ordinal ID**: `<txid>_<vout>` unique identifier
- **Collections**: Grouped inscriptions with parent reference

**Marketplace**: https://ordinals.gorillapool.io

## Identity Standards

### Paymail

Human-readable payment addressing (BRC-29).

**Format**: `user@domain.com`

**Capabilities**:
- `pki` - Public key infrastructure
- `paymentDestination` - Get payment address
- `p2p-payment-destination` - Peer-to-peer payments
- `receive-transaction` - Direct transaction delivery

### BAP Identity

On-chain identity management.

**Components**:
- Root address (identity anchor)
- Identity key (deterministic ID)
- Attestations (claims about identity)
- Key rotation (address transitions)

## Off-Chain Standards

### bitcoin-auth

HTTP authentication using Bitcoin private keys.

**Token Format**: `pubkey|scheme|timestamp|requestPath|signature`

**Schemes**: `brc77` (recommended), `bsm`

### bitcoin-backup

Encrypted backup file standard (.bep files).

**Encryption**: AES-256-GCM, PBKDF2-SHA256 (600k iterations)

**Types**: BapMasterBackup, BapMemberBackup, WifBackup, OneSatBackup, VaultBackup

### bitcoin-image

On-chain image reference normalization.

**Protocols**: `b://`, `ord://`, `bitfs://`, `ipfs://`, `data:`, native txid

**Outpoint Formats**: `txid_vout`, `txid.vout`, `txido0`, `/content/txid_vout`

## Data Schema Standards

### Bitcoin Schema

**Website**: https://bitcoinschema.org

Standardized data structures for on-chain data built on MAP and B protocols.

**Types**: Post, Like, Follow, Reply, Repost, Friend, Message, Payment, Ordinal

### Ord Schema Type

**Docs**: https://docs.1satordinals.com/adding-metadata/ord-schema-type

Base metadata schema for ordinals inscriptions.

**Required**: `app`, `type` ("ord"), `name`

**Optional**: `subType`, `subTypeData`, `royalties`, `previewUrl`

## Related Packages

| Package | Purpose |
|---------|---------|
| `@bsv/sdk` | Core BSV functionality |
| `@b-open-io/templates` | Script template implementations (replaces bmapjs) |
| `js-1sat-ord` | Ordinals/inscriptions (migrating to `@1sat/sdk` - in progress) |
| `bsv-bap` | BAP identity management |
| `sigma-protocol` | SIGMA signing |
| `bitcoin-auth` | HTTP authentication |
| `bitcoin-backup` | Encrypted backup files |
| `bitcoin-image` | URL normalization |

**Deprecated**: `bmapjs` - replaced by `@b-open-io/templates`

## Additional Resources

### Reference Files

- **`references/brc-index.md`** - Complete BRC specification index
- **`references/bitcom-protocols.md`** - Detailed BitCom protocol specs
- **`references/token-standards.md`** - BSV-20/BSV-21/1Sat Ordinals details
- **`references/implementations.md`** - Local repo implementations and packages
- **`references/offchain-standards.md`** - Off-chain standards (auth, backup, image)

### External Links

- **BRC Standards**: https://bsv.brc.dev/
- **Bitcoin Schema**: https://bitcoinschema.org
- **1Sat Ordinals Docs**: https://docs.1satordinals.com/
- **ORDFS Gateway**: https://ordfs.network
- **@b-open-io/templates**: https://github.com/b-open-io/ts-templates
- **sigma-protocol**: https://github.com/BitcoinSchema/sigma
- **js-1sat-ord**: https://github.com/BitcoinSchema/js-1sat-ord
- **bsv-bap**: https://github.com/BitcoinSchema/bap
- **bitcoin-auth**: https://github.com/b-open-io/bitcoin-auth
- **STAS Token**: https://docs.stastoken.com/
- **bitcoin-backup**: https://github.com/b-open-io/bitcoin-backup
- **bitcoin-image**: https://github.com/b-open-io/bitcoin-image
- **Paymail**: https://bsvalias.org/
