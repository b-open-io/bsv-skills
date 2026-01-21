# BRC-100 Desktop Wallet Guide (Electron)

This guide covers building BRC-100 compliant desktop wallets using Electron, based on the bsv-desktop reference implementation.

## Reference Implementation

- **bsv-desktop**: https://github.com/bsv-blockchain/bsv-desktop
  - Official BSV desktop wallet
  - Electron + React
  - Full BRC-100 support
  - IPC architecture for storage isolation
  - HTTPS server for external app integration

---

## Architecture Overview

Desktop wallets use multi-process architecture with IPC communication:

```
Renderer Process (UI)
       | (ipcRenderer.invoke)
       v
Main Process (Wallet + Storage)
       | (SQLite via Knex)
       v
Worker Process (Monitor)
       | (Shared SQLite with WAL mode)
       v
HTTPS Server (Port 2121)
       | (BRC-100 HTTP interface)
       v
External Applications
```

### Key Components

| Component | Process | Purpose |
|-----------|---------|---------|
| Main Process | Electron Main | Wallet instance, storage, IPC handlers |
| Renderer | Chromium | React UI, wallet proxy |
| Monitor Worker | Node.js Worker | Background tx monitoring, merkle proofs |
| HTTPS Server | Main | Port 2121 BRC-100 interface for external apps |

---

## IPC Proxy Pattern

Storage and wallet run in main process; renderer accesses via IPC.

### Main Process (Wallet Owner)

```typescript
// main/wallet-service.ts
import { ipcMain } from 'electron'
import { Wallet, StorageKnex, Services } from '@bsv/wallet-toolbox'
import { PrivateKey, KeyDeriver } from '@bsv/sdk'
import Knex from 'knex'

let wallet: Wallet | null = null

export async function initializeWallet(rootKey: PrivateKey) {
  // SQLite with WAL mode for concurrent access
  const knex = Knex({
    client: 'sqlite3',
    connection: { filename: './wallet.db' },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA journal_mode = WAL')
        conn.run('PRAGMA synchronous = NORMAL')
        cb()
      }
    }
  })

  const storage = new StorageKnex({
    knex,
    storageIdentityKey: rootKey.toPublicKey().toString(),
    storageName: 'desktop-wallet'
  })

  await storage.makeAvailable()

  const services = new Services({
    chain: 'main',
    arcUrl: 'https://arc.taal.com'
  })

  wallet = new Wallet({
    chain: 'main',
    keyDeriver: new KeyDeriver(rootKey),
    storage,
    services
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

ipcMain.handle('wallet:getPublicKey', async (event, args) => {
  if (!wallet) throw new Error('Wallet not initialized')
  return wallet.getPublicKey(args)
})

ipcMain.handle('wallet:encrypt', async (event, args) => {
  if (!wallet) throw new Error('Wallet not initialized')
  return wallet.encrypt(args)
})

ipcMain.handle('wallet:decrypt', async (event, args) => {
  if (!wallet) throw new Error('Wallet not initialized')
  return wallet.decrypt(args)
})

ipcMain.handle('wallet:createSignature', async (event, args) => {
  if (!wallet) throw new Error('Wallet not initialized')
  return wallet.createSignature(args)
})
```

### Renderer Process (Proxy Client)

```typescript
// renderer/wallet-proxy.ts
import { ipcRenderer } from 'electron'
import type {
  CreateActionArgs,
  ListOutputsArgs,
  ListActionsArgs,
  GetPublicKeyArgs,
  WalletEncryptArgs,
  WalletDecryptArgs,
  CreateSignatureArgs
} from '@bsv/sdk'

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
  },

  async getPublicKey(args: GetPublicKeyArgs) {
    return ipcRenderer.invoke('wallet:getPublicKey', args)
  },

  async encrypt(args: WalletEncryptArgs) {
    return ipcRenderer.invoke('wallet:encrypt', args)
  },

  async decrypt(args: WalletDecryptArgs) {
    return ipcRenderer.invoke('wallet:decrypt', args)
  },

  async createSignature(args: CreateSignatureArgs) {
    return ipcRenderer.invoke('wallet:createSignature', args)
  }
}
```

### React Component Usage

```typescript
// renderer/components/WalletBalance.tsx
import { useState, useEffect } from 'react'
import { walletProxy } from '../wallet-proxy'

export function WalletBalance() {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    walletProxy.getBalance()
      .then(setBalance)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>
  return <div>Balance: {balance?.toLocaleString()} satoshis</div>
}
```

---

## Background Monitor Process

Separate worker process for transaction monitoring:

