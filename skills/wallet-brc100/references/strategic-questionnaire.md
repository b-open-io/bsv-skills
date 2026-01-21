# BRC-100 Wallet Strategic Questionnaire

Before implementing a BRC-100 wallet, work through these questions to determine the right architecture.

## 1. Platform Selection

**What type of wallet are you building?**

| Platform | Best For | Key Considerations |
|----------|----------|-------------------|
| **Desktop (Electron)** | Full-featured wallets, enterprise | IPC isolation, background processes, HTTPS server |
| **Browser Extension** | Web3 integration | Message passing, popup/background architecture |
| **Web Application** | SaaS wallets, custodial | IndexedDB storage, session management |
| **Mobile (React Native)** | Consumer apps | SQLite via react-native-sqlite-storage, secure enclave |
| **Node.js Service** | Backend wallets, CLIs | Full filesystem access, Knex + SQLite/MySQL |

**Reference Implementation**: For desktop wallets, study [bsv-desktop](https://github.com/bsv-blockchain/bsv-desktop) - a production Electron wallet with BRC-100 support.

---

## 2. Storage Model

**What storage model do you need?**

### Self-Custody (Local)
- User controls all keys
- Data stored locally (SQLite, IndexedDB)
- No external dependencies
- Backup responsibility on user

```typescript
// SQLite for Node.js/Electron
const storage = new StorageKnex({
  knex: Knex({ client: 'sqlite3', connection: { filename: './wallet.db' } }),
  storageIdentityKey: identityKey,
  storageName: 'local-wallet'
})
```

### Remote Storage (WAB/StorageClient)
- Hosted storage service
- Cross-device sync
- Backup handled by service
- Requires authentication

```typescript
// StorageClient for remote storage
const storage = new StorageClient({
  endpointUrl: 'https://storage.example.com',
  authToken: userToken
})
```

### Hybrid
- Local primary with cloud backup
- Best of both worlds
- More complex sync logic

See [storage-patterns.md](./storage-patterns.md) for detailed architecture patterns.

---

## 3. BRC-100 HTTP Interface

**Do external applications need to connect to your wallet?**

### Yes - Enable HTTPS Server

Required for:
- Browser apps using your wallet as signing service
- Other desktop apps delegating signing
- BRC-100 compliant wallet interfaces

```typescript
// bsv-desktop runs HTTPS server on port 2121
// External apps connect here for wallet operations
```

### No - Standalone Wallet

Simpler architecture if:
- Single application uses the wallet
- No external integrations needed
- Internal signing only

---

## 4. Authentication Model

**How will users authenticate?**

| Method | Security Level | User Experience |
|--------|---------------|-----------------|
| **Password + Encrypted Seed** | Medium | Familiar, but phishable |
| **Mnemonic Seed Phrase** | High | Standard, user backs up 12/24 words |
| **Hardware Wallet (BIP32)** | Very High | External device required |
| **WAB Tokens (UMP)** | High | Complex setup, enterprise use |
| **WebAuthn/Passkeys** | High | Modern browsers only |

For production wallets, consider combining methods (e.g., passkey + encrypted mnemonic backup).

---

## 5. Key Derivation Approach

**Which key derivation standard?**

### Type42/BRC-42 (Recommended)
- ECDH-based key derivation
- Counterparty-specific keys
- Privacy-preserving
- Used by modern BSV wallets

```typescript
import { KeyDeriver } from '@bsv/sdk'
const keyDeriver = new KeyDeriver(rootKey)
```

### BIP32/BRC-32 (Legacy HD Wallet)
- Hierarchical deterministic
- Industry standard
- Address reuse patterns possible
- Easier auditing

Choose Type42 for new implementations unless you need BIP32 compatibility.

---

## Decision Tree Summary

```
START
  |
  v
Platform?
  |
  +---> Desktop (Electron) ---> IPC Storage + HTTPS Server (see bsv-desktop)
  |
  +---> Browser Extension ---> IndexedDB + Message Passing
  |
  +---> Web App ---> IndexedDB + Session Auth
  |
  +---> Mobile ---> SQLite + Secure Enclave
  |
  +---> Node.js ---> Knex + SQLite/MySQL
  |
  v
Storage Mode?
  |
  +---> Self-custody ---> Local DB + User Backup
  |
  +---> Hosted ---> StorageClient + WAB Auth
  |
  +---> Hybrid ---> Both + Sync Logic
  |
  v
External API?
  |
  +---> Yes ---> HTTPS Server (BRC-100 interface)
  |
  +---> No ---> Internal wallet only
  |
  v
IMPLEMENT
```

---

## Next Steps

1. Review the platform guide for your chosen platform:
   - [extension-guide.md](./extension-guide.md) - Browser extensions (yours-wallet reference)
   - [desktop-guide.md](./desktop-guide.md) - Electron apps (bsv-desktop reference)
   - [web-guide.md](./web-guide.md) - Web applications
   - [mobile-guide.md](./mobile-guide.md) - React Native apps
   - [nodejs-guide.md](./nodejs-guide.md) - CLI tools and services
2. Study [storage-patterns.md](./storage-patterns.md) for storage architecture
3. Understand [key-concepts.md](./key-concepts.md) for BRC-100 specifics
4. Start with the relevant pattern from the main SKILL.md
