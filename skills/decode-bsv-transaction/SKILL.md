---
name: decode-bsv-transaction
description: This skill should be used when the user asks to "decode transaction", "parse tx hex", "transaction details", "analyze transaction", "decode BEEF", "parse BEEF hex", "decode EF transaction", "inspect transaction", or needs to decode BSV transaction hex (raw, Extended Format, or BEEF) into human-readable format.
allowed-tools: "Bash(bun:*)"
---

# Decode BSV Transaction

Decode BSV transaction hex into human-readable format. Supports raw hex, Extended Format (EF), and BEEF format.

## Status

**Complete** - All tests passing

## Transaction Formats

BSV transactions come in three formats:

| Format | Parser | Starts With | Contains |
|--------|--------|-------------|---------|
| **Raw** | `Transaction.fromHex()` | `01000000` | Just the transaction |
| **EF** (Extended Format) | `Transaction.fromHexEF()` | `0100beef` | Tx + source tx data for fee validation |
| **BEEF** | `Transaction.fromHexBEEF()` | `0100beef` | Tx + merkle proofs for SPV |

The script auto-detects format. Pass `--beef` flag to force BEEF parsing.

## Usage

```bash
# Decode raw or EF hex (auto-detected)
bun run /path/to/skills/decode-bsv-transaction/scripts/decode.ts <tx-hex>

# Decode BEEF hex (from WalletClient noSend)
bun run /path/to/skills/decode-bsv-transaction/scripts/decode.ts --beef <beef-hex>

# Decode transaction by txid (fetches from chain)
bun run /path/to/skills/decode-bsv-transaction/scripts/decode.ts --txid <txid>

# JSON output
bun run /path/to/skills/decode-bsv-transaction/scripts/decode.ts <tx-hex> --json

# Skip prevout lookups (faster; no input values or fee)
bun run /path/to/skills/decode-bsv-transaction/scripts/decode.ts --txid <txid> --no-fees
```

## API Endpoints

JungleBus (primary):
- `GET https://junglebus.gorillapool.io/v1/transaction/get/{txid}`

WhatsOnChain (fallback):
- `GET https://api.whatsonchain.com/v1/bsv/main/tx/{txid}/hex`

## Response

Returns decoded transaction with:
- Version, locktime, size, format type
- Inputs: previous outpoint (`txid:vout`), sequence, and — resolved from the
  embedded source tx (EF/BEEF) or fetched by prevout txid — the input's funding
  `satoshis` and P2PKH `address`. Pass `--no-fees` to skip prevout lookups.
- Outputs: `satoshis`, derived P2PKH `address` (null for non-P2PKH), a `type`
  classification (`p2pkh` / `op_return` / `nonstandard`), and the full locking
  `script` hex (not truncated, so OP_RETURN payloads are inspectable).
- `totalIn`, `totalOut`, and computed `fee` (`totalIn - totalOut`). Fee is
  `null` when any prevout value is unavailable (e.g. `--no-fees`, or a source tx
  that could not be fetched).

## Example

```
$ bun run decode.ts --txid 3ff71eb82058eb45062044091fad0ff9e115d7bb8a0f6b10d5d7f811a1a4fd2d
Transaction Decode (raw)
TXID:     3ff71eb82058eb45062044091fad0ff9e115d7bb8a0f6b10d5d7f811a1a4fd2d
Inputs:   2
  [0] 57277512...b8d19482:2  500000 sats 16j1aZn52BMH8r67kVhw7KE9y9PStwWJS6
  [1] 053ad5ff...53801f1c:18  75 sats 1MP354qMBv6BnSdzTbEEWqRXkLzxByBnq
Outputs:  7
  [0] 216919 satoshis 19Ao4zVRF6yzRaxiSHD34LCw7fBFn9nrDP
        script: 76a914599b34cbd9ec16e922ec3573b080f3fe7058333d88ac
  ...
Total in:  500075 satoshis
Total out: 500019 satoshis
Fee:       56 satoshis
```
