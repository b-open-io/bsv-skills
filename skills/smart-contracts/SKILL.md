---
name: smart-contracts
description: This skill should be used when the user asks about "BSV smart contract", "Bitcoin smart contract", "write a smart contract", "create a BSV contract", "use sCrypt", "use Runar", "compile to Bitcoin Script", "stateful contract", "covenant", "OP_PUSH_TX", "escrow contract", "auction contract", "token contract", "deploy smart contract", "test smart contract", or needs to author, compile, test, or deploy Bitcoin SV smart contracts using high-level languages.
allowed-tools: "Bash(npx:*,bun:*,pnpm:*)"
---

# BSV Smart Contracts

Write, compile, test, and deploy Bitcoin SV smart contracts using high-level languages that compile to Bitcoin Script.

## When to Use

- Author smart contracts in TypeScript, Go, Rust, Python, Solidity, or Move
- Compile high-level code to Bitcoin Script
- Build stateful contracts (counters, auctions, tokens) using OP_PUSH_TX
- Create spending conditions (escrow, multisig, timelocks, covenants)
- Test contracts locally before deployment
- Deploy contracts to BSV mainnet

For raw `@bsv/sdk` ScriptTemplate work (BitCom protocol templates like AIP, MAP, SIGMA), use the `create-script-template` skill instead. This skill is for contract logic — spending conditions, covenants, and stateful on-chain programs.

## Framework Selection

Two frameworks compile high-level languages to Bitcoin Script:

| | **Runar** | **sCrypt** |
|---|---|---|
| **Languages** | TypeScript, Go, Rust, Python, Solidity, Move | TypeScript (eDSL) |
| **Model** | Multi-compiler with conformance suite | Single compiler |
| **Stateful** | `StatefulSmartContract` + OP_PUSH_TX | `SmartContract` with `@prop(true)` |
| **Testing** | `TestContract` API with Script VM | Built-in test framework |
| **Deployment** | `runar-sdk` providers + signers | `scrypt-ts` deploy API |
| **IDE** | Full IDE support (valid TS/Go/Rust) | VS Code extension |
| **Playground** | https://runar.run | https://playground.scrypt.io |
| **Install** | `pnpm add runar-lang runar-compiler runar-cli` | `npx scrypt-cli project my-app` |
| **Builtins** | 53+ functions (crypto, math, EC, post-quantum, BLAKE3) | Standard Bitcoin Script ops |
| **Codegen** | SDK wrappers in TS, Go, Rust, Python from one compile | N/A |
| **Maturity** | v0.3.0 (23 examples, 28 conformance tests) | Production |
| **Source** | https://github.com/icellan/runar | https://github.com/sCrypt-Inc/scrypt-ts |

**Decision guide:**
- Multiple language teams or cross-compiler verification needed → **Runar**
- Production deployment with mature tooling → **sCrypt**
- Post-quantum or advanced cryptographic primitives → **Runar** (has WOTS+, SLH-DSA, Schnorr ZKP examples)
- Quick prototyping with TypeScript only → **either works**

## Contract Types

### Stateless (Spending Conditions)

All properties are immutable. The contract is satisfied in a single transaction. Both frameworks compile P2PKH to the same Bitcoin Script: `OP_DUP OP_HASH160 <hash> OP_EQUALVERIFY OP_CHECKSIG`.

### Stateful (On-Chain State Machines)

Mutable properties persist across transactions via OP_PUSH_TX. Runar handles preimage verification automatically in `StatefulSmartContract`. sCrypt requires explicit `buildStateOutput` + `hashOutputs` verification in each public method.

### Key Syntax Differences

| Feature | Runar | sCrypt |
|---------|-------|--------|
| Immutable prop | `readonly` keyword | `@prop()` decorator |
| Mutable prop | No keyword | `@prop(true)` decorator |
| Public method | `public` keyword | `@method()` decorator |
| Constructor super | `super(prop1, prop2)` | `super(...arguments)` |
| Sig check | `checkSig(sig, pk)` | `this.checkSig(sig, pk)` |
| State persistence | Automatic | Manual `buildStateOutput` |
| File extension | `.runar.ts` | `.ts` |

