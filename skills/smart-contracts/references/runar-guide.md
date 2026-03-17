# Runar v0.3 Framework Guide

Runar compiles a strict subset of TypeScript, Go, Rust, Python, Solidity, or Move into Bitcoin SV Script. Four independent compiler implementations (TypeScript, Go, Rust, Python) produce identical output for the same input. 28 conformance tests verify cross-compiler consistency.

**Version**: 0.3.0
**Source**: https://github.com/icellan/runar
**Playground**: https://runar.run (client-side, no backend — Monaco editor, all 6 languages, step-through debugger)
**Docs**: https://runar.build

## Installation

### From npm

```bash
pnpm add runar-lang runar-compiler runar-cli
```

- **runar-lang** — Types, base classes, and 53+ built-in function declarations (compile-time stubs — `hash160()` etc. throw at runtime)
- **runar-compiler** — Reference TypeScript compiler (6 nanopass transforms)
- **runar-cli** — CLI: init, compile, test, deploy, verify, codegen, debug

### Additional Packages

```bash
pnpm add runar-testing   # TestContract API, Script VM, fuzzer
pnpm add runar-sdk       # Deployment providers, signers, codegen
```

### Go/Rust/Python SDKs

```bash
go get github.com/icellan/runar/packages/runar-go     # Real ECDSA + Rabin crypto
cargo add runar                                         # Real crypto, compile_check!()
pip install runar-py                                    # Real crypto, deployment SDK
```

All four SDKs include real secp256k1 ECDSA and Rabin signature verification (not mocked).

## Supported Formats

| Format | Extension | Parser | Status |
|--------|-----------|--------|--------|
| TypeScript | `.runar.ts` | ts-morph | Stable |
| Go | `.runar.go` | tree-sitter | Experimental |
| Rust DSL | `.runar.rs` | SWC + native | Experimental |
| Python | `.runar.py` | tokenizer + recursive descent | Experimental |
| Solidity-like | `.runar.sol` | recursive descent | Experimental |
| Move-style | `.runar.move` | recursive descent | Experimental |

All four compilers (TS, Go, Rust, Python) can parse all six formats. Every format compiles through the same AST and produces identical Bitcoin Script.

## Contract Model

### Stateless (`SmartContract`)

All properties `readonly`. Embedded in locking script at deploy time.

```typescript
import { SmartContract, assert, PubKey, Sig, Addr, hash160, checkSig } from 'runar-lang';

class P2PKH extends SmartContract {
  readonly pubKeyHash: Addr;
  constructor(pubKeyHash: Addr) {
    super(pubKeyHash);
    this.pubKeyHash = pubKeyHash;
  }
  public unlock(sig: Sig, pubKey: PubKey) {
    assert(hash160(pubKey) === this.pubKeyHash);
    assert(checkSig(sig, pubKey));
  }
}
```

### Stateful (`StatefulSmartContract`)

Mutable properties carried across transactions via OP_PUSH_TX. State tracking is automatic — the ANF interpreter computes next state after each method call.

```typescript
import { StatefulSmartContract, assert } from 'runar-lang';

class Counter extends StatefulSmartContract {
  count: bigint = 0n;
  constructor() { super(); }
  public increment() { this.count++; }
  public decrement() {
    assert(this.count > 0n);
    this.count--;
  }
}
```

### Multi-Output (`this.addOutput`)

Token splitting/merging with multiple transaction outputs:

```typescript
public transfer(to: PubKey, amount: bigint, sig: Sig) {
  assert(checkSig(sig, this.owner));
  assert(amount > 0n && amount <= this.balance);
  this.addOutput(1n, to, amount, this.tokenId);
  this.addOutput(1n, this.owner, this.balance - amount, this.tokenId);
}
```

### Multi-Signature (v0.3)

Array literals enable native checkMultiSig — M-of-N signing schemes:

```typescript
public spend(sigs: Sig[], pubkeys: PubKey[]) {
  assert(checkMultiSig(sigs, pubkeys));
}
```

## Compilation Pipeline

Six nanopass transforms plus specialized codegens:

| Pass | File | Input → Output |
|------|------|----------------|
| 1 | `01-parse.ts` (+ per-format) | Source → Runar AST |
| 2 | `02-validate.ts` | AST → Validated AST |
| 3 | `03-typecheck.ts` | Validated AST → Typed AST |
| 4 | `04-anf-lower.ts` | Typed AST → ANF IR |
| 5 | `05-stack-lower.ts` | ANF IR → Stack IR |
| 6 | `06-emit.ts` | Stack IR → Bitcoin Script |

