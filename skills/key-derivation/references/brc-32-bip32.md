# BRC-32: BIP32 HD Key Derivation

Legacy hierarchical deterministic key derivation for BSV compatibility.

**Official Spec**: https://bsv.brc.dev/key-derivation/0032

## Overview

BIP32 enables generating virtually unlimited key pairs from a single master seed using hierarchical deterministic derivation. Each key in the tree can derive child keys.

## Master Key Generation

### From Seed

```typescript
import { HD } from "@bsv/sdk";

// 64-byte seed (from mnemonic or random)
const seed = new Uint8Array(64);
const hdKey = HD.fromSeed(seed);
```

### From Mnemonic (BIP39)

```typescript
import { Mnemonic, HD } from "@bsv/sdk";

const mnemonic = Mnemonic.fromString("word1 word2 word3 ... word12");
const seed = mnemonic.toSeed("optional passphrase");
const hdKey = HD.fromSeed(seed);
```

### From Extended Key String

```typescript
// Private key (xprv)
const hdPriv = HD.fromString("xprv9s21ZrQH143K...");

// Public key (xpub)
const hdPub = HD.fromString("xpub661MyMwAqRbc...");
```

## Path Format

```
m / purpose' / coin_type' / account' / change / address_index
```

| Component | Description |
|-----------|-------------|
| `m` | Master key |
| `/` | Level separator |
| `'` | Hardened derivation (add 2^31 to index) |
| `0-2147483647` | Child index |

### Standard Paths (BIP44)

```typescript
// BSV receiving address (coin type 236)
const receiving = hdKey.derive("m/44'/236'/0'/0/0");

// BSV change address
const change = hdKey.derive("m/44'/236'/0'/1/0");

// Bitcoin (for compatibility)
const btc = hdKey.derive("m/44'/0'/0'/0/0");
```

### Application-Specific Paths

```typescript
// BAP Identity (424150 = 0x67806 = "BAP" concept)
const bapRoot = hdKey.derive("m/424150'/0'/0'");
const bapSigning = hdKey.derive("m/424150'/0'/0'/0/0/1");

// Encryption (using max hardened indices)
const encryption = hdKey.derive("m/424150'/2147483647'/2147483647'");
```

## @bsv/sdk API

### HD Class

```typescript
import { HD } from "@bsv/sdk";

// Properties
hdKey.privKey      // PrivateKey (if private HD key)
hdKey.pubKey       // PublicKey
hdKey.chainCode    // Chain code bytes

// Methods
hdKey.derive(path: string): HD           // Derive at path
hdKey.deriveChild(index: number): HD     // Derive single child
hdKey.toPublic(): HD                     // Convert to public-only HD
hdKey.toString(): string                 // Serialize to xprv/xpub
```

### Derivation

```typescript
// Full path derivation
const child = hdKey.derive("m/44'/236'/0'/0/0");

// Single level derivation
const child0 = hdKey.deriveChild(0);           // Non-hardened
const child0h = hdKey.deriveChild(0x80000000); // Hardened (0')

// Access keys
const privateKey = child.privKey;
const publicKey = child.pubKey;
const address = child.pubKey.toAddress();
```

## Hardened vs Non-Hardened

### Non-Hardened (Index 0 to 2^31-1)

- Can derive child public keys from parent public key
- Parent xpub can generate all child xpubs
- Less secure: compromised child + parent xpub reveals parent private key

```typescript
const child = hdKey.derive("m/44'/236'/0'/0/0");  // Last two are non-hardened
```

### Hardened (Index 2^31 to 2^32-1, marked with ')

- Requires parent private key to derive
- More secure: prevents key derivation from public key alone
- Cannot generate child keys from xpub

```typescript
const hardened = hdKey.derive("m/44'/236'/0'");  // All hardened
```

### Security Recommendation

Use hardened derivation for:
- Account level and above
- Any level where child key compromise shouldn't affect siblings
- Privacy-sensitive applications

```typescript
// Recommended: hardened until address level
"m/44'/236'/0'/0/0"  // account' is hardened, change/address are not
```

## Public Key Derivation

Generate addresses without private key (non-hardened paths only):

```typescript
// Export public HD key
const xpub = hdKey.toPublic().toString();

// Merchant generates addresses
const merchantHD = HD.fromString(xpub);
const address0 = merchantHD.derive("m/0/0").pubKey.toAddress();
const address1 = merchantHD.derive("m/0/1").pubKey.toAddress();

// Cannot derive hardened paths from xpub
merchantHD.derive("m/0'/0");  // Error: cannot derive hardened from public key
```

## Limitations

| Limitation | Impact |
|------------|--------|
| 2^31 keys per parent | Practical limit for large systems |
| No privacy between paths | Chain code reveals derivation relationship |
| Public derivation vulnerability | xpub + child private key = master private key |
| Fixed path structure | Less flexible than Type42 invoice numbers |

## Migration to Type42

### Extract Root Key

```typescript
// Get root private key for Type42
const hdKey = HD.fromString(xprv);
const rootPrivate = hdKey.privKey;
const rootWif = rootPrivate.toWif();

// Use in Type42 context
const type42Key = PrivateKey.fromWif(rootWif);
const childKey = type42Key.deriveChild(type42Key.toPublicKey(), "bap:0");
```

### Path as Invoice Number

BIP32 paths can be used as Type42 invoice numbers:

```typescript
const path = "m/424150'/0'/0'/0/0/1";

// BIP32 derivation
const bip32Child = hdKey.derive(path);

// Type42 derivation (different result, same path string)
const type42Child = privateKey.deriveChild(privateKey.toPublicKey(), path);
```

## Mnemonic Integration

### Generate New Wallet

```typescript
import { Mnemonic, HD } from "@bsv/sdk";

// Generate 12-word mnemonic
const mnemonic = Mnemonic.fromRandom(128);  // 128 bits = 12 words
console.log(mnemonic.toString());

// Derive HD key
const seed = mnemonic.toSeed();
const hdKey = HD.fromSeed(seed);
```

### Recover Wallet

```typescript
const mnemonic = Mnemonic.fromString(
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
);
const hdKey = HD.fromSeed(mnemonic.toSeed());
const address = hdKey.derive("m/44'/236'/0'/0/0").pubKey.toAddress();
```

## Backup Format

### Extended Key Export

```typescript
// Private (for full backup)
const xprv = hdKey.toString();  // xprv9s21ZrQH143K...

// Public (for watch-only)
const xpub = hdKey.toPublic().toString();  // xpub661MyMwAqRbc...
```

### With Mnemonic

```typescript
const backup = {
  mnemonic: mnemonic.toString(),
  xprv: hdKey.toString(),
  passphrase: ""  // if used
};
```

## Related Specifications

- **BIP32**: Original HD wallet specification
- **BIP39**: Mnemonic code for generating seeds
- **BIP44**: Multi-account hierarchy for deterministic wallets
- **BRC-42**: Type42 replacement for privacy-sensitive applications

All BSV specs at: https://bsv.brc.dev/key-derivation
