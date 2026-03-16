---
name: create-bap-identity
description: This skill should be used when the user asks to "create BAP identity", "new BAP", "Type42 identity", "Legacy BAP identity", "generate BAP", "set up BAP identity", "initialize BAP", "update profile", "get profile", "attest attribute", "BAP attestation", or needs to create or manage Bitcoin Attestation Protocol identities.
---

# Create BAP Identity

Create and manage BAP (Bitcoin Attestation Protocol) identities.

## Installation

```bash
bun add bsv-bap @bsv/sdk
```

## Creating an Identity

```typescript
import { BAP } from "bsv-bap";
import { PrivateKey } from "@bsv/sdk";

// Create BAP instance with new key
const privateKey = PrivateKey.fromRandom();
const bap = new BAP({ rootPk: privateKey.toWif() });

// Create identity
const identity = bap.newId("Alice Smith");

console.log("Identity Key:", identity.getIdentityKey());
console.log("Root Address:", identity.rootAddress);
console.log("Signing Address:", identity.getCurrentAddress());
```

## BAP ID Format

The BAP library calls this the `identityKey` (via `getIdentityKey()`), but to avoid confusion with BRC-31 "identity keys" (which are public keys), we call it the **BAP ID** everywhere else.

**Derivation:** `base58(ripemd160(sha256(rootAddress)))` where `rootAddress` is the Bitcoin address of the member key.

This is NOT a Bitcoin address, NOT a public key, and NOT a BRC-31 identity key. It is a stable hash identifier that persists across signing key rotations.

### BAP ID vs BRC-31 Identity Key

| | BAP ID | BRC-31 Identity Key |
|---|---|---|
| **What** | Stable identity hash | Compressed secp256k1 public key |
| **Format** | ~27 char base58 string | 66 hex chars (`02`/`03` prefix) |
| **Example** | `Go8vCHAa4S6AhXK...` | `02a08a4bbb07ead...` |
| **Used in** | BAP attestations, ClawNet `bapId`, Sigma Auth `bap_id` | BRC-31 Authrite headers, BRC-42/43 key derivation |
| **Derived from** | Member key's address (rootAddress) | Direct from private key |

In BRC-100 wallets, the member key's pubkey is the BRC-31 identity key. You can derive the BAP ID from it: `pubkey.toAddress()` = rootAddress, then hash. This only works for the member key — NOT signing keys.

## Key Derivation

BAP uses Type42 (BRC-42) key derivation with BRC-43 invoice numbers:

| Purpose | Invoice Number | Security Level |
|---------|---------------|----------------|
| Signing key | `1-sigma-identity` | 1 (public protocol) |
| Friend encryption | `2-friend-{sha256(friendBapId)}` | 2 (user-approved) |

## Signing Messages

```typescript
import { Utils } from "@bsv/sdk";
const { toArray } = Utils;

// Sign a message
const message = toArray("Hello World", "utf8");
const { address, signature } = identity.signMessage(message);

// Verify (on any BAP instance)
const isValid = bap.verifySignature("Hello World", address, signature);
```

## Friend Encryption

Derive friend-specific encryption keys via the BRC-100 wallet:

```typescript
import { Hash, Utils } from "@bsv/sdk";
const { toHex, toArray } = Utils;

const keyID = toHex(Hash.sha256(toArray(friendBapId, "utf8")));

// Get encryption pubkey for a friend (share in friend requests)
const { publicKey } = await wallet.getPublicKey({
  protocolID: [2, "friend"],
  keyID,
  counterparty: "self",
});

// Encrypt data for friend
const { ciphertext } = await wallet.encrypt({
  protocolID: [2, "friend"],
  keyID,
  counterparty: friendIdentityKey,
  plaintext: toArray("secret message", "utf8"),
});

// Decrypt data from friend
const { plaintext } = await wallet.decrypt({
  protocolID: [2, "friend"],
  keyID,
  counterparty: friendIdentityKey,
  ciphertext,
});
```

## Export/Import

```typescript
// Export for backup
const backup = bap.exportForBackup("My Identity");
// { ids: "...", createdAt: "...", rootPk: "..." }

// Import from backup
const bap2 = new BAP({ rootPk: backup.rootPk });
bap2.importIds(backup.ids);
```

## CLI Option

For quick operations, the `bsv-bap` package includes a CLI:

```bash
npm install -g bsv-bap

bap create --name "Alice"     # Create identity (~/.bap/identity.json)
bap sign "Hello World"        # Sign message
bap verify "msg" "sig" "addr" # Verify signature
bap info                      # Show identity info
bap export                    # Export backup JSON
bap import <file>             # Import from backup
```

### Touch ID / Secure Enclave Protection (macOS arm64)

The BAP CLI supports hardware-level protection of the master key via `@1sat/vault`, which uses the macOS Secure Enclave (CryptoKit P-256 + ECIES encryption). When enabled, the `rootPk` is encrypted with a Secure Enclave key that never leaves the chip, and all decryption requires Touch ID.

```bash
bap touchid status            # Show SE availability and protection state
bap touchid enable            # Encrypt rootPk with SE, remove plaintext from disk
bap touchid disable           # Decrypt from SE, store as plaintext
```

- Config stores `se:bap-master` sentinel in `rootPkEncrypted` field when enabled
- Vault directory: `~/.secure-enclave-vault/`
- macOS arm64 only (fails informatively on other platforms)
- `BAP_NO_TOUCHID=1` env var or `--no-touchid` flag on `create`/`import` for CI/headless environments

## Key Rotation & Path Management

BAP separates **stable identity** from **active signing key**:

- **rootPath** (e.g., `bap:0`) — derives the stable member key. Never changes. This is the key used for identity linkage and member backup export.
- **currentPath** (e.g., `bap:0:1`) — derives the active wallet/signing key. Rotates with `incrementPath()`.
- **Identity key** persists across all rotations — it's derived from the rootAddress, not the signing address.