Specialized codegens: `blake3-codegen.ts`, `sha256-codegen.ts`, `ec-codegen.ts`, `slh-dsa-codegen.ts`

Peephole optimizer (`optimizer/peephole-rules.json`) runs between passes 5-6 (always enabled). EC-specific optimizer (`optimizer/ec-rules.json`) for elliptic curve operations. Automatic OP_CODESEPARATOR insertion reduces stateful contract script size.

## Compiled Artifact Structure

`npx runar compile` outputs a JSON artifact with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | `"runar-v0.1.0"` |
| `compilerVersion` | string | `"0.1.0"` |
| `contractName` | string | Contract class name |
| `abi` | object | Constructor params + method signatures |
| `script` | string | Compiled Bitcoin Script (hex) — constructor slots are `OP_0` placeholders |
| `asm` | string | Human-readable assembly |
| `constructorSlots` | array | Byte offsets where constructor args are embedded |
| `sourceMap` | object | Line/column mappings for debugger |
| `buildTimestamp` | string | ISO 8601 compile time |

Note: The compiled script field is `script`, not `lockingScript`. Constructor args are embedded at `constructorSlots[i].byteOffset` positions in the script hex.

## CLI Commands

```bash
npx runar init <name>                    # Scaffold new project
npx runar compile <file>                 # Compile to Bitcoin Script
npx runar compile <file> --emit ast      # Output AST instead
npx runar test <file>                    # Run contract tests
npx runar deploy <file> [args...]        # Deploy to network
npx runar verify <txid>                  # Verify on-chain contract
npx runar codegen <file>                 # Generate SDK wrappers (TS, Go, Rust, Python)
npx runar debug <file>                   # Step-through debugger with source maps
```

## Testing

### TestContract API

```typescript
import { TestContract, ALICE } from 'runar-testing';

// Stateless — use pubKeyHash (20-byte hex), NOT Base58Check address
const p2pkh = TestContract.fromSource(source, { pubKeyHash: ALICE.pubKeyHash });
const result = p2pkh.call('unlock', { sig: ALICE.testSig, pubKey: ALICE.pubKey });
expect(result.success).toBe(true);

// Stateful — automatic state tracking (v0.3)
const counter = TestContract.fromSource(source, { count: 0n });
counter.call('increment');
console.log(counter.state.count); // 1n — ANF interpreter computes next state
```

### Test Keys

`runar-testing` exports 10 named test keys: `ALICE`, `BOB`, `CHARLIE`, `DAVE`, `EVE`, `FRANK`, `GRACE`, `HEIDI`, `IVAN`, `JUDY`.

Each key has: `name`, `privKey` (hex), `pubKey` (compressed hex), `pubKeyHash` (20-byte hex), `address` (Base58Check), `wif`, `testSig` (pre-signed DER).

The `Addr` type in contracts expects `pubKeyHash` (40 hex chars), not `address` (Base58Check). This is a common mistake — `hash160(pubKey)` in the contract produces a 20-byte hex hash that must match the constructor arg exactly.

### Peer Dependencies

`runar-testing` requires `fast-check` for the fuzzer. Install it alongside:
```bash
bun add runar-testing fast-check
```

### Fuzzer

`runar-testing` includes a fuzzer that generates random inputs for property-based testing of contract methods.

### Mock Preimage

`mock-preimage.ts` helper for testing stateful contracts that use `this.txPreimage`.

## Deployment SDK

### Providers

| Provider | Module | Purpose |
|----------|--------|---------|
| `MockProvider` | `providers/mock.ts` | Local testing, no network |
| `RpcProvider` | `providers/rpc-provider.ts` | Direct BSV node RPC |
| `WocProvider` | `providers/woc.ts` | WhatsOnChain API |
| `WalletProvider` | `providers/wallet-provider.ts` | BRC-100 wallet integration |

### Signers

| Signer | Module | Purpose |
|--------|--------|---------|
| `LocalSigner` | `signers/local.ts` | Raw PrivateKey signing |
| `ExternalSigner` | `signers/external.ts` | External signing service |
| `WalletSigner` | `signers/wallet.ts` | BRC-100 WalletInterface |

### Deploy Example

