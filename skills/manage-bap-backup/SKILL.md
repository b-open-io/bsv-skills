---
name: manage-bap-backup
description: This skill should be used when the user asks to "export BAP identity", "import BAP backup", "view BAP backup", "manage BAP backup", "backup BAP identity", or needs to work with BAP identity backup files using the bap CLI.
---

# Manage BAP Backup

Export and import BAP identity backups using the `bsv-bap` library.

## Installation

```bash
bun add bsv-bap @bsv/sdk
```

## Backup Format

Contains everything needed to reconstruct all identities:

```json
{
  "rootPk": "L4vB5...",        // Master key WIF (Type42) or xprv (BIP32)
  "ids": "<encrypted string>", // All identity metadata, encrypted with master
  "label": "optional",
  "createdAt": "2026-03-13T..."
}
```

The encrypted `ids` blob contains: name, description, identityKey (BAP ID), identityAttributes, and paths.

## Export Master Backup

```typescript
import { BAP } from "bsv-bap";

const bap = new BAP({ rootPk: storedWif });
bap.importIds(encryptedIds);

const backup = bap.exportForBackup("My Identity");
// { rootPk: "L1SJ...", ids: "QklFMQ...", createdAt: "..." }

import { writeFileSync } from "node:fs";
writeFileSync("backup.json", JSON.stringify(backup, null, 2));
```

## Import Master Backup

```typescript
import { BAP } from "bsv-bap";
import { readFileSync } from "node:fs";

const backup = JSON.parse(readFileSync("backup.json", "utf-8"));
const bap = new BAP({ rootPk: backup.rootPk });
if (backup.ids) {
  bap.importIds(backup.ids);
}

const idKeys = bap.listIds();
const identity = bap.getId(idKeys[0]);
console.log(identity.idName, identity.getIdentityKey());
```

## List Accounts

```typescript
const idKeys = bap.listIds();

for (const key of idKeys) {
  const identity = bap.getId(key);
  console.log(`${identity.idName}: ${key}`);
  console.log(`  Root: ${identity.rootAddress}`);
  console.log(`  Current: ${identity.getCurrentAddress()}`);
}
```

## Encrypted Backups (.bep)

For encrypted backup files using AES-256-GCM, use the `bitcoin-backup` CLI:

```bash
bun add -g bitcoin-backup

# Encrypt a backup
bbackup enc backup.json -p "password" -o identity.bep

# Decrypt a backup
bbackup dec identity.bep -p "password" -o decrypted.json
```

See **`encrypt-decrypt-backup`** skill for full bitcoin-backup reference.

## CLI Option

For quick operations, use the `bap` CLI:

```bash
bun add -g bsv-bap

bap export              # Export identity JSON to stdout
bap export > backup.json
bap import backup.json  # Import from file
bap info                # View current identity
```

### Secure Enclave Protection (macOS arm64)

On macOS arm64, the BAP CLI can protect the master key with the Secure Enclave via `@1sat/vault`. When Touch ID protection is enabled (`bap touchid enable`), the `rootPk` is encrypted with a hardware-bound P-256 key and removed from disk. All backup/export operations that need the master key will trigger Touch ID. Use `bap touchid status` to check protection state. Set `BAP_NO_TOUCHID=1` for headless/CI environments.

## Master vs Member Backups

BAP supports two backup levels with different capabilities:

| Backup Type | Contains | Can Derive New IDs? | Use Case |
|-------------|----------|-------------------|----------|
| **Master** | rootPk (Type42) or xprv (legacy) + ids | Yes | Full identity management, key rotation |
| **Member** | Single derived WIF + encrypted identity data | No | Delegated access, agent auth, app-scoped signing |

### Member Backup Export

`exportMemberBackup()` produces a `MemberIdentity` with:
- `derivedPrivateKey` — the stable member key WIF (from rootPath, never changes)
- `address` — the current signing address (changes on rotation)
- `counter` — rotation counter for the signing key derivation
- `identityKey` — the BAP identity key

### Stable Member Key

The member key is the **stable identity anchor** for authentication:

```typescript
import { getStableMemberWif, getStableMemberPubkey } from "./bap/utils";

// These stay fixed even after key rotation
const wif = getStableMemberWif(identity);    // For auth token signing
const pubkey = getStableMemberPubkey(identity); // For identity resolution
```

Auth tokens (bitcoin-auth) are signed with the stable member WIF, not the rotating signing key. This ensures identity continuity across rotations.

## Related Skills

- **`create-bap-identity`** - Create new BAP identities
- **`encrypt-decrypt-backup`** - bitcoin-backup CLI for .bep files
- **`key-derivation`** - Type42 and BRC-43 key derivation

## Related

BAP identities can be used for OAuth authentication with Sigma Identity. See `@sigma-auth/better-auth-plugin` for integration patterns.
