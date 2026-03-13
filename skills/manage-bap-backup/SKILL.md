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

The encrypted `id` blob contains: name, description, identityKey (BAP ID), identityAttributes, and counter (current rotation index for deriving the BRC-100 wallet root).

The `wif` is the member key — it defines the BAP ID and root address permanently. From it, the current BRC-100 wallet root is derived via Type42: `memberKey.deriveChild(pub, "bap:{counter}")`. See `key-derivation` skill's `bap-derivation` reference for the full hierarchy.

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
npm install -g bsv-bap

bap export              # Export identity JSON to stdout
bap export > backup.json
bap import backup.json  # Import from file
bap info                # View current identity
```

## Related Skills

- **`create-bap-identity`** - Create new BAP identities
- **`encrypt-decrypt-backup`** - bitcoin-backup CLI for .bep files
- **`key-derivation`** - Type42 and BRC-43 key derivation

## Related

BAP identities can be used for OAuth authentication with Sigma Identity. See `@sigma-auth/better-auth-plugin` for integration patterns.
