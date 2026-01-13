---
name: message-signing
description: This skill should be used when the user asks to "sign a message", "verify a signature", "use BSM", "use BRC-77", "implement Sigma signing", "create signed messages", "authenticate with Bitcoin", or mentions message signing, signature verification, or authentication protocols on BSV.
---

# BSV Message Signing

Comprehensive guide for message signing and verification on BSV blockchain using @bsv/sdk.

## Overview

BSV supports multiple signing protocols:

| Protocol | Use Case | Verification | SDK Module |
|----------|----------|--------------|------------|
| **BSM** | Simple message signing | Public (anyone) | `BSM` |
| **BRC-77** | Derived key signing | Public or Private | `SignedMessage` |
| **Sigma** | Transaction-bound signatures | Public | `sigma-protocol` |

## BSM (Bitcoin Signed Message)

Standard Bitcoin message signing with recoverable signatures.

### When to Use

- Simple message authentication
- Proving ownership of an address
- Publicly verifiable signatures
- Legacy compatibility

### Signing

```typescript
import { BSM, PrivateKey, Signature, BigNumber } from "@bsv/sdk";

const privateKey = PrivateKey.fromWif("L1...");
const message = [/* byte array */];

// Sign message
const signature = BSM.sign(message, privateKey, "raw") as Signature;

// Calculate recovery factor for compact signature
const h = new BigNumber(BSM.magicHash(message));
const recovery = signature.CalculateRecoveryFactor(privateKey.toPublicKey(), h);

// Get compact signature (base64)
const compactSig = signature.toCompact(recovery, true, "base64");
```

### Verification

```typescript
import { BSM, Signature, BigNumber } from "@bsv/sdk";

const signature = Signature.fromCompact(compactSigBase64, "base64");

// Recover public key and verify
for (let recovery = 0; recovery < 4; recovery++) {
  try {
    const publicKey = signature.RecoverPublicKey(
      recovery,
      new BigNumber(BSM.magicHash(message))
    );
    if (BSM.verify(message, signature, publicKey)) {
      const address = publicKey.toAddress();
      // Signature valid, address is the signer
      break;
    }
  } catch { /* try next recovery */ }
}
```

## BRC-77 (Signed Message Protocol)

Advanced signing with derived keys and optional private verification.

### When to Use

- Per-message unique signing keys
- Private signatures (only specific recipient can verify)
- Enhanced security (signing key cannot spend coins)
- Modern applications

### Public Signature (Anyone Can Verify)

```typescript
import { SignedMessage, PrivateKey } from "@bsv/sdk";

const signer = PrivateKey.fromWif("L1...");
const message = [/* byte array */];

// Sign (no verifier = anyone can verify)
const signature = SignedMessage.sign(message, signer);

// Verify (no recipient key needed)
const isValid = SignedMessage.verify(message, signature);
```

### Private Signature (Specific Recipient Only)

```typescript
import { SignedMessage, PrivateKey, PublicKey } from "@bsv/sdk";

const signer = PrivateKey.fromWif("L1...");
const recipientPubKey = PublicKey.fromString("02...");
const message = [/* byte array */];

// Sign for specific recipient
const signature = SignedMessage.sign(message, signer, recipientPubKey);

// Recipient verifies with their private key
const recipientPrivKey = PrivateKey.fromWif("K1...");
const isValid = SignedMessage.verify(message, signature, recipientPrivKey);
```

### Signature Structure

BRC-77 signatures contain:
- Version (4 bytes): `42423301`
- Sender public key (33 bytes)
- Verifier: `0` (anyone) or public key (33 bytes)
- Key ID (32 bytes random)
- DER signature (variable)

## Sigma Protocol

Transaction-bound signatures that prove content ownership at signing time.

### When to Use

- Signing OP_RETURN data in transactions
- Binding signatures to specific inputs
- Multiple signatures on same output
- Platform + user dual signing

### Installation

```bash
bun add sigma-protocol
```

### Basic Usage

```typescript
import { Sigma, Algorithm } from "sigma-protocol";
import { Transaction, PrivateKey } from "@bsv/sdk";

// Create transaction with OP_RETURN output
const tx = new Transaction(1, [], [txOut]);

// Create Sigma instance (targetVout=0, sigmaInstance=0, refVin=0)
const sigma = new Sigma(tx, 0, 0, 0);

// Sign with BSM (default)
const { signedTx } = sigma.sign(privateKey);

// Or sign with BRC-77
const { signedTx: signedTx2 } = sigma.sign(privateKey, Algorithm.BRC77);

// Verify
const isValid = sigma.verify();
```

### Multiple Signatures

```typescript
// First signature (user)
const sigma1 = new Sigma(tx, 0, 0);
const { signedTx } = sigma1.sign(userKey);

// Second signature (platform) on same output
const sigma2 = new Sigma(signedTx, 0, 1);
sigma2.sign(platformKey, Algorithm.BRC77);

// Verify each
sigma2.setSigmaInstance(0);
sigma2.verify(); // User signature

sigma2.setSigmaInstance(1);
sigma2.verify(); // Platform signature
```

### Sigma Message Hash

Sigma combines:
1. **Input Hash**: SHA256 of outpoint (txid + vout index)
2. **Data Hash**: SHA256 of script data before SIGMA marker

```typescript
const inputHash = sigma.getInputHash();
const dataHash = sigma.getDataHash();
const messageHash = sigma.getMessageHash(); // SHA256(inputHash + dataHash)
```

## Algorithm Comparison

| Feature | BSM | BRC-77 | Sigma |
|---------|-----|--------|-------|
| Signing key | Direct | Derived child | Direct or BRC-77 |
| Recovery | From signature | Embedded pubkey | Depends on algo |
| Private verify | No | Yes | No |
| Tx-bound | No | No | Yes |
| Multi-sig | Manual | Manual | Built-in |
| SDK import | `BSM` | `SignedMessage` | `sigma-protocol` |

## Template Locations

Script templates for these protocols in `@opl/templates`:

| Template | Location | Purpose |
|----------|----------|---------|
| Sigma | `src/template/bitcom/Sigma.ts` | Parse/create Sigma scripts |
| AIP | `src/template/bitcom/AIP.ts` | Author Identity Protocol |
| BitCom | `src/template/bitcom/BitCom.ts` | Base OP_RETURN parsing |

## Additional Resources

### Reference Files

- **`references/brc-77-spec.md`** - Full BRC-77 specification
- **`references/sigma-advanced.md`** - Advanced Sigma patterns

### Examples

- **`examples/bsm-sign-verify.ts`** - Complete BSM example
- **`examples/brc77-private-sig.ts`** - BRC-77 private signature
- **`examples/sigma-multi-sig.ts`** - Sigma multi-signature
