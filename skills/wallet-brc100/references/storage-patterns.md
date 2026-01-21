# BRC-100 Storage Architecture Patterns

## Storage Decision Tree

```
What's your deployment target?
|
+---> Single process (simple app)
|     --> Direct StorageKnex/StorageIdb
|
+---> Multi-process (Electron, workers)
|     --> IPC Proxy Pattern
|
+---> Multi-device (cloud sync)
      --> StorageClient (WAB) or Hybrid
```

---

## Pattern 1: Direct Storage (Single Process)

Simplest pattern for Node.js services or simple web apps.

```typescript
import { Wallet, StorageKnex, Services } from '@bsv/wallet-toolbox'
import { KeyDeriver } from '@bsv/sdk'
import Knex from 'knex'

async function setupDirectStorage() {
  const knex = Knex({
    client: 'sqlite3',
    connection: { filename: './wallet.db' },
    useNullAsDefault: true
  })

  const storage = new StorageKnex({
    knex,
    storageIdentityKey: 'your-identity-key',
    storageName: 'direct-storage'
  })

  await storage.makeAvailable()

  const wallet = new Wallet({
    chain: 'main',
    keyDeriver: new KeyDeriver(rootKey),
    storage,
    services: new Services({ chain: 'main' })
  })

  return wallet
}
```

---

## Pattern 2: IPC Proxy (Multi-Process)

Used by bsv-desktop. Storage lives in main process; other processes access via IPC.

### Why IPC Proxy?

1. **Security**: Renderer process can't directly access filesystem
2. **Concurrency**: Single point of DB access prevents conflicts
3. **Isolation**: Crash in renderer doesn't corrupt storage

### Main Process (Storage Owner)

```typescript
// main/wallet-service.ts
import { ipcMain } from 'electron'
import { Wallet, StorageKnex, Services } from '@bsv/wallet-toolbox'

let wallet: Wallet | null = null

export async function initializeWallet(rootKey: PrivateKey) {
  const knex = Knex({
    client: 'sqlite3',
    connection: { filename: './wallet.db' },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        // WAL mode for concurrent reads (monitor process)
        conn.run('PRAGMA journal_mode = WAL')
        cb()
      }
    }
  })

  const storage = new StorageKnex({
    knex,
    storageIdentityKey: rootKey.toPublicKey().toString(),
    storageName: 'electron-wallet'
  })

  await storage.makeAvailable()

  wallet = new Wallet({
    chain: 'main',
    keyDeriver: new KeyDeriver(rootKey),
    storage,
    services: new Services({ chain: 'main' })
  })
}

// IPC Handlers
ipcMain.handle('wallet:getBalance', async () => {
  if (!wallet) throw new Error('Wallet not initialized')
  return wallet.balance()
})

ipcMain.handle('wallet:createAction', async (event, args) => {
  if (!wallet) throw new Error('Wallet not initialized')
  return wallet.createAction(args)
})

ipcMain.handle('wallet:listOutputs', async (event, args) => {
  if (!wallet) throw new Error('Wallet not initialized')
  return wallet.listOutputs(args)
})

ipcMain.handle('wallet:listActions', async (event, args) => {
  if (!wallet) throw new Error('Wallet not initialized')
  return wallet.listActions(args)
})

// Add more handlers as needed...
```

### Renderer Process (Proxy Client)

```typescript
// renderer/wallet-proxy.ts
import { ipcRenderer } from 'electron'
import type { CreateActionArgs, ListOutputsArgs, ListActionsArgs } from '@bsv/sdk'

export const walletProxy = {
  async getBalance(): Promise<number> {
    return ipcRenderer.invoke('wallet:getBalance')
  },

  async createAction(args: CreateActionArgs) {
    return ipcRenderer.invoke('wallet:createAction', args)
  },

  async listOutputs(args: ListOutputsArgs) {
    return ipcRenderer.invoke('wallet:listOutputs', args)
  },

  async listActions(args: ListActionsArgs) {
    return ipcRenderer.invoke('wallet:listActions', args)
  }
}

// Usage in React component
function WalletBalance() {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    walletProxy.getBalance().then(setBalance)
  }, [])

  return <div>Balance: {balance} sats</div>
}
```

### Worker Process (Background Monitor)

