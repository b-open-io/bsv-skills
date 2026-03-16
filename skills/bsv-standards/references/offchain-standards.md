# Off-Chain BSV Standards

Standards for authentication, backup, and data reference outside of on-chain protocols.

## bitcoin-auth

**Package**: `bitcoin-auth` (npm)
**Repository**: https://github.com/b-open-io/bitcoin-auth
**Purpose**: HTTP authentication using Bitcoin private keys

### Overview

Stateless cryptographic challenge-response authentication using Bitcoin signatures. No session storage or third-party identity providers required.

### Token Format

```
pubkey|scheme|timestamp|requestPath|signature
```

| Component | Description |
|-----------|-------------|
| `pubkey` | Compressed public key (hex) |
| `scheme` | `brc77` (recommended) or `bsm` |
| `timestamp` | ISO8601 timestamp |
| `requestPath` | Full endpoint path |
| `signature` | Base64-encoded signature |

### Signing Schemes

| Scheme | Algorithm | Body Integrity |
|--------|-----------|----------------|
| `brc77` | BRC-77 SignedMessage | Yes (SHA256 hash) |
| `bsm` | Bitcoin Signed Message | Yes (since v0.0.3) |

**Message Format**: `requestPath|timestamp|bodyHash`

### API Usage

```typescript
import { getAuthToken, verifyAuthToken, parseAuthToken } from "bitcoin-auth";

// Client: Generate token
const token = getAuthToken({
  privateKeyWif: "L1...",
  requestPath: "/api/submit",
  body: JSON.stringify(data),
  scheme: "brc77"
});

// Set header
headers["Bitcoin-Auth-Token"] = token;

// Server: Verify token
const valid = verifyAuthToken(token, {
  requestPath: req.path,
  timestamp: new Date().toISOString(),
  body: req.body
}, 5); // 5 minute time window
```

### Security Features

- **Request path binding**: Token tied to specific endpoint
- **Body integrity**: BRC-77 prevents payload tampering
- **Timestamp window**: 5-minute default skew limits replay attacks
- **Stateless**: No server-side session storage required

---

## bitcoin-backup

**Package**: `bitcoin-backup` (npm)
**Repository**: https://github.com/b-open-io/bitcoin-backup
**Purpose**: Encrypted backup file standard (.bep files)

### Encryption

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2-SHA256
- **Iterations**: 600,000 (recommended), 100,000 (legacy)
- **File Format**: `Base64(salt[16] + iv[12] + ciphertext)`

### Supported Backup Types

| Type | Key Fields | Purpose |
|------|------------|---------|
| `BapMasterBackup` | `rootPk`, `ids` | BAP master identity (Type42) |
| `BapMasterBackupLegacy` | `xprv`, `mnemonic`, `ids` | BAP master identity (BIP32) |
| `BapAccountBackup` | `wif`, `id` | Individual BAP account (delegated access) |
| `WifBackup` | `wif` | Simple private key |
| `OneSatBackup` | `ordPk`, `payPk`, `identityPk` | 1Sat Ordinals wallet |
| `VaultBackup` | `encryptedVault`, `scheme` | Pre-encrypted vault |
| `YoursWalletBackup` | `payPk`, `ordPk`, derivation paths | Yours Wallet export |

### API Usage

```typescript
import { encryptBackup, decryptBackup } from "bitcoin-backup";

// Encrypt
const encrypted = await encryptBackup({
  rootPk: "L1...",
  ids: "...",
  label: "My Wallet"
}, passphrase);

// Decrypt (auto-detects type)
const backup = await decryptBackup(encrypted, passphrase);
```

### CLI

```bash
bbackup enc input.json -p "password" -o output.bep
bbackup dec input.bep -p "password" -o output.json
bbackup upg input.bep -p "password"  # Upgrade iterations
```

---

## bitcoin-image

**Package**: `bitcoin-image` (npm)
**Repository**: https://github.com/b-open-io/bitcoin-image
**Purpose**: On-chain image reference normalization

### Supported Protocols

| Protocol | Format | Example |
|----------|--------|---------|
| `b://` | Bitcoin Files | `b://txid` or `b://txid_vout` |
| `ord://` | 1Sat Ordinals | `ord://txid_vout` or `ord://txid.vout` |
| `bitfs://` | BitFS | `bitfs://txid.out.vout` |
| `ipfs://` | IPFS | `ipfs://QmHash` |
| `data:` | Data URI | `data:image/png;base64,...` |
| Native | Txid only | `txid` or `txid_vout` |