```typescript
// Key rotation
const identity = bap.newId("Alice");
console.log(identity.currentPath); // "bap:0" (initially same as rootPath)

identity.incrementPath();
console.log(identity.currentPath); // "bap:0:1" (rotated)
// identity.identityKey is unchanged!
```

### Identity Destruction

To permanently destroy an identity (emergency kill switch if signing key is compromised), broadcast an ID transaction with address `0`, signed by the rootAddress:

```
BAP_PREFIX | ID | identityKey | 0 | AIP_SIGNATURE(rootAddress)
```

### MemberID Counter-Based Rotation

MemberID uses a counter for signing key derivation:

```
memberKey → deriveChild(pubkey, "bap:{counter}") → currentKey
currentKey → deriveChild(pubkey, "1-sigma-identity") → signingKey
```

The protocol name "sigma" is 5 characters, meeting BRC-100 minimum length requirements for protocol IDs. Calling `member.rotate()` increments the counter, producing a new signing key while the member key stays fixed.

### Stable vs Active Keys

| Key | Derivation | Changes? | Use |
|-----|-----------|----------|-----|
| Member key | rootPath derived from master | Never | Identity linkage, auth tokens, backup export |
| Signing key | currentPath derived from member + counter | On rotation | On-chain attestations, AIP signatures |

```typescript
import { getStableMemberPubkey, getActiveWalletPubkey } from "./bap/utils";

const stablePubkey = getStableMemberPubkey(identity); // Fixed
const activePubkey = getActiveWalletPubkey(identity);  // Rotates
```

## Identity Actions via @1sat/actions (Recommended)

For BRC-100 wallet operations, use the identity actions from `@1sat/actions`. These use the wallet's BAP signing key (`[1, "bapid"] / "identity"`) via AIP.

**Seeding the wallet:** When Sigma Identity publishes a BAP ID, it seeds the wallet via one of two paths:
- **Wallet-funded:** Root key signs the ID OP_RETURN via `PrivateKeySigner` + `AIP.sign()`, then `publishIdentity.execute()` funds via the BRC-100 wallet. Output auto-lands in the `bap` basket.
- **Droplit-funded (onboarding):** Droplit funds the broadcast, then `wallet.internalizeAction()` seeds the `bap` basket with `type:id, bapId:<hash>` tags.

### Publish Identity (wallet-funded)

```typescript
import { publishIdentity, createContext } from '@1sat/actions'
import { AIP, PrivateKeySigner } from '@bopen-io/templates'
import { OP, Script, Utils } from '@bsv/sdk'

// Sigma Identity builds and signs the BAP ID OP_RETURN with the root key
const script = new Script()
script.writeOpCode(OP.OP_FALSE)
script.writeOpCode(OP.OP_RETURN)
script.writeBin(Utils.toArray('1BAPSuaPnfGnSBM3GLV9yhxUdYe4vGbdMT'))
script.writeBin(Utils.toArray('ID'))
script.writeBin(Utils.toArray(bapId))
script.writeBin(Utils.toArray(currentAddress))
// ... append AIP signature via PrivateKeySigner(rootKey) ...

const ctx = createContext(wallet)
const result = await publishIdentity.execute(ctx, {
  signedScript: signedScript.toHex(),
})
// result: { txid, rawtx, error }
// Action parses the script to extract bapId, verifies AIP signature,
// and confirms currentAddress matches this wallet's BAP derivation.
// Output lands in bap basket with type:id tag.
```

### Update Profile

```typescript
import { updateProfile, createContext } from '@1sat/actions'

const ctx = createContext(wallet)

const result = await updateProfile.execute(ctx, {
  profile: {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Alice Smith',
    description: 'BSV developer',
  },
})
// result: { txid, rawtx, error }
// Publishes BAP ALIAS on-chain, relinquishes any previous alias outputs
```

### Get Profile

```typescript
import { getProfile, createContext } from '@1sat/actions'

const result = await getProfile.execute(createContext(wallet), {})
// result: { bapId, profile, error }
// Parses current ALIAS from wallet's bap basket
// Deduplicates if multiple alias outputs exist
```

### Attest

```typescript
import { attest, createContext } from '@1sat/actions'

const result = await attest.execute(createContext(wallet), {
  attestationHash: 'sha256-of-urn:bap:id:attribute:value:nonce',
  counter: '0',
})
// result: { txid, rawtx, error }
// Publishes BAP ATTEST on-chain signed with BAP identity
```

### Resolve BAP ID

```typescript
import { resolveBapId, createContext } from '@1sat/actions'

const bapId = await resolveBapId(createContext(wallet))
// Returns the BAP ID string from the wallet's bap basket, or null
```

## Identity Architecture

```
BRC-100 Wallet
  └─ identity-0 key (protocolID=[1,"sigma"], keyID="identity-0")
      ├─ Root address → BAP ID = base58(ripemd160(sha256(rootAddress)))
      └─ BAP signing key (Type42: "1-sigma-identity") → on-chain operations
```

- **Sigma Identity** handles: key generation, identity creation, ID record publication (root key), key rotation, OAuth
- **@1sat/actions** handles: `publishIdentity` (pre-signed script), `attest`, `updateProfile`, `getProfile` (signing key only)
- **BAP ID** is stable across key rotations — it's the identity anchor
- **AIP signature** proves who authorized each transaction

## Related Skills

- **`key-derivation`** - Type42 and BRC-43 key derivation patterns
- **`message-signing`** - BSM, BRC-77, AIP, and Sigma signing protocols
- **`encrypt-decrypt-backup`** - bitcoin-backup CLI for .bep encrypted backups
