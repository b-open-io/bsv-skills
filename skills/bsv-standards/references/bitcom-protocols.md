# BitCom Protocols

Detailed specifications for Bitcoin Computer (BitCom) protocols.

## What is BitCom?

BitCom protocols use Bitcoin addresses as protocol identifiers in OP_RETURN scripts. Each protocol has a unique address prefix that identifies the data format.

**Pattern**: `OP_RETURN | PROTOCOL_PREFIX | protocol_data...`

Protocols can be chained using pipe (`|`) separator.

## AIP (Author Identity Protocol)

**Prefix**: `15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva`
**Purpose**: Cryptographic content signing

### Format

```
OP_RETURN | <data_to_sign> | AIP_PREFIX | <algorithm> | <address> | <signature> | [field_indexes]
```

### Fields

| Position | Name | Description |
|----------|------|-------------|
| 1 | algorithm | Signing algorithm (usually "BITCOIN_ECDSA") |
| 2 | address | Bitcoin address of signer |
| 3 | signature | Base64 encoded signature |
| 4 | field_indexes | Optional: which fields were signed |

### Example

```
OP_RETURN
  "Hello World"
  |
  15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva
  "BITCOIN_ECDSA"
  "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
  "H+signature..."
```

### Verification

1. Reconstruct signed message from preceding data
2. Recover public key from signature
3. Verify address matches recovered key
4. Confirm signature valid

### Package

```typescript
import { AIP, PrivateKeySigner } from "@1sat/templates";

// Sign
const signer = new PrivateKeySigner(privateKey);
const aip = await AIP.sign(dataBytes, signer);

// Verify
const valid = aip.verify();
```

---

## MAP (Magic Attribute Protocol)

**Prefix**: `1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5`
**Purpose**: Key-value metadata storage

### Format

```
OP_RETURN | MAP_PREFIX | <command> | <key> | <value> | <key> | <value> ...
```

### Commands

| Command | Usage | Description |
|---------|-------|-------------|
| SET | `SET key value` | Set key-value pairs |
| DEL | `DEL key` | Delete a key |
| ADD | `ADD key value1 value2` | Add values to array key |
| SELECT | `SELECT app type` | Define context |

### Examples

**SET metadata**:
```
OP_RETURN | MAP_PREFIX | "SET" | "app" | "myapp" | "type" | "post" | "title" | "Hello"
```

**ADD tags**:
```
OP_RETURN | MAP_PREFIX | "ADD" | "tags" | "bitcoin" | "bsv" | "ordinals"
```

### Common Keys

| Key | Usage |
|-----|-------|
| `app` | Application identifier |
| `type` | Content type |
| `context` | Reference context |
| `subcontext` | Sub-reference |
| `tx` | Related transaction |

### Package

```typescript
import { MAP, MAPCommand } from "@1sat/templates";

// Create SET
const script = MAP.set({ app: "myapp", type: "post", title: "Hello" });

// Create ADD
const addScript = MAP.add("tags", ["bitcoin", "bsv"]);
```

---

## B (Binary) Protocol

**Prefix**: `19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut`
**Purpose**: Arbitrary file storage

### Format

```
OP_RETURN | B_PREFIX | <data> | <media_type> | <encoding> | [filename]
```

### Fields

| Position | Name | Description |
|----------|------|-------------|
| 1 | data | File content (binary) |
| 2 | media_type | MIME type (e.g., "image/png") |
| 3 | encoding | Encoding (e.g., "binary", "utf-8") |
| 4 | filename | Optional filename |

### Common Media Types

| Type | Usage |
|------|-------|
| `text/plain` | Plain text |
| `text/markdown` | Markdown |
| `text/html` | HTML |
| `image/png` | PNG images |
| `image/jpeg` | JPEG images |
| `application/json` | JSON data |
| `application/pdf` | PDF documents |

### Encodings

| Encoding | Usage |
|----------|-------|
| `binary` | Raw binary data |
| `utf-8` | UTF-8 text |
| `base64` | Base64 encoded |
| `hex` | Hexadecimal |

### Package

