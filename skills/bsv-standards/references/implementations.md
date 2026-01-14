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

**Location**: `~/code/ts-templates`
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

**Location**: `~/code/sigma`
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

**Location**: `~/code/bap`
**Repository**: https://github.com/BitcoinSchema/bap
**Package**: `bsv-bap`
**Protocol Spec**: https://github.com/BitcoinSchema/bap/blob/master/PROTOCOL.md

Full BAP identity management with Type42 and BIP32 support.

```typescript
import { BAP, MasterID, MemberID } from "bsv-bap";

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

**Key Files**:
- `src/index.ts` - Main BAP class
- `src/MasterID.ts` - Master identity management
- `src/MemberID.ts` - Member identity operations
- `src/constants.ts` - Protocol constants
- `docs/TYPE42_MIGRATION.md` - Migration guide

### go-bap (Go)

**Location**: `~/code/go-bap`
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

### js-1sat-ord

**Location**: `~/code/js-1sat-ord`
**Repository**: https://github.com/BitcoinSchema/js-1sat-ord
**Package**: `js-1sat-ord` (v0.1.91)

JavaScript library for 1Sat Ordinals.

```typescript
import {
  createOrdinals,
  sendOrdinals,
  deployBsv20,
  mintBsv20,
  transferBsv20
} from "js-1sat-ord";

// Create inscription
const tx = await createOrdinals({
  utxos,
  destinations: [{
    address: "1A1zP...",
    inscription: {
      dataB64: btoa("Hello, Ordinals!"),
      contentType: "text/plain"
    }
  }],
  changeAddress: "1B2c..."
});
```

**Dependencies**:
- `@bopen-io/templates` - Script templates
- `sigma-protocol` - Transaction signing

### go-1sat-ord (Go)

**Location**: `~/code/go-1sat-ord`
**Repository**: https://github.com/BitcoinSchema/go-1sat-ord

Go implementation for ordinals.

---

## BMAP (Transaction Parser)

### bmapjs

**Location**: `~/code/bmap`
**Repository**: https://github.com/BitcoinSchema/bmapjs
**Package**: `bmapjs` (v0.4.0)

Parses transactions containing BitCom protocols.

```typescript
import { TransformTx, BmapTx } from "bmapjs";

// Parse transaction
const parsed: BmapTx = await TransformTx(rawTx);

// Access parsed protocols
console.log(parsed.AIP);   // AIP signatures
console.log(parsed.MAP);   // MAP metadata
console.log(parsed.B);     // B protocol files
console.log(parsed.BAP);   // BAP attestations
console.log(parsed.SIGMA); // SIGMA signatures
```

**Supported Protocols**:
- B (Binary)
- MAP (Metadata)
- BAP (Attestation)
- AIP (Author Identity)
- SIGMA (Transaction signatures)
- METANET (Metanet protocol)
- 1Sat Ordinals

---

## Sigma Auth

### sigma-auth

**Location**: `~/code/sigma-auth`
**Purpose**: Bitcoin-native authentication

OAuth-compatible authentication using SIGMA signatures.

### @sigma-auth/better-auth-plugin

**Location**: `~/code/sigma-auth-better-auth-plugin`
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

**Location**: `~/code/go-aip`
**Repository**: https://github.com/bitcoinschema/go-aip
**Module**: `github.com/bitcoinschema/go-aip`

Go implementation of AIP (Author Identity Protocol).

### go-map

**Location**: `~/code/go-map`
**Repository**: https://github.com/bitcoinschema/go-map
**Module**: `github.com/bitcoinschema/go-map`

Go implementation of MAP (Magic Attribute Protocol).

### go-b

**Location**: `~/code/go-b`
**Repository**: https://github.com/bitcoinschema/go-b
**Module**: `github.com/bitcoinschema/go-b`

Go implementation of B (Binary) protocol.

### go-sigma

**Location**: `~/code/go-sigma`
**Repository**: https://github.com/bitcoinschema/go-sigma

Go implementation of SIGMA protocol.

---

## Token Services

### bsv21-overlay

**Location**: `~/code/bsv21-overlay`
**Purpose**: BSV-21 token overlay network

### 1sat-api

**Location**: `~/code/1sat-api`
**Purpose**: 1Sat Ordinals API service

### bmap-api

**Location**: `~/code/bmap-api`
**Purpose**: BMAP parsing API service

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
| Ordinals | `js-1sat-ord` | `go-1sat-ord` | NFT inscriptions |
| BSV-20 | `@bopen-io/templates` | - | Fungible tokens |
| BMAP | `bmapjs` | `go-bmap` | Tx parsing |

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

# 1Sat ordinals
bun add js-1sat-ord

# BMAP parsing
bun add bmapjs
```

## Organization Repositories

| Org | Focus |
|-----|-------|
| [BitcoinSchema](https://github.com/BitcoinSchema) | Protocol implementations |
| [b-open-io](https://github.com/b-open-io) | Templates, skills, tools |
| [bitcoin-sv](https://github.com/bitcoin-sv) | Official BSV SDK |
