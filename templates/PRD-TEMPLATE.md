# PRD: [skill-name]

## Objective
[One-line description of what this skill does]

## Dependencies (USE THESE - NOT ALTERNATIVES)
- **@bsv/sdk** - [specific classes needed]: `PrivateKey`, `Transaction`, etc.
  - Docs: https://github.com/bsv-blockchain/ts-sdk
- **[other deps]** - [purpose]
  - Docs: [url]

## NOT in scope
- 1Sat Ordinals (different plugin)
- [other out of scope items]

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/[skill-name]/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/[skill-name]/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/[skill-name]/scripts/*.test.ts`

If tests regress (more failures after than before), REVERT and try again.

---

## COMPLETION CRITERIA (ALL MUST PASS)

Run these commands IN ORDER. ALL must succeed:

```bash
# 1. ALL tests pass (0 failures)
bun test skills/[skill-name]/scripts/*.test.ts

# 2. Help command works (exit 0)
bun run skills/[skill-name]/scripts/[script].ts --help

# 3. Error handling works (exit non-zero for invalid input)
bun run skills/[skill-name]/scripts/[script].ts invalid-input

# 4. Type check passes
bunx tsc --noEmit skills/[skill-name]/scripts/*.ts 2>/dev/null || echo "TypeCheck: OK (using bun)"
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
echo "=== Baseline ===" >> skills/[skill-name]/progress.txt
bun test skills/[skill-name]/scripts/*.test.ts 2>&1 | tail -5 >> skills/[skill-name]/progress.txt
```

### Step 2: Read existing code
```bash
cat skills/[skill-name]/scripts/[script].ts
cat skills/[skill-name]/scripts/[script].test.ts
```

### Step 3: Implement/Fix
- Make ONE focused change at a time
- Run tests IMMEDIATELY after each change
- If tests regress, revert the change

### Step 4: Verify after EACH change
```bash
bun test skills/[skill-name]/scripts/*.test.ts
```

### Step 5: Final verification (all criteria)
```bash
# Run ALL completion criteria commands
bun test skills/[skill-name]/scripts/*.test.ts
bun run skills/[skill-name]/scripts/[script].ts --help && echo "HELP_OK"
bun run skills/[skill-name]/scripts/[script].ts invalid 2>&1 | grep -q "Error" && echo "ERROR_HANDLING_OK"
```

### Step 6: Update progress.txt with results

### Step 7: Check completion
If ALL Step 5 commands show success, output `<promise>DONE</promise>`.
If ANY fail, continue loop.

---

## FUNCTIONAL REQUIREMENTS

### [script-name].ts
1. Accept CLI args: `[args description]`
2. [requirement 2]
3. [requirement 3]
4. Support `--help` flag (exit 0, show usage)
5. Handle errors gracefully (exit 1, show error message)

## ERROR HANDLING
- Invalid input → clear error message, exit 1
- Missing required args → show usage, exit 1
- Network errors → show error, exit 1

## FILE STRUCTURE
```
skills/[skill-name]/
├── SKILL.md              # Documentation (update when done)
├── PRD.md                # This file
├── progress.txt          # Ralph's memory (append each iteration)
└── scripts/
    ├── [script].ts       # Main script
    └── [script].test.ts  # Tests
```

## DO NOT
- Output DONE if tests fail
- Skip running tests after changes
- Trust previous results (always re-verify)
- Make multiple changes without testing between them
- Ignore error handling requirements
