---
name: wallet-encrypt-decrypt
description: This skill should be used when the user asks to "encrypt message with BSV key", "decrypt with private key", "ECDH encryption", "AES-256-GCM BSV", or needs to encrypt/decrypt data using BSV keys and @bsv/sdk.
allowed-tools: "Bash(bun:*)"
---

# Wallet Encrypt/Decrypt

Encrypt and decrypt messages using BSV keys (ECDH + AES-256-GCM).

## When to Use

- Encrypt messages to a recipient's public key
- Decrypt messages with your private key
- Secure communication between BSV addresses
- End-to-end encrypted messaging

## Usage

```bash
# Encrypt message to public key
bun run skills/wallet-encrypt-decrypt/scripts/encrypt-message.ts <recipient-pubkey-hex> "message"

# Decrypt message with private key (WIF)
bun run skills/wallet-encrypt-decrypt/scripts/decrypt-message.ts <private-wif> '<encrypted-json>'

# Show help
bun run skills/wallet-encrypt-decrypt/scripts/encrypt-message.ts --help
bun run skills/wallet-encrypt-decrypt/scripts/decrypt-message.ts --help
```

## Encryption Output Format

```json
{
  "ephemeralPublicKey": "02...",
  "iv": "hex-string-24-chars",
  "authTag": "hex-string-32-chars",
  "ciphertext": "hex-string"
}
```

## Encryption Method

Uses ECDH (Elliptic Curve Diffie-Hellman) + AES-256-GCM:

1. **Sender** generates ephemeral key pair
2. **Shared secret** = ephemeral private key * recipient public key
3. **AES key** derived from shared secret via SHA256
4. **Encrypt** with AES-256-GCM (random 12-byte IV)
5. **Output**: ephemeral public key + IV + auth tag + ciphertext

**Decryption**:
1. **Shared secret** = recipient private key * ephemeral public key
2. **AES key** derived same way
3. **Decrypt** and verify auth tag

## Dependencies

- `@bsv/sdk` - Key operations (PrivateKey, PublicKey)
- Node.js `crypto` - AES-256-GCM encryption

## Security

- Fresh ephemeral key per encryption
- Random 12-byte IV per encryption
- 128-bit authentication tag (tamper detection)
- SHA256 key derivation from ECDH shared secret