```typescript
import { B, MediaType, Encoding } from "@1sat/templates";

// Store text
const script = B.lock({
  data: Utils.toArray("Hello World", "utf8"),
  mediaType: MediaType.TextPlain,
  encoding: Encoding.UTF8
});

// Store image
const imageScript = B.lock({
  data: imageBytes,
  mediaType: MediaType.ImagePNG,
  encoding: Encoding.Binary,
  filename: "photo.png"
});
```

---

## BAP (Bitcoin Attestation Protocol)

**Prefix**: `1BAPSuaPnfGnSBM3GLV9yhxUdYe4vGbdMT`
**Purpose**: Cryptographic identity management and attestation
**Package**: `bsv-bap`
**Spec**: https://github.com/BitcoinSchema/bap/blob/master/PROTOCOL.md

Core philosophy: "A cryptographic keypair IS an identity" - no centralized gatekeepers.

### Operations

| Operation | Purpose |
|-----------|---------|
| ID | Create/rotate identity signing keys |
| ATTEST | Cryptographic proof about identity attributes |
| ALIAS | Publish identity metadata (JSON-LD) |
| REVOKE | Revoke previous attestation |
| DATA | Publish encrypted/plaintext data |

### Transaction Structure

```
OP_RETURN
  1BAPSuaPnfGnSBM3GLV9yhxUdYe4vGbdMT
  [OPERATION]
  [URN Hash or Identity Key]
  [Sequence/Address/Data]
  |
  [AIP_PREFIX]
  BITCOIN_ECDSA
  [Signing Address]
  [Signature]
```

### ID Operation

Creates or rotates signing keys for an identity.

**Initial ID** (links identity key to root + signing address):
```
BAP_PREFIX | "ID" | <identity_key> | <signing_address> | <root_address>
```

**Key Rotation** (signed by current address, links to new):
```
BAP_PREFIX | "ID" | <identity_key> | <new_signing_address>
```

### ATTEST Operation

Authorities verify identity attributes by signing attestations.

```
BAP_PREFIX | "ATTEST" | <urn_hash> | <sequence>
```

- `urn_hash`: SHA256 of the URN being attested
- `sequence`: Prevents replay attacks (highest wins)

### URN Structure

Universal Resource Names for BAP:

| Type | Format |
|------|--------|
| Identity attribute | `urn:bap:id:[name]:[value]:[nonce]` |
| Attestation | `urn:bap:attest:[hash]:[identity-key]` |
| Delegation | `urn:bap:delegate:[from-key]:[to-key]:[nonce]` |
| Power of Attorney | `urn:bap:poa:[attribute]:[address]:[nonce]` |
| Grant | `urn:bap:grant:[attributes]:[service-key]` |
| Blacklist | `urn:bap:blacklist:[type]:[attribute]:[key]` |

URNs are SHA256-hashed before blockchain inclusion.

### Identity Key Derivation

Prevents identity confusion by linking to root address:

```
identityKey = base58(ripemd160(sha256(rootAddress)))
```

### Key Hierarchy

```
Root Key (identity-0) → BAP ID = base58(ripemd160(sha256(rootAddress)))
  └─ Signing Key (Type42: "1-sigma-identity") → on-chain operations
```

The root key is derived by the BRC-100 wallet at `protocolID=[1,"sigma"], keyID="identity-0"`.

**Type 42 signing key derivation**:
```typescript
signingKey = rootKey.deriveChild(rootKey.toPublicKey(), "1-sigma-identity");
```

### Signing Paths

**BIP32 (Legacy)**:
```
Signing: m/424150'/0'/0'/[identity]/[key]/[index]
Encryption: m/424150'/2147483647'/2147483647'
```

**Type 42 (Current)**:
```
Paths: "bap:0", "bap:1", "bap:2"...
Sequential counter for discovery
```

### W3C DID Compatibility

BAP identities map to Decentralized Identifiers:
```
did:bap:id:[identity-key]
```

### Package: bsv-bap