```typescript
// worker/monitor.ts
import { parentPort } from 'worker_threads'
import { Monitor, StorageKnex, Services } from '@bsv/wallet-toolbox'
import Knex from 'knex'

async function startMonitor() {
  // Connect to same SQLite DB (WAL enables concurrent reads)
  const knex = Knex({
    client: 'sqlite3',
    connection: { filename: './wallet.db' },
    useNullAsDefault: true
  })

  const storage = new StorageKnex({
    knex,
    storageIdentityKey: process.env.IDENTITY_KEY!,
    storageName: 'desktop-wallet'
  })

  const monitor = new Monitor({
    storage,
    services: new Services({ chain: 'main' }),
    chain: 'main'
  })

  monitor.on('transaction', (status) => {
    // Notify main process
    parentPort?.postMessage({
      type: 'tx-update',
      txid: status.txid,
      blockHeight: status.blockHeight,
      merkleProof: !!status.merkleProof
    })
  })

  monitor.on('error', (error) => {
    parentPort?.postMessage({
      type: 'monitor-error',
      error: error.message
    })
  })

  await monitor.start()
  parentPort?.postMessage({ type: 'monitor-started' })
}

startMonitor()
```

### Launching Monitor from Main

```typescript
// main/index.ts
import { Worker } from 'worker_threads'
import path from 'path'

let monitorWorker: Worker | null = null

function startMonitor(identityKey: string) {
  monitorWorker = new Worker(path.join(__dirname, 'worker/monitor.js'), {
    env: { IDENTITY_KEY: identityKey }
  })

  monitorWorker.on('message', (msg) => {
    if (msg.type === 'tx-update') {
      // Notify renderer
      mainWindow?.webContents.send('tx-update', msg)
    }
  })
}
```

---

## HTTPS Server for External Apps

BRC-100 defines HTTP interface for external app integration:

```typescript
// main/server.ts
import https from 'https'
import { readFileSync } from 'fs'

function startBRC100Server(wallet: Wallet) {
  const server = https.createServer({
    key: readFileSync('./certs/key.pem'),
    cert: readFileSync('./certs/cert.pem')
  }, async (req, res) => {
    // Parse request body
    const body = await parseBody(req)

    try {
      let result

      switch (req.url) {
        case '/createAction':
          result = await wallet.createAction(body)
          break
        case '/listOutputs':
          result = await wallet.listOutputs(body)
          break
        case '/getPublicKey':
          result = await wallet.getPublicKey(body)
          break
        // ... other BRC-100 endpoints
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: error.message }))
    }
  })

  // Localhost only for security
  server.listen(2121, '127.0.0.1', () => {
    console.log('BRC-100 server listening on https://127.0.0.1:2121')
  })
}
```

---

## SQLite WAL Mode

Write-Ahead Logging enables concurrent access between main and monitor:

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

| Feature | Default Mode | WAL Mode |
|---------|-------------|----------|
| Concurrent reads | Blocked during write | Always allowed |
| Write performance | Slower | Faster (sequential) |
| Crash recovery | Rollback journal | WAL file replay |
| Files | 1 | 3 (.db, .db-wal, .db-shm) |

---

## Secure Key Storage

```typescript
// main/key-storage.ts
import { safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'

const KEY_FILE = path.join(app.getPath('userData'), 'encrypted-seed')

export async function storeSeed(seed: Buffer): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage not available')
  }

  const encrypted = safeStorage.encryptString(seed.toString('hex'))
  fs.writeFileSync(KEY_FILE, encrypted)
}

export async function retrieveSeed(): Promise<Buffer> {
  if (!fs.existsSync(KEY_FILE)) {
    throw new Error('No seed stored')
  }

  const encrypted = fs.readFileSync(KEY_FILE)
  const hex = safeStorage.decryptString(encrypted)
  return Buffer.from(hex, 'hex')
}
```

---

## Application Lifecycle

```typescript
// main/index.ts
import { app, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null
let wallet: Wallet | null = null

app.whenReady().then(async () => {
  // Create main window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  })

  mainWindow.loadFile('index.html')
})

app.on('window-all-closed', async () => {
  // Cleanup
  if (wallet) {
    await wallet.destroy()
  }
  if (monitorWorker) {
    monitorWorker.terminate()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

---

## Security Checklist

- [ ] Context isolation enabled in renderer
- [ ] Preload script for IPC bridge
- [ ] HTTPS server on localhost only
- [ ] Electron safeStorage for seed encryption
- [ ] SQLite file in user data directory (not app directory)
- [ ] WAL mode for concurrent access
- [ ] Monitor in separate worker thread

---

## Related References

- [storage-patterns.md](./storage-patterns.md) - WAL mode and IPC details
- [key-concepts.md](./key-concepts.md) - BRC-100 concepts
- [strategic-questionnaire.md](./strategic-questionnaire.md) - Decision tree