```typescript
// worker/monitor.ts
import { Monitor } from '@bsv/wallet-toolbox'
import Knex from 'knex'

// Monitor runs in separate process but shares SQLite DB
// WAL mode allows concurrent reads
async function startMonitor() {
  const knex = Knex({
    client: 'sqlite3',
    connection: { filename: './wallet.db' }, // Same file as main
    useNullAsDefault: true
  })

  // Create read-only storage view
  const storage = new StorageKnex({
    knex,
    storageIdentityKey: process.env.IDENTITY_KEY,
    storageName: 'electron-wallet'
  })

  const monitor = new Monitor({
    storage,
    services: new Services({ chain: 'main' }),
    chain: 'main'
  })

  monitor.on('transaction', (status) => {
    // Notify main process via IPC
    process.send?.({ type: 'tx-update', data: status })
  })

  await monitor.start()
}

startMonitor()
```

---

## Pattern 3: Remote Storage (WAB/StorageClient)

For cloud-synced wallets using Wallet Authentication Backend.

```typescript
import { StorageClient, Wallet, Services } from '@bsv/wallet-toolbox'

async function setupRemoteStorage(authToken: string) {
  const storage = new StorageClient({
    endpointUrl: 'https://storage.example.com',
    authToken
  })

  await storage.makeAvailable()

  const wallet = new Wallet({
    chain: 'main',
    keyDeriver: new KeyDeriver(rootKey),
    storage,
    services: new Services({ chain: 'main' })
  })

  return wallet
}
```

---

## Pattern 4: Hybrid Storage (Local + Remote Backup)

Best of both worlds: fast local access with cloud backup.

```typescript
import { WalletStorageManager, StorageKnex, StorageClient } from '@bsv/wallet-toolbox'

async function setupHybridStorage(rootKey: PrivateKey, authToken: string) {
  // Primary: Local SQLite
  const localKnex = Knex({
    client: 'sqlite3',
    connection: { filename: './wallet.db' },
    useNullAsDefault: true
  })

  const localStorage = new StorageKnex({
    knex: localKnex,
    storageIdentityKey: rootKey.toPublicKey().toString(),
    storageName: 'local-primary'
  })

  // Backup: Remote cloud
  const remoteStorage = new StorageClient({
    endpointUrl: 'https://storage.example.com',
    authToken
  })

  await localStorage.makeAvailable()
  await remoteStorage.makeAvailable()

  // Manager handles sync between storages
  const storageManager = new WalletStorageManager(
    localStorage,    // Primary
    [remoteStorage]  // Replicas
  )

  return storageManager
}
```

---

## SQLite WAL Mode

Write-Ahead Logging enables concurrent access between processes.

```typescript
const knex = Knex({
  client: 'sqlite3',
  connection: { filename: './wallet.db' },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn, cb) => {
      // Enable WAL mode
      conn.run('PRAGMA journal_mode = WAL')
      // Optimize for concurrent reads
      conn.run('PRAGMA synchronous = NORMAL')
      conn.run('PRAGMA cache_size = -64000') // 64MB cache
      cb()
    }
  }
})
```

### WAL Benefits

| Feature | Default Mode | WAL Mode |
|---------|-------------|----------|
| Concurrent reads | Blocked during write | Always allowed |
| Write performance | Slower | Faster (sequential) |
| Crash recovery | Rollback journal | WAL file replay |
| File count | 1 file | 3 files (.db, .db-wal, .db-shm) |

### When to Use WAL

- Main process + monitor process sharing DB
- High read frequency with occasional writes
- Not needed for single-process apps

---

## Storage Migration

Moving from one storage backend to another:

```typescript
import { WalletStorageManager } from '@bsv/wallet-toolbox'

async function migrateStorage(fromStorage: Storage, toStorage: Storage) {
  await fromStorage.makeAvailable()
  await toStorage.makeAvailable()

  // Export from source
  const actions = await fromStorage.listActions({ limit: 10000 })
  const outputs = await fromStorage.listOutputs({ limit: 10000 })
  const certificates = await fromStorage.listCertificates({ limit: 10000 })

  // Import to destination
  for (const action of actions) {
    await toStorage.insertAction(action)
  }
  for (const output of outputs) {
    await toStorage.insertOutput(output)
  }
  // ... continue for other data types

  console.log('Migration complete')
}
```
