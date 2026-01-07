# PRD: wallet-send-bsv

## Objective
Implement a fully functional BSV transaction sending script using @bsv/sdk.

## Dependencies (USE THESE)
- **@bsv/sdk** - Core BSV operations: `PrivateKey`, `P2PKH`, `Transaction`
  - Docs: https://github.com/bsv-blockchain/ts-sdk
- **WhatsOnChain API** - UTXO fetching and broadcast
  - UTXOs: `GET https://api.whatsonchain.com/v1/bsv/main/address/{address}/unspent`
  - Broadcast: `POST https://api.whatsonchain.com/v1/bsv/main/tx/raw`

## NOT in scope
- 1Sat Ordinals (different plugin)
- BRC-100 wallet interface (this is a simple WIF-based send)
- Encrypted backups (use wallet-encrypt-decrypt for that)

## Completion Promise
Output `<promise>DONE</promise>` ONLY when ALL of these are TRUE:

1. `bun test skills/wallet-send-bsv/scripts/send.test.ts` - ALL tests pass (0 failures)
2. `bun run skills/wallet-send-bsv/scripts/send.ts --help` - Exits 0, shows usage
3. `bun run skills/wallet-send-bsv/scripts/send.ts invalidwif addr 1000` - Rejects with error
4. SKILL.md accurately describes the actual implementation

DO NOT output the promise if tests fail. DO NOT lie.

## Process Steps (MANDATORY)

### Step 1: Read existing code
```bash
cat skills/wallet-send-bsv/scripts/send.ts
cat skills/wallet-send-bsv/scripts/send.test.ts
```

### Step 2: Run tests to see current state
```bash
bun test skills/wallet-send-bsv/scripts/send.test.ts
```

### Step 3: Implement/fix code
- Fix any failing tests
- Ensure --help works
- Ensure error handling works

### Step 4: Verify ALL completion criteria
```bash
# Must ALL pass:
bun test skills/wallet-send-bsv/scripts/send.test.ts
bun run skills/wallet-send-bsv/scripts/send.ts --help
bun run skills/wallet-send-bsv/scripts/send.ts invalidwif 1BvBMSEY... 1000
```

### Step 5: Update progress.txt
Append what you did this iteration.

### Step 6: Check completion
If ALL Step 4 commands succeed, output `<promise>DONE</promise>`.
If ANY fail, loop continues - fix the issues.

## Functional Requirements

1. Accept CLI args: `<from-wif> <to-address> <amount-satoshis>`
2. Parse WIF with `PrivateKey.fromWif()` - reject invalid
3. Validate recipient address format
4. Derive sender address from private key
5. Fetch UTXOs from WhatsOnChain
6. Build transaction:
   - Inputs from UTXOs with `P2PKH().unlock()`
   - Output to recipient with `P2PKH().lock()`
   - Change output back to sender
7. Calculate fee (1 sat/byte minimum)
8. Sign with `tx.sign()`
9. Broadcast via WhatsOnChain
10. Output txid on success

## Error Handling
- Invalid WIF → clear error, exit 1
- Invalid address → clear error, exit 1
- Insufficient funds → show balance vs required, exit 1
- Network errors → show error, exit 1

## File Structure
```
skills/wallet-send-bsv/
├── SKILL.md              # Must match implementation
├── PRD.md                # This file
├── progress.txt          # Append each iteration
└── scripts/
    ├── send.ts           # Main script
    └── send.test.ts      # Tests
```

## Do NOT
- Broadcast to mainnet during tests (mock network calls)
- Store private keys in code
- Skip error handling
- Output DONE if tests fail
