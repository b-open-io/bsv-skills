---
name: 1sat-stack
description: Comprehensive BSV blockchain indexing and querying API that consolidates overlay engine, indexer, BSV21 tokens, and ORDFS into one unified platform. Use this skill when working with BSV blockchain data, including querying transaction outputs (TXOs), managing BSV21 tokens, serving ordinal content, overlay network operations, BEEF transaction storage, owner-based queries and subscriptions, or when migrating from legacy indexers. This is THE foundation layer for all BSV applications, replacing separate indexers with a unified composable stack.
---

# 1sat-stack

The unified BSV blockchain indexing server that provides everything needed to build BSV applications.

## Overview

**1sat-stack** consolidates four major BSV services into a single platform:
- **Overlay Engine** - Topic-based transaction filtering
- **Indexer** - Output parsing and indexing
- **BSV21 Token Service** - Fungible token protocol
- **ORDFS** - Ordinal filesystem content serving

Base URL: `https://api.1sat.app`

## Quick Start

### Basic TXO Query
```bash
# Get a specific output
curl https://api.1sat.app/txo/{txid}:{vout}

# Get spending information
curl https://api.1sat.app/txo/{txid}:{vout}/spend

# Batch query multiple outputs
curl -X POST https://api.1sat.app/txo/outpoints \
  -d '{"outpoints": ["txid1:0", "txid2:1"]}'
```

### BSV21 Token Queries
```bash
# Get token info
curl https://api.1sat.app/bsv21/{tokenId}

# Get address balance
curl https://api.1sat.app/bsv21/{tokenId}/p2pkh/{address}/balance

# Get unspent tokens
curl https://api.1sat.app/bsv21/{tokenId}/p2pkh/unspent
```

## Core API Endpoints

### TXO Service (Transaction Outputs)
- `GET /txo/{outpoint}` - Get output data
- `GET /txo/{outpoint}/spend` - Get spending transaction
- `POST /txo/outpoints` - Batch query outputs
- `POST /txo/spends` - Batch query spends
- `GET /txo/tx/{txid}` - Get all outputs for transaction
- `POST /txo/search` - Advanced search with filters

### BEEF Storage (Background Evaluation Extended Format)
- `GET /beef/{txid}` - Get full BEEF data
- `GET /beef/{txid}/tx` - Get raw transaction
- `GET /beef/{txid}/proof` - Get merkle proof

### BSV21 Token Service
- `GET /bsv21/{tokenId}` - Token metadata
- `GET /bsv21/{tokenId}/blk/{height}` - Token state at block
- `GET /bsv21/{tokenId}/outputs` - All token outputs
- `GET /bsv21/{tokenId}/{lockType}/{address}/balance` - Address balance
- `GET /bsv21/{tokenId}/{lockType}/history` - Transfer history
- `GET /bsv21/{tokenId}/{lockType}/unspent` - Unspent outputs
- `POST /bsv21/lookup` - Batch token lookup

### ORDFS Content Service
- `GET /content/{path}` - Serve ordinal content
- `GET /ordfs/metadata/{path}` - Get content metadata
- `GET /ordfs/preview` - Preview content
- `GET /ordfs/stream/{outpoint}` - Stream large files

### Overlay Network
- `POST /overlay/submit` - Submit to overlay network
- `POST /overlay/lookup` - Query overlay data
- `GET /overlay/listTopicManagers` - List topic managers
- `GET /overlay/listLookupServiceProviders` - List lookup services

### Owner Queries
- `GET /owner/{owner}/txos` - Get all TXOs for owner
- `GET /owner/{owner}/balance` - Get owner balance
- `GET /owner/sync` - SSE stream for real-time updates

### Event Subscriptions
- `GET /sse/{topics}` - Subscribe to real-time events

## Common Use Cases

### Building a BSV21 Token Wallet
```javascript
// Get token balance
const balance = await fetch(`${API}/bsv21/${tokenId}/p2pkh/${address}/balance`)

// Get unspent tokens for spending
const unspent = await fetch(`${API}/bsv21/${tokenId}/p2pkh/unspent`)

// Get transfer history
const history = await fetch(`${API}/bsv21/${tokenId}/p2pkh/history`)
```

### Creating an Inscription Gallery
```javascript
// Search for inscriptions in collection
const inscriptions = await fetch(`${API}/txo/search`, {
  method: 'POST',
  body: JSON.stringify({ q: `insc:${collectionId}` })
})

// Serve inscription content
const content = await fetch(`${API}/content/${inscriptionPath}`)

// Get metadata
const metadata = await fetch(`${API}/ordfs/metadata/${inscriptionPath}`)
```

### Real-time Transaction Monitoring
```javascript
// Subscribe to events
const events = new EventSource(`${API}/sse/txo:${address}+bsv21:${tokenId}`)

events.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('New transaction:', data)
}
```

### Wallet Balance Tracking
```javascript
// Get all outputs for address
const txos = await fetch(`${API}/owner/${address}/txos`)

// Stream real-time updates
const stream = new EventSource(`${API}/owner/sync?owner=${address}`)
```

## Deployment Options

1sat-stack can be deployed in three modes:

### 1. Monolith (All-in-One)
All services run in a single binary - simplest deployment.

### 2. Microservices
Each service runs separately, connected via HTTP:
- Beef Service: `http://beef:8080`
- Indexer Service: `http://indexer:8081`
- BSV21 Service: `http://bsv21:8082`
- Overlay Service: `http://overlay:8083`

### 3. Embedded Library
Include 1sat-stack in your Go application without HTTP:
```go
import "github.com/b-open-io/1sat-stack/config"

cfg, _ := config.LoadConfig("")
services, _ := cfg.Initialize(ctx, logger)

// Use services directly
output, _ := services.TXO.LoadOutput(ctx, outpoint, cfg)
```

## Search Query Syntax

The `/txo/search` endpoint supports advanced queries:

- `owner:{address}` - Outputs owned by address
- `tag:{tagName}` - Outputs with specific tag
- `event:{eventType}` - Outputs matching event type
- `insc:{collectionId}` - Inscriptions in collection
- `token:{tokenId}` - BSV21 token outputs

Combine with `+` for AND, use `|` for OR.

## Event Types

Real-time subscriptions via SSE:

- `txo:{outpoint}` - Specific output events
- `owner:{address}` - Address activity
- `bsv21:{tokenId}` - Token transfers
- `topic:{topicId}` - Overlay topic events

## Migration from Legacy Services

Replace these services with 1sat-stack:

| Old Service | 1sat-stack Endpoint |
|-------------|-------------------|
| 1sat-indexer | `/txo/*` endpoints |
| bsv21-overlay | `/bsv21/*` endpoints |
| go-ordfs-server | `/content/*`, `/ordfs/*` |
| overlay-services | `/overlay/*` endpoints |

## Configuration

For self-hosted deployments, see [CONFIG.md](references/CONFIG.md).

## API Documentation

- Interactive docs: https://api.1sat.app/1sat/docs
- OpenAPI spec: https://api.1sat.app/swagger.json

## Error Handling

Standard HTTP status codes:
- `200` - Success
- `400` - Bad request
- `404` - Not found
- `500` - Server error

Error response format:
```json
{
  "error": "error message",
  "code": "ERROR_CODE"
}
```

## Rate Limits

Default limits:
- 100 requests/minute for authenticated users
- 20 requests/minute for anonymous users
- SSE connections limited to 10 per IP