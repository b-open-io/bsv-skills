---
name: manage-bap-backup
description: This skill should be used when the user asks to "export BAP identity", "import BAP backup", "view BAP backup", "manage BAP backup", "backup BAP identity", or needs to work with BAP identity backup files using the bap CLI.
---

# Manage BAP Backup

Manage BAP identity backups using the `bap` CLI from the `bsv-bap` npm package.

## Installation

```bash
npm install -g bsv-bap
```

## CLI Commands for Backup

```bash
bap export                    # Export identity backup (JSON to stdout)
bap import <file>             # Import identity from backup file
bap info                      # View current identity info
```

## Export Identity

Export the current identity as JSON backup:

```bash
# Export to file
bap export > my-identity-backup.json

# View export (stdout)
bap export
```

Output format:
```json
{
  "ids": "QklFMQ...",
  "createdAt": "2026-01-17T02:45:04.015Z",
  "rootPk": "L1SJx4SfhuGkZHwjgYatQfe2yn8iqHpenvHxsDt9Vnsz7wMT8FqG"
}
```

## Import Identity

Import identity from a backup file:

```bash
bap import backup.json
```

Output:
```
Identity imported successfully!
  Identities: 1

Stored at: ~/.bap/identity.json
```

## View Identity Info

Check current identity status:

```bash
bap info
```

Output:
```
BAP Identity Info
  Config: ~/.bap/identity.json
  Identities: 1

  Identity: Test Identity
    Key: 3U7uEgJAiQytNd536RWoWE5Vv3W9
    Root Address: 171M3ycsSRdxhCSRa27bgowupjU75LeCQq
    Current Address: 1Hn5SfmbeFAPBDXnVCWo1aMaY4uFnCCujW
    Encryption Pubkey: 027c71c6b59a76ccbbdc3b569f8a621adeabd5c2fae0b45c6a256a7badc3ef1a65
```

## Storage Location

Identity stored at `~/.bap/identity.json`:
- Root WIF (private key)
- Encrypted identity data (ids)
- Creation timestamp

## Encrypted Backups (.bep)

For encrypted backup files using AES-256-GCM, use the `bitcoin-backup` CLI:

```bash
# Install bitcoin-backup CLI
bun add -g bitcoin-backup

# Encrypt a backup
bbackup enc my-identity.json -p "password" -o identity.bep

# Decrypt a backup
bbackup dec identity.bep -p "password" -o decrypted.json
```

See **`encrypt-decrypt-backup`** skill for full bitcoin-backup CLI reference.

## Programmatic Usage

```typescript
import { BAP } from "bsv-bap";

// Load existing identity
const bap = new BAP({ rootPk: storedWif });
bap.importIds(encryptedIds);

// Export for backup
const backup = bap.exportForBackup("My Identity");
// { ids: "...", createdAt: "...", rootPk: "..." }

// List identities
const idKeys = bap.listIds();

// Get specific identity
const identity = bap.getId(idKeys[0]);
console.log(identity.idName, identity.getIdentityKey());
```

## Related Skills

- **`create-bap-identity`** - Create new BAP identities
- **`encrypt-decrypt-backup`** - bitcoin-backup CLI for .bep encrypted files
- **`key-derivation`** - Type42 and BRC-43 key derivation

## Related

BAP identities can be used for OAuth authentication with Sigma Identity. See `@sigma-auth/better-auth-plugin` for integration patterns.
