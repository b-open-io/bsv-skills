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

Enhanced fungible tokens with contract control. BSV-21 is sometimes called "BSV-20 v2" — the JSON protocol field is still `"p": "bsv-20"` but it uses `sym` instead of `tick`, `id` instead of ticker-based lookups, and supports `deploy+mint` as a single operation. The `scrypt-ord` library's `BSV20V2` class implements BSV-21.

### Differences from BSV-20

| Feature | BSV-20 | BSV-21 |
|---------|--------|--------|
| Identifier | `tick` (1-4 char ticker) | `id` (txid_vout of deploy tx) |
| Deploy | `deploy` then separate `mint` | `deploy+mint` (atomic) |
| Supply control | Fixed at deploy, public mint | Contract controlled |
| Transfer rules | None | Programmable via covenant |
| Symbol field | `tick` | `sym` |

### Inscription Model

BSV-21 uses the same ordinals inscription envelope as BSV-20. The inscription is NOP-prepended dead code in the locking script:

```
OP_FALSE OP_IF
  "ord"
  OP_1 "application/bsv-20"
  OP_0 <json_payload>
OP_ENDIF
[actual locking script: P2PKH or contract covenant]
```

The indexer reads the inscription for token accounting. The Bitcoin VM only executes the locking script after `OP_ENDIF`.

### Deploy Format

```json
{
  "p": "bsv-20",
  "op": "deploy+mint",
  "sym": "TOKEN",
  "amt": "21000000",
  "dec": "0",
  "icon": "<icon_inscription_id>"
}
```

Note: protocol field is `"p": "bsv-20"` (not `"bsv-21"`). The `deploy+mint` operation and `sym`/`id` fields distinguish BSV-21 from BSV-20.

### Transfer Format

```json
{
  "p": "bsv-20",
  "op": "transfer",
  "id": "<deploy_txid>_<vout>",
  "amt": "1000"
}
```

### Additional Fields

| Field | Description |
|-------|-------------|
| `sym` | Token symbol (replaces `tick`) |
| `id` | Token ID — outpoint of the deploy transaction |
| `icon` | Icon inscription ID (outpoint) |
| `dec` | Decimal precision (0-18) |

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

### sCrypt Integration (scrypt-ord)

For contract-controlled BSV-21 tokens, use `scrypt-ord`:

```typescript
import { BSV20V2 } from 'scrypt-ord';

// BSV20V2 is the BSV-21 base class
class MyToken extends BSV20V2 {
  // Inscription envelope is prepended automatically
  // Contract enforces outputs via hash256(outputs) === this.ctx.hashOutputs
}
```

Source: https://github.com/sCrypt-Inc/scrypt-ord

---

## POW-20 (Proof-of-Work Tokens)

Proof-of-work mineable BSV21 fungible tokens using sCrypt smart contracts on 1Sat Ordinals. The contract is a recursive covenant (`HashToMintBsv20` extending `BSV20V2` from `scrypt-ord`) that enforces mining rules and token issuance on-chain.

**Protocol spec**: https://protocol.pow20.io/
**Contract source**: https://github.com/danwag06/htm-contract
**Miner implementation**: https://github.com/b-open-io/pow20-miner (Go)
**sCrypt ordinals library**: https://github.com/sCrypt-Inc/scrypt-ord

### How the Inscription + Contract Model Works

Each output's locking script is: `[inscription envelope] [contract or P2PKH script]`

The inscription is dead code — `OP_FALSE OP_IF "ord" OP_1 <contentType> OP_0 <content> OP_ENDIF` — never executed by the Bitcoin VM. The indexer reads it for BSV21 token accounting. The actual locking script follows after `OP_ENDIF`.

This is implemented by `scrypt-ord`'s `Ordinal.createInsciption()` which prepends the envelope as NOP script. `BSV20V2` (the base class for POW-20) uses `prependNOPScript()` to wrap its locking script with the BSV21 inscription.

The contract enforces ALL outputs via `hash256(outputs) === this.ctx.hashOutputs` — it manually constructs the expected output byte strings (inscription + locking script + satoshis) and verifies the hash matches. This is full covenant enforcement — the miner cannot omit the reward inscription or change the amounts.

### Mining Algorithm

The on-chain contract (`HashToMintBsv20.redeem`) checks:
```
hash = sha256(sha256(this.ctx.utxo.outpoint.txid + nonce))
```
Where `txid` is the contract UTXO being spent (32 bytes, internal byte order).

The Go miner builds the preimage as:
```
Preimage (64 bytes):
  Bytes 0-31:   Previous transaction ID (32 bytes, reversed)
  Bytes 32-39:  Nonce counter (uint64, little-endian)
  Bytes 40-47:  Worker thread ID (uint64, little-endian)
  Bytes 48-63:  Padding (zeros)
```

### Difficulty (nibble-based, 16x per step)

Difficulty = number of leading zero **nibbles** (hex digits) in the hash. Each nibble is 4 bits, so each +1 difficulty is a **16x** increase in work. The contract checks nibbles with bitwise AND masking:
- Even positions: `byte & 0xF0 === 0` (high nibble)
- Odd positions: `byte & 0x0F === 0` (low nibble)

Dynamic adjustment (stepped, not linear):

| Supply remaining | Extra difficulty |
|-----------------|-----------------|
| 80-100% | +0 |
| 60-80% | +1 (16x harder) |
| 40-60% | +2 (256x harder) |
| 20-40% | +3 (4096x harder) |
| 0-20% | +4 (65536x harder) |

### Transaction Structure

**Deploy transaction:**

| Output | Script | Satoshis |
|--------|--------|----------|
| 0 | `[inscription: deploy+mint JSON]` `[contract locking script]` | 1 |
| 1 | Change P2PKH | remainder |

Deploy inscription: `{"p":"bsv-20","op":"deploy+mint","sym":"TOKEN","amt":"21000000","dec":"0"}`

**Mine (redeem) transaction:**

| Output | Script | Satoshis |
|--------|--------|----------|
| 0 | `[inscription: transfer JSON, amt=remaining_supply]` `[contract locking script with updated state]` | 1 |
| 1 | `[inscription: transfer JSON, amt=reward]` `[P2PKH to miner]` | 1 |
| 2 | Change P2PKH | remainder |

Continuation inscription: `{"p":"bsv-20","op":"transfer","id":"<tokenId>","amt":"<remaining>"}`
Reward inscription: `{"p":"bsv-20","op":"transfer","id":"<tokenId>","amt":"<reward>"}`

### Contract State (on-chain, in locking script)

| Field | Mutable | Description |
|-------|---------|-------------|
| `id` | Yes (set once at genesis) | Token ID (`txid_vout` format) |
| `sym` | No | Token symbol |
| `max` | No | Maximum supply |
| `dec` | No | Decimal places |
| `totalSupply` | No | Same as max (for ratio calculation) |
| `supply` | Yes | Remaining supply to mine |
| `currentReward` | No | Tokens per mine |
| `startingDifficulty` | No | Base difficulty (nibbles) |
| `maxDifficulty` | No | Hard cap at 15 nibbles |

### APIs

| Endpoint | Purpose |
|----------|---------|
| `https://api.1sat.app/1sat/bsv21/{tokenId}` | Token details via 1sat-stack |
| `https://api.1sat.app/1sat/bsv21/{tokenId}/p2pkh/{addr}/balance` | Miner's token balance |
| WebSocket on token channel | Real-time mine event updates |

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
