# PRD: calculate-mining-difficulty

## Objective
Calculate and analyze BSV mining difficulty from block headers and targets.

## Dependencies (USE THESE - NOT ALTERNATIVES)
- **@bsv/sdk** - BigNumber operations
  - Docs: https://github.com/bsv-blockchain/ts-sdk
- **WhatsOnChain API** - Current difficulty data
  - Chain info: `GET https://api.whatsonchain.com/v1/bsv/main/chain/info`
  - Docs: https://docs.whatsonchain.com

## NOT in scope
- 1Sat Ordinals (different plugin)
- Mining pool integration
- Hash rate estimation

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/calculate-mining-difficulty/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/calculate-mining-difficulty/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/calculate-mining-difficulty/scripts/*.test.ts`

If tests regress (more failures after than before), REVERT and try again.

---

## COMPLETION CRITERIA (ALL MUST PASS)

Run these commands IN ORDER. ALL must succeed:

```bash
# 1. ALL tests pass (0 failures)
bun test skills/calculate-mining-difficulty/scripts/*.test.ts

# 2. Help command works (exit 0)
bun run skills/calculate-mining-difficulty/scripts/difficulty.ts --help

# 3. Error handling works (exit non-zero for invalid input)
bun run skills/calculate-mining-difficulty/scripts/difficulty.ts --target "invalid"
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
echo "=== Baseline ===" >> skills/calculate-mining-difficulty/progress.txt
bun test skills/calculate-mining-difficulty/scripts/*.test.ts 2>&1 | tail -5 >> skills/calculate-mining-difficulty/progress.txt
```

### Step 2: Read existing code
```bash
cat skills/calculate-mining-difficulty/scripts/difficulty.ts
cat skills/calculate-mining-difficulty/scripts/difficulty.test.ts
```

### Step 3: Implement/Fix
- Make ONE focused change at a time
- Run tests IMMEDIATELY after each change
- If tests regress, revert the change

### Step 4: Verify after EACH change
```bash
bun test skills/calculate-mining-difficulty/scripts/*.test.ts
```

### Step 5: Final verification (all criteria)
```bash
# Run ALL completion criteria commands
bun test skills/calculate-mining-difficulty/scripts/*.test.ts
bun run skills/calculate-mining-difficulty/scripts/difficulty.ts --help && echo "HELP_OK"
bun run skills/calculate-mining-difficulty/scripts/difficulty.ts --target "invalid" 2>&1 | grep -qi "error" && echo "ERROR_HANDLING_OK"
```

### Step 6: Update progress.txt with results

### Step 7: Check completion
If ALL Step 5 commands show success, output `<promise>DONE</promise>`.
If ANY fail, continue loop.

---

## FUNCTIONAL REQUIREMENTS

### difficulty.ts
1. Accept CLI args:
   - `--current` - Fetch current network difficulty
   - `--target <hex>` - Calculate difficulty from target (nBits)
   - `--bits <compact>` - Calculate from compact bits representation
2. Implement difficulty calculations:
   - target_to_difficulty = max_target / target
   - bits_to_target conversion (compact representation)
   - difficulty_to_bits reverse calculation
3. Display:
   - Difficulty value
   - Target in hex
   - Compact bits representation
   - Expected hashes to find block
4. Support `--help` flag (exit 0, show usage)
5. Support `--json` flag for machine-readable output
6. Handle errors gracefully (exit 1, show error message)

### Difficulty Math Reference
```
max_target = 0x00000000FFFF0000000000000000000000000000000000000000000000000000
difficulty = max_target / current_target

compact bits format:
- First byte: exponent
- Next 3 bytes: mantissa
- target = mantissa * 2^(8*(exponent-3))
```

### Output Format (default)
```
Mining Difficulty Analysis
==========================
Difficulty: 123,456,789,012.34
Target: 0x00000000000000000c...
Bits: 0x1a0c0ddf
Expected hashes: 5.3e23
Time estimate: ~10 minutes (at current hashrate)
```

### Output Format (--json)
```json
{
  "difficulty": 123456789012.34,
  "target": "00000000000000000c...",
  "bits": "1a0c0ddf",
  "expectedHashes": "5.3e23"
}
```

## ERROR HANDLING
- Invalid target hex → "Error: Invalid target hex", exit 1
- Invalid bits format → "Error: Invalid bits format", exit 1
- Network error → "Error: API request failed: <reason>", exit 1
- Missing required args → show usage, exit 1

## FILE STRUCTURE
```
skills/calculate-mining-difficulty/
├── SKILL.md              # Documentation (update when done)
├── PRD.md                # This file
├── progress.txt          # Ralph's memory (append each iteration)
└── scripts/
    ├── difficulty.ts     # Main script
    └── difficulty.test.ts # Tests
```

## DO NOT
- Output DONE if tests fail
- Skip running tests after changes
- Trust previous results (always re-verify)
- Use floating point for precise difficulty (use BigNumber)
- Make real API calls in tests (mock them)
