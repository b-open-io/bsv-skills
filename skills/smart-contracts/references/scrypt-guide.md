# sCrypt Framework Guide

sCrypt is an embedded Domain Specific Language (eDSL) based on TypeScript for writing smart contracts on Bitcoin SV. Contracts are TypeScript classes with decorators that compile to Bitcoin Script.

**Docs**: https://docs.scrypt.io
**Playground**: https://playground.scrypt.io
**Source**: https://github.com/sCrypt-Inc/scrypt-ts

## Installation

```bash
# Create new project
npx scrypt-cli project my-contract

# Or add to existing project
npm install scrypt-ts
```

## Core Concepts

### Decorators

sCrypt uses TypeScript decorators to mark contract elements:

| Decorator | Purpose |
|-----------|---------|
| `@prop()` | Immutable contract property (embedded in locking script) |
| `@prop(true)` | Mutable/stateful property (carried across transactions) |
| `@method()` | Public or non-public contract method |

### Contract Structure

```typescript
import { SmartContract, method, prop, assert, hash256, PubKey, Sig, PubKeyHash } from 'scrypt-ts';

class MyContract extends SmartContract {
  @prop()
  readonly owner: PubKeyHash;

  @prop(true)
  counter: bigint;

  constructor(owner: PubKeyHash, counter: bigint) {
    super(...arguments);
    this.owner = owner;
    this.counter = counter;
  }

  @method()
  public increment(sig: Sig, pubKey: PubKey) {
    assert(hash160(pubKey) == this.owner, 'wrong owner');
    assert(this.checkSig(sig, pubKey), 'invalid sig');
    this.counter++;
    assert(this.ctx.hashOutputs == hash256(this.buildStateOutput(this.ctx.utxo.value)));
  }
}
```

### Stateful Contracts

Stateful contracts maintain state across transactions using the OP_PUSH_TX pattern. The framework handles preimage verification automatically. To persist state:

1. Mark mutable properties with `@prop(true)`
2. At the end of a public method, build the state output and verify `this.ctx.hashOutputs`

```typescript
@method()
public increment() {
  this.count++;
  // Enforce the next UTXO carries the updated state
  assert(this.ctx.hashOutputs == hash256(this.buildStateOutput(this.ctx.utxo.value)));
}
```

## Types

### Primitive Types

| Type | Description |
|------|-------------|
| `boolean` | True/false |
| `bigint` | Arbitrary-precision integer (use `0n` literals) |
| `ByteString` | Hex-encoded byte string |
| `PubKey` | Public key |
| `Sig` | ECDSA signature |
| `PubKeyHash` / `Addr` | 20-byte address hash |
| `Sha256` | 32-byte SHA-256 hash |
| `Ripemd160` | 20-byte RIPEMD-160 hash |
| `OpCodeType` | Script opcode |
| `SigHashType` | Signature hash type |
| `SigHashPreimage` | Transaction preimage |

### Library Classes

Reusable code shared across contracts:

```typescript
class Util extends SmartContractLib {
  @method()
  static checkOwner(sig: Sig, pubKey: PubKey, owner: PubKeyHash): boolean {
    assert(hash160(pubKey) == owner);
    assert(checkSig(sig, pubKey));
    return true;
  }
}
```

### Fixed-Size Arrays

```typescript
@prop()
readonly pks: FixedArray<PubKey, 3>;
```

## Testing

### Local Testing

```typescript
import { TestWallet, TestProvider } from 'scrypt-ts/test';

const privateKey = bsv.PrivateKey.fromRandom();
const wallet = new TestWallet(privateKey, new TestProvider());

const instance = new MyContract(pubKeyHash, 0n);
await instance.connect(wallet);

// Deploy
const deployTx = await instance.deploy(1000);

// Call
const callResult = await instance.methods.increment(sig, pubKey);
```

### Method Call Transaction Builder

For fine-grained control over call transactions:

```typescript
const callResult = await instance.methods.increment(
  (sigResps) => findSig(sigResps, pubKey),
  pubKey,
  {
    pubKeyOrAddrToSign: pubKey,
  }
);
```

## Compilation