```typescript
import { Contract, WocProvider, LocalSigner } from 'runar-sdk';

const provider = new WocProvider('mainnet');
const signer = new LocalSigner(privateKey);
const contract = new Contract(artifact, provider, signer);

const deployTx = await contract.deploy([constructorArg], { satoshis: 1000 });
const callTx = await contract.call('methodName', [arg1, arg2]);
```

### SDK Code Generation (v0.3)

Compile once, generate typed SDK wrappers in all four languages:

```bash
npx runar codegen MyContract.runar.ts
# Generates: MyContract.ts, MyContract.go, MyContract.rs, MyContract.py
```

Templates in `codegen/templates/`: `wrapper.ts.mustache`, `wrapper.go.mustache`, `wrapper.rs.mustache`, `wrapper.py.mustache`.

## Built-in Functions (54 total)

### Cryptographic

| Function | Bitcoin Script | Description |
|----------|---------------|-------------|
| `sha256(data)` | `OP_SHA256` | SHA-256 hash |
| `ripemd160(data)` | `OP_RIPEMD160` | RIPEMD-160 hash |
| `hash160(data)` | `OP_HASH160` | SHA-256 + RIPEMD-160 |
| `hash256(data)` | `OP_HASH256` | Double SHA-256 |
| `sha256Compress(state, block)` | Inlined | SHA-256 compression function |
| `sha256Finalize(state, remaining, bitLen)` | Inlined | SHA-256 finalization |
| `blake3Compress(chainingValue, block)` | Inlined | BLAKE3 single-block compression (v0.3) |
| `blake3Hash(message)` | Inlined | Full BLAKE3 hash up to 64 bytes (v0.3) |
| `checkSig(sig, pubkey)` | `OP_CHECKSIG` | ECDSA signature verification |
| `checkMultiSig(sigs, pubkeys)` | `OP_CHECKMULTISIG` | M-of-N multi-signature (v0.3) |
| `verifyRabinSig(msg, sig, pubkey)` | Inlined | Rabin signature verification |

### Post-Quantum

| Function | Description |
|----------|-------------|
| `verifyWOTS(msg, sig, pubkey)` | WOTS+ signature verification |
| `verifySLHDSA_SHA2_128s(msg, sig, pubkey)` | SLH-DSA (FIPS 205) 128-bit small |
| `verifySLHDSA_SHA2_128f(msg, sig, pubkey)` | SLH-DSA 128-bit fast |
| `verifySLHDSA_SHA2_192s(msg, sig, pubkey)` | SLH-DSA 192-bit small |
| `verifySLHDSA_SHA2_192f(msg, sig, pubkey)` | SLH-DSA 192-bit fast |
| `verifySLHDSA_SHA2_256s(msg, sig, pubkey)` | SLH-DSA 256-bit small |
| `verifySLHDSA_SHA2_256f(msg, sig, pubkey)` | SLH-DSA 256-bit fast |

### Elliptic Curve

| Function | Description |
|----------|-------------|
| `ecAdd(a, b)` | EC point addition |
| `ecMul(p, k)` | EC scalar multiplication |
| `ecMulGen(k)` | Generator point multiplication |
| `ecNegate(p)` | EC point negation |
| `ecOnCurve(p)` | Point on curve check |
| `ecModReduce(value, mod)` | Modular reduction |
| `ecEncodeCompressed(p)` | Compress point to 33 bytes |
| `ecMakePoint(x, y)` | Construct point from coordinates |
| `ecPointX(p)` / `ecPointY(p)` | Extract coordinates |

### Byte Operations

`len`, `cat`, `substr`, `left`, `right`, `split`, `reverseBytes`, `num2bin`, `bin2num`, `int2str`

### Math

`abs`, `min`, `max`, `within`, `safediv`, `safemod`, `clamp`, `sign`, `pow`, `mulDiv`, `percentOf`, `sqrt`, `gcd`, `divmod`, `log2`, `bool`

## Types

| Type | Description |
|------|-------------|
| `ByteString` | Hex-encoded byte string |
| `PubKey` | Public key (branded ByteString) |
| `Sig` | ECDSA signature |
| `Addr` | 20-byte address (alias for Ripemd160) |
| `Sha256` | 32-byte SHA-256 hash |
| `Ripemd160` | 20-byte RIPEMD-160 hash |
| `RabinSig` / `RabinPubKey` | Rabin signature types |
| `Point` | Elliptic curve point |
| `OpCodeType` | Script opcode |
| `SigHashType` | Signature hash type |
| `SigHashPreimage` | Transaction preimage |
| `FixedArray<T, N>` | Fixed-size array |

