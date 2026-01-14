# BSV Token Standards

Fungible and non-fungible token standards on BSV.

## 1Sat Ordinals (NFTs)

Non-fungible tokens using ordinal theory and inscriptions.

### Inscription Format

```
OP_0 OP_IF
  "ord"
  OP_1 <content-type>
  OP_0 <content>
OP_ENDIF
[optional: P2PKH or other locking script]
```

### Structure

| Element | Description |
|---------|-------------|
| `OP_0 OP_IF` | Envelope start (false branch, never executed) |
| `"ord"` | Protocol identifier |
| `OP_1` | Content-type marker |
| `<content-type>` | MIME type (e.g., "image/png") |
| `OP_0` | Content marker |
| `<content>` | Actual file data |
| `OP_ENDIF` | Envelope end |

### Ordinal ID

Format: `<txid>_<vout>`

Example: `abc123...def_0`

### Collections

Parent-child relationship for grouping:

```typescript
const inscription = Inscription.create(data, "image/png", {
  parent: parentOutpoint  // 36-byte: txid + vout
});
```

### Content Types

| Type | Extension | Usage |
|------|-----------|-------|
| `image/png` | .png | Images |
| `image/jpeg` | .jpg | Photos |
| `image/svg+xml` | .svg | Vector graphics |
| `image/webp` | .webp | Modern images |
| `text/plain` | .txt | Text |
| `text/html` | .html | Web content |
| `application/json` | .json | Metadata, tokens |

### Package

```typescript
import { Inscription } from "@bopen-io/templates";
// or
import { createOrdinals, sendOrdinals } from "js-1sat-ord";

// Create inscription
const inscription = Inscription.fromText("Hello, Ordinals!", "text/plain");
const lockingScript = inscription.lock();

// With parent
const child = Inscription.create(data, "image/png", {
  parent: Buffer.from(parentTxid + "00000000", "hex")
});
```

### Marketplace

- **GorillaPool**: https://ordinals.gorillapool.io
- **API**: https://ordinals.gorillapool.io/api/

---

## BSV-20 (Fungible Tokens)

BRC-20 style fungible tokens using inscriptions.

### Operations

| Operation | Purpose | Required Fields |
|-----------|---------|-----------------|
| `deploy` | Create new token | tick, max, lim, dec |
| `mint` | Mint tokens | tick, amt |
| `transfer` | Transfer tokens | tick or id, amt |
| `burn` | Burn tokens | tick or id, amt |

### Deploy Format

```json
{
  "p": "bsv-20",
  "op": "deploy",
  "tick": "TOKEN",
  "max": "21000000",
  "lim": "1000",
  "dec": "8"
}
```

| Field | Description |
|-------|-------------|
| `p` | Protocol: always "bsv-20" |
| `op` | Operation: "deploy" |
| `tick` | Token ticker (1-4 chars) |
| `max` | Maximum supply |
| `lim` | Limit per mint operation |
| `dec` | Decimals (0-18, default 0) |

### Mint Format

```json
{
  "p": "bsv-20",
  "op": "mint",
  "tick": "TOKEN",
  "amt": "1000"
}
```

### Transfer Format

```json
{
  "p": "bsv-20",
  "op": "transfer",
  "tick": "TOKEN",
  "amt": "100"
}
```

Or using deployment ID:

```json
{
  "p": "bsv-20",
  "op": "transfer",
  "id": "<deployment_txid>_<vout>",
  "amt": "100"
}
```

### Storage

BSV-20 tokens are stored as JSON inscriptions:

```
OP_0 OP_IF "ord" OP_1 "application/bsv-20" OP_0 <json_payload> OP_ENDIF
```

### Package

```typescript
import { BSV20 } from "@bopen-io/templates";

// Deploy token
const deploy = BSV20.deploy({
  tick: "TEST",
  max: "21000000",
  lim: "1000",
  dec: 8
});

// Mint
const mint = BSV20.mint({ tick: "TEST", amt: "1000" });

// Transfer
const transfer = BSV20.transfer({ tick: "TEST", amt: "100" });
```

---

## BSV-21 (Enhanced Tokens)

Enhanced fungible tokens with contract control.

### Differences from BSV-20

| Feature | BSV-20 | BSV-21 |
|---------|--------|--------|
| Supply control | Fixed at deploy | Contract controlled |
| Transfer rules | None | Programmable |
| Metadata | Basic | Extended |
| Contract | None | Optional |

### Deploy Format

```json
{
  "p": "bsv-21",
  "op": "deploy",
  "sym": "TOKEN",
  "icon": "<inscription_id>",
  "amt": "21000000",
  "dec": "8",
  "contract": "<optional_contract_id>"
}
```

### Additional Fields

| Field | Description |
|-------|-------------|
| `sym` | Token symbol (replaces `tick`) |
| `icon` | Icon inscription ID |
| `contract` | Optional contract controlling transfers |

### Package

```typescript
import { BSV21 } from "@bopen-io/templates";

const deploy = BSV21.deploy({
  sym: "TEST",
  amt: "21000000",
  dec: 8,
  icon: iconInscriptionId
});
```

---

## OrdLock (Token Locking)

Lock ordinals with P2PKH or custom conditions.

### Format

```
<inscription_envelope>
OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
```

### Usage

Lock an ordinal to a specific address, requiring signature to unlock.

```typescript
import { OrdLock } from "@bopen-io/templates";

const locked = OrdLock.lock(inscriptionData, ownerPubKeyHash);
```

---

## Token Ecosystem

### Indexers

| Service | Purpose |
|---------|---------|
| GorillaPool | 1Sat Ordinals indexing |
| Yours | BSV-20/21 indexing |
| JungleBus | General transaction indexing |

### APIs

```
# GorillaPool Ordinals
GET https://ordinals.gorillapool.io/api/inscriptions/{id}
GET https://ordinals.gorillapool.io/api/market/listings

# Yours API
GET https://api.yours.org/bsv20/{tick}
```

### Wallets

| Wallet | Support |
|--------|---------|
| Yours Wallet | 1Sat, BSV-20, BSV-21 |
| RelayX | 1Sat, BSV-20 |
| HandCash | 1Sat |

---

## Best Practices

### Minting

1. Check if ticker already exists before deploy
2. Verify sufficient balance for all outputs
3. Use appropriate fee rates
4. Store deployment txid for reference

### Transfers

1. Validate token balance before transfer
2. Include proper change outputs
3. Handle partial transfers correctly
4. Track UTXOs for token balance

### Security

1. Never expose private keys
2. Validate all incoming token transactions
3. Use secure random for key generation
4. Test on testnet first

---

## Comparison

| Feature | 1Sat Ordinals | BSV-20 | BSV-21 |
|---------|---------------|--------|--------|
| Type | NFT | Fungible | Fungible |
| Storage | Inscription | JSON inscription | JSON inscription |
| Supply | 1 per inscription | Fixed at deploy | Contract controlled |
| Divisibility | No | Up to 18 decimals | Up to 18 decimals |
| Transferable | Yes | Yes | Yes (with rules) |
| Collection | Parent-child | No | No |
