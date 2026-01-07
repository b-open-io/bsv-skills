# PRD: wallet-brc100

## Objective
Provide BRC-100 conforming wallet operations using @bsv/wallet-toolbox and @bsv/sdk.

## Dependencies (USE THESE - NOT ALTERNATIVES)
- **@bsv/wallet-toolbox** - BRC-100 wallet implementation
  - Docs: https://bsv-blockchain.github.io/wallet-toolbox
- **@bsv/sdk** - Core BSV primitives
  - Docs: https://bsv-blockchain.github.io/ts-sdk

## NOT in scope
- Token protocols (1Sat, BRC-20, etc)
- Identity/BAP operations
- Mining operations

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/wallet-brc100/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/wallet-brc100/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/wallet-brc100/scripts/*.test.ts`

If tests regress, REVERT and try again.

---

## COMPLETION CRITERIA (ALL MUST PASS)

```bash
# 1. ALL tests pass
bun test skills/wallet-brc100/scripts/*.test.ts

# 2. Help commands work (exit 0)
bun run skills/wallet-brc100/scripts/create-wallet.ts --help
bun run skills/wallet-brc100/scripts/get-balance.ts --help
bun run skills/wallet-brc100/scripts/create-action.ts --help

# 3. Error handling works (exit non-zero)
bun run skills/wallet-brc100/scripts/get-balance.ts --invalid
```

---

## FUNCTIONAL REQUIREMENTS

### create-wallet.ts
Create a BRC-100 conforming wallet instance.

```bash
bun run create-wallet.ts --chain main|test --storage sqlite|memory [--db-path ./wallet.db]
```

Output wallet identity key and storage info.

### get-balance.ts
Get wallet balance using BRC-100 wallet interface.

```bash
bun run get-balance.ts --wallet <identity-key> [--json]
```

### create-action.ts
Create a BRC-100 compliant action (transaction).

```bash
bun run create-action.ts --wallet <identity-key> --to <address> --satoshis <amount> [--description "Payment"]
```

### list-outputs.ts
List wallet outputs (UTXOs) using BRC-100 interface.

```bash
bun run list-outputs.ts --wallet <identity-key> [--spendable] [--json]
```

## Output Formats

### Default (human-readable)
```
Wallet: <identity-key>
Balance: 1000000 satoshis (0.01 BSV)
Chain: main
```

### JSON (--json flag)
```json
{
  "identityKey": "02...",
  "balance": 1000000,
  "chain": "main"
}
```

## ERROR HANDLING
- Invalid wallet key → "Error: Invalid wallet identity key", exit 1
- No wallet found → "Error: Wallet not found", exit 1
- Invalid parameters → show usage, exit 1

## FILE STRUCTURE
```
skills/wallet-brc100/
├── SKILL.md              # Comprehensive BRC-100 docs (keep existing)
├── PRD.md                # This file
├── progress.txt          # Ralph's memory
└── scripts/
    ├── create-wallet.ts
    ├── get-balance.ts
    ├── create-action.ts
    ├── list-outputs.ts
    └── wallet.test.ts
```

## DO NOT
- Output DONE if tests fail
- Skip running tests after changes
- Implement token protocols (not BRC-100)
