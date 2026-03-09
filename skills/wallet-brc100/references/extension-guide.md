# BRC-100 Browser Extension Wallet Guide

This guide covers building BRC-100 compliant browser extension wallets, based on the yours-wallet reference implementation.

## Reference Implementation

- **yours-wallet**: https://github.com/AustinKelsay/yours-wallet
  - Open source, non-custodial BSV wallet
  - Chrome extension (Manifest V3)
  - Full BRC-100 WalletInterface (CWI) implementation
  - React + TypeScript + Vite

- **Provider API Documentation**: https://yours-wallet.gitbook.io/provider-api
  - API reference for `window.CWI` (BRC-100 WalletInterface)
  - Integration guides for web applications

---

## Architecture Overview

Browser extensions have a unique multi-process architecture:

```
Website JavaScript
       | (CustomEvent)
       v
Inject Script (window.CWI)
       | (chrome.runtime.sendMessage)
       v
Content Script (bridge)
       | (chrome.runtime.sendMessage)
       v
Background Service Worker
       | (response callback)
       v
   Back to Website
```

### Key Components

| Component | Process | Purpose |
|-----------|---------|---------|
| Background Script | Service Worker | Persistent wallet state, read-only operations |
| Content Script | Per-tab | Message bridge between page and extension |
| Inject Script | Page context | Exposes `window.CWI` (BRC-100 WalletInterface) |
| Popup UI | Extension popup | User confirmations, signing operations |

---

## Storage Patterns

### Chrome Storage (Account Data)

```typescript
interface ChromeStorageObject {
  accounts: {
    [identityAddress: string]: Account;  // Multi-account support
  };
  selectedAccount: string;
  passKey: string;          // Password hash (PBKDF2)
  salt: string;             // Random salt
  isLocked: boolean;
}

interface Account {
  name: string;
  encryptedKeys: string;    // AES encrypted JSON
  addresses: Addresses;
  pubKeys: PubKeys;
}
```

### IndexedDB (Wallet Data)

```typescript
import { StorageIdb } from '@bsv/wallet-toolbox'

// Per-account IndexedDB database
const storage = new StorageIdb({
  idb: await openDB(`wallet-${accountId}`, 1),
  storageIdentityKey: identityPubKey,
  storageName: 'extension-wallet'
})
```

See [storage-patterns.md](./storage-patterns.md) for encryption details.

---

## Two-Wallet Pattern

Extensions use two wallet instances for security:

### 1. Read-Only Wallet (Background - Always Available)

```typescript
import { Wallet, ReadOnlySigner } from '@bsv/wallet-toolbox'

// Uses public key only - no signing capability
const keyDeriver = new ReadOnlySigner(identityPubKey)
const wallet = new Wallet({
  chain: 'main',
  keyDeriver,
  storage,
  services
})

// Safe operations (no password required)
await wallet.listOutputs({ basket: 'default' })
await wallet.listActions({ limit: 50 })
await wallet.getPublicKey({ identityKey: true })
```

### 2. Signing Wallet (Popup - Temporary)

```typescript
import { Wallet, KeyDeriver } from '@bsv/wallet-toolbox'
import { PrivateKey } from '@bsv/sdk'

// Only created when user provides password
const decryptedKeys = await decryptKeys(encryptedKeys, password)
const identityKey = PrivateKey.fromWif(decryptedKeys.identityWif)
const keyDeriver = new KeyDeriver(identityKey)

const signingWallet = new Wallet({
  chain: 'main',
  keyDeriver,
  storage,
  services
})

// Privileged operations
await signingWallet.createSignature({ ... })
await signingWallet.encrypt({ ... })
await signingWallet.createAction({ ... })

// Discard after use - don't persist private keys
```

---

## Message Passing Architecture

### Inject Script (Page Context)

```typescript
// inject.ts - Runs on every page
const createCWIMethod = <TResult, TArgs>(eventName: string) => {
  return async (args: TArgs): Promise<TResult> => {
    return new Promise((resolve, reject) => {
      const messageId = `${eventName}-${Date.now()}-${Math.random()}`

      // One-time listener for response
      function onResponse(e: Event) {
        const detail = (e as CustomEvent).detail
        if (detail.success) resolve(detail.data)
        else reject(new Error(detail.error))
      }

      self.addEventListener(messageId, onResponse, { once: true })

      // Send request
      self.dispatchEvent(new CustomEvent('YoursRequest', {
        detail: { messageId, type: eventName, params: args }
      }))
    })
  }
}

// Expose BRC-100 interface
window.CWI = {
  listOutputs: createCWIMethod('cwi_listOutputs'),
  createSignature: createCWIMethod('cwi_createSignature'),
  encrypt: createCWIMethod('cwi_encrypt'),
  // ... all BRC-100 methods
}
```

### Content Script (Bridge)

```typescript
// content.ts - Bridges page to extension
self.addEventListener('YoursRequest', (e: Event) => {
  const { type, messageId, params } = (e as CustomEvent).detail

  // Forward to background with domain info
  chrome.runtime.sendMessage(
    { action: type, params: { ...params, domain: location.hostname } },
    (response) => {
      // Send response back to page
      self.dispatchEvent(new CustomEvent(messageId, { detail: response }))
    }
  )
})
```

### Background Script (Handler)