## Example Contracts (23)

| Contract | Pattern | Stateful | v0.3 New |
|----------|---------|----------|----------|
| P2PKH | Standard payments | No | |
| Escrow | Multi-party (4 paths) | No | |
| Counter | State machine | Yes | |
| Auction | Bidding with deadline | Yes | |
| CovenantVault | Spending constraints | No | |
| OraclePriceFeed | Rabin signature oracle | No | |
| FungibleToken | Split/merge tokens | Yes | |
| SimpleNFT | Transfer/burn NFT | Yes | |
| PostQuantumWallet | WOTS+ signatures | No | |
| SPHINCSWallet | SLH-DSA (FIPS 205) | No | |
| SchnorrZKP | Zero-knowledge proof | No | |
| FunctionPatterns | Methods and builtins | Yes | |
| MathDemo | Math built-ins | Yes | |
| ConvergenceProof | Convergence pattern | No | |
| ECDemo | EC point operations | No | |
| BoundedCounter | Property initializers | Yes | |
| BooleanLogic | Boolean operations | No | |
| Arithmetic | Arithmetic operations | No | |
| P2Blake3PKH | BLAKE3 hash verification | No | v0.3 |
| BLAKE3 | BLAKE3 compress/hash | No | v0.3 |
| SHA256Compress | SHA-256 compression | No | v0.3 |
| SHA256Finalize | SHA-256 finalization | No | v0.3 |
| TicTacToe | On-chain game | Yes | v0.3 |

All contracts available in 6 formats (TypeScript, Go, Rust, Solidity, Move, Python).

## Language Subset

**Allowed:** Class/struct declarations, readonly/mutable properties, public/private methods, const/let variables, if/else, bounded for loops, arithmetic/comparison/logical/bitwise operators, ternary expressions, array literals (v0.3), Runar built-in function calls only.

**Disallowed:** Unbounded loops, recursion, async/await, closures, exceptions, dynamic arrays, arbitrary function calls (Math.floor, console.log, etc.).

## Compiler Gotchas (verified by live testing)

These behaviors were discovered by compiling real contracts and hitting actual errors. They stem from the stack-based compilation model — the compiler maps variables to stack positions, and complex variable lifetimes can exceed what the stack-lower pass handles.

### 1. Variables get dropped inside loops

The compiler's stack management drops outer variables when loop bodies reference too many values. If you declare a variable before a `for` loop and reference it inside, the compiler may report "Value not found on stack."

**Fails:**
```typescript
const difficulty = this.startingDifficulty + extraBits;
const fullBytes = safediv(difficulty, 8n);
for (let i = 0; i < 8; i++) {
  if (i < fullBytes) {  // ERROR: fullBytes or difficulty not on stack
    assert(bin2num(substr(hash, i, 1n)) === 0n);
  }
}
```

**Fix:** Recompute inside the loop, or unroll the loop into sequential if/else chains. Unrolling avoids the stack pressure entirely and often produces smaller script.

### 2. Public methods cannot return values to other methods

Public methods compile to separate script entry points. A public method that returns `bigint` will fail if another method tries to use the return value — the compiler treats public method calls as void.

**Fails:**
```typescript
public calculateDifficulty(): bigint { return this.startingDifficulty + extra; }
public redeem(nonce: ByteString) {
  const diff = this.calculateDifficulty();  // ERROR: got 'void'
}
```

**Fix:** Inline the logic directly into the calling method. If shared logic is needed, keep it as a computation block, not a separate public method.

### 3. `this.addOutput()` takes only MUTABLE state fields

For `StatefulSmartContract`, `this.addOutput(satoshis, ...mutableFields)` only needs the values for mutable properties. Readonly properties are embedded in the compiled script at constructor slots and carry forward automatically.

```typescript
class MyContract extends StatefulSmartContract {
  counter: bigint;           // mutable → pass to addOutput
  readonly max: bigint;      // readonly → embedded in script, do NOT pass

  public increment() {
    this.counter = this.counter + 1n;
    this.addOutput(1n, this.counter);  // only mutable field
  }
}
```

### 4. `this.txPreimage` is available but raw

Stateful contracts can access `this.txPreimage` (BIP-143 sighash preimage). The compiler verifies the preimage automatically via `OP_CHECKSIGVERIFY` with the secp256k1 generator point.

