---
name: create-bap-identity
description: This skill should be used when the user asks to "create BAP identity", "new BAP", "Type42 identity", "Legacy BAP identity", "generate BAP", "set up BAP identity", "initialize BAP", or needs to create Bitcoin Attestation Protocol identities using the bap CLI.
---

# Create BAP Identity

Create new BAP (Bitcoin Attestation Protocol) identities using the `bap` CLI from the `bsv-bap` npm package.

## Installation

```bash
npm install -g bsv-bap
```

## CLI Commands

```bash
bap create [--name <name>] [--wif <wif>]  # Create new identity
bap sign <message>                         # Sign a message
bap verify <message> <sig> <address>       # Verify signature
bap info                                   # Show identity info
bap export                                 # Export identity backup (JSON)
bap import <file>                          # Import identity from backup
bap friend-pubkey <friendBapId>            # Get friend encryption pubkey
bap encrypt <data> <friendBapId>           # Encrypt for friend
bap decrypt <ciphertext> <friendBapId>     # Decrypt from friend
bap help                                   # Show help
```

## Creating an Identity

```bash
# Create with default name
bap create

# Create with custom name
bap create --name "Alice Smith"

# Create from existing WIF
bap create --wif L1SJx4SfhuGkZHwjgYatQfe2yn8iqHpenvHxsDt9Vnsz7wMT8FqG
```

Output:
```
Identity created successfully!
  Name: Alice Smith
  Identity Key: 3U7uEgJAiQytNd536RWoWE5Vv3W9
  Root Address: 171M3ycsSRdxhCSRa27bgowupjU75LeCQq
  Signing Address: 1Hn5SfmbeFAPBDXnVCWo1aMaY4uFnCCujW

Stored at: ~/.bap/identity.json
```

## Storage Location

Identity data stored at `~/.bap/identity.json`:
- Root WIF (private key)
- Encrypted identity data
- Creation timestamp

## Key Derivation

The CLI uses Type42 (BRC-42) key derivation with BRC-43 invoice numbers:

| Purpose | Invoice Number | Security Level |
|---------|---------------|----------------|
| Signing key | `1-bap-identity` | 1 (public protocol) |
| Friend encryption | `2-friend-{sha256(friendBapId)}` | 2 (user-approved) |

## Signing Messages

```bash
# Sign a message
bap sign "Hello World"
# Output: {"message":"Hello World","address":"1Hn5...","signature":"H4mX..."}

# Verify a signature
bap verify "Hello World" "H4mX..." "1Hn5..."
# Output: {"valid":true,"message":"Hello World",...}
```

## Friend Encryption

Derive friend-specific encryption keys using BRC-43 format:

```bash
# Get encryption pubkey for a friend (share this in friend requests)
bap friend-pubkey "friend-bap-id-here"

# Encrypt data for friend
bap encrypt "secret message" "friend-bap-id-here"

# Decrypt data from friend
bap decrypt "QklFMQ..." "friend-bap-id-here"
```

## Export/Import

```bash
# Export identity backup (JSON to stdout)
bap export > backup.json

# Import identity from backup
bap import backup.json
```

## Programmatic Usage

For programmatic identity management, use the `bsv-bap` library directly:

```typescript
import { BAP, MemberID } from "bsv-bap";
import { PrivateKey } from "@bsv/sdk";

// Create BAP instance
const privateKey = PrivateKey.fromRandom();
const bap = new BAP({ rootPk: privateKey.toWif() });

// Create identity
const identity = bap.newId("Alice Smith");

// Sign message
const { address, signature } = identity.signMessage([...messageBytes]);

// Friend encryption
const friendPubKey = identity.getEncryptionPublicKeyWithSeed(friendBapId);
const ciphertext = identity.encryptWithSeed(data, friendBapId);
const plaintext = identity.decryptWithSeed(ciphertext, friendBapId);
```

## Next Steps

After creating an identity:
1. Use `bap sign` for message authentication
2. Use `bap friend-pubkey` to share encryption keys in friend requests
3. Publish identity to blockchain for on-chain reputation
4. Integrate with Sigma Identity for OAuth authentication (`@sigma-auth/better-auth-plugin`)

## Related Skills

- **`key-derivation`** - Type42 and BRC-43 key derivation patterns
- **`message-signing`** - BSM, BRC-77, and Sigma signing protocols
- **`encrypt-decrypt-backup`** - bitcoin-backup CLI for .bep encrypted backups
