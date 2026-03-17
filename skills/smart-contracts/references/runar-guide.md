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

- **runar-lang** — Types, base classes, and 54 built-in function declarations
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
import { TestContract } from 'runar-testing';

// Stateless
const p2pkh = TestContract.fromSource(source, { pubKeyHash: '...' });
const result = p2pkh.call('unlock', { sig: '...', pubKey: '...' });
assert(result.success);

// Stateful — automatic state tracking (v0.3)
const counter = TestContract.fromSource(source, { count: 0n });
counter.call('increment');
console.log(counter.state.count); // 1n — ANF interpreter computes next state
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
