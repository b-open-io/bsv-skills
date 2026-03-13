# BAP Identity Key Derivation

Key derivation patterns used in Bitcoin Attestation Protocol (BAP).

**Package**: `bsv-bap` (npm)
**Repository**: https://github.com/BitcoinSchema/bap
**Protocol Spec**: https://github.com/BitcoinSchema/bap/blob/master/PROTOCOL.md

## Key Hierarchy

```text
Master Key (xprv or WIF)
│   Stored in master backup. Spans ALL accounts.
│   BIP32 (xprv) or Type42 (WIF) — used ONLY to derive member keys.
│   Multiple accounts = multiple member keys. No on-chain relationship
│   between them. "currentPath" on MasterID = which account is active.
│
└── Member Key (WIF) — ONE per account, stable, never changes
    │   Derived from master via BIP32 path or Type42 invoice ("bap:N").
    │   rootAddress = memberKey.toPublicKey().toAddress()
    │   BAP ID = base58(ripemd160(sha256(rootAddress)))
    │   Used to sign: identity publication, key rotation transactions.
    │   This WIF is stored in the member backup.
    │
    ├── Current Key = BRC-100 wallet root (Type42, rotates)
    │   │   memberKey.deriveChild(memberPub, "bap:{counter}")
    │   │   counter = 0 initially, increments on rotation.
    │   │   This is the active wallet/auth root.
    │   │
    │   └── Signing Key (Type42)
    │       currentKey.deriveChild(currentPub, "1-bapid-identity")
    │       signingAddress = signingKey.toPublicKey().toAddress()
    │       Used for BAP attestations from the active wallet.
    │
    └── Encryption Key (Type42)
        memberKey.deriveChild(memberPub, ENCRYPTION_PATH)
        Used for ECIES encrypt/decrypt of identity data.
```

### Rules

- **Master → Member**: BIP32 (path) or Type42 (invoice). This is the ONLY place BIP32 may be used.
- **Member → everything below**: Type42 derivation only. Member key is a plain WIF, not an HD key.
- **Member key never changes**. It defines the BAP ID and root address permanently.
- **Rotation** increments a counter. New current key = `memberKey.deriveChild(pub, "bap:{counter}")`. On-chain, a BAP ID transaction signed with the member key's root address announces the new signing address.
- **Multiple accounts** from one master are independent identities with no on-chain link between them.

## Mode Detection

BAP supports both Type42 and BIP32 for master → member derivation:

```typescript
import { BAP } from "bsv-bap";

// Type42 mode (recommended)
const bapType42 = new BAP({ rootPk: "L1..." });  // WIF string in object

// BIP32 mode (legacy)
const bapBip32 = new BAP("xprv9s21ZrQH143K...");  // xprv string directly
```

## Type42 Derivation Flow

### Step 1: Master Key

```typescript
import { PrivateKey } from "@bsv/sdk";

const masterKey = PrivateKey.fromWif("L1...");
```

### Step 2: Member Key (from master)

```typescript
// Type42 derivation from master — one per account
const memberKey = masterKey.deriveChild(
  masterKey.toPublicKey(),
  "bap:0"  // "bap:1", "bap:2", etc. for additional accounts
);

// Root address and BAP ID — stable, never changes
const rootAddress = memberKey.toPublicKey().toAddress();
```

### Step 3: Current Key / BRC-100 Wallet Root (from member)

```typescript
// Type42 derivation from member key — rotates with counter
const counter = 0; // increments on rotation
const currentKey = memberKey.deriveChild(
  memberKey.toPublicKey(),
  `bap:${counter}`
);
```

### Step 4: Signing Key (from current key)

```typescript
const BAP_INVOICE = "1-bapid-identity";

const signingKey = currentKey.deriveChild(
  currentKey.toPublicKey(),
  BAP_INVOICE
);

const signingAddress = signingKey.toPublicKey().toAddress();
```

### Complete Pattern

```typescript
function deriveKeys(
  masterKey: PrivateKey,
  accountIndex: number,
  rotationCounter: number
): {
  memberKey: PrivateKey;
  currentKey: PrivateKey;
  signingKey: PrivateKey;
  rootAddress: string;
  signingAddress: string;
} {
  // Level 1: Member key (from master, stable)
  const memberKey = masterKey.deriveChild(
    masterKey.toPublicKey(),
    `bap:${accountIndex}`
  );

  // Root address — defines BAP ID, never changes
  const rootAddress = memberKey.toPublicKey().toAddress();

  // Level 2: Current key / BRC-100 wallet root (from member, rotates)
  const currentKey = memberKey.deriveChild(
    memberKey.toPublicKey(),
    `bap:${rotationCounter}`
  );

  // Level 3: Signing key (from current key)
  const signingKey = currentKey.deriveChild(
    currentKey.toPublicKey(),
    "1-bapid-identity"
  );

  return {
    memberKey,
    currentKey,
    signingKey,
    rootAddress,
    signingAddress: signingKey.toPublicKey().toAddress()
  };
}
```

