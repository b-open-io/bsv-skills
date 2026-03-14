# BSV Protocol Implementations

Local repositories and packages implementing BSV standards.

## Core SDK

### @bsv/sdk

**Location**: npm package
**Purpose**: Core BSV functionality

Implements:
- BRC-42 (Type42 key derivation via `PrivateKey.deriveChild`)
- BRC-32 (BIP32 via `HD` class)
- BRC-2 (Encryption via `electrumEncrypt`/`electrumDecrypt`)
- BRC-77 (SignedMessage via `SignedMessage` class)
- BSM (Bitcoin Signed Message via `BSM` class)

```typescript
import {
  PrivateKey, PublicKey, HD,
  BSM, SignedMessage,
  Transaction, Script
} from "@bsv/sdk";
```

---

## BitCom Protocol Templates

### @bopen-io/templates

**Location**: `local clone/ts-templates`
**Repository**: https://github.com/b-open-io/ts-templates
**Package**: `@bopen-io/templates`

Implements:
- AIP (Author Identity Protocol)
- MAP (Magic Attribute Protocol)
- B (Binary Protocol)
- BAP (Bitcoin Attestation Protocol)
- SIGMA (Transaction-bound signatures)
- BitCom (Base protocol parsing)

```typescript
import {
  AIP, MAP, B, BAP, Sigma, BitCom,
  Inscription, BSV20, BSV21,
  OrdLock, PushDrop
} from "@bopen-io/templates";
```

**Key Files**:
- `src/template/bitcom/AIP.ts` - AIP implementation
- `src/template/bitcom/MAP.ts` - MAP implementation
- `src/template/bitcom/B.ts` - B protocol
- `src/template/bitcom/BAP.ts` - BAP implementation
- `src/template/bitcom/Sigma.ts` - SIGMA implementation
- `src/template/inscription/Inscription.ts` - Ordinal inscriptions
- `src/template/bsv20/BSV20.ts` - BSV-20 tokens
- `src/template/bsv21/BSV21.ts` - BSV-21 tokens

---

## SIGMA Protocol

### sigma-protocol

**Location**: `local clone/sigma`
**Repository**: https://github.com/BitcoinSchema/sigma
**Package**: `sigma-protocol` (v0.1.8)

Full implementation of transaction-bound signatures.

```typescript
import { Sigma, Algorithm } from "sigma-protocol";

// Sign transaction output
const sigma = new Sigma(tx, targetVout, sigmaInstance, refVin);
const { signedTx } = sigma.sign(privateKey, Algorithm.BSM);

// Verify
const valid = sigma.verify();
```

**Features**:
- BSM (Bitcoin Signed Message) signatures
- BRC-77 (SignedMessage) signatures
- Multi-signature support
- Transaction binding via input hash

---

## BAP (Bitcoin Attestation Protocol)

### bsv-bap (TypeScript)

**Location**: `local clone/bap`
**Repository**: https://github.com/BitcoinSchema/bap
**Package**: `bsv-bap`
**Protocol Spec**: https://github.com/BitcoinSchema/bap/blob/master/PROTOCOL.md

Full BAP identity management with Type42 and BIP32 support.

```typescript
import { BAP } from "bsv-bap";

// Type42 mode (recommended)
const bap = new BAP({ rootPk: privateKeyWif });

// BIP32 mode (legacy)
const bapLegacy = new BAP(xprvString);

// Create identity
const id = bap.newId();
id.setAttribute("name", "Alice");

// Export for backup
const backup = bap.exportForBackup("My Wallet");
```

Exports: `BAP` (main entry point), `MasterID` (identity via `bap.getId()`, `bap.newId()`).

**Key Files**:
- `src/index.ts` - Main BAP class
- `src/MasterID.ts` - Master identity management
- `src/constants.ts` - Protocol constants

### go-bap (Go)

**Location**: `local clone/go-bap`
**Repository**: https://github.com/bitcoinschema/go-bap
**Module**: `github.com/bitcoinschema/go-bap`

Go implementation of BAP.

```go
import "github.com/bitcoinschema/go-bap"

// Create identity
id := bap.NewIdentity(privateKey)
```

