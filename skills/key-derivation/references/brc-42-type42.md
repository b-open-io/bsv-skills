# BRC-42: Type42 Key Derivation

Complete specification for BSV's modern key derivation scheme.

**Official Spec**: https://bsv.brc.dev/key-derivation/0042

## Core Concept

Type42 enables two parties to derive shared keys without revealing private keys. Uses ECDH (Elliptic Curve Diffie-Hellman) shared secrets combined with invoice numbers.

## Mathematical Foundation

### Derivation Formula

Given:
- `a` = sender's private key
- `A` = sender's public key (a × G)
- `B` = counterparty's public key
- `invoice` = UTF-8 encoded invoice number string

**Sender derives child public key:**
1. Compute shared secret: `S = a × B`
2. Compute HMAC: `h = HMAC-SHA256(S, invoice)`
3. Convert to scalar: `offset = h (as big-endian integer)`
4. Compute point: `P = offset × G`
5. Derive child public key: `childPubKey = B + P`

**Recipient derives corresponding private key:**
1. Compute same shared secret: `S = b × A` (equals a × B)
2. Compute same HMAC: `h = HMAC-SHA256(S, invoice)`
3. Derive child private key: `childPrivKey = b + offset`

## @bsv/sdk API

### PrivateKey.deriveChild()

```typescript
deriveChild(counterpartyPubKey: PublicKey, invoiceNumber: string): PrivateKey
```

**Parameters:**
- `counterpartyPubKey`: The other party's public key (or own public key for self-derivation)
- `invoiceNumber`: Any UTF-8 string identifying this derivation

**Returns:** New `PrivateKey` instance

### PublicKey.deriveChild()

```typescript
deriveChild(counterpartyPubKey: PublicKey, invoiceNumber: string): PublicKey
```

Derives child public key without private key (requires own private key to know the offset).

## Invoice Number Conventions (BRC-43)

### Security Levels

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Low security, public protocol | `1-bap-identity` |
| 2 | Standard security, may involve signatures | `2-encryption-default` |
| 3 | High security, sensitive operations | `3-auth-session` |

### Format

```
{securityLevel}-{protocolName}-{keyId}
```

Examples:
- `1-bap-identity` - BAP identity signing
- `2-social-4` - Social protocol, key index 4
- `2-encryption-default` - Default encryption key

### Standard Protocol Invoice Numbers

| Purpose | Invoice Number | Notes |
|---------|---------------|-------|
| BAP identity signing | `1-bap-identity` | Security level 1, public protocol |
| Per-host auth key | `2-sigma auth-{host}` | Security level 2, host-specific |
| Friend encryption | `2-friend-{sha256(friendBapId)}` | Security level 2, counterparty-specific |
| Generic encryption | `2-encrypt-{sha256(purpose)}` | Security level 2, purpose-hashed |

### Custom Invoice Numbers

Any string works as an invoice number:

```typescript
// Payment invoice
const paymentKey = key.deriveChild(merchantPubKey, "order-12345");

// Sequential counter
const key0 = key.deriveChild(key.toPublicKey(), "bap:0");
const key1 = key.deriveChild(key.toPublicKey(), "bap:1");

// Timestamp-based
const sessionKey = key.deriveChild(serverPubKey, new Date().toISOString());
```

## Advanced Patterns

### Self-Derivation

Derive keys from own master without counterparty:

```typescript
const masterKey = PrivateKey.fromWif("L1...");
const ownPubKey = masterKey.toPublicKey();

// Derive multiple keys from same master
const signingKey = masterKey.deriveChild(ownPubKey, "1-bap-identity");
const encryptKey = masterKey.deriveChild(ownPubKey, "2-encryption-default");
const paymentKey = masterKey.deriveChild(ownPubKey, "payment:0");
```

### Two-Party Key Agreement

```typescript
// Alice and Bob agree on invoice
const invoice = "shared-channel-2024";

// Alice derives
const alicePriv = PrivateKey.fromWif("L1...");
const bobPub = PublicKey.fromString("02...");
const aliceDerived = alicePriv.deriveChild(bobPub, invoice);

// Bob derives (same result)
const bobPriv = PrivateKey.fromWif("K1...");
const alicePub = alicePriv.toPublicKey();
const bobDerived = bobPriv.deriveChild(alicePub, invoice);

// aliceDerived.toPublicKey().toAddress() === bobDerived.toPublicKey().toAddress()
```

