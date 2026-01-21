# BRC-100 Key Concepts

BRC-100 defines unique concepts that differ from typical Bitcoin wallet implementations. Understanding these is essential for proper integration.

## Actions vs Transactions

BRC-100 abstracts raw Bitcoin transactions into "Actions".

| Concept | Traditional Wallet | BRC-100 Wallet |
|---------|-------------------|----------------|
| Create TX | Build raw transaction | `createAction()` |
| Tracking | TXID only | Action with description, labels, metadata |
| Status | confirmed/unconfirmed | pending → unproven → proven → spent |
| Grouping | None | Labels and baskets |

### Action Lifecycle

```
createAction() → pending
      |
      v
    broadcast → unproven (waiting for merkle proof)
      |
      v
    confirmed → proven (has merkle proof)
      |
      v
    spent → output consumed by new action
```

### Creating an Action

```typescript
const result = await wallet.createAction({
  description: 'Payment to vendor',  // Human-readable description
  labels: ['vendor-payments', 'q1-2024'],  // For filtering/grouping
  outputs: [{
    lockingScript: recipientScript.toHex(),
    satoshis: 50000,
    outputDescription: 'Payment amount',
    basket: 'default',  // UTXO grouping
    tags: ['payment']   // Output-level metadata
  }],
  options: {
    acceptDelayedBroadcast: false,  // Wait for broadcast confirmation
    randomizeOutputs: true           // Privacy: shuffle output order
  }
})
```

---

## Baskets

Baskets are logical groupings for UTXOs. Think of them as "accounts" within your wallet.

### Common Basket Patterns

| Basket | Purpose |
|--------|---------|
| `default` | Change outputs, general funds |
| `tokens` | Token UTXOs (1Sat Ordinals, BSV-20) |
| `nfts` | NFT inscriptions |
| `locked` | Timelocked outputs |
| `incoming` | Received payments (before consolidation) |

### Using Baskets

```typescript
// Send from specific basket
const result = await wallet.createAction({
  description: 'Sell token',
  inputBEEF: tokenUtxo.beef,  // Specific input
  outputs: [{
    lockingScript: buyerScript.toHex(),
    satoshis: 1,
    basket: 'default'  // Change goes to default
  }]
})

// List outputs from basket
const tokens = await wallet.listOutputs({
  basket: 'tokens',
  spendable: true
})
```

---

## Tags

Tags are metadata labels attached to individual outputs. Unlike baskets (structural), tags are descriptive.

```typescript
// Create output with tags
await wallet.createAction({
  outputs: [{
    lockingScript: script.toHex(),
    satoshis: 1000,
    basket: 'default',
    tags: ['payment', 'invoice-123', 'customer-alice']
  }]
})

// Find outputs by tag
const alicePayments = await wallet.listOutputs({
  tags: ['customer-alice']
})
```

---

## Protocol and Security Levels (BRC-43)

BRC-43 defines security levels for different operations.

| Level | Name | Usage |
|-------|------|-------|
| 0 | Public | Non-sensitive operations |
| 1 | Standard | General wallet operations |
| 2 | Privileged | Sensitive operations (key export, etc.) |

### ProtocolID Format

Protocol IDs are tuples: `[securityLevel, protocolName]`

```typescript
// Standard encryption protocol
const encryptResult = await wallet.encrypt({
  plaintext: data,
  protocolID: [1, 'secure-messaging'],  // Level 1: Standard
  keyID: 'msg-key-1',
  counterparty: recipientPubKey
})

// Privileged operation (requires elevated access)
const exportResult = await wallet.getPrivateKey({
  protocolID: [2, 'key-export'],  // Level 2: Privileged
  keyID: 'backup',
  privileged: true
})
```

---

## Counterparty Key Agreement (Type42/BRC-42)

BRC-42 enables deriving unique keys for each counterparty.

### How It Works

```
Your Root Key + Counterparty PubKey + Protocol + KeyID
                    |
                    v
            Shared Secret (ECDH)
                    |
                    v
            Derived Key Pair
```

### Usage

