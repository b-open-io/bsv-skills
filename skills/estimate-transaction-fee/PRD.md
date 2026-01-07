# PRD: estimate-transaction-fee

## Objective
Estimate transaction fees for BSV transactions based on size and current fee rates.

## Dependencies (USE THESE - NOT ALTERNATIVES)
- **@bsv/sdk** - Transaction building: `Transaction`
  - Docs: https://github.com/bsv-blockchain/ts-sdk
- **WhatsOnChain API** - Fee rate data
  - Docs: https://docs.whatsonchain.com

## NOT in scope
- 1Sat Ordinals (different plugin)
- Transaction creation (fee estimation only)
- Historical fee analysis

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/estimate-transaction-fee/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/estimate-transaction-fee/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/estimate-transaction-fee/scripts/*.test.ts`

If tests regress (more failures after than before), REVERT and try again.

---

## COMPLETION CRITERIA (ALL MUST PASS)

Run these commands IN ORDER. ALL must succeed:

```bash
# 1. ALL tests pass (0 failures)
bun test skills/estimate-transaction-fee/scripts/*.test.ts

# 2. Help command works (exit 0)
bun run skills/estimate-transaction-fee/scripts/estimate.ts --help

# 3. Error handling works (exit non-zero for invalid input)
bun run skills/estimate-transaction-fee/scripts/estimate.ts --size -100
```

### Completion Promise
Output `<promise>DONE</promise>` ONLY when:
- ALL tests pass (verified by running them, not by "thinking" they pass)
- Help commands exit 0 (verified by running them)
- Error cases handled (verified by running them)

**DO NOT** output the promise based on:
- "I believe the tests pass"
- "The code looks correct"
- Previous iteration results (tests can regress!)

---

## VERIFICATION SEQUENCE (Step-by-Step)

### Step 1: Establish baseline
```bash
echo "=== Baseline ===" >> skills/estimate-transaction-fee/progress.txt
bun test skills/estimate-transaction-fee/scripts/*.test.ts 2>&1 | tail -5 >> skills/estimate-transaction-fee/progress.txt
```

### Step 2: Read existing code
```bash
cat skills/estimate-transaction-fee/scripts/estimate.ts
cat skills/estimate-transaction-fee/scripts/estimate.test.ts
```

### Step 3: Implement/Fix
- Make ONE focused change at a time
- Run tests IMMEDIATELY after each change
- If tests regress, revert the change

### Step 4: Verify after EACH change
```bash
bun test skills/estimate-transaction-fee/scripts/*.test.ts
```

### Step 5: Final verification (all criteria)
```bash
# Run ALL completion criteria commands
bun test skills/estimate-transaction-fee/scripts/*.test.ts
bun run skills/estimate-transaction-fee/scripts/estimate.ts --help && echo "HELP_OK"
bun run skills/estimate-transaction-fee/scripts/estimate.ts --size -100 2>&1 | grep -qi "error" && echo "ERROR_HANDLING_OK"
```

### Step 6: Update progress.txt with results

### Step 7: Check completion
If ALL Step 5 commands show success, output `<promise>DONE</promise>`.
If ANY fail, continue loop.

---

## FUNCTIONAL REQUIREMENTS

### estimate.ts
1. Accept CLI args:
   - `--size <bytes>` - Estimate fee for given transaction size
   - `--tx <hex>` - Calculate size and estimate fee for raw tx hex
   - `--inputs <n>` - Estimate size based on input count
   - `--outputs <n>` - Estimate size based on output count
   - `--rate <sat/byte>` - Override fee rate (default: 1 sat/byte)
2. Size estimation formulas:
   - Base: 10 bytes (version + locktime)
   - Per P2PKH input: ~148 bytes
   - Per P2PKH output: ~34 bytes
   - Actual: parse tx hex if provided
3. Fee calculation: `fee = size * rate`
4. Display:
   - Estimated/actual size in bytes
   - Fee rate used (sat/byte)
   - Estimated fee in satoshis
   - Estimated fee in BSV
5. Support `--help` flag (exit 0, show usage)
6. Support `--json` flag for machine-readable output
7. Handle errors gracefully (exit 1, show error message)

### Size Estimation Reference
```
P2PKH Transaction Structure:
- Version: 4 bytes
- Input count: 1-9 bytes (varint)
- Per input:
  - Previous txid: 32 bytes
  - Previous vout: 4 bytes
  - Script length: 1-9 bytes (varint)
  - Signature script: ~107 bytes (sig + pubkey)
  - Sequence: 4 bytes
  = ~148 bytes per input
- Output count: 1-9 bytes (varint)
- Per output:
  - Value: 8 bytes
  - Script length: 1-9 bytes (varint)
  - Locking script: ~25 bytes (P2PKH)
  = ~34 bytes per output
- Locktime: 4 bytes
```

### Output Format (default)
```
Fee Estimation
==============
Size: 226 bytes
Rate: 1 sat/byte
Fee: 226 satoshis (0.00000226 BSV)
Breakdown:
  - Inputs (1): ~148 bytes
  - Outputs (2): ~68 bytes
  - Overhead: ~10 bytes
```

### Output Format (--json)
```json
{
  "size": 226,
  "rate": 1,
  "fee": 226,
  "feeBsv": 0.00000226,
  "inputs": 1,
  "outputs": 2
}
```

## ERROR HANDLING
- Invalid size → "Error: Size must be positive integer", exit 1
- Invalid tx hex → "Error: Invalid transaction hex", exit 1
- Negative rate → "Error: Rate must be positive", exit 1
- Missing required args → show usage, exit 1

## FILE STRUCTURE
```
skills/estimate-transaction-fee/
├── SKILL.md              # Documentation (update when done)
├── PRD.md                # This file
├── progress.txt          # Ralph's memory (append each iteration)
└── scripts/
    ├── estimate.ts       # Main script
    └── estimate.test.ts  # Tests
```

## DO NOT
- Output DONE if tests fail
- Skip running tests after changes
- Trust previous results (always re-verify)
- Make multiple changes without testing between them
- Round fees down (always round up for safety)
