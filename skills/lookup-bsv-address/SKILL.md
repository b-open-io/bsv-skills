---
name: lookup-bsv-address
description: This skill should be used when the user asks to "lookup address", "check address balance", "address UTXOs", "address history", or needs to retrieve BSV address information from WhatsOnChain API.
allowed-tools: "Bash(bun:*)"
---

# Lookup BSV Address

Look up BSV address information using WhatsOnChain API.

## Status

**Complete** - All tests passing

## When to Use

- Check address balance
- View transaction history
- List unspent outputs (UTXOs)
- Verify address activity

## Usage

```bash
# Balance, UTXOs, and history (default granularity: all)
bun run /path/to/skills/lookup-bsv-address/scripts/lookup.ts <address>

# Balance only
bun run /path/to/skills/lookup-bsv-address/scripts/lookup.ts <address> balance

# Transaction history (tx_hash + height)
bun run /path/to/skills/lookup-bsv-address/scripts/lookup.ts <address> history

# Unspent outputs (outpoint + value + block height)
bun run /path/to/skills/lookup-bsv-address/scripts/lookup.ts <address> utxos

# JSON output (for scripting / reconciliation)
bun run /path/to/skills/lookup-bsv-address/scripts/lookup.ts <address> all --json
```

The positional granularity selects which sections to fetch: `balance`, `history`,
`utxos`, or `all` (default). Only the requested endpoints are called.

## API Endpoints

WhatsOnChain Address API:
- Balance: `GET /v1/bsv/main/address/{address}/balance`
- History: `GET /v1/bsv/main/address/{address}/history`
- UTXOs: `GET /v1/bsv/main/address/{address}/unspent`

## Response

- `balance`: confirmed + unconfirmed satoshis, plus `totalBsv`.
- `utxos`: each unspent output as `{ outpoint, satoshis, height }`, with
  `utxoCount` and `utxoTotal` (the UTXO total reconciles against the balance).
- `history`: each transaction as `{ txid, height }`, with `historyCount`.

## Example

```
$ bun run lookup.ts 19Ao4zVRF6yzRaxiSHD34LCw7fBFn9nrDP utxos
Address: 19Ao4zVRF6yzRaxiSHD34LCw7fBFn9nrDP
UTXOs: 1 (216919 satoshis)
  3ff71eb82058eb45062044091fad0ff9e115d7bb8a0f6b10d5d7f811a1a4fd2d.0  216919 sats  (block 957877)
```