```typescript
// background.ts - Service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    // Read-only operations - handle immediately
    case 'cwi_listOutputs':
      handleListOutputs(message.params).then(sendResponse)
      return true // Async response

    // Signing operations - require popup
    case 'cwi_createSignature':
      // Store request, open popup, wait for user
      storeRequest(message)
      openPopup()
      // Response sent later via popup callback
      return true
  }
})
```

---

## Popup Request Flow

For operations requiring user confirmation:

```typescript
// 1. Background stores request in chrome.storage
await chrome.storage.local.set({
  pendingSignatureRequest: {
    ...args,
    sendResponseId: generateId()
  }
})

// 2. Background opens popup
chrome.windows.create({
  url: chrome.runtime.getURL('index.html'),
  type: 'popup',
  width: 392,
  height: 567
})

// 3. Popup reads request and renders UI
const SignatureRequest = () => {
  const [request, setRequest] = useState(null)

  useEffect(() => {
    chrome.storage.local.get('pendingSignatureRequest', (data) => {
      setRequest(data.pendingSignatureRequest)
    })
  }, [])

  const handleSign = async (password: string) => {
    const keys = await decryptKeys(password)
    const wallet = await createSigningWallet(keys)
    const result = await wallet.createSignature(request)

    // Send result back to background
    chrome.runtime.sendMessage({
      action: 'cwi_createSignature_response',
      result
    })
  }

  return <PasswordPrompt onSubmit={handleSign} />
}

// 4. Background receives response and forwards to content script
```

---

## Key Management

### Key Derivation (BIP39 + HD)

```typescript
import { Mnemonic, HD } from '@bsv/sdk'
import bip39 from 'bip39'

interface Keys {
  mnemonic: string;

  // Payment key (m/44'/236'/0'/0/0)
  walletWif: string;
  walletAddress: string;

  // Ordinal key (m/44'/236'/0'/1/0)
  ordWif: string;
  ordAddress: string;

  // Identity key (m/44'/236'/218'/0/0)
  identityWif: string;
  identityPubKey: string;
}

function deriveKeys(mnemonic: string): Keys {
  const seed = Mnemonic.fromString(mnemonic).toSeed()
  const master = HD.fromSeed(seed)

  const wallet = master.derive("m/44'/236'/0'/0/0")
  const ord = master.derive("m/44'/236'/0'/1/0")
  const identity = master.derive("m/44'/236'/218'/0/0")

  return {
    mnemonic,
    walletWif: wallet.privKey.toWif(),
    walletAddress: wallet.pubKey.toAddress(),
    // ... etc
  }
}
```

### Encryption Pattern

```typescript
import CryptoJS from 'crypto-js'

function encryptKeys(keys: Keys, password: string): string {
  const salt = CryptoJS.lib.WordArray.random(128 / 8)
  const iv = CryptoJS.lib.WordArray.random(128 / 8)
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000  // High iteration count for security
  })

  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(keys),
    key,
    { iv }
  )

  // Prepend salt + iv for decryption
  return salt.toString() + iv.toString() + encrypted.toString()
}
```

---

## Authorization (Whitelist)

```typescript
interface Settings {
  whitelist: Array<{ domain: string; icon: string }>
  isPasswordRequired: boolean
}

async function checkAuthorization(domain: string): Promise<boolean> {
  const { accounts, selectedAccount } = await chrome.storage.local.get()
  const whitelist = accounts[selectedAccount].settings.whitelist
  return whitelist.some(app => app.domain === domain)
}

// Operations requiring authorization
const authRequired = [
  'cwi_createSignature',
  'cwi_encrypt',
  'cwi_decrypt',
  'cwi_createAction'
]

// Operations available without authorization
const noAuthRequired = [
  'cwi_isAuthenticated',
  'cwi_getPublicKey',  // Public info only
  'cwi_getVersion'
]
```

---

## Build Configuration (Vite + MV3)

```typescript
// vite.config.ts - Main popup/UI
export default {
  plugins: [react(), nodePolyfills()],
  build: {
    outDir: 'build',
    rollupOptions: {
      input: { main: 'index.html' }
    }
  }
}

// vite.config.background.ts - Service worker (ES module)
export default {
  build: {
    lib: {
      entry: 'src/background.ts',
      formats: ['es'],
      fileName: () => 'background.js'
    },
    emptyOutDir: false,
    rollupOptions: { external: ['chrome'] }
  }
}

// vite.config.content.ts - Content script (IIFE)
export default {
  build: {
    lib: {
      entry: 'src/content.ts',
      formats: ['iife'],
      fileName: () => 'content.js'
    },
    emptyOutDir: false
  }
}
```

---

## Security Checklist

- [ ] Private keys only in popup, never in background/content
- [ ] PBKDF2 with 100k+ iterations for key derivation
- [ ] Salt + IV prepended to encrypted data
- [ ] Whitelist-based domain authorization
- [ ] Unique messageId per request to prevent race conditions
- [ ] Password required for all signing operations
- [ ] Keys discarded after signing (not cached)

---

## Related References

- [storage-patterns.md](./storage-patterns.md) - IPC and encryption details
- [key-concepts.md](./key-concepts.md) - BRC-100 concepts (Actions, Baskets, etc.)
- [strategic-questionnaire.md](./strategic-questionnaire.md) - Decision tree
