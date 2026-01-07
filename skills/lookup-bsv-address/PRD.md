# PRD: lookup-bsv-address

## Objective
Look up BSV address information including balance, transaction history, and UTXOs.

## Dependencies (USE THESE - NOT ALTERNATIVES)
- **WhatsOnChain API** - Address endpoints
  - Balance: `https://api.whatsonchain.com/v1/bsv/main/address/{address}/balance`
  - UTXOs: `https://api.whatsonchain.com/v1/bsv/main/address/{address}/unspent`
  - History: `https://api.whatsonchain.com/v1/bsv/main/address/{address}/history`

## NOT in scope
- Address generation
- Transaction creation
- Private key operations

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/lookup-bsv-address/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/lookup-bsv-address/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/lookup-bsv-address/scripts/*.test.ts`

If tests regress (more failures after than before), REVERT and try again.

---

## COMPLETION CRITERIA (ALL MUST PASS)

Run these commands IN ORDER. ALL must succeed:

```bash
# 1. ALL tests pass (0 failures)
bun test skills/lookup-bsv-address/scripts/*.test.ts

# 2. Help command works (exit 0)
bun run skills/lookup-bsv-address/scripts/lookup.ts --help

# 3. Error handling works (exit non-zero for invalid input)
bun run skills/lookup-bsv-address/scripts/lookup.ts "invalid-address"
```

### Completion Promise
Output `<promise>DONE</promise>` ONLY when:
- ALL tests pass (verified by running them, not by "thinking" they pass)
- Help commands exit 0 (verified by running them)
- Error cases handled (verified by running them)

---

## FUNCTIONAL REQUIREMENTS

### lookup.ts
1. Accept address as positional argument: `lookup.ts <address>`
2. Support `--help` flag (exit 0, show usage)
3. Support `--json` flag for machine-readable output
4. Support `--utxos` flag to include UTXO details
5. Support `--history` flag to include transaction history
6. Validate address format (1... or 3... prefixes, correct length)
7. Display:
   - Confirmed balance
   - Unconfirmed balance (if any)
   - Transaction count
   - UTXOs (with --utxos)
   - Recent transactions (with --history)
8. Handle errors gracefully (exit 1, show error message)

### Output Format (default)
```
Address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
Balance: 68.73841168 BSV (confirmed)
         0.00000000 BSV (unconfirmed)
Transactions: 3,393
```

### Output Format (--json)
```json
{
  "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "balance": {
    "confirmed": 6873841168,
    "unconfirmed": 0
  },
  "txCount": 3393
}
```

## ERROR HANDLING
- Invalid address format → "Error: Invalid BSV address format", exit 1
- Address not found/no history → Show zero balance (not an error)
- Network error → "Error: API request failed: <reason>", exit 1
- No address provided → show usage, exit 1

## FILE STRUCTURE
```
skills/lookup-bsv-address/
├── SKILL.md              # Documentation
├── PRD.md                # This file
├── progress.txt          # Ralph's memory
└── scripts/
    ├── lookup.ts         # Main script
    └── lookup.test.ts    # Tests
```

## DO NOT
- Output DONE if tests fail
- Skip running tests after changes
- Trust previous results (always re-verify)
- Use emojis in output
