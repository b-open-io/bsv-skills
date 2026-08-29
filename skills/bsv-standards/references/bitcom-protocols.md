# BitCom Protocols

BitCom protocols are not BRCs. They use Bitcoin addresses (or the literal `SIGMA`) as OP_RETURN prefixes.

**Pattern**: `OP_RETURN | PROTOCOL_PREFIX | protocol_data...`

Chain protocols with a pipe (`|`) separator.

Templates: `@1sat/templates`. Identity: `bsv-bap`. Signatures: `sigma-protocol`. Signing workflows: `message-signing` skill. Identity CLI: `create-bap-identity` skill.

## Prefixes

| Protocol | Prefix |
|----------|--------|
| AIP | `15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva` |
| MAP | `1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5` |
| B | `19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut` |
| BAP | `1BAPSuaPnfGnSBM3GLV9yhxUdYe4vGbdMT` |
| SIGMA | `SIGMA` (literal string, not an address) |

## AIP (Author Identity Protocol)

Signs preceding OP_RETURN data. Does not bind to a transaction input (see SIGMA).

```
OP_RETURN | <data> | AIP_PREFIX | <algorithm> | <address> | <signature> | [field_indexes]
```

| Position | Name | Description |
|----------|------|-------------|
| 1 | algorithm | Usually `BITCOIN_ECDSA` |
| 2 | address | Signer address |
| 3 | signature | Base64 |
| 4 | field_indexes | Optional: which fields were signed |

```typescript
import { AIP, PrivateKeySigner } from "@1sat/templates";
const aip = await AIP.sign(dataBytes, new PrivateKeySigner(privateKey));
const valid = aip.verify();
```

## MAP (Magic Attribute Protocol)

Key-value metadata.

```
OP_RETURN | MAP_PREFIX | <command> | <key> | <value> ...
```

| Command | Usage |
|---------|--------|
| SET | `SET key value` pairs |
| DEL | `DEL key` |
| ADD | `ADD key value1 value2` |
| SELECT | `SELECT app type` |

Common keys: `app`, `type`, `context`, `subcontext`, `tx`.

```typescript
import { MAP } from "@1sat/templates";
const script = MAP.set({ app: "myapp", type: "post", title: "Hello" });
```

## B (Binary) Protocol

Arbitrary file storage.

```
OP_RETURN | B_PREFIX | <data> | <media_type> | <encoding> | [filename]
```

Encodings: `binary`, `utf-8`, `base64`, `hex`.

```typescript
import { B, MediaType, Encoding } from "@1sat/templates";
import { Utils } from "@bsv/sdk";
const script = B.lock({
  data: Utils.toArray("Hello World", "utf8"),
  mediaType: MediaType.TextPlain,
  encoding: Encoding.UTF8
});
```

## BAP (Bitcoin Attestation Protocol)

Identity attestation. Spec: https://github.com/BitcoinSchema/bap/blob/master/PROTOCOL.md

```
OP_RETURN | BAP_PREFIX | <OPERATION> | <urn_hash_or_identity_key> | <sequence/address/data> | AIP ...
```

| Operation | Purpose |
|-----------|---------|
| ID | Create or rotate signing keys |
| ATTEST | Proof about identity attributes |
| ALIAS | Publish identity metadata (JSON-LD) |
| REVOKE | Revoke a previous attestation |
| DATA | Publish encrypted or plaintext data |

**Initial ID**: `BAP_PREFIX \| "ID" \| <identity_key> \| <signing_address> \| <root_address>`

**Rotation**: `BAP_PREFIX \| "ID" \| <identity_key> \| <new_signing_address>` (signed by current address)

**ATTEST**: `BAP_PREFIX \| "ATTEST" \| <urn_hash> \| <sequence>` — highest sequence wins.

URN types (SHA256-hashed before inclusion):

| Type | Format |
|------|--------|
| Attribute | `urn:bap:id:[name]:[value]:[nonce]` |
| Attestation | `urn:bap:attest:[hash]:[identity-key]` |
| Delegation | `urn:bap:delegate:[from-key]:[to-key]:[nonce]` |
| PoA | `urn:bap:poa:[attribute]:[address]:[nonce]` |
| Grant | `urn:bap:grant:[attributes]:[service-key]` |
| Blacklist | `urn:bap:blacklist:[type]:[attribute]:[key]` |

`identityKey = base58(ripemd160(sha256(rootAddress)))`

DID: `did:bap:id:[identity-key]`

Signing key invoice: `1-sigma-identity` (Type42). BRC-100 wallets derive the root at `protocolID=[1,"sigma"], keyID="identity-0"`.

```typescript
import { BAP } from "bsv-bap";
const bap = new BAP({ rootPk: wifKey });
const id = bap.newId();
id.setAttribute("name", "Alice");
```

## SIGMA

Transaction-bound signatures. Prefix is the literal `SIGMA`.

```
OP_RETURN | <data> | SIGMA | <algorithm> | <address> | <signature> | <vin>
```

Algorithms: `BSM` (recoverable), `BRC-77` (SignedMessage).

AIP signs arbitrary data. SIGMA also hashes the referenced input (`sha256(prevTxId + prevVout)`), so the signature is bound to that spend.

```typescript
import { Sigma, Algorithm } from "sigma-protocol";
const sigma = new Sigma(tx, targetVout, sigmaInstance, refVin);
const { signedTx } = sigma.sign(privateKey, Algorithm.BSM);
const valid = sigma.verify();
```

## Chaining

```
OP_RETURN
  | B_PREFIX | <file_data> | "image/png" | "binary"
  | MAP_PREFIX | "SET" | "app" | "photos" | "title" | "My Photo"
  | AIP_PREFIX | "BITCOIN_ECDSA" | <address> | <signature>
```

Parse chained outputs with `@1sat/templates` (`BitCom`, `AIP`, `MAP`, `B`, `BAP`, `Sigma`). `bmapjs` is deprecated.
