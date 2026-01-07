# PRD: stratum-v2

## Objective
Provide Stratum v2 protocol utilities for binary message encoding/decoding and protocol comparison.

## Dependencies
- **@bsv/sdk** - Crypto primitives

## NOT in scope
- Full Noise Protocol encryption
- Production mining pool
- ASIC firmware

---

## RALPH LOOP PROTOCOL

### Memory: progress.txt
After EVERY iteration, append to `skills/stratum-v2/progress.txt`:
```
=== Iteration N (timestamp) ===
Tests: X pass / Y fail
Help: works/broken
What I did: [brief description]
What's left: [remaining issues]
```

### Test Sandwich (MANDATORY)
1. **BEFORE** making changes: `bun test skills/stratum-v2/scripts/*.test.ts`
2. Make code changes
3. **AFTER** changes: `bun test skills/stratum-v2/scripts/*.test.ts`

---

## COMPLETION CRITERIA (ALL MUST PASS)

```bash
# 1. ALL tests pass
bun test skills/stratum-v2/scripts/*.test.ts

# 2. Help commands work (exit 0)
bun run skills/stratum-v2/scripts/encode-message.ts --help
bun run skills/stratum-v2/scripts/decode-message.ts --help
bun run skills/stratum-v2/scripts/compare-protocols.ts --help

# 3. Error handling works
bun run skills/stratum-v2/scripts/decode-message.ts "invalid"
```

---

## FUNCTIONAL REQUIREMENTS

### encode-message.ts
Encode Stratum v2 binary messages.

```bash
# Encode SetupConnection message
bun run encode-message.ts --type SetupConnection --protocol 0 --min-version 2 --max-version 2 --vendor "TestMiner"
```

Output:
- Binary message as hex
- Frame breakdown (extension, type, length)

### decode-message.ts
Decode Stratum v2 binary frames.

```bash
bun run decode-message.ts <hex-frame>
bun run decode-message.ts --json <hex-frame>
```

Output:
- Extension type
- Message type name
- Payload fields decoded

### compare-protocols.ts
Compare v1 vs v2 for education/migration planning.

```bash
bun run compare-protocols.ts --feature bandwidth
bun run compare-protocols.ts --feature security
bun run compare-protocols.ts --feature decentralization
bun run compare-protocols.ts --all
```

Output comparison table with:
- Feature name
- v1 behavior
- v2 improvement
- Migration notes

### frame-builder.ts
Low-level frame construction helper.

```bash
bun run frame-builder.ts --extension 0 --type 0 --payload <hex>
```

Output:
- Complete frame hex
- Frame diagram

## BINARY FRAME FORMAT

```
+------------------+------------------+------------------+
| Extension Type   | Message Type     | Message Length   |
| (2 bytes LE)     | (1 byte)         | (3 bytes LE)     |
+------------------+------------------+------------------+
|                      Payload                           |
|                   (variable length)                    |
+--------------------------------------------------------+
```

## DATA TYPES TO SUPPORT

| Type | Description |
|------|-------------|
| U8, U16, U24, U32 | Unsigned integers (LE) |
| U256 | 256-bit hash |
| STR0_255 | Length-prefixed string |
| B0_32, B0_64K | Length-prefixed bytes |
| BOOL | 1-byte boolean |
| F32 | 32-bit float |

## ERROR HANDLING
- Invalid frame → "Error: Invalid frame format", exit 1
- Unknown message type → "Error: Unknown message type X", exit 1
- Truncated message → "Error: Incomplete frame", exit 1

## FILE STRUCTURE
```
skills/stratum-v2/
├── SKILL.md              # Protocol documentation (keep existing)
├── PRD.md                # This file
├── progress.txt          # Ralph's memory
└── scripts/
    ├── encode-message.ts
    ├── decode-message.ts
    ├── compare-protocols.ts
    ├── frame-builder.ts
    └── stratum-v2.test.ts
```

## DO NOT
- Implement full Noise encryption (too complex)
- Build production pool
- Skip frame parsing tests
