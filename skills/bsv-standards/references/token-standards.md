# BSV Token Standards

Fungible and non-fungible token standards on BSV.

## 1Sat Ordinals (NFTs)

Non-fungible tokens using ordinal theory and inscriptions on BSV.

**Documentation**: https://docs.1satordinals.com/

### Core Concepts

**Origin-Based Indexing**: Unlike BTC ordinals, 1Sat Ordinals uses BSV's single-satoshi outputs for efficient "origin" tracking. An origin is the first outpoint where a satoshi exists alone.

**Inscription IDs**: Format `<txid>_<vout>` directly tied to transaction outputs.

**Token Burning**: When a satoshi enters a multi-satoshi output, its origin ceases. A new origin regenerates if that satoshi later enters another 1-sat output.

### Inscription Format

```
OP_FALSE OP_IF
  6f7264 ("ord")
  OP_1 <content-type>
  OP_0 <content>
OP_ENDIF
[optional: P2PKH or other locking script]
```

**Key Differences from BTC**:
- Inscriptions in outputs (not taproot inputs)
- Exactly 1 satoshi locked per inscription
- No 520-byte push limit
- Only first valid envelope produces ordinal

### Structure

| Element | Description |
|---------|-------------|
| `OP_FALSE OP_IF` | Envelope start (false branch, never executed) |
| `6f7264` | "ord" in hex |
| `OP_1` | Content-type marker |
| `<content-type>` | MIME type (e.g., "image/png") |
| `OP_0` | Content marker |
| `<content>` | File data |
| `OP_ENDIF` | Envelope end |

### Ordinal ID (Outpoint)

Format: `<txid>_<vout>`

Example: `abc123...def_0`

**Alternative formats** (see bitcoin-image):
- `txid.vout` (dot notation)
- `txido0` (output suffix)
- `/content/txid_0` (ORDFS path)

### Ord Schema Type

**Docs**: https://docs.1satordinals.com/adding-metadata/ord-schema-type

Base metadata schema for ordinals inscriptions.

**Required Fields**:

| Field | Description |
|-------|-------------|
| `app` | Application that created the ordinal |
| `type` | Always "ord" for indexer recognition |
| `name` | Name/description of the ordinal |

**Optional Fields**:

| Field | Description |
|-------|-------------|
| `subType` | collectionItem, collection, website |
| `subTypeData` | Stringified JSON for subType requirements |
| `royalties` | Creator payment destinations |
| `previewUrl` | URL or reference to preview media |

**Metadata via MAP Protocol**:
```
1SAT_P2PKH <INSCRIPTION> OP_RETURN MAP SET app <platform> type ord name "Title" | AIP <address> "BITCOIN_ECDSA" <signature> [-1]
```

### Royalties

```json
{
  "app": "my_app",
  "type": "ord",
  "name": "Awesome NFT",
  "royalties": [
    {"type": "paymail", "destination": "artist@domain.com", "percentage": "0.03"},
    {"type": "address", "destination": "1ABC...", "percentage": "0.025"}
  ]
}
```

**PaymentType**: `'paymail' | 'address' | 'script'`

### Collections

Parent-child relationship for grouping:

```typescript
const inscription = Inscription.create(data, "image/png", {
  parent: parentOutpoint  // 36-byte: txid + vout
});
```

**Collection subType**: Define a collection inscription, then reference it as parent in child items.

### Content Types

| Type | Extension | Usage |
|------|-----------|-------|
| `image/png` | .png | Images |
| `image/jpeg` | .jpg | Photos |
| `image/svg+xml` | .svg | Vector graphics |
| `image/webp` | .webp | Modern images |
| `text/plain` | .txt | Text |
| `text/html` | .html | Web content, recursive inscriptions |
| `application/json` | .json | Metadata, tokens |
| `ord-fs/json` | - | Directory listing |

### Package

```typescript
import { Inscription } from "@1sat/templates";

// Create inscription (low-level script template)
const inscription = Inscription.fromText("Hello, Ordinals!", "text/plain");
const lockingScript = inscription.lock();

// Preferred: use @1sat/actions for full inscription workflow
import { inscribe, createContext } from '@1sat/actions'
const ctx = createContext(wallet)
const result = await inscribe.execute(ctx, {
  base64Content: btoa('Hello, Ordinals!'),
  contentType: 'text/plain',
})

// With parent (collection item)
const child = Inscription.create(data, "image/png", {
  parent: Buffer.from(parentTxid + "00000000", "hex")
});

// With metadata
const withMeta = Inscription.create(data, "image/png", {
  parent: parentOutpoint,
  metadata: {
    app: "my_app",
    type: "ord",
    name: "My NFT"
  }
});
```

