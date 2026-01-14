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
import { AIP } from "@bopen-io/templates";

// Sign
const aip = await AIP.sign(dataBytes, privateKey, { algorithm: "BITCOIN_ECDSA" });

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
import { MAP, MAPCommand } from "@bopen-io/templates";

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
import { B, MediaType, Encoding } from "@bopen-io/templates";

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
**Purpose**: Identity management and attestation

### Operations

| Operation | Purpose |
|-----------|---------|
| ID | Create/update identity |
| ATTEST | Make attestation about identity |
| ALIAS | Create identity alias |
| REVOKE | Revoke attestation |

### ID Transaction Format

```
OP_RETURN | BAP_PREFIX | "ID" | <identity_key> | <current_address> | [attributes]
```

### Attestation Format

```
OP_RETURN | BAP_PREFIX | "ATTEST" | <id_key> | <attribute> | <value> | <sequence>
```

### Identity Key Derivation

```
identityKey = base58(ripemd160(sha256(rootAddress)))
```

### Signing Paths

```
Signing: m/424150'/0'/0'/0/0/1
Encryption: m/424150'/2147483647'/2147483647'
```

### Package

```typescript
import { BAP } from "bap";

// Create identity
const bap = new BAP({ rootPk: privateKeyWif });
const id = bap.newId();

// Set attribute
id.setAttribute("name", "Alice");

// Create ID transaction
const idTx = id.getIdTransaction();
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
- `@bopen-io/templates` - Script templates
- `bmapjs` - Transaction parsing
- Individual packages (bap, sigma-protocol)
