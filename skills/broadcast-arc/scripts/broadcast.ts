#!/usr/bin/env bun

import { Transaction, ARC } from "@bsv/sdk";

const HELP = `
broadcast-arc - Broadcast a BSV transaction via ARC

USAGE:
  bun run broadcast.ts <tx-hex>
  bun run broadcast.ts --beef <beef-hex>
  bun run broadcast.ts <tx-hex> --url <arc-url> --key <api-key>

ARGUMENTS:
  tx-hex          Signed transaction in raw hex or EF hex format

OPTIONS:
  --beef <hex>    Transaction in BEEF hex format (from WalletClient noSend)
  --url <url>     ARC endpoint URL (default: https://arc.gorillapool.io)
  --key <key>     API key (required for TAAL, optional for GorillaPool)
  --help, -h      Show this help message

EXAMPLES:
  # Broadcast raw tx to GorillaPool (no key needed)
  bun run broadcast.ts 0100000001...

  # Broadcast BEEF transaction
  bun run broadcast.ts --beef 0100beef...

  # Broadcast to TAAL with API key
  bun run broadcast.ts 0100000001... --url https://api.taal.com/arc --key mainnet_xxxxxx

PROVIDERS:
  GorillaPool:  https://arc.gorillapool.io  (no API key required)
  TAAL:         https://api.taal.com/arc    (get key from console.taal.com)
`.trim();

const DEFAULT_ARC_URL = "https://arc.gorillapool.io";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  // Parse flags
  const beefIndex = args.indexOf("--beef");
  const urlIndex = args.indexOf("--url");
  const keyIndex = args.indexOf("--key");

  const arcUrl = urlIndex !== -1 ? args[urlIndex + 1] : DEFAULT_ARC_URL;
  const apiKey = keyIndex !== -1 ? args[keyIndex + 1] : undefined;

  if (!arcUrl) {
    console.error("Error: --url requires a value");
    process.exit(1);
  }

  let tx: Transaction;

  if (beefIndex !== -1) {
    // BEEF format
    const beefHex = args[beefIndex + 1];
    if (!beefHex) {
      console.error("Error: --beef requires a hex value");
      process.exit(1);
    }
    if (!/^[a-fA-F0-9]+$/.test(beefHex)) {
      console.error("Error: Invalid BEEF hex format");
      process.exit(1);
    }
    try {
      tx = Transaction.fromHexBEEF(beefHex);
    } catch (e: any) {
      console.error(`Error: Failed to parse BEEF transaction - ${e.message}`);
      process.exit(1);
    }
  } else {
    // Raw or EF hex
    const txHex = args.find((a) => !a.startsWith("--") && !/^--/.test(a));
    if (!txHex) {
      console.error("Error: Transaction hex required");
      console.error("Run with --help for usage");
      process.exit(1);
    }
    if (!/^[a-fA-F0-9]+$/.test(txHex)) {
      console.error("Error: Invalid transaction hex format");
      process.exit(1);
    }
    // Try EF first, fall back to raw
    try {
      tx = Transaction.fromHexEF(txHex);
    } catch {
      try {
        tx = Transaction.fromHex(txHex);
      } catch (e: any) {
        console.error(`Error: Failed to parse transaction - ${e.message}`);
        process.exit(1);
      }
    }
  }

  const broadcaster = new ARC(arcUrl, apiKey);

  console.log(`Broadcasting to: ${arcUrl}`);
  console.log(`TX size: ${tx.toBinary().length} bytes`);

  const result = await tx.broadcast(broadcaster);

  if (result.status === "success") {
    console.log(`\nSuccess!`);
    console.log(`TXID:   ${result.txid}`);
    console.log(`Status: ${result.message}`);
    console.log(`View:   https://whatsonchain.com/tx/${result.txid}`);
  } else {
    console.error(`\nBroadcast failed`);
    console.error(`Code:   ${result.code}`);
    console.error(`Reason: ${result.description}`);
    // 409 means already known — not a real failure
    if (result.code === "409") {
      console.log("(Transaction already known to the network — this is OK)");
      if (result.txid) console.log(`TXID: ${result.txid}`);
    } else {
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error(`Unexpected error: ${e.message}`);
  process.exit(1);
});