### OUTPOINT Standards

Multiple formats exist for expressing transaction outputs:

| Format | Example | Usage |
|--------|---------|-------|
| Underscore | `txid_0` | Standard, ORDFS default |
| Period | `txid.0` | Alternative notation |
| Output suffix | `txido0` | Bitcoin-style output |
| Input suffix | `txidi0` | Bitcoin-style input |
| Content path | `/content/txid_0` | ORDFS content endpoint |

**Validation**:
- txid: 64 hex characters
- vout: non-negative integer

### API Usage

```typescript
import { parseImageURL, getDisplayUrl } from "bitcoin-image";

// Parse any format
const parsed = parseImageURL("b://abc123..._0");
// { protocol: "B", txid: "abc123...", vout: 0, isValid: true }

// Get displayable URL (routes through ordfs.network)
const url = await getDisplayUrl("ord://abc123..._0");
// "https://ordfs.network/abc123..._0"

// Batch processing
const urls = await getDisplayUrls(["b://...", "ord://..."], {
  concurrency: 10
});
```

### Default Gateways

| Protocol | Gateway |
|----------|---------|
| `b://`, `ord://`, native | `https://ordfs.network/` |
| `bitfs://` | `https://x.bitfs.network/` |
| `ipfs://` | `https://ipfs.io/ipfs/` |

### React Integration

```typescript
import { useBlockchainImage, BlockchainImage } from "bitcoin-image/react";

// Hook
const { url, loading, error } = useBlockchainImage("ord://...");

// Component
<BlockchainImage src="b://..." fallback="/placeholder.png" />
```

---

## Bitcoin Schema

**Website**: https://bitcoinschema.org
**Purpose**: Standardized data structures for on-chain data

### Overview

Community-driven standardization system transforming Bitcoin's ledger into a structured, queryable database. Enables interoperable applications sharing a unified global data layer.

### Standard Primitives

| Category | Types |
|----------|-------|
| Social | Post, Like, Follow, Reply, Repost, Friend |
| Communication | Message |
| Transactions | Payment |
| Advanced | Function, Ordinal |

### Foundation

Built on:
- **MAP** (Magic Attribute Protocol)
- **B Protocol**

### Key Benefits

1. **Universal Interoperability**: Data readable across all compliant apps
2. **Type Safety**: Strict validation rules
3. **Developer Experience**: JSON-LD templates
4. **Decentralized**: Ownerless social graphs

### Ord Schema Type

Base metadata schema for ordinals (`type: "ord"`).

**Required Fields**:
- `app`: Application identifier
- `type`: Always "ord"
- `name`: Name/description

**Optional Fields**:
- `subType`: collectionItem, collection, website
- `subTypeData`: JSON with subType requirements
- `royalties`: Payment destinations array
- `previewUrl`: Preview media reference

**Royalties Format**:
```json
{
  "royalties": [
    {"type": "paymail", "destination": "user@domain.com", "percentage": "0.03"},
    {"type": "address", "destination": "1ABC...", "percentage": "0.025"}
  ]
}
```

**PaymentType**: `'paymail' | 'address' | 'script'`

### Common subTypes

Maintained at bitcoinschema.org:
- `collectionItem` - Item in a collection
- `collection` - Collection parent
- `website` - Web content inscription

---

## Integration Patterns

### Content URL Construction

```typescript
// Normalize any image reference to displayable URL
import { getDisplayUrl } from "bitcoin-image";

const imageUrl = await getDisplayUrl(
  metadata.image ||    // Could be b://, ord://, txid, etc.
  metadata.icon
);
// Always returns https://ordfs.network/... or gateway URL

// Direct ORDFS URL construction
const ordfsUrl = `https://ordfs.network/${txid}_${vout}`;
```

### Authentication Flow

```typescript
// Client request with bitcoin-auth
const response = await fetch("/api/protected", {
  method: "POST",
  headers: {
    "Bitcoin-Auth-Token": getAuthToken({
      privateKeyWif: wallet.wif,
      requestPath: "/api/protected",
      body: JSON.stringify(payload)
    })
  },
  body: JSON.stringify(payload)
});
```

### Backup/Restore Flow

```typescript
// Export wallet backup
const backup = await encryptBackup({
  rootPk: wallet.toWif(),
  ids: JSON.stringify(identities),
  label: "My BSV Wallet"
}, userPassphrase);

// Store backup.bep file securely

// Restore
const restored = await decryptBackup(backupFile, userPassphrase);
// Auto-detects backup type
```