```bash
# Compile all contracts
npx scrypt-cli compile

# Output: artifacts/<ContractName>.json
```

The compiler produces a JSON artifact containing the compiled Bitcoin Script, ABI, and contract metadata. Load artifacts at runtime:

```typescript
import artifact from '../artifacts/MyContract.json';
MyContract.loadArtifact(artifact);
```

## Deployment

```typescript
import { bsv, DefaultProvider, WalletSigner } from 'scrypt-ts';

const provider = new DefaultProvider({ network: bsv.Networks.mainnet });
const signer = new WalletSigner(privateKey, provider);

const instance = new MyContract(pubKeyHash, 0n);
await instance.connect(signer);

const deployTx = await instance.deploy(satoshis);
console.log('Deployed:', deployTx.id);
```

## Advanced Patterns

### Hash Time-Locked Contract (HTLC)

```typescript
class HTLC extends SmartContract {
  @prop()
  readonly sender: PubKeyHash;
  @prop()
  readonly receiver: PubKeyHash;
  @prop()
  readonly hashSecret: Sha256;
  @prop()
  readonly deadline: bigint;

  @method()
  public claim(secret: ByteString, sig: Sig, pubKey: PubKey) {
    assert(sha256(secret) == this.hashSecret, 'wrong secret');
    assert(hash160(pubKey) == this.receiver, 'wrong receiver');
    assert(this.checkSig(sig, pubKey), 'invalid sig');
  }

  @method()
  public refund(sig: Sig, pubKey: PubKey) {
    assert(this.ctx.locktime >= this.deadline, 'too early');
    assert(hash160(pubKey) == this.sender, 'wrong sender');
    assert(this.checkSig(sig, pubKey), 'invalid sig');
  }
}
```

### Oracle Price Feed

```typescript
class OraclePriceFeed extends SmartContract {
  @prop()
  readonly oraclePubKey: RabinPubKey;

  @method()
  public verify(data: ByteString, sig: RabinSig) {
    assert(RabinVerifier.verifySig(data, sig, this.oraclePubKey));
    // Extract price from data and use it
  }
}
```

### Auction

```typescript
class Auction extends SmartContract {
  @prop(true)
  highestBidder: PubKey;
  @prop(true)
  highestBid: bigint;
  @prop()
  readonly deadline: bigint;

  @method()
  public bid(bidder: PubKey, bid: bigint) {
    assert(bid > this.highestBid, 'bid too low');
    assert(this.ctx.locktime < this.deadline, 'auction ended');

    // Refund previous bidder
    const refundOutput = Utils.buildPublicKeyHashOutput(
      hash160(this.highestBidder), this.highestBid
    );

    this.highestBidder = bidder;
    this.highestBid = bid;

    assert(this.ctx.hashOutputs == hash256(
      this.buildStateOutput(bid) + refundOutput
    ));
  }

  @method()
  public close(sig: Sig) {
    assert(this.ctx.locktime >= this.deadline, 'not ended');
    assert(this.checkSig(sig, this.highestBidder));
  }
}
```

## sCrypt CLI Commands

```bash
npx scrypt-cli project <name>     # Create new project
npx scrypt-cli compile             # Compile contracts
npx scrypt-cli deploy              # Deploy to network
npx scrypt-cli verify              # Verify on-chain contract
```

## Key Differences from Standard TypeScript

- Only `bigint` for numbers (no `number` type in contract methods)
- No floating point
- Limited loop constructs (must have compile-time-known bounds)
- No `string` type — use `ByteString` (hex-encoded)
- No dynamic arrays — use `FixedArray<T, N>`
- All contract properties must be decorated with `@prop()` or `@prop(true)`
- All contract methods must be decorated with `@method()`
- `console.log` and other runtime APIs not available in contract code

## Resources

- **Official Docs**: https://docs.scrypt.io
- **Tutorial: Hello World**: https://docs.scrypt.io/tutorials/hello-world
- **Tutorial: Auction**: https://docs.scrypt.io/tutorials/auction
- **GitHub Examples**: https://github.com/sCrypt-Inc/boilerplate
- **Academy**: https://academy.scrypt.io
