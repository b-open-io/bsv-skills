# Off-Chain BSV Standards

Not BRCs. Package repos are the source of truth.

## bitcoin-auth

**Package**: `bitcoin-auth` — https://github.com/b-open-io/bitcoin-auth

HTTP authentication with Bitcoin signatures. No session store.

Token: `pubkey|scheme|timestamp|requestPath|signature`

Header: `Bitcoin-Auth-Token`

| Scheme | Algorithm | Body integrity |
|--------|-----------|----------------|
| `brc77` | BRC-77 SignedMessage | SHA256 of body |
| `bsm` | Bitcoin Signed Message | SHA256 of body (v0.0.3+) |

Signed message: `requestPath|timestamp|bodyHash`

Default replay window: 5 minutes.

```typescript
import { getAuthToken, verifyAuthToken } from "bitcoin-auth";
const token = getAuthToken({
  privateKeyWif: "L1...",
  requestPath: "/api/submit",
  body: JSON.stringify(data),
  scheme: "brc77"
});
const valid = verifyAuthToken(token, {
  requestPath: req.path,
  timestamp: new Date().toISOString(),
  body: req.body
}, 5);
```

## bitcoin-backup

**Package**: `bitcoin-backup` — https://github.com/b-open-io/bitcoin-backup

Encrypted `.bep` files. CLI: `bbackup`.

- AES-256-GCM
- PBKDF2-SHA256
- Iterations: 600,000 (recommended), 100,000 (legacy)
- File: `Base64(salt[16] + iv[12] + ciphertext)`

Types: `BapMasterBackup`, `BapMasterBackupLegacy`, `BapAccountBackup`, `WifBackup`, `OneSatBackup`, `VaultBackup`, `YoursWalletBackup`.

```typescript
import { encryptBackup, decryptBackup } from "bitcoin-backup";
const encrypted = await encryptBackup({ rootPk: "L1...", ids: "...", label: "My Wallet" }, passphrase);
const backup = await decryptBackup(encrypted, passphrase);
```

Operational flows: `encrypt-decrypt-backup` skill.

## bitcoin-image

**Package**: `bitcoin-image` — https://github.com/b-open-io/bitcoin-image

Normalizes on-chain image URLs to a displayable gateway URL.

| Protocol | Example |
|----------|---------|
| `b://` | `b://txid` or `b://txid_vout` |
| `ord://` | `ord://txid_vout` |
| `bitfs://` | `bitfs://txid.out.vout` |
| `ipfs://` | `ipfs://QmHash` |
| `data:` | `data:image/png;base64,...` |
| Native | `txid` or `txid_vout` |

Outpoint forms (same output): `txid_0`, `txid.0`, `txido0`, `/content/txid_0`. txid is 64 hex chars; vout is a non-negative integer.

Default gateways: `b://` / `ord://` / native → `https://ordfs.network/`; `bitfs://` → `https://x.bitfs.network/`; `ipfs://` → `https://ipfs.io/ipfs/`.

```typescript
import { parseImageURL, getDisplayUrl } from "bitcoin-image";
const parsed = parseImageURL("b://abc123..._0");
const url = await getDisplayUrl("ord://abc123..._0");
```

## Bitcoin Schema

https://bitcoinschema.org — MAP + B typed records (Post, Like, Follow, Reply, Repost, Friend, Message, Payment, Ordinal). Ord display metadata: `app`, `type` (`ord`), `name`; optional `subType`, `subTypeData`, `royalties`, `previewUrl`.
