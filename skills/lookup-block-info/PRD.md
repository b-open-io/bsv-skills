# PRD: lookup-block-info

## Objective
Retrieve block information from the BSV blockchain by height or hash.

## Dependencies (USE THESE - NOT ALTERNATIVES)
- **WhatsOnChain API** - Block data
  - By height: `GET https://api.whatsonchain.com/v1/bsv/main/block/height/{height}`
  - By hash: `GET https://api.whatsonchain.com/v1/bsv/main/block/hash/{hash}`
  - Docs: https://docs.whatsonchain.com

## NOT in scope
- 1Sat Ordinals (different plugin)
- Transaction details within blocks
- Block creation/mining

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/lookup-block-info/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/lookup-block-info/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/lookup-block-info/scripts/*.test.ts`

If tests regress (more failures after than before), REVERT and try again.

---

## COMPLETION CRITERIA (ALL MUST PASS)

Run these commands IN ORDER. ALL must succeed:

```bash
# 1. ALL tests pass (0 failures)
bun test skills/lookup-block-info/scripts/*.test.ts

# 2. Help command works (exit 0)
bun run skills/lookup-block-info/scripts/lookup.ts --help

# 3. Error handling works (exit non-zero for invalid input)
bun run skills/lookup-block-info/scripts/lookup.ts --height -1
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
echo "=== Baseline ===" >> skills/lookup-block-info/progress.txt
bun test skills/lookup-block-info/scripts/*.test.ts 2>&1 | tail -5 >> skills/lookup-block-info/progress.txt
```

### Step 2: Read existing code
```bash
cat skills/lookup-block-info/scripts/lookup.ts
cat skills/lookup-block-info/scripts/lookup.test.ts
```

### Step 3: Implement/Fix
- Make ONE focused change at a time
- Run tests IMMEDIATELY after each change
- If tests regress, revert the change

### Step 4: Verify after EACH change
```bash
bun test skills/lookup-block-info/scripts/*.test.ts
```

### Step 5: Final verification (all criteria)
```bash
# Run ALL completion criteria commands
bun test skills/lookup-block-info/scripts/*.test.ts
bun run skills/lookup-block-info/scripts/lookup.ts --help && echo "HELP_OK"
bun run skills/lookup-block-info/scripts/lookup.ts --height -1 2>&1 | grep -qi "error" && echo "ERROR_HANDLING_OK"
```

### Step 6: Update progress.txt with results

### Step 7: Check completion
If ALL Step 5 commands show success, output `<promise>DONE</promise>`.
If ANY fail, continue loop.

---

## FUNCTIONAL REQUIREMENTS

### lookup.ts
1. Accept CLI args: `--height <number>` OR `--hash <block-hash>`
2. Validate input:
   - Height must be non-negative integer
   - Hash must be 64 hex characters
3. Fetch block data from WhatsOnChain API
4. Display block information:
   - Hash
   - Height
   - Timestamp (human-readable)
   - Size
   - Transaction count
   - Merkle root
   - Previous block hash
   - Difficulty
5. Support `--help` flag (exit 0, show usage)
6. Support `--json` flag for machine-readable output
7. Handle errors gracefully (exit 1, show error message)

### Output Format (default)
```
Block #800000
Hash: 00000000000000000320e...
Time: 2023-07-24 12:34:56 UTC
Size: 1,234,567 bytes
Transactions: 5,432
Merkle Root: abc123...
Previous: 00000000000000000319f...
Difficulty: 123,456,789,012
```

### Output Format (--json)
```json
{
  "height": 800000,
  "hash": "00000000000000000320e...",
  "time": 1690199696,
  "size": 1234567,
  "txCount": 5432,
  "merkleRoot": "abc123...",
  "previousHash": "00000000000000000319f...",
  "difficulty": 123456789012
}
```

## ERROR HANDLING
- Invalid height → "Error: Height must be non-negative integer", exit 1
- Invalid hash → "Error: Hash must be 64 hex characters", exit 1
- Block not found → "Error: Block not found", exit 1
- Network error → "Error: API request failed: <reason>", exit 1
- Missing required args → show usage, exit 1

## FILE STRUCTURE
```
skills/lookup-block-info/
├── SKILL.md              # Documentation (update when done)
├── PRD.md                # This file
├── progress.txt          # Ralph's memory (append each iteration)
└── scripts/
    ├── lookup.ts         # Main script
    └── lookup.test.ts    # Tests
```

## DO NOT
- Output DONE if tests fail
- Skip running tests after changes
- Trust previous results (always re-verify)
- Make multiple changes without testing between them
- Make real API calls in tests (mock them)
