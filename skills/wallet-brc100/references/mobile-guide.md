# BRC-100 Mobile Wallet Guide (React Native)

This guide covers building BRC-100 compliant wallets for mobile platforms using React Native.

---

## Architecture Overview

```
React Native App
       |
       v
Wallet Instance
       |
       v
SQLite (react-native-sqlite-storage)
       |
       v
Secure Enclave (Keys)
```

### Key Characteristics

- **SQLite storage**: Via react-native-sqlite-storage
- **Secure key storage**: iOS Keychain / Android Keystore
- **No background processing**: Platform restrictions
- **Biometric authentication**: TouchID/FaceID integration

---

## Dependencies

```json
{
  "dependencies": {
    "@bsv/wallet-toolbox": "^1.7.18",
    "@bsv/sdk": "^1.9.29",
    "react-native-sqlite-storage": "^6.0.1",
    "react-native-keychain": "^8.1.2",
    "@bsv/react-native-wallet-toolbox": "^1.0.0"
  }
}
```

**Note**: Mobile support for wallet-toolbox may require a separate mobile-optimized package. Check npm for `@bsv/wallet-toolbox-mobile` or similar.

---

## Basic Setup

```typescript
import { Wallet, Services } from '@bsv/wallet-toolbox-mobile'
import { PrivateKey, KeyDeriver } from '@bsv/sdk'
import SQLite from 'react-native-sqlite-storage'
import * as Keychain from 'react-native-keychain'

SQLite.enablePromise(true)

async function createMobileWallet(password: string): Promise<Wallet> {
  // 1. Retrieve or create encrypted seed
  const rootKey = await getOrCreateRootKey(password)
  const keyDeriver = new KeyDeriver(rootKey)

  // 2. Open SQLite database
  const db = await SQLite.openDatabase({
    name: 'wallet.db',
    location: 'default'
  })

  // 3. Initialize storage adapter
  // Note: May need mobile-specific storage adapter
  const storage = await createMobileStorage(db, rootKey.toPublicKey().toString())

  // 4. Create wallet
  return new Wallet({
    chain: 'main',
    keyDeriver,
    storage,
    services: new Services({ chain: 'main', arcUrl: 'https://arc.taal.com' })
  })
}
```

---

## Secure Key Storage

### iOS Keychain / Android Keystore

```typescript
import * as Keychain from 'react-native-keychain'

async function storeEncryptedSeed(encryptedSeed: string): Promise<void> {
  await Keychain.setGenericPassword('wallet', encryptedSeed, {
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_ENCLAVE
  })
}

async function getEncryptedSeed(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword()
  if (!credentials) return null
  return credentials.password
}

async function clearSeed(): Promise<void> {
  await Keychain.resetGenericPassword()
}
```

### Seed Encryption

```typescript
import CryptoJS from 'crypto-js'

function encryptSeed(seed: Uint8Array, password: string): string {
  const salt = CryptoJS.lib.WordArray.random(128 / 8)
  const iv = CryptoJS.lib.WordArray.random(128 / 8)

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000
  })

  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.lib.WordArray.create(seed),
    key,
    { iv }
  )

  return salt.toString() + iv.toString() + encrypted.toString()
}

function decryptSeed(encrypted: string, password: string): Uint8Array {
  const salt = CryptoJS.enc.Hex.parse(encrypted.slice(0, 32))
  const iv = CryptoJS.enc.Hex.parse(encrypted.slice(32, 64))
  const ciphertext = encrypted.slice(64)

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000
  })

  const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv })
  const words = decrypted.words
  const bytes = new Uint8Array(words.length * 4)

  for (let i = 0; i < words.length; i++) {
    bytes[i * 4] = (words[i] >> 24) & 0xff
    bytes[i * 4 + 1] = (words[i] >> 16) & 0xff
    bytes[i * 4 + 2] = (words[i] >> 8) & 0xff
    bytes[i * 4 + 3] = words[i] & 0xff
  }

  return bytes
}
```

### Combined Key Management

```typescript
async function getOrCreateRootKey(password: string): Promise<PrivateKey> {
  const stored = await getEncryptedSeed()

  if (stored) {
    // Decrypt existing seed
    const seed = decryptSeed(stored, password)
    return new PrivateKey(seed)
  }

  // Create new seed
  const seed = new Uint8Array(32)
  crypto.getRandomValues(seed)

  const encrypted = encryptSeed(seed, password)
  await storeEncryptedSeed(encrypted)

  return new PrivateKey(seed)
}
```

---

## Biometric Authentication