---

## 1Sat Ordinals

### @1sat/actions (recommended)

**Package**: `@1sat/actions`

The action system provides high-level operations for ordinals, tokens, payments, and more via a BRC-100 compatible wallet.

```typescript
import { inscribe, createContext } from '@1sat/actions'

const ctx = createContext(wallet)
const result = await inscribe.execute(ctx, {
  base64Content: btoa('Hello, Ordinals!'),
  contentType: 'text/plain',
})
// result.txid — broadcast transaction ID
```

See the `transaction-building` skill for the full action registry and two-phase signing pattern.

### js-1sat-ord (legacy)

> **Legacy**: Use `@1sat/actions` for new development. `js-1sat-ord` is maintained for backward compatibility only.

**Package**: `js-1sat-ord`

### go-1sat-ord (Go)

**Location**: `local clone/go-1sat-ord`
**Repository**: https://github.com/BitcoinSchema/go-1sat-ord

Go implementation for ordinals.

---

## BMAP (Transaction Parser) - DEPRECATED

### bmapjs

> **DEPRECATED**: Use `@bopen-io/templates` instead for transaction parsing.

**Location**: `local clone/bmap`
**Repository**: https://github.com/BitcoinSchema/bmapjs
**Package**: `bmapjs`

Legacy transaction parser. Functionality now integrated into `@bopen-io/templates`.

```typescript
// DEPRECATED - use @bopen-io/templates instead
import { TransformTx, BmapTx } from "bmapjs";

// NEW - preferred approach
import { BitCom, AIP, MAP, B, BAP, Sigma } from "@bopen-io/templates";
```

**Supported Protocols** (now in @bopen-io/templates):
- B (Binary)
- MAP (Metadata)
- BAP (Attestation)
- AIP (Author Identity)
- SIGMA (Transaction signatures)
- 1Sat Ordinals

---

## Sigma Auth

### sigma-auth

**Location**: `local clone/sigma-auth`
**Purpose**: Bitcoin-native authentication

OAuth-compatible authentication using SIGMA signatures.

### @sigma-auth/better-auth-plugin

**Location**: `local clone/sigma-auth-better-auth-plugin`
**Purpose**: Better Auth integration

```typescript
import { sigmaAuth } from "@sigma-auth/better-auth-plugin";

export const auth = betterAuth({
  plugins: [sigmaAuth()]
});
```

---

## Go Libraries

### go-aip

**Location**: `local clone/go-aip`
**Repository**: https://github.com/bitcoinschema/go-aip
**Module**: `github.com/bitcoinschema/go-aip`

Go implementation of AIP (Author Identity Protocol).

### go-map

**Location**: `local clone/go-map`
**Repository**: https://github.com/bitcoinschema/go-map
**Module**: `github.com/bitcoinschema/go-map`

Go implementation of MAP (Magic Attribute Protocol).

### go-b

**Location**: `local clone/go-b`
**Repository**: https://github.com/bitcoinschema/go-b
**Module**: `github.com/bitcoinschema/go-b`

Go implementation of B (Binary) protocol.

### go-sigma

**Location**: `local clone/go-sigma`
**Repository**: https://github.com/bitcoinschema/go-sigma

Go implementation of SIGMA protocol.

---

## Off-Chain Standards

### bitcoin-auth

**Location**: `local clone/bitcoin-auth`
**Repository**: https://github.com/b-open-io/bitcoin-auth
**Package**: `bitcoin-auth`

HTTP authentication using Bitcoin private keys.

```typescript
import { getAuthToken, verifyAuthToken } from "bitcoin-auth";

// Generate token
const token = getAuthToken({
  privateKeyWif: "L1...",
  requestPath: "/api/data",
  body: JSON.stringify(data),
  scheme: "brc77"
});

// Verify token
const valid = verifyAuthToken(token, {
  requestPath: req.path,
  timestamp: new Date().toISOString(),
  body: req.body
});
```

### bitcoin-backup

**Location**: `local clone/bitcoin-backup`
**Repository**: https://github.com/b-open-io/bitcoin-backup
**Package**: `bitcoin-backup`

