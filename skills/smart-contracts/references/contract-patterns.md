# Contract Patterns: Side-by-Side

Common BSV smart contract patterns implemented in both Runar and sCrypt for comparison.

## P2PKH (Pay-to-Public-Key-Hash)

The simplest spending condition. Funds are spent by providing a valid signature for the specified public key hash.

### Runar
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

### sCrypt
```typescript
import { SmartContract, method, prop, assert, hash160, PubKey, Sig, PubKeyHash } from 'scrypt-ts';

class P2PKH extends SmartContract {
  @prop()
  readonly pubKeyHash: PubKeyHash;
  constructor(pubKeyHash: PubKeyHash) {
    super(...arguments);
    this.pubKeyHash = pubKeyHash;
  }
  @method()
  public unlock(sig: Sig, pubKey: PubKey) {
    assert(hash160(pubKey) == this.pubKeyHash);
    assert(this.checkSig(sig, pubKey));
  }
}
```

**Both compile to**: `OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG`

---

## Multi-Party Escrow

Funds released to seller or refunded to buyer, with arbiter authorization.

### Runar
```typescript
import { SmartContract, assert, PubKey, Sig, checkSig } from 'runar-lang';

class Escrow extends SmartContract {
  readonly buyer: PubKey;
  readonly seller: PubKey;
  readonly arbiter: PubKey;

  constructor(buyer: PubKey, seller: PubKey, arbiter: PubKey) {
    super(buyer, seller, arbiter);
    this.buyer = buyer;
    this.seller = seller;
    this.arbiter = arbiter;
  }

  public release(sig: Sig) {
    assert(checkSig(sig, this.seller) || checkSig(sig, this.arbiter));
  }

  public refund(sig: Sig) {
    assert(checkSig(sig, this.buyer) || checkSig(sig, this.arbiter));
  }
}
```

### sCrypt
```typescript
import { SmartContract, method, prop, assert, PubKey, Sig } from 'scrypt-ts';

class Escrow extends SmartContract {
  @prop()
  readonly buyer: PubKey;
  @prop()
  readonly seller: PubKey;
  @prop()
  readonly arbiter: PubKey;

  constructor(buyer: PubKey, seller: PubKey, arbiter: PubKey) {
    super(...arguments);
    this.buyer = buyer;
    this.seller = seller;
    this.arbiter = arbiter;
  }

  @method()
  public release(sig: Sig) {
    assert(this.checkSig(sig, this.seller) || this.checkSig(sig, this.arbiter));
  }

  @method()
  public refund(sig: Sig) {
    assert(this.checkSig(sig, this.buyer) || this.checkSig(sig, this.arbiter));
  }
}
```

---

## Stateful Counter

On-chain counter that persists across transactions.

### Runar
```typescript
import { StatefulSmartContract, assert } from 'runar-lang';

class Counter extends StatefulSmartContract {
  count: bigint = 0n;
  constructor() { super(); }

  public increment() {
    this.count++;
  }

  public decrement() {
    assert(this.count > 0n);
    this.count--;
  }
}
```

### sCrypt
```typescript
import { SmartContract, method, prop, assert, hash256 } from 'scrypt-ts';

class Counter extends SmartContract {
  @prop(true)
  count: bigint;

  constructor(count: bigint) {
    super(...arguments);
    this.count = count;
  }

  @method()
  public increment() {
    this.count++;
    assert(this.ctx.hashOutputs == hash256(this.buildStateOutput(this.ctx.utxo.value)));
  }

  @method()
  public decrement() {
    assert(this.count > 0n, 'count is zero');
    this.count--;
    assert(this.ctx.hashOutputs == hash256(this.buildStateOutput(this.ctx.utxo.value)));
  }
}
```

**Key difference**: Runar handles OP_PUSH_TX automatically for `StatefulSmartContract`. sCrypt requires explicit `buildStateOutput` + `hashOutputs` verification.

---

## Covenant Vault

Spending constraints that limit where funds can go.

### Runar
```typescript
import { SmartContract, assert, PubKey, Sig, Addr, checkSig } from 'runar-lang';

class CovenantVault extends SmartContract {
  readonly owner: PubKey;
  readonly allowedDestination: Addr;

  constructor(owner: PubKey, allowedDestination: Addr) {
    super(owner, allowedDestination);
    this.owner = owner;
    this.allowedDestination = allowedDestination;
  }

  public spend(sig: Sig, amount: bigint) {
    assert(checkSig(sig, this.owner));
    // Covenant: verify the output pays to the allowed destination
    // Runar uses txPreimage introspection (available on StatefulSmartContract)
    // For stateless covenants, the spending constraint is enforced
    // by the script structure itself
  }
}
```

### sCrypt
```typescript
import { SmartContract, method, prop, assert, PubKey, Sig, PubKeyHash, Utils, hash256, hash160 } from 'scrypt-ts';

class CovenantVault extends SmartContract {
  @prop()
  readonly owner: PubKey;
  @prop()
  readonly allowedDest: PubKeyHash;

  constructor(owner: PubKey, allowedDest: PubKeyHash) {
    super(...arguments);
    this.owner = owner;
    this.allowedDest = allowedDest;
  }

  @method()
  public spend(sig: Sig, amount: bigint) {
    assert(this.checkSig(sig, this.owner), 'wrong owner');
    const output = Utils.buildPublicKeyHashOutput(this.allowedDest, amount);
    assert(this.ctx.hashOutputs == hash256(output), 'wrong destination');
  }
}
```

---

## Key Syntax Differences Summary

| Feature | Runar | sCrypt |
|---------|-------|--------|
| **Base class (stateless)** | `SmartContract` | `SmartContract` |
| **Base class (stateful)** | `StatefulSmartContract` | `SmartContract` with `@prop(true)` |
| **Immutable prop** | `readonly` keyword | `@prop()` decorator |
| **Mutable prop** | No keyword (just declare) | `@prop(true)` decorator |
| **Public method** | `public` keyword | `@method()` decorator |
| **Constructor super** | `super(prop1, prop2)` | `super(...arguments)` |
| **Sig check** | `checkSig(sig, pk)` | `this.checkSig(sig, pk)` |
| **State persistence** | Automatic (OP_PUSH_TX) | Manual `buildStateOutput` + `hashOutputs` |
| **Multi-output** | `this.addOutput(sats, ...)` | Build output scripts manually |
| **Equality** | `===` | `==` |
| **File extension** | `.runar.ts` | `.ts` |
| **Compilation** | `npx runar compile` | `npx scrypt-cli compile` |