```typescript
import * as Keychain from 'react-native-keychain'

async function authenticateWithBiometrics(): Promise<boolean> {
  const biometryType = await Keychain.getSupportedBiometryType()

  if (!biometryType) {
    // Biometrics not available
    return false
  }

  try {
    // This will prompt for biometric auth
    const result = await Keychain.getGenericPassword({
      authenticationPrompt: {
        title: 'Authenticate to access wallet'
      }
    })

    return !!result
  } catch (error) {
    console.error('Biometric auth failed:', error)
    return false
  }
}
```

---

## React Context for Wallet State

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react'

interface WalletContextType {
  wallet: Wallet | null
  isLocked: boolean
  unlock: (password: string) => Promise<void>
  unlockWithBiometrics: () => Promise<void>
  lock: () => void
  balance: number | null
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [isLocked, setIsLocked] = useState(true)
  const [balance, setBalance] = useState<number | null>(null)

  const unlock = useCallback(async (password: string) => {
    const w = await createMobileWallet(password)
    setWallet(w)
    setIsLocked(false)

    // Fetch initial balance
    const bal = await w.balance()
    setBalance(bal)
  }, [])

  const unlockWithBiometrics = useCallback(async () => {
    const authenticated = await authenticateWithBiometrics()
    if (!authenticated) {
      throw new Error('Biometric authentication failed')
    }

    // Password stored in secure enclave
    const credentials = await Keychain.getGenericPassword()
    if (!credentials) {
      throw new Error('No credentials stored')
    }

    // Unlock with stored password
    await unlock(credentials.password)
  }, [unlock])

  const lock = useCallback(() => {
    if (wallet) {
      wallet.destroy()
    }
    setWallet(null)
    setIsLocked(true)
    setBalance(null)
  }, [wallet])

  const refreshBalance = useCallback(async () => {
    if (!wallet) return
    const bal = await wallet.balance()
    setBalance(bal)
  }, [wallet])

  return (
    <WalletContext.Provider value={{
      wallet,
      isLocked,
      unlock,
      unlockWithBiometrics,
      lock,
      balance,
      refreshBalance
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be within WalletProvider')
  return ctx
}
```

---

## Platform Limitations

### No Background Processing

iOS and Android severely restrict background execution:

- **No background monitor**: Can't auto-sync transactions
- **Push notifications**: Use for transaction alerts (requires server)
- **App refresh**: Limited to specific intervals

```typescript
// Sync when app comes to foreground
import { AppState } from 'react-native'

useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active' && wallet) {
      wallet.sync().catch(console.error)
    }
  })

  return () => subscription.remove()
}, [wallet])
```

### SQLite Considerations

```typescript
// Mobile SQLite doesn't support WAL mode in all cases
// Test thoroughly on actual devices

const db = await SQLite.openDatabase({
  name: 'wallet.db',
  location: 'default',
  // May need these for some devices:
  // createFromLocation: '~wallet.db',
})
```

### Memory Constraints

Mobile devices have limited memory:

```typescript
// Paginate large queries
const outputs = await wallet.listOutputs({
  basket: 'default',
  spendable: true,
  limit: 50,  // Reasonable page size
  offset: page * 50
})
```

---

## UI Components

### Lock Screen

```typescript
function LockScreen() {
  const { unlock, unlockWithBiometrics } = useWallet()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleUnlock = async () => {
    try {
      await unlock(password)
    } catch (e) {
      setError('Invalid password')
    }
  }

  const handleBiometric = async () => {
    try {
      await unlockWithBiometrics()
    } catch (e) {
      setError('Biometric authentication failed')
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Unlock" onPress={handleUnlock} />
      <Button title="Use Face ID" onPress={handleBiometric} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}
```

### Balance Display

```typescript
function BalanceDisplay() {
  const { balance, refreshBalance, isLocked } = useWallet()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshBalance()
    setRefreshing(false)
  }

  if (isLocked) return null

  return (
    <TouchableOpacity onPress={handleRefresh}>
      <Text style={styles.balance}>
        {balance?.toLocaleString() ?? '---'} sats
      </Text>
      {refreshing && <ActivityIndicator />}
    </TouchableOpacity>
  )
}
```

---

## Security Checklist

- [ ] Seeds stored in iOS Keychain / Android Keystore
- [ ] Secure enclave used when available
- [ ] PBKDF2 with 100k+ iterations for encryption
- [ ] Biometric auth integrated
- [ ] Wallet locked on app background
- [ ] No sensitive data in logs
- [ ] SSL pinning for network requests

---

## Related References

- [storage-patterns.md](./storage-patterns.md) - Storage architecture
- [key-concepts.md](./key-concepts.md) - BRC-100 concepts
- [strategic-questionnaire.md](./strategic-questionnaire.md) - Decision tree
