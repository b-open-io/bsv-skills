#!/usr/bin/env bun

import { PrivateKey, P2PKH, Transaction, Script } from "@bsv/sdk";

// Help text
const HELP = `
wallet-send-bsv - Send BSV transactions

USAGE:
  bun run send.ts <from-wif> <to-address> <amount-satoshis>
  bun run send.ts --help

ARGUMENTS:
  from-wif          Private key in WIF format (starts with K, L, or 5)
  to-address        Recipient BSV address (starts with 1 or 3)
  amount-satoshis   Amount to send in satoshis (1 BSV = 100,000,000 satoshis)

OPTIONS:
  --help, -h        Show this help message

EXAMPLES:
  # Send 1000 satoshis
  bun run send.ts KwajxSXaLx4GHVJH6cmB54eB2UHMKEJbeNweTfUxJDkSoorZ9Bgx 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2 1000

NOTES:
  - Uses WhatsOnChain API for UTXO fetching and broadcast
  - Fee rate: 1 sat/byte (minimum)
  - Network: BSV mainnet
`.trim();

// Validate BSV address format
function isValidAddress(address: string): boolean {
  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
}

// Fetch UTXOs from WhatsOnChain
interface UTXO {
  tx_hash: string;
  tx_pos: number;
  value: number;
}

async function fetchUtxos(address: string): Promise<UTXO[]> {
  const url = `https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
  }
  return response.json();
}

// Broadcast transaction via WhatsOnChain
async function broadcastTx(txHex: string): Promise<string> {
  const url = "https://api.whatsonchain.com/v1/bsv/main/tx/raw";
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txhex: txHex }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Broadcast failed: ${error}`);
  }
  return response.text();
}

// Calculate fee (1 sat/byte minimum)
function calculateFee(inputCount: number, outputCount: number): number {
  // P2PKH: ~148 bytes per input, ~34 bytes per output, ~10 bytes overhead
  const estimatedSize = 10 + inputCount * 148 + outputCount * 34;
  return estimatedSize; // 1 sat/byte
}

async function main() {
  const args = process.argv.slice(2);

  // Handle help
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  // Parse arguments
  const [wifArg, toAddress, amountArg] = args;

  if (!wifArg || !toAddress || !amountArg) {
    console.error("Error: Missing required arguments");
    console.error("Usage: bun run send.ts <from-wif> <to-address> <amount-satoshis>");
    console.error("Run with --help for more information");
    process.exit(1);
  }

  // Parse and validate WIF
  let privateKey: PrivateKey;
  try {
    privateKey = PrivateKey.fromWif(wifArg);
  } catch (e) {
    console.error(`Error: Invalid WIF format - ${(e as Error).message}`);
    process.exit(1);
  }

  // Validate recipient address
  if (!isValidAddress(toAddress)) {
    console.error(`Error: Invalid recipient address format: ${toAddress}`);
    process.exit(1);
  }

  // Parse amount
  const amount = parseInt(amountArg, 10);
  if (isNaN(amount) || amount <= 0) {
    console.error(`Error: Invalid amount: ${amountArg}`);
    process.exit(1);
  }

  // Get sender address
  const senderAddress = privateKey.toAddress();
  console.log(`Sender: ${senderAddress}`);
  console.log(`Recipient: ${toAddress}`);
  console.log(`Amount: ${amount} satoshis`);

  // Fetch UTXOs
  console.log("\nFetching UTXOs...");
  let utxos: UTXO[];
  try {
    utxos = await fetchUtxos(senderAddress);
  } catch (e) {
    console.error(`Error fetching UTXOs: ${(e as Error).message}`);
    process.exit(1);
  }

  if (utxos.length === 0) {
    console.error("Error: No UTXOs found for sender address");
    process.exit(1);
  }

  // Calculate total balance
  const totalBalance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
  console.log(`Balance: ${totalBalance} satoshis (${utxos.length} UTXOs)`);

  // Estimate fee
  const estimatedFee = calculateFee(utxos.length, 2);
  const totalRequired = amount + estimatedFee;

  if (totalBalance < totalRequired) {
    console.error(`Error: Insufficient funds`);
    console.error(`  Balance: ${totalBalance} satoshis`);
    console.error(`  Required: ${totalRequired} satoshis (${amount} + ${estimatedFee} fee)`);
    process.exit(1);
  }

  // Build transaction
  console.log("\nBuilding transaction...");
  const tx = new Transaction();

  // Add inputs
  for (const utxo of utxos) {
    tx.addInput({
      sourceTXID: utxo.tx_hash,
      sourceOutputIndex: utxo.tx_pos,
      unlockingScriptTemplate: new P2PKH().unlock(privateKey),
      sequence: 0xffffffff,
    });
  }

  // Add recipient output
  tx.addOutput({
    lockingScript: new P2PKH().lock(toAddress),
    satoshis: amount,
  });

  // Add change output if needed
  const change = totalBalance - amount - estimatedFee;
  if (change > 0) {
    tx.addOutput({
      lockingScript: new P2PKH().lock(senderAddress),
      satoshis: change,
    });
  }

  // Sign transaction
  console.log("Signing transaction...");
  await tx.sign();

  // Get transaction hex
  const txHex = tx.toHex();
  console.log(`Transaction size: ${txHex.length / 2} bytes`);
  console.log(`Fee: ${estimatedFee} satoshis`);

  // Broadcast
  console.log("\nBroadcasting transaction...");
  try {
    const txid = await broadcastTx(txHex);
    console.log(`\nSuccess! Transaction ID: ${txid}`);
    console.log(`View: https://whatsonchain.com/tx/${txid}`);
  } catch (e) {
    console.error(`Error broadcasting: ${(e as Error).message}`);
    console.log("\nTransaction hex (for manual broadcast):");
    console.log(txHex);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`Unexpected error: ${e.message}`);
  process.exit(1);
});
