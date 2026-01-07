# PRD: stratum-v1

## Objective
Provide Stratum v1 mining protocol utilities for message parsing, validation, and share calculation.

## Dependencies
- **@bsv/sdk** - SHA256d hashing, BigNumber for difficulty
- WhatsOnChain API (optional for current difficulty)

## NOT in scope
- Full mining pool implementation
- ASIC communication
- Network socket handling

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/stratum-v1/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/stratum-v1/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/stratum-v1/scripts/*.test.ts`

---

## COMPLETION CRITERIA (ALL MUST PASS)

```bash
# 1. ALL tests pass
bun test skills/stratum-v1/scripts/*.test.ts

# 2. Help commands work (exit 0)
bun run skills/stratum-v1/scripts/parse-message.ts --help
bun run skills/stratum-v1/scripts/build-coinbase.ts --help
bun run skills/stratum-v1/scripts/calculate-share.ts --help

# 3. Error handling works
bun run skills/stratum-v1/scripts/parse-message.ts "invalid"
```

---

## FUNCTIONAL REQUIREMENTS

### parse-message.ts
Parse Stratum v1 JSON-RPC messages.

```bash
# Parse a stratum message
bun run parse-message.ts '{"id":1,"method":"mining.subscribe","params":["Agent/1.0"]}'

# JSON output
bun run parse-message.ts --json '{"id":1,"method":"mining.subscribe","params":[]}'
```

Output:
- Method name
- Parameters decoded
- Message type (request/response/notification)

### build-coinbase.ts
Build coinbase transaction from Stratum components.

```bash
bun run build-coinbase.ts --coinb1 <hex> --coinb2 <hex> --extranonce1 <hex> --extranonce2 <hex>
```

Output:
- Full coinbase hex
- Coinbase txid (SHA256d)

### calculate-share.ts
Calculate share difficulty and validate against target.

```bash
bun run calculate-share.ts --header <80-byte-hex> --target <difficulty>
```

Or build header from components:
```bash
bun run calculate-share.ts --version <hex> --prevhash <hex> --merkle <hex> --time <hex> --bits <hex> --nonce <hex> --target <difficulty>
```

Output:
- Block hash
- Share difficulty
- Valid: true/false

### decode-notify.ts
Decode mining.notify params into readable format.

```bash
bun run decode-notify.ts --params '["jobid","prevhash","cb1","cb2",["branch"],"ver","bits","time",true]'
```

Output:
- Job ID
- Previous block hash (both word-reversed and byte-reversed forms)
- Coinbase parts
- Merkle branches
- Version, bits, time
- Clean jobs flag

## BYTE ORDER HANDLING (CRITICAL)

The scripts MUST handle Stratum's complex byte ordering:

1. **prevhash**: Word-reversed in notify, byte-reversed in header
2. **version/bits/time/nonce**: BE hex in JSON, LE bytes in header
3. **merkle branches**: Pre-reversed by pool, use as-is

Include helper functions:
- `wordReverse(hex)` - For prevhash Stratum format
- `byteReverse(hex)` - For header construction
- `beHexToLeBytes(hex)` - For version/time/bits/nonce

## ERROR HANDLING
- Invalid JSON → "Error: Invalid JSON message", exit 1
- Invalid hex → "Error: Invalid hex format", exit 1
- Missing params → show usage, exit 1

## FILE STRUCTURE
```
skills/stratum-v1/
├── SKILL.md              # Protocol documentation (keep existing)
├── PRD.md                # This file
├── progress.txt          # Ralph's memory
└── scripts/
    ├── parse-message.ts
    ├── build-coinbase.ts
    ├── calculate-share.ts
    ├── decode-notify.ts
    └── stratum.test.ts
```

## DO NOT
- Implement full pool server
- Handle network sockets
- Skip byte order tests (critical!)
