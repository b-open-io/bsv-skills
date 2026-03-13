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

## Key Derivation

BAP uses Type42 (BRC-42) key derivation with BRC-43 invoice numbers:

| Purpose | Invoice Number | Security Level |
|---------|---------------|----------------|
| Signing key | `1-bapid-identity` | 1 (public protocol) |
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

Derive friend-specific encryption keys for private communication:

```typescript
// Get encryption pubkey for a friend (share in friend requests)
const friendPubKey = identity.getEncryptionPublicKeyWithSeed(friendBapId);

// Encrypt data for friend
const ciphertext = identity.encryptWithSeed("secret message", friendBapId);

// Decrypt data from friend
const plaintext = identity.decryptWithSeed(ciphertext, friendBapId);
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
bap friend-pubkey <bapId>     # Get friend encryption pubkey
bap encrypt <data> <bapId>    # Encrypt for friend
bap decrypt <text> <bapId>    # Decrypt from friend
bap export                    # Export backup JSON
bap import <file>             # Import from backup
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
Sigma Identity (root key domain)
  └─ BAP Master Key (xprv)
      └─ Identity N
          ├─ Root key (member key) → BAP ID = base58(ripemd160(sha256(rootAddress)))
          └─ Active key → BRC-100 wallet root key
              └─ BAP signing key (Type42: "1-bapid-identity")
```

- **Sigma Identity** handles: key generation, identity creation, ID record publication (root key), key rotation, OAuth
- **@1sat/actions** handles: `publishIdentity` (pre-signed script), `attest`, `updateProfile`, `getProfile` (signing key only)
- **BAP ID** is stable across key rotations — it's the identity anchor
- **AIP signature** proves who authorized each transaction

## Using bsv-bap Library Directly

For operations outside the BRC-100 wallet (raw WIF usage, CLI scripts).

## Installation

```bash
bun add bsv-bap @bsv/sdk
```

## Creating an Identity

```typescript
import { BAP } from "bsv-bap";
import { PrivateKey } from "@bsv/sdk";

const privateKey = PrivateKey.fromRandom();
const bap = new BAP({ rootPk: privateKey.toWif() });
const identity = bap.newId("Alice Smith");

console.log("BAP ID:", identity.getIdentityKey());
console.log("Root Address:", identity.rootAddress);
console.log("Signing Address:", identity.getCurrentAddress());
```

## Key Derivation

BAP uses Type42 (BRC-42) key derivation with BRC-43 invoice numbers:

| Purpose | Invoice Number | Security Level |
|---------|---------------|----------------|
| Signing key | `1-bapid-identity` | 1 (public protocol) |
| Friend encryption | `2-friend-{sha256(friendBapId)}` | 2 (user-approved) |

## Related Skills

- **`key-derivation`** - Type42 and BRC-43 key derivation patterns
- **`message-signing`** - BSM, BRC-77, AIP, and Sigma signing protocols
- **`encrypt-decrypt-backup`** - bitcoin-backup CLI for .bep encrypted backups
