---
name: wallet-send-bsv
description: This skill should be used when the user asks to "send BSV", "transfer satoshis", "create payment transaction", "send from WIF", "P2PKH transaction", or needs to build, sign, and broadcast P2PKH transactions from a WIF private key using @bsv/sdk.
allowed-tools: "Bash(bun:*)"
disable-model-invocation: true
---

# Wallet Send BSV

Build, sign, and broadcast a P2PKH payment from a WIF private key using `@bsv/sdk`.

> **Note**: This skill is for WIF-key-based scripts and CLIs. If building an app where users have their own wallet, use `wallet-brc100` with `WalletClient.createAction()` instead — the wallet handles UTXOs, signing, and broadcasting automatically.

## When to Use

- Scripts and CLIs that own a WIF private key
- Server-side BSV payments from a managed key
- Quick one-off transfers from a known address

## Usage

```bash
bun run skills/wallet-send-bsv/scripts/send.ts <from-wif> <to-address> <amount-satoshis>

# Show help
bun run skills/wallet-send-bsv/scripts/send.ts --help

# Example: Send 1000 satoshis
bun run skills/wallet-send-bsv/scripts/send.ts L1abc... 1BvBMSEY... 1000
```

## Arguments

| Argument | Description |
|----------|-------------|
| `from-wif` | Private key in WIF format (starts with K, L, or 5) |
| `to-address` | Recipient BSV address (starts with 1 or 3) |
| `amount-satoshis` | Amount to send (1 BSV = 100,000,000 satoshis) |

## Dependencies

- `@bsv/sdk` - BSV SDK for key/transaction operations
- WhatsOnChain API - UTXO fetching
- GorillaPool ARC - Transaction broadcast

## Transaction Flow

1. Parse and validate WIF private key
2. Validate recipient address format
3. Derive sender address from private key
4. Fetch UTXOs from WhatsOnChain
5. Build transaction with P2PKH inputs/outputs
6. Calculate fee (1 sat/byte)
7. Sign transaction
8. Broadcast via GorillaPool ARC (`https://arc.gorillapool.io`)

## Error Handling

- **Invalid WIF**: Clear error with SDK message
- **Invalid address**: Format validation error
- **Insufficient funds**: Shows balance vs required amount
- **Broadcast failure**: Shows ARC error code and description

## Related Skills

- `broadcast-arc` — broadcast any signed transaction via ARC (GorillaPool or TAAL)
- `wallet-brc100` — app-level payments via `WalletClient` (no WIF needed)
- `decode-bsv-transaction` — inspect a transaction before broadcasting
