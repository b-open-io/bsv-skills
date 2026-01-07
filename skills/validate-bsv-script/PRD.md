# PRD: validate-bsv-script

## Objective
Validate and analyze BSV locking/unlocking scripts for correctness and security.

## Dependencies (USE THESE - NOT ALTERNATIVES)
- **@bsv/sdk** - Script parsing and execution: `Script`, `Interpreter`
  - Docs: https://github.com/bsv-blockchain/ts-sdk
- **Script opcodes** - OP_CHECKSIG, OP_DUP, OP_HASH160, etc.

## NOT in scope
- 1Sat Ordinals (different plugin)
- Script creation (validation only)
- Transaction building

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/validate-bsv-script/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/validate-bsv-script/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/validate-bsv-script/scripts/*.test.ts`

If tests regress (more failures after than before), REVERT and try again.

---

## COMPLETION CRITERIA (ALL MUST PASS)

Run these commands IN ORDER. ALL must succeed:

```bash
# 1. ALL tests pass (0 failures)
bun test skills/validate-bsv-script/scripts/*.test.ts

# 2. Help command works (exit 0)
bun run skills/validate-bsv-script/scripts/validate.ts --help

# 3. Error handling works (exit non-zero for invalid input)
bun run skills/validate-bsv-script/scripts/validate.ts "invalid-hex-garbage"
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
echo "=== Baseline ===" >> skills/validate-bsv-script/progress.txt
bun test skills/validate-bsv-script/scripts/*.test.ts 2>&1 | tail -5 >> skills/validate-bsv-script/progress.txt
```

### Step 2: Read existing code
```bash
cat skills/validate-bsv-script/scripts/validate.ts
cat skills/validate-bsv-script/scripts/validate.test.ts
```

### Step 3: Implement/Fix
- Make ONE focused change at a time
- Run tests IMMEDIATELY after each change
- If tests regress, revert the change

### Step 4: Verify after EACH change
```bash
bun test skills/validate-bsv-script/scripts/*.test.ts
```

### Step 5: Final verification (all criteria)
```bash
# Run ALL completion criteria commands
bun test skills/validate-bsv-script/scripts/*.test.ts
bun run skills/validate-bsv-script/scripts/validate.ts --help && echo "HELP_OK"
bun run skills/validate-bsv-script/scripts/validate.ts "invalid" 2>&1 | grep -qi "error" && echo "ERROR_HANDLING_OK"
```

### Step 6: Update progress.txt with results

### Step 7: Check completion
If ALL Step 5 commands show success, output `<promise>DONE</promise>`.
If ANY fail, continue loop.

---

## FUNCTIONAL REQUIREMENTS

### validate.ts
1. Accept CLI args: `<script-hex> [--type locking|unlocking]`
2. Parse hex string into Script object using `Script.fromHex()`
3. Decode and display opcodes in human-readable format
4. Validate script structure:
   - Check for common patterns (P2PKH, P2PK, multisig)
   - Identify script type
   - Check for malformed opcodes
5. Security analysis:
   - Warn if script has OP_RETURN in unusual position
   - Warn if script uses dangerous opcodes
   - Check for common vulnerabilities
6. Support `--help` flag (exit 0, show usage)
7. Support `--json` flag for machine-readable output
8. Handle errors gracefully (exit 1, show error message)

### Output Format (default)
```
Script Type: P2PKH (Pay-to-Public-Key-Hash)
Opcodes: OP_DUP OP_HASH160 <20-byte-hash> OP_EQUALVERIFY OP_CHECKSIG
Length: 25 bytes
Valid: true
Warnings: none
```

### Output Format (--json)
```json
{
  "type": "P2PKH",
  "opcodes": ["OP_DUP", "OP_HASH160", "<hash>", "OP_EQUALVERIFY", "OP_CHECKSIG"],
  "length": 25,
  "valid": true,
  "warnings": []
}
```

## ERROR HANDLING
- Invalid hex → "Error: Invalid hex string", exit 1
- Malformed script → "Error: Malformed script at byte N", exit 1
- Missing required args → show usage, exit 1

## FILE STRUCTURE
```
skills/validate-bsv-script/
├── SKILL.md              # Documentation (update when done)
├── PRD.md                # This file
├── progress.txt          # Ralph's memory (append each iteration)
└── scripts/
    ├── validate.ts       # Main script
    └── validate.test.ts  # Tests
```

## DO NOT
- Output DONE if tests fail
- Skip running tests after changes
- Trust previous results (always re-verify)
- Make multiple changes without testing between them
- Ignore error handling requirements
- Execute scripts (validation only, no execution)
