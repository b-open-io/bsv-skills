# BRC-100 Node.js Service/CLI Wallet Guide

This guide covers building BRC-100 compliant wallets for Node.js services, backend applications, and CLI tools.

---

## Architecture Overview

```
Node.js Application
       |
       v
Wallet Instance
       |
       v
StorageKnex (SQLite/MySQL/PostgreSQL)
       |
       v
File System / Database Server
```

### Key Characteristics

- **Full filesystem access**: Store DB anywhere
- **Long-running processes**: Can run background monitors
- **Multiple storage backends**: SQLite, MySQL, PostgreSQL via Knex
- **Environment-based keys**: Load from env vars or files

---

## Basic Setup

```typescript
import { Wallet, StorageKnex, Services } from '@bsv/wallet-toolbox'
import { PrivateKey, KeyDeriver } from '@bsv/sdk'
import Knex from 'knex'
import path from 'path'
import os from 'os'

async function createNodeWallet(): Promise<Wallet> {
  // 1. Load root key from environment
  const rootKeyHex = process.env.WALLET_ROOT_KEY
  if (!rootKeyHex) {
    throw new Error('WALLET_ROOT_KEY environment variable required')
  }

  const rootKey = new PrivateKey(rootKeyHex, 'hex')
  const keyDeriver = new KeyDeriver(rootKey)

  // 2. Configure SQLite storage
  const walletDir = path.join(os.homedir(), '.my-wallet')

  const knex = Knex({
    client: 'sqlite3',
    connection: { filename: path.join(walletDir, 'wallet.db') },
    useNullAsDefault: true
  })

  const storage = new StorageKnex({
    knex,
    storageIdentityKey: rootKey.toPublicKey().toString(),
    storageName: 'node-wallet'
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

## Storage Backends

### SQLite (Default)

```typescript
const knex = Knex({
  client: 'sqlite3',
  connection: {
    filename: './wallet.db'
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn, cb) => {
      // Enable WAL for better concurrency
      conn.run('PRAGMA journal_mode = WAL')
      cb()
    }
  }
})
```

### MySQL

```typescript
const knex = Knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'wallet',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'wallet_db'
  },
  pool: { min: 2, max: 10 }
})
```

### PostgreSQL

```typescript
const knex = Knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'wallet',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'wallet_db'
  },
  pool: { min: 2, max: 10 }
})
```

---

## CLI Application

### Commander-based CLI

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import { Script } from '@bsv/sdk'
import { createNodeWallet } from './wallet'

const program = new Command()

program
  .name('wallet')
  .description('BRC-100 CLI Wallet')
  .version('1.0.0')

program
  .command('balance')
  .description('Show wallet balance')
  .action(async () => {
    const wallet = await createNodeWallet()
    const balance = await wallet.balance()
    console.log(`Balance: ${balance.toLocaleString()} satoshis`)
    process.exit(0)
  })

program
  .command('send <address> <satoshis>')
  .description('Send BSV to an address')
  .action(async (address: string, satoshis: string) => {
    const wallet = await createNodeWallet()

    const result = await wallet.createAction({
      description: 'CLI payment',
      outputs: [{
        lockingScript: Script.fromAddress(address).toHex(),
        satoshis: parseInt(satoshis),
        basket: 'default'
      }],
      options: {
        acceptDelayedBroadcast: false
      }
    })

    if (result.txid) {
      console.log(`Transaction sent: ${result.txid}`)
    } else {
      console.error('Transaction failed')
    }

    process.exit(0)
  })

program
  .command('list-outputs')
  .description('List spendable outputs')
  .option('-b, --basket <basket>', 'Filter by basket', 'default')
  .option('-l, --limit <limit>', 'Max outputs to show', '20')
  .action(async (options) => {
    const wallet = await createNodeWallet()

    const result = await wallet.listOutputs({
      basket: options.basket,
      spendable: true,
      limit: parseInt(options.limit)
    })

    console.log(`Found ${result.totalOutputs} outputs:`)
    result.outputs.forEach(output => {
      console.log(`  ${output.outpoint}: ${output.satoshis} sats`)
    })

    process.exit(0)
  })

program
  .command('pubkey')
  .description('Get identity public key')
  .action(async () => {
    const wallet = await createNodeWallet()
    const result = await wallet.getPublicKey({ identityKey: true })
    console.log(`Identity Key: ${result.publicKey}`)
    process.exit(0)
  })

program.parse()
```

### Package.json bin entry

```json
{
  "bin": {
    "wallet": "./dist/cli.js"
  }
}
```

---

## Background Monitor

