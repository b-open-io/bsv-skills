#!/usr/bin/env bun

import { Transaction } from "@bsv/sdk";

const args = process.argv.slice(2);

function base64ToHex(base64: string): string {
  const binary = atob(base64);
  const hex: string[] = [];
  for (let i = 0; i < binary.length; i++) {
    hex.push(binary.charCodeAt(i).toString(16).padStart(2, "0"));
  }
  return hex.join("");
}

function showHelp(): void {
  console.log(`decode-bsv-transaction - Decode BSV transaction hex

USAGE:
  bun run decode.ts <tx-hex>
  bun run decode.ts --beef <beef-hex>
  bun run decode.ts --txid <txid>

OPTIONS:
  --beef <hex>   Parse as BEEF format (from WalletClient noSend)
  --txid <id>    Fetch and decode transaction by txid
  --json         Output in JSON format
  --help         Show this help message

FORMATS:
  raw    Standard transaction hex (01000000...)
  EF     Extended Format — auto-detected
  BEEF   Background Evaluation Extended Format — use --beef flag

EXAMPLES:
  bun run decode.ts 0100000001...
  bun run decode.ts --beef 0100beef...
  bun run decode.ts --txid abc123...`);
}

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

const jsonOutput = args.includes("--json");
const txidIndex = args.indexOf("--txid");
const beefIndex = args.indexOf("--beef");

async function main() {
  let txHex: string;
  let format = "raw";

  if (beefIndex !== -1) {
    // BEEF format from --beef flag
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
      const tx = Transaction.fromHexBEEF(beefHex);
      format = "BEEF";
      printTransaction(tx, beefHex.length / 2, format, jsonOutput);
    } catch (e: any) {
      console.error(`Error: Failed to parse BEEF transaction - ${e.message}`);
      process.exit(1);
    }
    return;
  }

  if (txidIndex !== -1 && args[txidIndex + 1]) {
    // Fetch by txid from JungleBus (primary) or WhatsOnChain (fallback)
    const txid = args[txidIndex + 1];
    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      console.error("Error: Invalid txid format (must be 64 hex characters)");
      process.exit(1);
    }

    // Try JungleBus first - returns transaction as base64
    let response = await fetch(`https://junglebus.gorillapool.io/v1/transaction/get/${txid}`);
    if (response.ok) {
      const data = await response.json();
      if (data.transaction) {
        txHex = base64ToHex(data.transaction);
      } else {
        console.error(`Error: Transaction not found: ${txid}`);
        process.exit(1);
      }
    } else {
      // Fallback to WhatsOnChain
      response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/hex`);
      if (!response.ok) {
        console.error(`Error: Transaction not found: ${txid}`);
        process.exit(1);
      }
      txHex = await response.text();
    }
  } else {
    // Get hex from args
    const hexArg = args.find(a => !a.startsWith("--"));
    if (!hexArg) {
      console.error("Error: Transaction hex required");
      console.error("Run with --help for usage");
      process.exit(1);
    }
    txHex = hexArg;
  }

  // Validate hex format
  if (!/^[a-fA-F0-9]+$/.test(txHex)) {
    console.error("Error: Invalid transaction hex");
    process.exit(1);
  }

  // Auto-detect format: try EF first, fall back to raw
  let tx: Transaction;
  try {
    tx = Transaction.fromHexEF(txHex);
    format = "EF";
  } catch {
    try {
      tx = Transaction.fromHex(txHex);
      format = "raw";
    } catch (error: any) {
      console.error(`Error: Failed to decode transaction - ${error.message}`);
      process.exit(1);
    }
  }

  printTransaction(tx!, txHex.length / 2, format, jsonOutput);
}

function printTransaction(tx: Transaction, byteSize: number, format: string, json: boolean) {
  const result = {
    txid: tx.id("hex"),
    format,
    version: tx.version,
    locktime: tx.lockTime,
    size: byteSize,
    inputs: tx.inputs.map((input, i) => ({
      index: i,
      txid: input.sourceTXID,
      vout: input.sourceOutputIndex,
      sequence: input.sequence,
    })),
    outputs: tx.outputs.map((output, i) => ({
      index: i,
      satoshis: output.satoshis,
      script: output.lockingScript?.toHex().substring(0, 40) + "...",
    })),
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Transaction Decode (${format})`);
    console.log(`TXID:     ${result.txid}`);
    console.log(`Version:  ${result.version}`);
    console.log(`Size:     ${result.size} bytes`);
    console.log(`Inputs:   ${result.inputs.length}`);
    result.inputs.forEach(inp => {
      console.log(`  [${inp.index}] ${inp.txid}:${inp.vout}`);
    });
    console.log(`Outputs:  ${result.outputs.length}`);
    result.outputs.forEach(out => {
      console.log(`  [${out.index}] ${out.satoshis} satoshis`);
    });
    console.log(`Locktime: ${result.locktime}`);
  }
}

main();