### Chain Derivation

Derive keys from derived keys:

```typescript
const master = PrivateKey.fromWif("L1...");
const level1 = master.deriveChild(master.toPublicKey(), "level1");
const level2 = level1.deriveChild(level1.toPublicKey(), "level2");
const level3 = level2.deriveChild(level2.toPublicKey(), "level3");
```

### Friend Encryption (BSocial Pattern)

Derive unique encryption keys for each friend relationship:

```typescript
import { Hash, Utils } from "@bsv/sdk";
const { toHex, toArray } = Utils;

// Derive friend-specific encryption key
const friendBapId = "abc123..."; // Friend's BAP identity key
const seedHash = toHex(Hash.sha256(toArray(friendBapId, "utf8")));
const invoiceNumber = `2-friend-${seedHash}`;

// Self-derivation for friend relationship
const friendKey = masterKey.deriveChild(masterKey.toPublicKey(), invoiceNumber);

// Share this pubkey in friend request TX - friend uses it to encrypt TO you
const friendPubKey = friendKey.toPublicKey().toString();
```

**bsv-bap Implementation** (canonical):

```typescript
import { MemberID } from "bsv-bap";

const member = new MemberID(privateKey);

// Get pubkey to share in friend request
const pubKey = member.getEncryptionPublicKeyWithSeed(friendBapId);

// Encrypt data for friend
const ciphertext = member.encryptWithSeed(data, friendBapId, theirPubKey?);

// Decrypt data from friend
const plaintext = member.decryptWithSeed(ciphertext, friendBapId, theirPubKey?);
```

**bap CLI**:

```bash
bap friend-pubkey <friendBapId>   # Get encryption pubkey for friend
bap encrypt <data> <friendBapId>  # Encrypt for friend
bap decrypt <text> <friendBapId>  # Decrypt from friend
```

## Key Linkage Revelation (BRC-69)

Reveal derivation relationship to third party without exposing private key.

### Method 1: Counterparty Revelation

Reveal shared secret between two identity keys:

```typescript
// Compute shared secret
const sharedSecret = privateKey.multiply(counterpartyPubKey);

// Reveal to verifier (encrypted per BRC-72)
const revelation = {
  type: "counterparty-revelation",
  prover: myPubKey.toString(),
  counterparty: counterpartyPubKey.toString(),
  encryptedLinkage: encrypt(sharedSecret, verifierPubKey)
};
```

### Method 2: Specific Linkage Revelation

Reveal specific derivation for a protocol/key combination:

```typescript
const revelation = {
  type: "specific-revelation",
  prover: myPubKey.toString(),
  counterparty: counterpartyPubKey.toString(),
  protocolID: [2, "social"],
  keyID: "4",
  encryptedLinkage: encrypt(keyOffset, verifierPubKey)
};
```

## Schnorr Verification (BRC-96)

Verify shared secret authenticity without private keys using zero-knowledge proof:

```typescript
// Prover generates proof
const proof = generateSchnorrProof(privateKey, counterpartyPubKey, sharedSecret);

// Verifier checks without knowing private key
const valid = verifySchnorrProof(
  proverPubKey,      // A
  counterpartyPubKey, // B
  sharedSecret,       // S
  proof               // (R, S', z)
);
```

## Comparison with BIP32

| Feature | Type42 | BIP32 |
|---------|--------|-------|
| Key limit per parent | Unlimited | 2^31 |
| Public derivation | No | Yes (non-hardened) |
| Privacy | Enhanced (ECDH) | Limited |
| Counterparty derivation | Yes | No |
| Path format | Any string | m/0'/1/2 |
| Auditability | Selective reveal | Chain code reveal |

## Security Properties

1. **Forward Secrecy**: Compromising one invoice doesn't reveal others
2. **No Public Derivation**: Cannot derive child public keys from parent public key alone
3. **Selective Disclosure**: Reveal specific linkages without master key
4. **Counterparty Independence**: Each party derives without sharing secrets

## Related Specifications

- **BRC-43**: Security levels and protocol ID conventions
- **BRC-69**: Key linkage revelation methods
- **BRC-72**: Encrypted linkage transmission
- **BRC-93**: Limitations of revelation (solved by BRC-96)
- **BRC-96**: Schnorr-based verification

All specs at: https://bsv.brc.dev/key-derivation
