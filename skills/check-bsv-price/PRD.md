# PRD: check-bsv-price

## Objective
Get current BSV price and exchange rate information from WhatsOnChain API.

## Dependencies (USE THESE - NOT ALTERNATIVES)
- **WhatsOnChain API** - Exchange rate endpoint
  - Endpoint: `https://api.whatsonchain.com/v1/bsv/main/exchangerate`

## NOT in scope
- Historical price data
- Multiple exchange sources
- Price alerts

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/check-bsv-price/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/check-bsv-price/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/check-bsv-price/scripts/*.test.ts`

If tests regress (more failures after than before), REVERT and try again.

---

## COMPLETION CRITERIA (ALL MUST PASS)

Run these commands IN ORDER. ALL must succeed:

```bash
# 1. ALL tests pass (0 failures)
bun test skills/check-bsv-price/scripts/*.test.ts

# 2. Help command works (exit 0)
bun run skills/check-bsv-price/scripts/price.ts --help

# 3. Error handling works (exit non-zero for invalid input)
bun run skills/check-bsv-price/scripts/price.ts --invalid-flag
```

### Completion Promise
Output `<promise>DONE</promise>` ONLY when:
- ALL tests pass (verified by running them, not by "thinking" they pass)
- Help commands exit 0 (verified by running them)
- Error cases handled (verified by running them)

---

## FUNCTIONAL REQUIREMENTS

### price.ts
1. Default: Fetch and display current BSV price in USD
2. Support `--help` flag (exit 0, show usage)
3. Support `--json` flag for machine-readable output
4. Support `--currency <code>` to specify output currency (default: USD)
5. Handle API errors gracefully (exit 1, show error message)

### Output Format (default)
```
BSV Price Information
Price: $45.67 USD
Updated: 2024-01-07 10:30:00 UTC
```

### Output Format (--json)
```json
{
  "price": 45.67,
  "currency": "USD",
  "timestamp": "2024-01-07T10:30:00.000Z"
}
```

## ERROR HANDLING
- Network error → "Error: Failed to fetch price: <reason>", exit 1
- Invalid flag → show usage, exit 1

## FILE STRUCTURE
```
skills/check-bsv-price/
├── SKILL.md              # Documentation
├── PRD.md                # This file
├── progress.txt          # Ralph's memory
└── scripts/
    ├── price.ts          # Main script
    └── price.test.ts     # Tests
```

## DO NOT
- Output DONE if tests fail
- Skip running tests after changes
- Trust previous results (always re-verify)
- Use emojis in output
