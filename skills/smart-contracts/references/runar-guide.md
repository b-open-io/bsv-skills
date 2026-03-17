# Runar Framework Guide

Runar compiles a strict subset of TypeScript, Go, Rust, Python, Solidity, or Move into Bitcoin SV Script. Four independent compiler implementations (TypeScript, Go, Rust, Python) produce identical output for the same input.

**Source**: https://github.com/icellan/runar
**Playground**: https://runar.run
**Docs**: https://runar.build

## Installation

### From npm

```bash
pnpm add runar-lang runar-compiler runar-cli
```

- **runar-lang** — Types and built-in function declarations imported in contracts
- **runar-compiler** — Reference TypeScript-to-Bitcoin-Script compiler
- **runar-cli** — Command-line tool for compiling, testing, deploying

### From Source

```bash
git clone https://github.com/icellan/runar.git && cd runar
pnpm install && pnpm build
```

### Go/Rust/Python SDKs

```bash
# Go contracts
go get github.com/icellan/runar/packages/runar-go

# Rust contracts
cargo add runar

# Python contracts
pip install runar-py
```

## Supported Formats

| Format | Extension | IDE Support | Status |
|--------|-----------|-------------|--------|
| TypeScript | `.runar.ts` | Full (tsc) | Stable |
| Go | `.runar.go` | Full (gopls) | Experimental |
| Rust DSL | `.runar.rs` | Full (rust-analyzer) | Experimental |
| Python | `.runar.py` | Full (pyright) | Experimental |
| Solidity-like | `.runar.sol` | Syntax highlighting | Experimental |
| Move-style | `.runar.move` | Syntax highlighting | Experimental |

All formats parse into the same `ContractNode` AST and produce identical Bitcoin Script.

## Language Subset

Only a strict subset of each language is valid Runar:

**Allowed:** Class/struct declarations, readonly/mutable properties, public/private methods, const/let variables, if/else, bounded for loops, arithmetic/comparison/logical/bitwise operators, ternary expressions, Runar built-in function calls.

**Disallowed:** Unbounded loops, recursion, async/await, closures, exceptions, dynamic arrays, arbitrary function calls.

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

Compiles to: `OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG`

### Stateful (`StatefulSmartContract`)

Mutable properties carried across transactions via OP_PUSH_TX. Access preimage fields via `this.txPreimage`.

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

Contracts that create multiple outputs for token splitting/merging:

```typescript
class FungibleToken extends StatefulSmartContract {
  owner: PubKey;
  balance: bigint;
  tokenId: Bytes;

  public transfer(to: PubKey, amount: bigint, sig: Sig) {
    assert(checkSig(sig, this.owner));
    assert(amount > 0n && amount <= this.balance);
    this.addOutput(1n, to, amount, this.tokenId);          // recipient
    this.addOutput(1n, this.owner, this.balance - amount, this.tokenId); // change
  }
}
```

### Multi-Method Dispatch

Contracts with multiple public methods get a compiler-generated dispatch table. The unlocking script includes a method index (`0n`, `1n`, etc.):

```typescript
class Escrow extends SmartContract {
  readonly buyer: PubKey;
  readonly seller: PubKey;
  readonly arbiter: PubKey;

  public release(sig: Sig) {
    assert(checkSig(sig, this.seller) || checkSig(sig, this.arbiter));
  }
  public refund(sig: Sig) {
    assert(checkSig(sig, this.buyer) || checkSig(sig, this.arbiter));
  }
}
```

## Compilation Pipeline

Six nanopass transforms, each a pure function:

| Pass | Name | Input → Output |
|------|------|----------------|
| 1 | Parse | Source → Runar AST |
| 2 | Validate | AST → Validated AST |
| 3 | Type-check | Validated AST → Typed AST |
| 4 | ANF Lower | Typed AST → ANF IR |
| 5 | Stack Lower | ANF IR → Stack IR |
| 6 | Emit | Stack IR → Bitcoin Script |

Peephole optimizer runs between passes 5-6 (always enabled). Constant folding available between 4-5 (disabled by default).

```bash
# Compile
npx runar compile MyContract.runar.ts

# Compile with optimization
npx runar compile MyContract.runar.ts --optimize

# Compile and output AST
npx runar compile MyContract.runar.ts --emit ast
```

## Testing

### TestContract API

```typescript
import { readFileSync } from 'node:fs';
import { TestContract } from 'runar-testing';

const source = readFileSync('Counter.runar.ts', 'utf8');
const counter = TestContract.fromSource(source, { count: 0n });

counter.call('increment');
console.log(counter.state.count); // 1n

counter.call('increment');
counter.call('decrement');
console.log(counter.state.count); // 1n

// Failing assertion
const result = TestContract.fromSource(source, { count: 0n }).call('decrement');
console.log(result.success); // false
```

### Running Tests

```bash
npx vitest run                           # All TypeScript tests
cd compilers/go && go test ./...         # Go compiler tests
cd compilers/rust && cargo test          # Rust compiler tests
cd examples/go && go test ./...          # Go contract tests
```

## Deployment

```typescript
import { RunarProvider, WifSigner } from 'runar-sdk';

const provider = new RunarProvider('mainnet');
const signer = new WifSigner(wif);

// Deploy
const deployed = await provider.deploy(artifact, [constructorArg1], {
  signer,
  satoshis: 1000,
});

// Call method on deployed contract
const result = await deployed.call('unlock', [sig, pubKey], { signer });
```

## Built-in Functions

| Function | Bitcoin Script | Description |
|----------|---------------|-------------|
| `assert(cond)` | `OP_VERIFY` | Spending condition |
| `hash160(data)` | `OP_HASH160` | SHA-256 + RIPEMD-160 |
| `sha256(data)` | `OP_SHA256` | SHA-256 |
| `ripemd160(data)` | `OP_RIPEMD160` | RIPEMD-160 |
| `checkSig(sig, pk)` | `OP_CHECKSIG` | ECDSA verify |
| `checkMultiSig(sigs, pks)` | `OP_CHECKMULTISIG` | M-of-N verify |
| `abs(n)` | `OP_ABS` | Absolute value |
| `min(a, b)` | `OP_MIN` | Minimum |
| `max(a, b)` | `OP_MAX` | Maximum |
| `within(x, lo, hi)` | `OP_WITHIN` | Range check |

## Example Contracts

16 example contracts in the repo:

| Contract | Pattern | Stateful |
|----------|---------|----------|
| P2PKH | Standard payments | No |
| Escrow | Multi-party (4 paths) | No |
| Counter | State machine | Yes |
| Auction | Bidding with deadline | Yes |
| CovenantVault | Spending constraints | No |
| OraclePriceFeed | Rabin signature oracle | No |
| FungibleToken | Split/merge tokens | Yes |
| SimpleNFT | Transfer/burn NFT | Yes |
| PostQuantumWallet | WOTS+ signatures | No |
| SPHINCSWallet | SLH-DSA (FIPS 205) | No |
| SchnorrZKP | Zero-knowledge proof | No |
| FunctionPatterns | Methods and builtins | Yes |
| MathDemo | Math built-ins | Yes |
| ConvergenceProof | Convergence pattern | No |
| ECDemo | EC point operations | No |
| BoundedCounter | Property initializers | Yes |

All available in 6 formats (TypeScript, Go, Rust, Solidity, Move, Python).

## Multi-Language Examples

The same contract in all supported formats:

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