Encrypted backup file standard (.bep files).

```typescript
import { encryptBackup, decryptBackup } from "bitcoin-backup";

// Encrypt (AES-256-GCM, PBKDF2-SHA256)
const encrypted = await encryptBackup(payload, passphrase);

// Decrypt (auto-detects backup type)
const backup = await decryptBackup(encrypted, passphrase);
```

**Supported Types**: BapMasterBackup, WifBackup, OneSatBackup, VaultBackup, YoursWalletBackup

### bitcoin-image

**Location**: `local clone/bitcoin-image`
**Repository**: https://github.com/b-open-io/bitcoin-image
**Package**: `bitcoin-image`

On-chain image reference normalization.

```typescript
import { parseImageURL, getDisplayUrl } from "bitcoin-image";

// Parse any format (b://, ord://, txid, etc.)
const parsed = parseImageURL("b://abc123..._0");

// Get displayable URL
const url = await getDisplayUrl("ord://abc123..._0");
// Returns: https://ordfs.network/abc123..._0
```

**Supported Protocols**: `b://`, `ord://`, `bitfs://`, `ipfs://`, `data:`, native txid

---

## Token Services

### bsv21-overlay

**Location**: `local clone/bsv21-overlay`
**Purpose**: BSV-21 token overlay network

### 1sat-api

**Location**: `local clone/1sat-api`
**Purpose**: 1Sat Ordinals API service

### bmap-api

**Location**: `local clone/bmap-api`
**Purpose**: BMAP parsing API service

---

## Content Services

### go-ordfs-server

**Location**: `local clone/go-ordfs-server`
**Repository**: https://github.com/b-open-io/go-ordfs-server
**Live**: https://ordfs.network

Ordinals File System - HTTP gateway for on-chain content.

**Key Features**:
- Content access via `/{txid}_{vout}` or `/content/{pointer}`
- Sequence versioning with `:{sequence}` suffix
- Directory/SPA support with `ord-fs/json`
- DNS-based domain routing
- Preview endpoint for HTML inscriptions
- Block and transaction API endpoints

---

## Package Summary

| Protocol | TypeScript | Go | Notes |
|----------|------------|-----|-------|
| BRC-42 (Type42) | `@bsv/sdk` | `go-sdk` | Key derivation |
| BRC-32 (BIP32) | `@bsv/sdk` | `go-sdk` | HD wallets |
| AIP | `@bopen-io/templates` | `go-aip` | Author identity |
| MAP | `@bopen-io/templates` | `go-map` | Metadata |
| B | `@bopen-io/templates` | `go-b` | Binary storage |
| BAP | `bsv-bap` | `go-bap` | Identity management |
| SIGMA | `sigma-protocol` | `go-sigma` | Tx signatures |
| Ordinals | `@1sat/actions` | `go-1sat-ord` | NFT inscriptions |
| BSV-20 | `@bopen-io/templates` | - | Fungible tokens |
| BMAP | `bmapjs` (deprecated) | `go-bmap` | Use @bopen-io/templates |
| HTTP Auth | `bitcoin-auth` | - | BRC-77 authentication |
| Backup | `bitcoin-backup` | - | Encrypted .bep files |
| Image URLs | `bitcoin-image` | - | URL normalization |
| ORDFS | - | `go-ordfs-server` | Content gateway |

## Installation

```bash
# Core SDK
bun add @bsv/sdk

# Templates
bun add @bopen-io/templates

# Sigma protocol
bun add sigma-protocol

# BAP identity
bun add bsv-bap

# 1Sat ordinals (actions + core)
bun add @1sat/actions @1sat/core

# BMAP parsing (deprecated - use @bopen-io/templates)
# bun add bmapjs

# Off-chain standards
bun add bitcoin-auth bitcoin-backup bitcoin-image
```

## Organization Repositories

| Org | Focus |
|-----|-------|
| [BitcoinSchema](https://github.com/BitcoinSchema) | Protocol implementations |
| [b-open-io](https://github.com/b-open-io) | Templates, skills, tools |
| [bitcoin-sv](https://github.com/bitcoin-sv) | Official BSV SDK |
