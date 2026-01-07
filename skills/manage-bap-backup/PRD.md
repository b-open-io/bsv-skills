# PRD: manage-bap-backup

## Objective
Implement BAP backup management scripts for listing and exporting identities.

## Dependencies (USE THESE)
- **bitcoin-backup** - Backup encryption/decryption CLI
  - `bbackup decrypt` for decrypting .bep files
- **bap** CLI - BAP identity operations
  - `bap export` for exporting identities
- **Node.js fs** - File operations

## Flow Convention
Uses Flow's BSV operations directory:
```
~/.flow/.bsv/
├── backups/         # Encrypted .bep backup files
├── temp/            # Temporary decrypted files
└── config.json      # Backup registry
```

## NOT in scope
- 1Sat Ordinals (different plugin)
- Creating new backups (use encrypt-decrypt-backup)
- BAP identity creation (separate skill)

## Completion Promise
Output `<promise>DONE</promise>` ONLY when ALL of these are TRUE:

1. `bun test skills/manage-bap-backup/scripts/*.test.ts` - ALL tests pass
2. `bun run skills/manage-bap-backup/scripts/list.ts --help` - Exits 0
3. `bun run skills/manage-bap-backup/scripts/export-member.ts --help` - Exits 0
4. list.ts handles missing config gracefully
5. SKILL.md accurately describes the implementation

DO NOT output the promise if tests fail. DO NOT lie.

## Process Steps (MANDATORY)

### Step 1: Read existing code
```bash
cat skills/manage-bap-backup/scripts/list.ts
cat skills/manage-bap-backup/scripts/export-member.ts
cat skills/manage-bap-backup/scripts/*.test.ts
```

### Step 2: Run tests
```bash
bun test skills/manage-bap-backup/scripts/*.test.ts
```

### Step 3: Implement/fix
- Fix any failing tests
- Ensure --help works
- Ensure graceful error handling

### Step 4: Verify ALL criteria
```bash
bun test skills/manage-bap-backup/scripts/*.test.ts
bun run skills/manage-bap-backup/scripts/list.ts --help
bun run skills/manage-bap-backup/scripts/export-member.ts --help
```

### Step 5: Update progress.txt

### Step 6: Check completion
If ALL Step 4 succeeds, output `<promise>DONE</promise>`.

## Functional Requirements

### list.ts
1. Read `~/.flow/.bsv/config.json`
2. Parse backups array
3. Display formatted table:
   - ID (short)
   - Name
   - Type (bap, wif, ordinals, vault)
   - Created date
   - File path
4. Handle missing config file → "No config found"
5. Handle empty backups → "No backups found"

### export-member.ts
1. Accept: `<backup-id> <output-path>`
2. Find backup in config by ID
3. Decrypt backup using `bbackup decrypt`
4. Call `bap export <identity-file>`
5. Save to output path
6. Clean up temp files
7. Report success/failure

### config.json Structure
```json
{
  "backups": [
    {
      "id": "unique-id",
      "name": "My Identity",
      "type": "bap",
      "path": "~/.flow/.bsv/backups/backup.bep",
      "created": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Error Handling
- Missing config → graceful message
- Unknown backup ID → clear error
- Decryption failure → show error
- Missing passphrase env → prompt user

## Environment
- `BACKUP_PASSPHRASE` - For decryption (optional, prompts if missing)

## File Structure
```
skills/manage-bap-backup/
├── SKILL.md
├── PRD.md
├── progress.txt
└── scripts/
    ├── list.ts
    ├── export-member.ts
    ├── list.test.ts
    └── export-member.test.ts
```

## Do NOT
- Store passphrases in code
- Leave decrypted files in temp
- Skip config validation
- Output DONE if tests fail