See `references/contract-patterns.md` for complete side-by-side code examples of P2PKH, Escrow, Counter, Covenant, and more.

## Common Patterns

| Pattern | Use Case | Stateful |
|---------|----------|----------|
| P2PKH | Standard payments | No |
| Escrow | Multi-party authorization | No |
| Counter | On-chain state machine | Yes |
| Auction | Bidding with deadline | Yes |
| Covenant Vault | Spending constraints | No |
| Fungible Token | Split/merge token supply | Yes |
| NFT | Transfer/burn ownership | Yes |
| Oracle Price Feed | Rabin signature verification | No |
| Hash Time Lock | Atomic swaps | No |
| Multi-Sig (M-of-N) | Corporate treasury, shared custody | No |
| BLAKE3 Hash Lock | Modern hash verification | No |
| Post-Quantum Wallet | WOTS+, SLH-DSA signatures | No |
| TicTacToe | On-chain game logic | Yes |

See `references/runar-guide.md` and `references/scrypt-guide.md` for complete examples of each pattern.

## Development Workflow

### 1. Write

Create a contract file:
- Runar: `MyContract.runar.ts` (or `.runar.go`, `.runar.rs`, `.runar.py`)
- sCrypt: `MyContract.ts` with `@method()` decorators

### 2. Compile

```bash
# Runar
npx runar compile MyContract.runar.ts

# sCrypt
npx scrypt-cli compile
```

### 3. Test

```typescript
// Runar — TestContract API with pre-generated test keys
import { TestContract, ALICE, BOB } from 'runar-testing';
// Addr type = 20-byte hex pubKeyHash, NOT Base58Check address
const contract = TestContract.fromSource(source, { pubKeyHash: ALICE.pubKeyHash });
// Test keys have: privKey, pubKey, pubKeyHash (hex), address (base58), wif, testSig
const result = contract.call('unlock', { sig: ALICE.testSig, pubKey: ALICE.pubKey });
expect(result.success).toBe(true);
```

```typescript
// sCrypt — built-in testing
const instance = new P2PKH(pubKeyHash);
await instance.connect(getDefaultSigner());
const deployTx = await instance.deploy(1000);
const callTx = await instance.methods.unlock(sig, pubKey);
```

### 4. Deploy

```typescript
// Runar — SDK deployment
import { Contract, WocProvider, LocalSigner } from 'runar-sdk';
const provider = new WocProvider('mainnet');
const signer = new LocalSigner(privateKey);
const contract = new Contract(artifact, provider, signer);
const deployTx = await contract.deploy([constructorArg], { satoshis: 1000 });
```

```typescript
// sCrypt — deploy API
await instance.connect(new TestWallet(privateKey, provider));
const tx = await instance.deploy(satoshis);
```

## Integration with @bsv/sdk

Both frameworks produce standard Bitcoin Script. The compiled output integrates with `@bsv/sdk` transaction building:

```typescript
import { Transaction, P2PKH } from '@bsv/sdk';
// Use compiled contract script as locking script in any @bsv/sdk transaction
```

For raw script template authoring (BitCom protocols), see the `create-script-template` skill.
For script validation and opcode analysis, see the `validate-bsv-script` skill.

## Additional Resources

### Reference Files

For detailed framework-specific guides, consult:
- **`references/runar-guide.md`** — Runar installation, language reference, compilation pipeline, all contract patterns, deployment SDK, multi-language support
- **`references/scrypt-guide.md`** — sCrypt installation, decorators, testing, deployment, advanced patterns
- **`references/contract-patterns.md`** — Side-by-side implementations of common patterns in both frameworks

### External Resources

- **Runar Playground**: https://runar.run
- **Runar Source**: https://github.com/icellan/runar
- **Runar Docs**: https://runar.build
- **sCrypt Docs**: https://docs.scrypt.io
- **sCrypt Playground**: https://playground.scrypt.io