```typescript
// Derive key for specific counterparty
const key = await wallet.getPublicKey({
  protocolID: [1, 'messaging'],
  keyID: 'encryption',
  counterparty: 'their-identity-key'  // Their public key
})

// Same call with different counterparty = different key
const key2 = await wallet.getPublicKey({
  protocolID: [1, 'messaging'],
  keyID: 'encryption',
  counterparty: 'another-identity-key'  // Different key derived
})
```

### Privacy Benefits

- Each relationship gets unique keys
- No key reuse across counterparties
- Compromising one key doesn't expose others

---

## Certificates (BRC-52/53/64/65)

Certificates are on-chain attestations about identity or capabilities.

### Certificate Types

| BRC | Purpose |
|-----|---------|
| BRC-52 | Identity certificates (name, email, etc.) |
| BRC-53 | Capability certificates (permissions) |
| BRC-64 | Selective revelation proofs |
| BRC-65 | Certificate revocation |

### Acquiring a Certificate

```typescript
// Request certificate from certifier
const cert = await wallet.acquireCertificate({
  acquisitionProtocol: 'issuance',
  type: 'https://example.com/kyc-certificate',
  certifier: 'certifier-identity-key',
  certifierUrl: 'https://certifier.example.com',
  fields: {
    name: 'Alice Smith',
    country: 'US'
  }
})
```

### Proving Certificate (Selective Revelation)

```typescript
// Prove only specific fields to verifier
const proof = await wallet.proveCertificate({
  certificateId: cert.certificateId,
  fieldsToReveal: ['name'],  // Only reveal name, not country
  verifier: 'verifier-identity-key'
})
```

---

## Background Monitoring

BRC-100 wallets need to track transaction confirmations and merkle proofs.

### Output States

```
pending → unproven → proven → spent
   |         |         |        |
   v         v         v        v
Created   Broadcast  Confirmed  Used in
but not   but no     with       another
broadcast proof      merkle     transaction
                     proof
```

### Monitor Process

```typescript
import { Monitor } from '@bsv/wallet-toolbox'

const monitor = new Monitor({
  storage: wallet.storage,
  services: wallet.services,
  chain: 'main'
})

// Listen for updates
monitor.on('transaction', (status) => {
  console.log(`TX ${status.txid}:`)
  console.log(`  Block: ${status.blockHeight}`)
  console.log(`  Merkle proof: ${status.merkleProof ? 'yes' : 'no'}`)
})

await monitor.start()
```

### What Monitor Does

1. **Polls for confirmations**: Checks if pending TXs are in blocks
2. **Fetches merkle proofs**: Downloads SPV proofs for confirmed TXs
3. **Updates output states**: Moves outputs through state machine
4. **Detects double-spends**: Alerts if TX conflicts detected

---

## Privileged Key Manager

Handles operations requiring elevated security.

```typescript
import { PrivilegedKeyManager } from '@bsv/wallet-toolbox'

const pkm = new PrivilegedKeyManager({
  rootKey: masterKey,
  // Optional: hardware wallet interface
  // hwInterface: ledgerInterface
})

// Used in wallet constructor
const wallet = new Wallet({
  chain: 'main',
  keyDeriver,
  storage,
  services,
  privilegedKeyManager: pkm  // Handles level-2 operations
})

// Privileged operations use the manager
const privateKey = await wallet.getPrivateKey({
  protocolID: [2, 'backup'],
  keyID: 'master',
  privileged: true  // Routed through PrivilegedKeyManager
})
```

---

## Summary: BRC-100 vs Traditional Wallets

| Aspect | Traditional | BRC-100 |
|--------|-------------|---------|
| TX creation | Raw transaction builder | `createAction()` with metadata |
| UTXO tracking | Manual or simple | Baskets + Tags + States |
| Key derivation | BIP32 paths | Type42 counterparty-based |
| Confirmations | Block count | Merkle proofs (SPV) |
| Identity | None | Certificate system |
| Security | Flat | Tiered (levels 0-2) |
| External API | Custom | Standardized BRC-100 interface |
