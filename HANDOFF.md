# Handoff Instructions for bsv-skills Completion

## Current State (Updated)

### Completed Skills (Phase 1 - All DONE ✅)

- **wallet-send-bsv** - DONE
  - Tests: 11 pass
  - `--help` works
  - WIF/address validation works

- **wallet-encrypt-decrypt** - DONE
  - Tests: 26 pass
  - `encrypt-message.ts --help` works
  - `decrypt-message.ts --help` works
  - ECDH + AES-256-GCM implementation

- **bsocial-posts** - DONE
  - Tests: 11 pass
  - `create-post.ts --help` works
  - `read-posts.ts --help` works
  - MAP protocol OP_RETURN transactions
  - BMAP API integration for reading posts

- **manage-bap-backup** - DONE
  - Tests: 12 pass
  - `list.ts --help` works
  - `export-member.ts --help` works
  - Flow ~/.flow/.bsv/ directory structure
  - bbackup/bap CLI integration

### Total Test Coverage
- 96 tests passing across all skills

## Dependencies Reference

- **@bsv/sdk** - https://github.com/bsv-blockchain/ts-sdk
- **@bsv/wallet-toolbox** - https://github.com/bsv-blockchain/wallet-toolbox
- **ts-templates** - https://github.com/b-open-io/ts-templates
- **Bitcoin Schema** - https://bitcoinschema.org/llms.txt

## NOT in scope for this plugin
- 1Sat Ordinals (separate plugin)

## PRD Structure (Best Practice from NotebookLM)

See `templates/PRD-TEMPLATE.md` for the full template. Each PRD MUST have:

### 1. Dependencies Section
- List EXACT packages and APIs to use
- Include documentation URLs
- Specify which classes/functions to import

### 2. Ralph Loop Protocol
- **Memory via progress.txt** - Append after EVERY iteration
- **Test Sandwich** - Run tests BEFORE and AFTER each change
- If tests regress, REVERT immediately

### 3. Completion Criteria (Objective Tests)
All must be verified by RUNNING commands, not "thinking":
```bash
bun test skills/<skill>/scripts/*.test.ts  # ALL pass
bun run skills/<skill>/scripts/<script>.ts --help  # Exit 0
bun run skills/<skill>/scripts/<script>.ts invalid  # Exit non-zero
```

### 4. Verification Sequence
Step-by-step process with explicit bash commands at each step.

### 5. DO NOT Section
- Output DONE if tests fail
- Skip running tests after changes
- Trust previous results (always re-verify)
- Make multiple changes without testing

---

## Running Ralph Loops

### Improved Command
```bash
/ralph-loop "Read skills/<skill-name>/PRD.md carefully. Follow the RALPH LOOP PROTOCOL exactly. Use progress.txt as memory. Run the Test Sandwich after EVERY change. Output <promise>DONE</promise> ONLY when ALL completion criteria pass (verified by running them, not thinking)." --completion-promise DONE --max-iterations 25
```

### Why This Works Better
1. **progress.txt as memory** - Ralph remembers what he tried
2. **Test Sandwich** - Catches regressions immediately
3. **Objective verification** - Must RUN commands, not assume
4. **No lying** - Promise tied to actual test results

### Monitoring Progress
```bash
# Watch Ralph's progress in real-time
tail -f skills/<skill-name>/progress.txt

# Check current test status
bun test skills/<skill-name>/scripts/*.test.ts
```

### Common Ralph Failures & Fixes
| Issue | Solution |
|-------|----------|
| Ralph says "done" but tests fail | PRD must require running tests before outputting DONE |
| Ralph forgets what he tried | PRD must require progress.txt updates |
| Tests regress after changes | PRD must enforce Test Sandwich |
| Ralph ignores error handling | PRD must include error case verification |

## Phase 2 Skills - COMPLETE ✅
- **validate-bsv-script** - 5 tests pass
- **lookup-block-info** - 5 tests pass
- **calculate-mining-difficulty** - 5 tests pass
- **estimate-transaction-fee** - 6 tests pass

Total Phase 2: 21 tests

## Phase 3 Skills - COMPLETE ✅
- **check-bsv-price** - 5 tests pass
- **decode-bsv-transaction** - 5 tests pass
- **lookup-bsv-address** - 6 tests pass

Total Phase 3: 16 tests

## Grand Total: 133 tests across 11 skills
