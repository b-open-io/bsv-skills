# BAP Identity Key Derivation

Key derivation patterns used in Bitcoin Attestation Protocol (BAP).

**Package**: `bsv-bap` (npm)
**Repository**: https://github.com/BitcoinSchema/bap
**Protocol Spec**: https://github.com/BitcoinSchema/bap/blob/master/PROTOCOL.md

## Overview

BAP uses a two-level key derivation hierarchy:
1. **Member Key**: Derived from master using path/invoice
2. **Identity Signing Key**: Derived from member key using BAP invoice number

This separation enables:
- Multiple identities from single master
- Consistent signing key derivation
- Type42 and BIP32 compatibility

## Mode Detection

BAP supports both Type42 and BIP32:

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

### Step 2: Member Key (Path Derivation)

```typescript
// Using counter-based invoice
const memberKey = masterKey.deriveChild(
  masterKey.toPublicKey(),
  "bap:0"  // "bap:1", "bap:2", etc. for additional identities
);
```

### Step 3: Identity Signing Key

```typescript
const BAP_INVOICE = "1-bapid-identity";

const signingKey = memberKey.deriveChild(
  memberKey.toPublicKey(),
  BAP_INVOICE
);

const signingAddress = signingKey.toPublicKey().toAddress();
```

### Complete Pattern

```typescript
function deriveIdentitySigningKey(
  masterKey: PrivateKey,
  identityIndex: number
): { memberKey: PrivateKey; signingKey: PrivateKey; address: string } {
  // Level 1: Member key
  const memberKey = masterKey.deriveChild(
    masterKey.toPublicKey(),
    `bap:${identityIndex}`
  );

  // Level 2: Signing key
  const signingKey = memberKey.deriveChild(
    memberKey.toPublicKey(),
    "1-bapid-identity"
  );

  return {
    memberKey,
    signingKey,
    address: signingKey.toPublicKey().toAddress()
  };
}
```

## BIP32 Derivation Flow

### Standard Paths

```typescript
// Root signing path
const SIGNING_PATH_PREFIX = "m/424150'/0'/0'";

// Member paths
const member0 = "m/424150'/0'/0'/0/0/0";
const member1 = "m/424150'/0'/0'/0/0/1";

// Encryption path (max hardened indices)
const ENCRYPTION_PATH = "m/424150'/2147483647'/2147483647'";
```

### Step 1: HD Key

```typescript
import { HD } from "@bsv/sdk";

const hdKey = HD.fromString("xprv9s21ZrQH143K...");
```

### Step 2: Member Key (Path Derivation)

```typescript
const memberPath = "m/424150'/0'/0'/0/0/0";
const memberHD = hdKey.derive(memberPath);
const memberKey = memberHD.privKey;
```

### Step 3: Identity Signing Key (Type42 from BIP32)

```typescript
// Even in BIP32 mode, signing key uses Type42 derivation
const signingKey = memberKey.deriveChild(
  memberHD.pubKey,
  "1-bapid-identity"
);

const signingAddress = signingKey.toPublicKey().toAddress();
```

## Encryption Key Derivation

### Type42 Mode

```typescript
const ENCRYPTION_PATH = "m/424150'/2147483647'/2147483647'";

// First derive to root path
const rootKey = masterKey.deriveChild(
  masterKey.toPublicKey(),
  "m/424150'/0'/0'"
);

// Then derive encryption key
const encryptionKey = rootKey.deriveChild(
  rootKey.toPublicKey(),
  ENCRYPTION_PATH
);
```

### BIP32 Mode

```typescript
const rootHD = hdKey.derive("m/424150'/0'/0'");
const encryptionHD = rootHD.derive("m/424150'/2147483647'/2147483647'");
const encryptionKey = encryptionHD.privKey;
```

## Seed-Based Derivation

Derive deterministic keys from arbitrary seed strings:

```typescript
import { Hash, Utils } from "@bsv/sdk";
const { toHex } = Utils;

function deriveFromSeed(masterKey: PrivateKey, seed: string): PrivateKey {
  // Hash seed to get deterministic invoice
  const seedHash = toHex(Hash.sha256(seed, "utf8"));

  // First derive to root path
  const rootKey = masterKey.deriveChild(
    masterKey.toPublicKey(),
    "m/424150'/0'/0'"
  );

  // Derive with seed hash as invoice
  const seedKey = rootKey.deriveChild(
    rootKey.toPublicKey(),
    seedHash
  );

  // Apply identity signing derivation
  return seedKey.deriveChild(
    seedKey.toPublicKey(),
    "1-bapid-identity"
  );
}
```

## Identity Key Linkage

Deterministic identity key derived from root address:

```typescript
import { Hash, Utils } from "@bsv/sdk";
const { toHex, toBase58 } = Utils;

function deriveIdentityKey(rootAddress: string): string {
  // base58( ripemd160( sha256( rootAddress ) ) )
  const addressHash = toHex(Hash.sha256(rootAddress, "utf8"));
  return toBase58(Hash.ripemd160(addressHash, "hex"));
}
```

## Migration: BIP32 to Type42

**Important**: No direct upgrade path exists. Keys derived with different methods produce different results.

### Migration Process

1. **Extract WIF from HD**:
```typescript
const hdKey = HD.fromString(xprv);
const rootWif = hdKey.privKey.toWif();
```

2. **Create rotation transaction** (links old identity to new):
```typescript
// Sign with OLD (BIP32) key pointing to NEW (Type42) address
const legacyKey = hdKey.derive("m/424150'/0'/0'/0/0/0").privKey;
const newAddress = type42Key.deriveChild(type42Key.toPublicKey(), "bap:0")
  .deriveChild(/*..*/, "1-bapid-identity")
  .toPublicKey()
  .toAddress();

// Create ID transaction with rotation
```

3. **Continue with Type42** for new attestations

### Checking Migration Need

```typescript
function needsRotation(
  hdKey: HD,
  type42Key: PrivateKey,
  registeredAddress: string
): boolean {
  const path = "m/424150'/0'/0'/0/0/0";

  // Get BIP32 address
  const bip32Key = hdKey.derive(path).privKey;
  const bip32Signing = bip32Key.deriveChild(
    hdKey.derive(path).pubKey,
    "1-bapid-identity"
  );
  const bip32Address = bip32Signing.toPublicKey().toAddress();

  // If registered with BIP32 address, needs rotation
  return registeredAddress === bip32Address;
}
```

## Constants

```typescript
// BAP-specific constants
const BAP_PROTOCOL_PREFIX = 424150;  // Used in BIP32 paths
const BAP_PROTOCOL_ID: [1, string] = [1, "bapid"];
const BAP_KEY_ID = "identity";
const BAP_INVOICE_NUMBER = "1-bapid-identity";

// Paths
const SIGNING_PATH_PREFIX = "m/424150'/0'/0'";
const ENCRYPTION_PATH = "m/424150'/2147483647'/2147483647'";
const MAX_INT = 2147483647;  // 2^31 - 1
```

## Path Validation

BAP paths must:
- Have exactly 6 integer components
- Each integer max 10 digits
- Values <= 2^31 - 1

```typescript
function validatePath(path: string): boolean {
  const parts = path.replace(/'/g, "").split("/").slice(1);
  if (parts.length !== 6) return false;

  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 2147483647;
  });
}
```

## Security Notes

1. **Master key protection**: Never expose; derive child keys for operations
2. **Type42 preferred**: Enhanced privacy, no public derivation
3. **Invoice numbers public**: Can be shared; security from ECDH secrets
4. **Backup both formats**: During migration, maintain both backups
5. **Test recovery**: Always verify backup restoration before migration