For long-running services that need to track transaction confirmations:

```typescript
import { Monitor } from '@bsv/wallet-toolbox'

async function startWalletService() {
  const wallet = await createNodeWallet()

  // Start background monitor
  const monitor = new Monitor({
    storage: wallet.storage,
    services: wallet.services,
    chain: 'main'
  })

  monitor.on('transaction', (status) => {
    console.log(`TX Update: ${status.txid}`)
    console.log(`  Block: ${status.blockHeight || 'unconfirmed'}`)
    console.log(`  Merkle Proof: ${status.merkleProof ? 'yes' : 'no'}`)
  })

  monitor.on('error', (error) => {
    console.error('Monitor error:', error)
  })

  await monitor.start()
  console.log('Wallet monitor started')

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...')
    await monitor.stop()
    await wallet.destroy()
    process.exit(0)
  })
}

startWalletService()
```

---

## REST API Service

```typescript
import express from 'express'
import { createNodeWallet } from './wallet'

const app = express()
app.use(express.json())

let wallet: Wallet | null = null

// Initialize wallet on startup
async function init() {
  wallet = await createNodeWallet()
}

// Auth middleware (implement your own)
function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

app.use(authMiddleware)

app.get('/balance', async (req, res) => {
  if (!wallet) return res.status(503).json({ error: 'Wallet not ready' })

  const balance = await wallet.balance()
  res.json({ balance })
})

app.post('/send', async (req, res) => {
  if (!wallet) return res.status(503).json({ error: 'Wallet not ready' })

  const { address, satoshis, description } = req.body

  try {
    const result = await wallet.createAction({
      description: description || 'API payment',
      outputs: [{
        lockingScript: Script.fromAddress(address).toHex(),
        satoshis,
        basket: 'default'
      }]
    })

    res.json({ txid: result.txid })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.get('/outputs', async (req, res) => {
  if (!wallet) return res.status(503).json({ error: 'Wallet not ready' })

  const result = await wallet.listOutputs({
    basket: req.query.basket || 'default',
    spendable: true,
    limit: parseInt(req.query.limit) || 100
  })

  res.json(result)
})

init().then(() => {
  app.listen(3000, () => {
    console.log('Wallet API listening on port 3000')
  })
})
```

---

## Key Management

### Environment Variables

```bash
# .env (never commit!)
WALLET_ROOT_KEY=your-root-key-hex
DB_HOST=localhost
DB_USER=wallet
DB_PASSWORD=secret
```

```typescript
import dotenv from 'dotenv'
dotenv.config()

const rootKey = process.env.WALLET_ROOT_KEY
```

### Encrypted File

```typescript
import fs from 'fs'
import crypto from 'crypto'

function loadEncryptedKey(filepath: string, password: string): string {
  const data = fs.readFileSync(filepath)

  const salt = data.slice(0, 16)
  const iv = data.slice(16, 32)
  const encrypted = data.slice(32)

  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)

  // Extract auth tag (last 16 bytes)
  const authTag = encrypted.slice(-16)
  const ciphertext = encrypted.slice(0, -16)

  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ])

  return decrypted.toString('hex')
}
```

### Hardware Security Module (HSM)

For production, consider HSM integration:

```typescript
// Example with AWS KMS
import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms'

async function getKeyFromKMS(keyId: string): Promise<string> {
  const client = new KMSClient({ region: process.env.AWS_REGION })

  const encryptedKey = fs.readFileSync('./encrypted-key.bin')

  const command = new DecryptCommand({
    KeyId: keyId,
    CiphertextBlob: encryptedKey
  })

  const response = await client.send(command)
  return Buffer.from(response.Plaintext!).toString('hex')
}
```

---

## Graceful Shutdown

```typescript
async function main() {
  const wallet = await createNodeWallet()
  const monitor = await startMonitor(wallet)

  // Handle shutdown signals
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down...`)

    await monitor.stop()
    await wallet.destroy()

    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  // Keep process running
  console.log('Wallet service running. Press Ctrl+C to exit.')
}

main().catch(console.error)
```

---

## Security Checklist

- [ ] Root key from environment variable or encrypted file
- [ ] Never log private keys or sensitive data
- [ ] Use TLS for any network endpoints
- [ ] API authentication for REST services
- [ ] Database credentials secured
- [ ] Graceful shutdown handlers
- [ ] Consider HSM for production

---

## Related References

- [storage-patterns.md](./storage-patterns.md) - Database configurations
- [key-concepts.md](./key-concepts.md) - BRC-100 concepts
- [strategic-questionnaire.md](./strategic-questionnaire.md) - Decision tree