```typescript
import { BAP } from "bsv-bap";

// Type 42 mode (recommended)
const bap = new BAP({ rootPk: wifKey });

// BIP32 mode (legacy)
const bapLegacy = new BAP(xprvString);

// Create identity
const id = bap.newId();
id.setAttribute("name", "Alice");

// Get ID transaction
const idTx = id.getIdTransaction();

// Encryption
const encrypted = bap.encrypt(data);
const decrypted = bap.decrypt(encrypted);

// Backup
const backup = bap.exportForBackup("My Wallet");
```

### Identity Actions via @1sat/actions

For wallet-driven identity operations (publish, attest, rotate, profile):

```typescript
import { publishIdentity, attest, updateProfile, createContext } from '@1sat/actions'

const ctx = createContext(wallet)
await publishIdentity.execute(ctx, { signedScript: scriptHex })
await attest.execute(ctx, { attestationHash: hash, counter: '0' })
await updateProfile.execute(ctx, { profile: { '@type': 'Person', name: 'Alice' } })
```

### Key Classes

| Class | Purpose |
|-------|---------|
| `BAP` | Main entry point, manages identities and backup |
| `MasterID` | Single identity with HD derivation (via `bap.getId()`, `bap.newId()`) |
| `BapAccountBackup` | Type definition for backup objects returned by `exportForBackup()` |

### Backup Format

```json
{
  "ids": "<encrypted>",
  "rootPk": "<WIF>",
  "label": "My Wallet",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Configuration

```typescript
BAP_SERVER = "https://api.1sat.app/1sat/bap"
BAP_TOKEN = "<auth-token>"
```

---

## SIGMA

**Prefix**: `SIGMA`
**Purpose**: Transaction-bound signatures

### Format

```
OP_RETURN | <data> | SIGMA | <algorithm> | <address> | <signature> | <vin>
```

### Fields

| Field | Description |
|-------|-------------|
| algorithm | "BSM" or "BRC-77" |
| address | Signer's Bitcoin address |
| signature | Compact signature |
| vin | Input index binding signature to transaction |

### Algorithms

| Algorithm | Method |
|-----------|--------|
| BSM | Bitcoin Signed Message (recoverable) |
| BRC-77 | SignedMessage with key derivation |

### Key Difference from AIP

- AIP: Signs arbitrary data
- SIGMA: Signs data + transaction input hash (binding to transaction)

### Message Hash Construction

```
messageHash = sha256(inputHash + dataHash)
inputHash = sha256(prevTxId + prevVout)
dataHash = sha256(scriptData)
```

### Package

```typescript
import { Sigma, Algorithm } from "sigma-protocol";

// Create and sign
const sigma = new Sigma(tx, targetVout, sigmaInstance, refVin);
const { signedTx } = sigma.sign(privateKey, Algorithm.BSM);

// Verify
const valid = sigma.verify();
```

---

## BMAP (Parsing Library)

**Not a protocol** - BMAP is a parsing library for BitCom transactions.

Parses transactions containing multiple BitCom protocols into structured JSON.

### Parsed Output

```json
{
  "AIP": [{ "algorithm": "...", "address": "...", "valid": true }],
  "MAP": { "app": "myapp", "type": "post" },
  "B": { "content": "...", "mediaType": "text/plain" }
}
```

### Package

```typescript
import { TransformTx } from "bmapjs";

const parsed = await TransformTx(rawTx);
```

---

## Protocol Chaining

Multiple protocols can be chained in one output:

```
OP_RETURN
  | B_PREFIX | <file_data> | "image/png" | "binary"
  | MAP_PREFIX | "SET" | "app" | "photos" | "title" | "My Photo"
  | AIP_PREFIX | "BITCOIN_ECDSA" | <address> | <signature>
```

This creates:
1. Stored image (B)
2. Metadata (MAP)
3. Author signature (AIP)

## BitCom Addresses

| Protocol | Address |
|----------|---------|
| AIP | `15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva` |
| MAP | `1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5` |
| B | `19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut` |
| BAP | `1BAPSuaPnfGnSBM3GLV9yhxUdYe4vGbdMT` |
| SIGMA | `SIGMA` (literal string, not address) |

## Implementation

All protocols implemented in:
- `@1sat/templates` - Script templates
- `bmapjs` - Transaction parsing
- Individual packages (bap, sigma-protocol)
