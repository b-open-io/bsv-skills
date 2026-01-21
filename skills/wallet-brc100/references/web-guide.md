# BRC-100 Web Application Wallet Guide

This guide covers building BRC-100 compliant wallets for web applications using IndexedDB storage.

---

## Architecture Overview

Web app wallets run entirely in the browser:

```
React/Vue/Svelte App
       |
       v
Wallet Instance (in-memory)
       |
       v
StorageIdb (IndexedDB)
       |
       v
Browser Persistence
```

### Key Characteristics

- **Single process**: No IPC needed
- **Session-based keys**: Decrypt on login, hold in memory
- **IndexedDB storage**: Persistent across sessions
- **No external interface**: Wallet only used by hosting app

---

## Basic Setup

```typescript
import { Wallet, StorageIdb, Services } from '@bsv/wallet-toolbox'
import { PrivateKey, KeyDeriver, Random } from '@bsv/sdk'
import { openDB } from 'idb'

async function createBrowserWallet(password: string) {
  // 1. Get or create encrypted seed from localStorage
  let seed: Uint8Array
  const encryptedSeed = localStorage.getItem('wallet_seed')

  if (encryptedSeed) {
    seed = await decryptSeed(encryptedSeed, password)
  } else {
    seed = Random(32)
    const encrypted = await encryptSeed(seed, password)
    localStorage.setItem('wallet_seed', encrypted)
  }

  const rootKey = new PrivateKey(seed)
  const keyDeriver = new KeyDeriver(rootKey)

  // 2. Open IndexedDB
  const db = await openDB('wallet-db', 1)

  const storage = new StorageIdb({
    idb: db,
    storageIdentityKey: rootKey.toPublicKey().toString(),
    storageName: 'web-wallet'
  })

  await storage.makeAvailable()

  // 3. Configure services
  const services = new Services({
    chain: 'main',
    arcUrl: 'https://arc.taal.com'
  })

  // 4. Create wallet
  return new Wallet({
    chain: 'main',
    keyDeriver,
    storage,
    services
  })
}
```

---

## Seed Encryption

Use Web Crypto API for secure encryption:

```typescript
async function encryptSeed(seed: Uint8Array, password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Derive key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  // Encrypt seed
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    seed
  )

  // Combine salt + iv + ciphertext
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(new Uint8Array(encrypted), salt.length + iv.length)

  return btoa(String.fromCharCode(...result))
}

async function decryptSeed(encrypted: string, password: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const data = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))

  const salt = data.slice(0, 16)
  const iv = data.slice(16, 28)
  const ciphertext = data.slice(28)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new Uint8Array(decrypted)
}
```

---

## Session Management

```typescript
// Context for wallet state
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface WalletContextType {
  wallet: Wallet | null
  isLocked: boolean
  unlock: (password: string) => Promise<void>
  lock: () => void
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [isLocked, setIsLocked] = useState(true)

  // Auto-lock on tab visibility change (optional)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Could auto-lock after timeout
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const unlock = async (password: string) => {
    const w = await createBrowserWallet(password)
    setWallet(w)
    setIsLocked(false)

    // Optional: Store unlock state in sessionStorage
    sessionStorage.setItem('wallet_unlocked', 'true')
  }

  const lock = () => {
    if (wallet) {
      wallet.destroy()
    }
    setWallet(null)
    setIsLocked(true)
    sessionStorage.removeItem('wallet_unlocked')
  }

  return (
    <WalletContext.Provider value={{ wallet, isLocked, unlock, lock }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
```

---

## Usage in Components

```typescript
function SendPayment() {
  const { wallet, isLocked } = useWallet()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [txid, setTxid] = useState<string | null>(null)

  if (isLocked) {
    return <div>Please unlock your wallet first</div>
  }

  const handleSend = async () => {
    if (!wallet) return

    const result = await wallet.createAction({
      description: 'Payment',
      outputs: [{
        lockingScript: Script.fromAddress(recipient).toHex(),
        satoshis: parseInt(amount),
        basket: 'default'
      }]
    })

    if (result.txid) {
      setTxid(result.txid)
    }
  }

  return (
    <div>
      <input
        placeholder="Recipient address"
        value={recipient}
        onChange={e => setRecipient(e.target.value)}
      />
      <input
        placeholder="Amount (satoshis)"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      <button onClick={handleSend}>Send</button>
      {txid && <div>Sent! TXID: {txid}</div>}
    </div>
  )
}
```

---

## IndexedDB Schema

StorageIdb creates these object stores automatically:

```typescript
// Managed by @bsv/wallet-toolbox
interface WalletDB {
  actions: {
    txid: string
    description: string
    status: 'pending' | 'unproven' | 'proven' | 'spent'
    // ...
  }
  outputs: {
    outpoint: string
    satoshis: number
    basket: string
    tags: string[]
    spendable: boolean
    // ...
  }
  certificates: {
    certificateId: string
    type: string
    certifier: string
    // ...
  }
}
```

---

## Limitations

### No Background Processing

Web apps can't run background tasks reliably:

- **No Monitor process**: Can't auto-update merkle proofs
- **Manual sync required**: Call sync when app loads
- **Service Worker limits**: Can be killed by browser

```typescript
// Sync on app load
useEffect(() => {
  if (wallet) {
    wallet.sync().catch(console.error)
  }
}, [wallet])
```

### Storage Limits

IndexedDB has browser-specific limits:

- Chrome: Up to 60% of disk space
- Firefox: Up to 50% of disk space
- Safari: Up to 1GB (with user prompt for more)

### No External App Integration

Web wallets can't expose BRC-100 HTTP interface. For external app integration, use:
- Desktop wallet (Electron)
- Browser extension

---

## Security Checklist

- [ ] HTTPS required (crypto.subtle only works on secure contexts)
- [ ] Password-based seed encryption with PBKDF2 (100k+ iterations)
- [ ] Seed never stored in plaintext
- [ ] Wallet locked when tab hidden (optional)
- [ ] Session storage for unlock state (not persistent)
- [ ] Clear sensitive data on lock

---

## Related References

- [storage-patterns.md](./storage-patterns.md) - Storage architecture
- [key-concepts.md](./key-concepts.md) - BRC-100 concepts
- [strategic-questionnaire.md](./strategic-questionnaire.md) - Decision tree
