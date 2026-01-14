---
name: junglebus
description: This skill should be used when the user asks about "JungleBus", "transaction streaming", "BSV subscriptions", "real-time blockchain data", "GorillaPool API", or needs to subscribe to blockchain events.
---

# JungleBus

Real-time BSV blockchain data streaming from GorillaPool.

## When to Use

- Subscribe to transactions matching specific patterns
- Stream real-time mempool and block data
- Build indexers or notification systems
- Monitor addresses or script patterns

## Libraries

### JavaScript

```bash
npm install @gorillapool/js-junglebus
```

```typescript
import { JungleBusClient } from '@gorillapool/js-junglebus';

const client = new JungleBusClient("junglebus.gorillapool.io", {
  onConnected(ctx) { console.log("Connected", ctx); },
  onDisconnected(ctx) { console.log("Disconnected", ctx); },
  onError(ctx) { console.error("Error", ctx); }
});

// Subscribe to a subscription ID (create at junglebus.gorillapool.io)
const subId = "your-subscription-id";
const fromBlock = 750000;

const subscription = client.Subscribe(
  subId,
  fromBlock,
  (tx) => {
    // Transaction received
    console.log("TX:", tx.id, tx.block_height);
  },
  (status) => {
    // Status update (block height, etc)
    console.log("Status:", status);
  },
  (error) => {
    console.error("Sub error:", error);
  },
  (mempoolTx) => {
    // Unconfirmed transaction
    console.log("Mempool:", mempoolTx.id);
  }
);

// Lite mode - only txid and block height (less bandwidth)
client.Subscribe(subId, fromBlock, onTx, onStatus, onError, onMempool, true);
```

### Go

```bash
go get github.com/GorillaPool/go-junglebus
```

```go
package main

import (
    "github.com/GorillaPool/go-junglebus"
)

func main() {
    client, _ := junglebus.New(
        junglebus.WithHTTP("https://junglebus.gorillapool.io"),
    )

    // Subscribe with callback
    client.Subscribe("subscription-id", 750000, func(tx *junglebus.Transaction) {
        fmt.Printf("TX: %s at height %d\n", tx.Id, tx.BlockHeight)
    })
}
```

## REST API

Direct HTTP endpoints (no subscription required):

### Transaction

```bash
# Get transaction with parsed data
curl https://junglebus.gorillapool.io/v1/transaction/get/{txid}
```

Response includes: `id`, `transaction` (raw hex), `block_hash`, `block_height`, `addresses`, `inputs`, `outputs`

### Address History

```bash
# Get transactions for an address
curl https://junglebus.gorillapool.io/v1/address/get/{address}
```

Returns array of `{transaction_id, block_height, block_hash, block_index}`

### Block Header

```bash
# Get block header by hash
curl https://junglebus.gorillapool.io/v1/block_header/get/{block_hash}
```

Returns: `hash`, `height`, `time`, `nonce`, `version`, `merkleroot`, `bits`

## Creating Subscriptions

1. Go to https://junglebus.gorillapool.io
2. Create an account
3. Define subscription filters:
   - Address patterns
   - Script patterns (OP_RETURN prefixes, protocols)
   - Output types
4. Get subscription ID for use in client libraries

## Subscription Filters

Filter transactions by:
- **Addresses**: P2PKH addresses
- **Scripts**: OP_RETURN prefixes (e.g., `1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5` for MAP)
- **Contexts**: Protocol identifiers
- **Output types**: pubkeyhash, scripthash, etc.

## JungleBus vs WhatsOnChain

| Feature | JungleBus | WhatsOnChain |
|---------|-----------|--------------|
| Real-time streaming | Yes | No |
| Transaction history | Yes | Yes |
| Address balance | No | Yes |
| UTXOs | No | Yes |
| Price data | No | Yes |
| Parsed tx data | Yes | Limited |

Use JungleBus for streaming and transaction data. Use WhatsOnChain for balance/UTXOs/price.

## Links

- Dashboard: https://junglebus.gorillapool.io
- Docs: https://junglebus.gorillapool.io/docs
- JS Client: https://www.npmjs.com/package/@gorillapool/js-junglebus
- Go Client: https://github.com/GorillaPool/go-junglebus
