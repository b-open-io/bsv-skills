# Storage Configuration

## SQLite Storage (Node.js)

```typescript
import Knex from 'knex'
import { StorageKnex } from '@bsv/wallet-toolbox'

async function setupSQLiteStorage() {
  const knex = Knex({
    client: 'sqlite3',
    connection: { filename: './wallet.db' },
    useNullAsDefault: true
  })

  const storage = new StorageKnex({
    knex,
    storageIdentityKey: 'your-identity-key',
    storageName: 'main-storage'
  })

  await storage.makeAvailable()
  return storage
}
```

## MySQL Storage

```typescript
async function setupMySQLStorage() {
  const knex = Knex({
    client: 'mysql2',
    connection: {
      host: 'localhost',
      user: 'wallet_user',
      password: 'secure_password',
      database: 'wallet_db'
    }
  })

  const storage = new StorageKnex({
    knex,
    storageIdentityKey: 'your-identity-key',
    storageName: 'mysql-storage'
  })

  await storage.makeAvailable()
  return storage
}
```

## IndexedDB Storage (Browser)

```typescript
import { openDB, DBSchema } from 'idb'
import { StorageIdb } from '@bsv/wallet-toolbox'

interface WalletDB extends DBSchema {
  // Storage schema is managed by StorageIdb
}

async function setupIndexedDBStorage() {
  const db = await openDB<WalletDB>('wallet-db', 1, {
    upgrade(db) {
      // StorageIdb creates necessary object stores
    }
  })

  const storage = new StorageIdb({
    idb: db,
    storageIdentityKey: 'your-identity-key',
    storageName: 'browser-storage'
  })

  await storage.makeAvailable()
  return storage
}
```

## Multi-Storage Manager

```typescript
import { WalletStorageManager } from '@bsv/wallet-toolbox'

async function setupMultiStorage() {
  const primaryStorage = await setupSQLiteStorage()
  const backupStorage = await setupMySQLStorage()

  const manager = new WalletStorageManager(
    primaryStorage,
    [backupStorage]
  )

  return manager
}
```