## BIP32 Derivation Flow (Legacy)

BIP32 is only used for master → member derivation in legacy mode:

```typescript
import { HD } from "@bsv/sdk";

const hdKey = HD.fromString("xprv9s21ZrQH143K...");

// BIP32 paths for member derivation
const SIGNING_PATH_PREFIX = "m/424150'/0'/0'";
const member0Path = "m/424150'/0'/0'/0/0/0";
const member1Path = "m/424150'/0'/0'/0/0/1";

// Derive member key via BIP32
const memberKey = hdKey.derive(member0Path).privKey;

// From here, ALL further derivation uses Type42 (same as above)
const currentKey = memberKey.deriveChild(memberKey.toPublicKey(), "bap:0");
const signingKey = currentKey.deriveChild(currentKey.toPublicKey(), "1-bapid-identity");
```

## Encryption Key Derivation

Encryption keys are derived from the member key via Type42:

```typescript
const ENCRYPTION_PATH = "m/424150'/2147483647'/2147483647'";

const encryptionKey = memberKey.deriveChild(
  memberKey.toPublicKey(),
  ENCRYPTION_PATH
);
```

## Seed-Based Derivation

Derive deterministic keys from arbitrary seed strings (e.g., friend encryption):

```typescript
import { Hash, Utils } from "@bsv/sdk";
const { toHex } = Utils;

function deriveFromSeed(memberKey: PrivateKey, seed: string): PrivateKey {
  const seedHash = toHex(Hash.sha256(seed, "utf8"));

  return memberKey.deriveChild(
    memberKey.toPublicKey(),
    seedHash
  );
}
```

## Identity Key Linkage

BAP ID is deterministically derived from root address:

```typescript
import { Hash, Utils } from "@bsv/sdk";
const { toHex, toBase58 } = Utils;

function deriveIdentityKey(rootAddress: string): string {
  // base58( ripemd160( sha256( rootAddress ) ) )
  const addressHash = toHex(Hash.sha256(rootAddress, "utf8"));
  return toBase58(Hash.ripemd160(addressHash, "hex"));
}
```

## Backup Formats

### Master Backup

Contains everything needed to reconstruct all accounts:

```json
{
  "rootPk": "L4vB5...",        // Master key WIF (Type42) or xprv (BIP32)
  "ids": "<encrypted string>", // All account metadata, encrypted with master
  "label": "optional",
  "createdAt": "2026-03-13T..."
}
```

### Member Backup

Contains one account's key and metadata:

```json
{
  "wif": "KwDiB...",           // Member key WIF (stable, never changes)
  "id": "<encrypted string>",  // Identity metadata, encrypted with member key
  "label": "optional",
  "createdAt": "2026-03-13T..."
}
```

The encrypted `id` blob contains:
- `name`, `description` — human-readable identity info
- `identityKey` — BAP ID
- `identityAttributes` — attestation attributes
- `counter` — current rotation index (needed to derive current BRC-100 wallet root)

## Rotation

Key rotation changes the active wallet/signing key while keeping the BAP ID stable:

1. Increment counter
2. Derive new current key: `memberKey.deriveChild(pub, "bap:{newCounter}")`
3. Derive new signing key: `currentKey.deriveChild(pub, "1-bapid-identity")`
4. Publish BAP ID transaction signed with **member key's root address** announcing the new signing address
5. Update counter in member backup

The BAP ID never changes because it comes from the member key, which never changes.

## Constants

```typescript
const BAP_PROTOCOL_PREFIX = 424150;  // Used in BIP32 paths
const BAP_PROTOCOL_ID: [1, string] = [1, "bapid"];
const BAP_KEY_ID = "identity";
const BAP_INVOICE_NUMBER = "1-bapid-identity";

const SIGNING_PATH_PREFIX = "m/424150'/0'/0'";
const ENCRYPTION_PATH = "m/424150'/2147483647'/2147483647'";
const MAX_INT = 2147483647;  // 2^31 - 1
```

## Security Notes

1. **Master key protection**: Never expose; only used to derive member keys
2. **Member key**: Stored in member backup, used for identity publication and rotation signing
3. **Type42 below member**: All derivation from member key downward uses Type42
4. **Invoice numbers public**: Can be shared; security from ECDH secrets
5. **Backup both levels**: Master backup for full recovery, member backup for single-account use
