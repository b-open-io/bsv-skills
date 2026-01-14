---
name: bsv-standards
description: This skill should be used when the user asks "what is BRC-42", "what is MAP protocol", "what is AIP", "what is B protocol", "what are BSV standards", "what is SIGMA", "what is BAP", "what is paymail", "what is 1Sat Ordinals", "what is BSV-20", "lookup BRC", "BitCom protocols", or needs to understand BSV ecosystem standards, protocols, and specifications.
---

# BSV Standards & Protocols Reference

Comprehensive index of BSV blockchain standards, protocols, and specifications.

## Quick Reference

| Category | Standards | Description |
|----------|-----------|-------------|
| **BRCs** | BRC-1 to BRC-100+ | Official BSV Request for Comments |
| **BitCom** | AIP, MAP, B, BAP, SIGMA | Data protocols using Bitcoin addresses as prefixes |
| **Tokens** | BSV-20, BSV-21 | Fungible token standards |
| **Ordinals** | 1Sat Ordinals | NFT inscriptions on BSV |
| **Identity** | Paymail, BAP | Identity and addressing standards |

## Official BRC Standards

**Reference**: https://bsv.brc.dev/

### Key Derivation (BRC-42, BRC-32, etc.)

| BRC | Name | Description |
|-----|------|-------------|
| BRC-32 | BIP32 HD Keys | Hierarchical deterministic key derivation |
| BRC-42 | Type42 Derivation | Modern ECDH-based key derivation |
| BRC-43 | Protocol IDs | Security levels and key ID conventions |
| BRC-69 | Key Linkage | Revealing key associations |
| BRC-72 | Linkage Protection | Encrypted linkage transmission |

### Wallet Standards (BRC-1, BRC-2, etc.)

| BRC | Name | Description |
|-----|------|-------------|
| BRC-1 | Transaction Envelope | Standard transaction format |
| BRC-2 | Encryption | Message encryption standard |
| BRC-29 | Paymail | Human-readable payment addresses |

### Script Templates (BRC-48, etc.)

| BRC | Name | Description |
|-----|------|-------------|
| BRC-48 | Pay to Push Drop | Token output template |
| BRC-100 | Wallet Toolbox | Standard wallet implementation |

### Overlay Networks (BRC-22, etc.)

| BRC | Name | Description |
|-----|------|-------------|
| BRC-22 | Overlay Networks | Network topology standard |
| BRC-31 | Authrite | Authentication protocol |

## BitCom Protocols

Data protocols using Bitcoin addresses as OP_RETURN prefixes.

### AIP (Author Identity Protocol)

**Prefix**: `15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva`

Signs content with Bitcoin addresses for verifiable authorship.

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

## Related Packages

| Package | Purpose |
|---------|---------|
| `@bsv/sdk` | Core BSV functionality |
| `@bopen-io/templates` | Script template implementations |
| `js-1sat-ord` | Ordinals/inscriptions |
| `bap` | BAP identity management |
| `sigma-protocol` | SIGMA signing (v0.1.8) |
| `bmapjs` | Transaction parsing for BitCom protocols |

## Local Implementations

Key repositories in `~/code`:

| Repo | Package | Purpose |
|------|---------|---------|
| `ts-templates` | `@bopen-io/templates` | BitCom script templates |
| `sigma` | `sigma-protocol` | SIGMA signing |
| `bap` | `bap` | BAP identity |
| `js-1sat-ord` | `js-1sat-ord` | 1Sat ordinals |
| `bmap` | `bmapjs` | Transaction parser |
| `go-bap` | Go module | Go BAP implementation |
| `go-sigma` | Go module | Go SIGMA implementation |

## Additional Resources

### Reference Files

- **`references/brc-index.md`** - Complete BRC specification index
- **`references/bitcom-protocols.md`** - Detailed BitCom protocol specs
- **`references/token-standards.md`** - BSV-20/BSV-21 token details
- **`references/implementations.md`** - Local repo implementations and packages

### External Links

- **BRC Standards**: https://bsv.brc.dev/
- **ts-templates**: https://github.com/b-open-io/ts-templates
- **sigma-protocol**: https://github.com/BitcoinSchema/sigma
- **js-1sat-ord**: https://github.com/BitcoinSchema/js-1sat-ord
- **bap**: https://github.com/bitcoin-sv/bap
- **bmapjs**: https://github.com/BitcoinSchema/bmapjs
- **1Sat Ordinals**: https://docs.1satordinals.com/
- **Paymail**: https://bsvalias.org/
