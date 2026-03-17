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

### 8. No way to enforce non-contract outputs (inscription gap)

`this.addOutput()` only creates continuation outputs — new instances of the same contract. There is no mechanism to verify arbitrary additional outputs (like a BSV21 reward inscription locked to a P2PKH).

**Why this matters:** In sCrypt's `scrypt-ord`, the contract manually constructs ALL expected output bytes and verifies `hash256(outputs) === this.ctx.hashOutputs`. This lets a covenant enforce that a specific inscription + P2PKH output exists in the transaction. Without this, a stateful covenant can verify its own continuation but cannot enforce what other outputs the transaction contains.

**Workaround:** Accept that non-contract outputs are validated by the indexer (BSV21 token indexer), not the covenant. Economically, miners have no incentive to mine without claiming their reward inscription. But this is weaker than full covenant enforcement.

**Upstream need:** A `this.addRawOutput(scriptHex, satoshis)` or similar mechanism that includes arbitrary output scripts in the `hashOutputs` verification would close this gap and enable full BSV21 token covenants in Runar.

## BSV21 Token Integration (inscription model)

sCrypt's `scrypt-ord` library shows how BSV21 tokens integrate with smart contracts. The key insight: **inscriptions are NOP-prepended dead code in the locking script**.

### How it works

A BSV21 token output's locking script looks like:
```
[OP_FALSE OP_IF "ord" OP_1 "application/bsv-20" OP_0 <json> OP_ENDIF] [actual locking script]
```

The `OP_FALSE OP_IF...OP_ENDIF` envelope is never executed by the Bitcoin VM — it's dead code. The indexer reads it for token accounting. The actual locking script (P2PKH, covenant, etc.) follows after `OP_ENDIF`.

### Deploy output (output 0)
```
inscription: {"p":"bsv-20","op":"deploy+mint","sym":"TOKEN","amt":"21000000","dec":"0"}
+ contract locking script (1 sat)
```

### Continuation output after mining (output 0)
```
inscription: {"p":"bsv-20","op":"transfer","id":"<tokenId>","amt":"<remaining_supply>"}
+ same contract locking script with updated state (1 sat)
```

### Reward output to miner (output 1)
```
inscription: {"p":"bsv-20","op":"transfer","id":"<tokenId>","amt":"<reward>"}
+ P2PKH to miner's address (1 sat)
```

### What Runar can and can't do here

Runar's `StatefulSmartContract` handles the continuation output (contract restating with updated supply). The inscription envelope wrapping and the reward output construction happen in the **transaction builder** (SDK-side), not inside the contract.

In sCrypt, the contract itself constructs these output byte strings on-chain and verifies them against `hashOutputs`. This is possible because sCrypt provides `Utils.buildOutput()`, `Utils.buildPublicKeyHashScript()`, and `Ordinal.createInsciption()` as on-chain helper methods. Runar would need equivalent on-chain string building + hashOutputs verification to match this capability.

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