### Content Access

**ORDFS Gateway**: https://ordfs.network

```
https://ordfs.network/{txid}_{vout}           # Direct content
https://ordfs.network/content/{txid}_{vout}   # Content endpoint
https://ordfs.network/{origin}:{sequence}     # Specific version
```

### Marketplace & APIs

- **GorillaPool**: https://ordinals.gorillapool.io
- **API**: https://ordinals.gorillapool.io/api/
- **Documentation**: https://docs.1satordinals.com/

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
import { BSV20 } from "@1sat/templates";

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
import { BSV21 } from "@1sat/templates";

const deploy = BSV21.deploy({
  sym: "TEST",
  amt: "21000000",
  dec: 8,
  icon: iconInscriptionId
});
```

---

## POW-20 (Proof-of-Work Tokens)

Proof-of-work mineable fungible tokens using sCrypt smart contracts on 1Sat Ordinals. Combines 1Sat infrastructure with covenant-enforced mining for fair token distribution.

**Reference implementation**: https://github.com/b-open-io/pow20-miner (Go)

### Core Concepts

- **sCrypt covenant**: Recursive smart contract enforces mining rules on-chain
- **Proof-of-work**: SHA256d mining with configurable difficulty (leading zero nibbles)
- **Layer 1 settlement**: Validated by miners, no off-chain computation required
- **State machine**: Each mine output becomes the next mining target

### Mining Algorithm

```
Preimage (64 bytes):
  Bytes 0-31:   Previous transaction ID (32 bytes, reversed)
  Bytes 32-39:  Nonce counter (uint64, little-endian)
  Bytes 40-47:  Worker thread ID (uint64, little-endian)

Solution = SHA256(SHA256(preimage))
Must have N leading zero nibbles where N = difficulty
```

### Transaction Structure

When a solution is found:

| Output | Purpose |
|--------|---------|
| 1 | Restate contract (1 sat) — same sCrypt template, reduced supply |
| 2 | Token reward — BSV-20 inscription locked to miner's address |
| 3 | Change (optional) |

### Token Inscription (Output 2)

```json
{
  "p": "bsv-20",
  "op": "transfer",
  "id": "<TOKEN_ID>",
  "amt": "<REWARD>"
}
```

### Contract State

| Field | Description |
|-------|-------------|
| `symbol` | Token ticker |
| `max` | Maximum supply |
| `dec` | Decimal places |
| `reward` | Current reward (decreases over time) |
| `difficulty` | Leading zero nibbles required (1-16) |
| `supply` | Remaining supply to mine |
| `id` | Token ID (txid_0 format) |

### APIs

| Endpoint | Purpose |
|----------|---------|
| `https://api.1sat.market/mine/pow20/` | List POW-20 tokens |
| `https://ordinals.gorillapool.io/api/subscribe?channel=<tokenid>` | WebSocket mine updates |

---

## OpNS (On-Chain Name System)

Decentralized name system where names are ordinal inscriptions with identity key bindings.

**Content type**: `application/op-ns`

### Architecture

- **Mine tree**: Tracked by the OpNS overlay in 1sat-stack. Name origins are permanent once indexed.
- **Name resolution**: ORDFS handles ordinal-level resolution, not the overlay.
- **Identity binding**: MAP metadata `opns.idKey` on a self-transfer of the OpNS ordinal.
- **Paymail**: OpNS name -> ORDFS MAP lookup -> `idKey` -> BRC-29 address derivation.
- **Genesis**: `58b7558ea379f24266c7e2f5fe321992ad9a724fd7a87423ba412677179ccb25`

### Actions

| Action | Description |
|--------|-------------|
| `opnsRegister` | Bind wallet's identity key to a name via `opns.idKey` MAP field |
| `opnsDeregister` | Clear identity binding (set `opns.idKey` to empty) |

### Package

```typescript
import { opnsRegister, opnsDeregister, createContext } from '@1sat/actions'
```

### Tags

| Tag | Meaning |
|-----|---------|
| `type:application/op-ns` | OpNS name ordinal |
| `opns:published` | Identity key currently registered |
| `origin:{outpoint}` | Origin outpoint |
| `name:{value}` | The name string |

### Overlay Route

```
GET /opns/mine/:name
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
import { OrdLock } from "@1sat/templates";

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
