# PRD: decode-bsv-transaction

## Objective
Decode BSV transaction hex into human-readable format showing inputs, outputs, and scripts.

## Dependencies (USE THESE - NOT ALTERNATIVES)
- **@bsv/sdk** - Transaction parsing: `Transaction`
  - Docs: https://github.com/bsv-blockchain/ts-sdk
- **WhatsOnChain API** - Transaction lookup by txid
  - Endpoint: `https://api.whatsonchain.com/v1/bsv/main/tx/{txid}`

## NOT in scope
- Transaction creation/signing
- Broadcasting transactions
- Script execution

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/decode-bsv-transaction/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/decode-bsv-transaction/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/decode-bsv-transaction/scripts/*.test.ts`

If tests regress (more failures after than before), REVERT and try again.

---

## COMPLETION CRITERIA (ALL MUST PASS)

Run these commands IN ORDER. ALL must succeed:

```bash
# 1. ALL tests pass (0 failures)
bun test skills/decode-bsv-transaction/scripts/*.test.ts

# 2. Help command works (exit 0)
bun run skills/decode-bsv-transaction/scripts/decode.ts --help

# 3. Error handling works (exit non-zero for invalid input)
bun run skills/decode-bsv-transaction/scripts/decode.ts "invalid-hex"
```

### Completion Promise
Output `<promise>DONE</promise>` ONLY when:
- ALL tests pass (verified by running them, not by "thinking" they pass)
- Help commands exit 0 (verified by running them)
- Error cases handled (verified by running them)

---

## FUNCTIONAL REQUIREMENTS

### decode.ts
1. Accept tx hex as positional argument: `decode.ts <tx-hex>`
2. Accept txid with --txid flag: `decode.ts --txid <txid>` (fetches from WoC)
3. Support `--help` flag (exit 0, show usage)
4. Support `--json` flag for machine-readable output
5. Parse transaction and display:
   - Version
   - Input count and details (txid, vout, script)
   - Output count and details (value, script type, address if known)
   - Locktime
6. Handle errors gracefully (exit 1, show error message)

### Output Format (default)
```
Transaction Decode
Version: 1
Inputs: 2
  [0] txid:vout - P2PKH unlock
  [1] txid:vout - P2PKH unlock
Outputs: 2
  [0] 0.001 BSV - P2PKH to 1Address...
  [1] 0.0005 BSV - OP_RETURN (data)
Locktime: 0
Size: 226 bytes
```

### Output Format (--json)
```json
{
  "version": 1,
  "inputs": [...],
  "outputs": [...],
  "locktime": 0,
  "size": 226
}
```

## ERROR HANDLING
- Invalid hex → "Error: Invalid transaction hex", exit 1
- Invalid txid format → "Error: Invalid txid format", exit 1
- Txid not found → "Error: Transaction not found", exit 1
- No input provided → show usage, exit 1

## FILE STRUCTURE
```
skills/decode-bsv-transaction/
├── SKILL.md              # Documentation
├── PRD.md                # This file
├── progress.txt          # Ralph's memory
└── scripts/
    ├── decode.ts         # Main script
    └── decode.test.ts    # Tests
```

## DO NOT
- Output DONE if tests fail
- Skip running tests after changes
- Trust previous results (always re-verify)
- Use emojis in output
