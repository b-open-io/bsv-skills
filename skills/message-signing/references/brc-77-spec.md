# BRC-77 Message Signing Specification

Full specification for the BRC-77 message signing protocol.

## Overview

BRC-77 addresses limitations in Bitcoin Signed Messages (BSM) by implementing unique signing keys per message using BRC-42 key derivation and BRC-43 invoice numbering.

## Key Benefits

1. **Unique Keys**: Each message uses a new signing key
2. **No Spending Risk**: Derived keys cannot spend coins locked to parent keys
3. **Private Verification**: Optional signatures verifiable only by specific parties
4. **Key Derivation**: Leverages BRC-42 for secure child key generation

## Signature Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Version (4 bytes)      │ 42423301 (hex)                     │
├─────────────────────────────────────────────────────────────┤
│ Sender Public Key      │ 33 bytes (compressed)              │
├─────────────────────────────────────────────────────────────┤
│ Verifier               │ 0x00 (anyone) OR 33 bytes (pubkey) │
├─────────────────────────────────────────────────────────────┤
│ Key ID                 │ 32 bytes (random)                  │
├─────────────────────────────────────────────────────────────┤
│ DER Signature          │ Variable length                    │
└─────────────────────────────────────────────────────────────┘
```

## Signing Process

1. Generate random 256-bit key ID
2. Compute invoice number: `2-message signing-${base64(keyID)}`
3. Derive child private key using BRC-42: `signer.deriveChild(verifier, invoiceNumber)`
4. Create ECDSA signature over message with derived key
5. Serialize: version + senderPubKey + verifier + keyID + signature

## Verification Process

1. Deserialize signature structure
2. Extract sender public key and key ID
3. Compute invoice number from key ID
4. If verifier is `0x00`, use anyone-can-verify key (private key = 1)
5. Otherwise, recipient must provide their private key
6. Derive verification key: `senderPubKey.deriveChild(recipient, invoiceNumber)`
7. Verify ECDSA signature with derived public key

## SDK Implementation

```typescript
// SignedMessage.sign implementation (simplified)
export const sign = (message, signer, verifier?) => {
  const recipientAnyone = typeof verifier !== 'object';
  if (recipientAnyone) {
    // Anyone can verify: use public key for private key = 1
    verifier = new PublicKey(curve.g.mul(new PrivateKey(1)));
  }

  const keyID = Random(32);
  const invoiceNumber = `2-message signing-${toBase64(keyID)}`;
  const signingKey = signer.deriveChild(verifier, invoiceNumber);
  const signature = signingKey.sign(message).toDER();

  return [
    ...VERSION,
    ...signer.toPublicKey().encode(true),
    ...(recipientAnyone ? [0] : verifier.encode(true)),
    ...keyID,
    ...signature
  ];
};
```

## Security Properties

### Forward Secrecy
Each message uses a unique derived key. Compromising one signature does not compromise others.

### Key Isolation
Derived signing keys cannot spend coins locked to the parent key's address.

### Private Signatures
When a specific verifier is provided, only that party can verify the signature. The signature is bound to the verifier's public key through key derivation.

## Comparison with BSM

| Property | BSM | BRC-77 |
|----------|-----|--------|
| Key per message | Same | Unique derived |
| Message prefix | "Bitcoin signed message" | None |
| Recovery | From compact sig | Embedded in sig |
| Private verify | No | Yes |
| Signature size | 65 bytes | ~105+ bytes |

## Use Cases

### Public Authentication
```typescript
// Anyone can verify this signature
const sig = SignedMessage.sign(message, privateKey);
const valid = SignedMessage.verify(message, sig);
```

### Private Messages
```typescript
// Only recipient can verify
const sig = SignedMessage.sign(message, sender, recipientPubKey);
const valid = SignedMessage.verify(message, sig, recipientPrivKey);
```

### Timestamped Signatures
The random key ID provides implicit timestamp entropy. Combined with blockchain anchoring, this proves message existence at a point in time.

## Related BRCs

- **BRC-3**: Digital signature creation and verification
- **BRC-42**: Key derivation scheme
- **BRC-43**: Invoice numbering for security levels
- **BRC-77**: This specification