To extract the outpoint txid (e.g. for proof-of-work puzzles):
```typescript
// BIP-143 preimage layout: offset 68 = outpoint (36 bytes: txid[32] + vout[4])
const txid = substr(this.txPreimage, 68n, 32n);
```

The FungibleToken example imports `extractOutpoint` from `runar-lang`, but raw `substr` on the preimage also works and is simpler.

### 5. The compiler auto-adds method parameters

The compiled ABI adds parameters the developer didn't write:
- `_changePKH: Ripemd160` — change address
- `_changeAmount: bigint` — change satoshis
- `txPreimage: SigHashPreimage` — BIP-143 preimage

These are provided by the transaction builder (runar-sdk), not the miner/user. The contract source only declares the "logical" parameters.

### 6. Unrolled if/else chains beat loops for stack management

When checking N conditions where N is bounded and each condition is similar (e.g., checking bytes of a hash), unrolled if/else chains compile cleanly while `for` loops with the same logic hit stack issues. The compiled script is similar size either way because loop iterations get unrolled during compilation anyway.

### 7. Script number encoding for bigint

Bitcoin Script numbers are little-endian with a sign bit. Large values like `21000000` encode as `406f4001` (4 bytes LE). The `constructorSlots` in the artifact specify byte offsets where these encoded values are embedded in the script hex.

### 8. `addRawOutput` for non-contract outputs

`this.addOutput(satoshis, ...mutableFields)` creates continuation outputs (new instances of the same contract). For arbitrary outputs — P2PKH payouts, inscription outputs, outputs locked to different contracts — use `this.addRawOutput(satoshis, scriptBytes)`.

Both are included in the compiler's auto-generated `hashOutputs` verification:
```
hash256(addOutput_0 + addOutput_1 + ... + addRawOutput_0 + ... + changeOutput) == extractOutputHash(preimage)
```

The compiler always appends a P2PKH change output built from `_changePKH` + `_changeAmount`. There is no way to skip it.

**Example** (from BondedCounter in amm-swap):
```typescript
// Output 0: contract continuation
this.addOutput(1n, this.count);

// Output 1: inscription + BondedOutput locking script
const envelopePrefix = toByteString('006303' + '6f7264' + '0101' + '0a' + '746578742f706c61696e' + '00');
const inscriptionScript = cat(cat(cat(cat(envelopePrefix, countLen), countStr), toByteString('68')), this.bondedOutputScript);
this.addRawOutput(1n, inscriptionScript);

// Output 2: P2PKH (auto-appended change)
```

### 9. Auto-injected implicit parameters (full list)

For stateful public methods, the compiler injects these beyond what the developer writes:
- `_opPushTxSig` — OP_PUSH_TX DER signature (k=1 deterministic key)
- `_codePart` — contract code portion (when method uses `addOutput` or `addRawOutput`)
- `_changePKH` — 20-byte address hash for change output
- `_changeAmount` — satoshis for change output
- `_newAmount` — satoshis for continuation (single-output methods only)
- `txPreimage` — BIP-143 sighash preimage

### 10. Trailing outputs gap

The compiler auto-appends a P2PKH change output to every stateful method's hashOutputs check. There is no `trailingOutputs` parameter pattern (like sCrypt's) for contracts with dynamic output structures. This limits contracts that need to include variable numbers of outputs after the contract's fixed outputs.

### 11. `int2str` is NOT ASCII

`int2str(n, byteLen)` compiles to `OP_NUM2BIN` — Bitcoin Script number encoding (little-endian sign-magnitude). `int2str(42n, 1n)` produces `0x2a`, NOT ASCII `"42"` (`0x3432`). For inscription content needing human-readable text (e.g., BSV-20 `amt` field), ASCII conversion must be done off-chain or via manual lookup table.

### 12. State encoding format

State is serialized after `OP_RETURN` in the locking script: `<code> OP_RETURN <field_0> <field_1> ... <field_n>`. Fixed-width for known types: 8 bytes bigint, 1 byte bool, 33 bytes PubKey, 20 bytes Addr. Variable-length types use standard Bitcoin push data framing. The artifact's `stateFields` array describes field order, types, and sizes.

### 13. SDK hardcodes SIGHASH_ALL

`computeOpPushTx` hardcodes `SIGHASH_ALL | SIGHASH_FORKID`. For contracts needing `SIGHASH_NONE` (like BondedOutput which enforces atomicity but not outputs), you must bypass the SDK's preimage computation. Per-input sighash requires manual transaction construction via `@bsv/sdk`.

