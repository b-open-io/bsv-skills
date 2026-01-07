# PRD: wallet-encrypt-decrypt

## Objective
Implement ECDH-based message encryption/decryption using @bsv/sdk keys.

## Dependencies (USE THESE)
- **@bsv/sdk** - Key operations: `PrivateKey`, `PublicKey`
  - Docs: https://github.com/bsv-blockchain/ts-sdk
- **Node.js crypto** - AES-256-GCM encryption
  - `crypto.createCipheriv()`, `crypto.createDecipheriv()`

## NOT in scope
- 1Sat Ordinals (different plugin)
- File encryption (this is message encryption)
- Backup encryption (separate skill)

## Completion Promise
Output `<promise>DONE</promise>` ONLY when ALL of these are TRUE:

1. `bun test skills/wallet-encrypt-decrypt/scripts/*.test.ts` - ALL tests pass
2. `bun run skills/wallet-encrypt-decrypt/scripts/encrypt-message.ts --help` - Exits 0
3. `bun run skills/wallet-encrypt-decrypt/scripts/decrypt-message.ts --help` - Exits 0
4. Roundtrip test: encrypt then decrypt returns original message
5. SKILL.md accurately describes the implementation

DO NOT output the promise if tests fail. DO NOT lie.

## Process Steps (MANDATORY)

### Step 1: Read existing code
```bash
cat skills/wallet-encrypt-decrypt/scripts/encrypt-message.ts
cat skills/wallet-encrypt-decrypt/scripts/decrypt-message.ts
cat skills/wallet-encrypt-decrypt/scripts/*.test.ts
```

### Step 2: Run tests
```bash
bun test skills/wallet-encrypt-decrypt/scripts/*.test.ts
```

### Step 3: Implement/fix
- Fix any failing tests
- Ensure --help works on both scripts
- Ensure roundtrip works

### Step 4: Verify ALL criteria
```bash
bun test skills/wallet-encrypt-decrypt/scripts/*.test.ts
bun run skills/wallet-encrypt-decrypt/scripts/encrypt-message.ts --help
bun run skills/wallet-encrypt-decrypt/scripts/decrypt-message.ts --help
```

### Step 5: Update progress.txt

### Step 6: Check completion
If ALL Step 4 succeeds, output `<promise>DONE</promise>`.

## Functional Requirements

### encrypt-message.ts
1. Accept: `<recipient-pubkey-hex> <message>`
2. Generate ephemeral key pair
3. Compute ECDH shared secret: `ephemeralPrivate * recipientPublic`
4. Derive AES-256 key from shared secret (SHA256)
5. Generate random 12-byte IV
6. Encrypt with AES-256-GCM
7. Output JSON: `{ ephemeralPublicKey, iv, authTag, ciphertext }`

### decrypt-message.ts
1. Accept: `<private-key-wif> <encrypted-json>`
2. Parse encrypted JSON
3. Compute ECDH shared secret: `privateKey * ephemeralPublic`
4. Derive AES-256 key from shared secret
5. Decrypt with AES-256-GCM (verify authTag)
6. Output plaintext message

## Cryptographic Requirements
- ECDH on secp256k1 curve (via @bsv/sdk)
- AES-256-GCM with 128-bit auth tag
- 12-byte random IV per encryption
- SHA256 for key derivation

## Error Handling
- Invalid public key → clear error, exit 1
- Invalid private key → clear error, exit 1
- Tampered ciphertext → auth failure, exit 1
- Malformed JSON → parse error, exit 1

## File Structure
```
skills/wallet-encrypt-decrypt/
├── SKILL.md
├── PRD.md
├── progress.txt
└── scripts/
    ├── encrypt-message.ts
    ├── decrypt-message.ts
    ├── encrypt.test.ts
    └── decrypt.test.ts
```

## Do NOT
- Use deprecated crypto functions
- Skip auth tag verification
- Reuse IVs
- Output DONE if tests fail