## BSV21 Token Integration (inscription model)

Inscriptions are NOP-prepended dead code in locking scripts: `OP_FALSE OP_IF "ord" OP_1 <contentType> OP_0 <content> OP_ENDIF`. The Bitcoin VM skips the false branch. The indexer reads it for token accounting.

### Runar can construct inscriptions in-script

The primitives (`cat`, `num2bin`, `toByteString`) are sufficient to build inscription envelopes on-chain. Validated in the amm-swap BondedCounter prototype:

```typescript
const envelopePrefix = toByteString('006303' + '6f7264' + '0101' + '0a' + '746578742f706c61696e' + '00');
const envelope = cat(cat(cat(envelopePrefix, contentLenByte), content), toByteString('68'));
const fullScript = cat(envelope, lockingScript);
this.addRawOutput(1n, fullScript);
```

This IS verified on-chain via hashOutputs — the covenant enforces the exact inscription content.

### What's missing for full BSV21 support

1. **`runar-ord` library** — No ordinals helper package yet. `scrypt-ord` provides `Ordinal.createInsciption()`, `BSV20V2.createTransferInsciption()`, `Ordinal.int2Str()` (ASCII conversion). Runar needs equivalents.
2. **No-op prefixed continuation** — `addOutput` builds `<codePart> OP_RETURN <state>`. It can't prepend an inscription. For contracts where the contract IS the token (like POW20), the continuation output needs `<inscription> <code> OP_RETURN <state>`. This requires `addPrefixedOutput(satoshis, prefix, ...stateValues)` or exposing `_codePart` as a readable property.
3. **ASCII integer conversion** — BSV-20 JSON `amt` field needs decimal text. `int2str` produces binary, not ASCII.
4. **Trailing outputs** — Compiler auto-appends change. No way to add dynamic outputs after the contract's fixed outputs.

### Transaction structure for BSV21 token contracts

```
Deploy tx:
  Output 0: [inscription: deploy+mint JSON] [contract script] (1 sat)
  Output 1: Change P2PKH

Mine/redeem tx:
  Input 0: Spend contract UTXO
  Output 0: [inscription: transfer JSON, remaining supply] [contract script, updated state] (1 sat)
  Output 1: [inscription: transfer JSON, reward] [P2PKH to miner] (1 sat)
  Output 2: Change P2PKH
```

### Runar ↔ sCrypt feature mapping for tokens

| sCrypt | Runar | Status |
|---|---|---|
| `Utils.buildOutput(script, value)` | `addRawOutput(satoshis, scriptBytes)` | Works |
| `Ordinal.createInsciption(data, type)` | Manual byte assembly via `cat`/`toByteString` | Works (no helper) |
| `Ordinal.int2Str(n)` (ASCII decimal) | Not available (`int2str` is `OP_NUM2BIN`) | Gap |
| `BSV20V2.buildTransferOutput(addr, id, amt)` | Manual construction | Works (no helper) |
| `this.buildStateOutput(amount)` with inscription prefix | `addOutput` (no prefix support) | Gap |
| `this.ctx.hashOutputs` manual verification | Auto-injected by compiler | Works differently |
| `trailingOutputs` parameter | Not supported | Gap |

## Multi-Language Examples

### Go
```go
type P2PKH struct {
    runar.SmartContract
    PubKeyHash runar.Addr `runar:"readonly"`
}
func (c *P2PKH) Unlock(sig runar.Sig, pubKey runar.PubKey) {
    runar.Assert(runar.Hash160(pubKey) == c.PubKeyHash)
    runar.Assert(runar.CheckSig(sig, pubKey))
}
```

### Rust
```rust
#[runar::contract]
pub struct P2PKH {
    #[readonly]
    pub pub_key_hash: Addr,
}
#[runar::methods(P2PKH)]
impl P2PKH {
    #[public]
    pub fn unlock(&self, sig: &Sig, pub_key: &PubKey) {
        assert!(hash160(pub_key) == self.pub_key_hash);
        assert!(check_sig(sig, pub_key));
    }
}
```

### Python
```python
class P2PKH(SmartContract):
    pub_key_hash: Addr
    def __init__(self, pub_key_hash: Addr):
        super().__init__(pub_key_hash)
        self.pub_key_hash = pub_key_hash
    @public
    def unlock(self, sig: Sig, pub_key: PubKey):
        assert hash160(pub_key) == self.pub_key_hash
        assert check_sig(sig, pub_key)
```
