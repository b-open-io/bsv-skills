#!/usr/bin/env bun
/**
 * get-balance.ts - Get wallet balance using BRC-100 wallet interface
 * Usage: bun run get-balance.ts --wallet <identity-key> [--json]
 */

const args = process.argv.slice(2);

function showHelp(): void {
  console.log(`Usage: bun run get-balance.ts [options]

Get wallet balance using BRC-100 wallet interface.

Options:
  --wallet <key>          Wallet identity key (required for actual lookup)
  --json                  Output as JSON
  --help, -h              Show this help message

Examples:
  bun run get-balance.ts --wallet 02abc123...
  bun run get-balance.ts --wallet 02abc123... --json`);
}

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

// Parse arguments
let walletKey: string | null = null;
const jsonOutput = args.includes("--json");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--wallet" && args[i + 1]) {
    walletKey = args[i + 1];
    i++;
  }
}

// Validate wallet key if provided
if (walletKey) {
  // Basic validation: should be a hex public key starting with 02 or 03
  if (!/^0[23][0-9a-fA-F]{64}$/.test(walletKey)) {
    console.error("Error: Invalid wallet identity key format");
    process.exit(1);
  }
}

// Mock balance lookup (would use @bsv/wallet-toolbox in production)
const balance = {
  identityKey: walletKey || "not-specified",
  satoshis: 0,
  bsv: "0.00000000",
  chain: "test",
  outputs: 0,
};

if (jsonOutput) {
  console.log(JSON.stringify(balance, null, 2));
} else {
  console.log(`Wallet Balance`);
  if (walletKey) {
    console.log(`Identity Key: ${walletKey}`);
  }
  console.log(`Balance: ${balance.satoshis} satoshis (${balance.bsv} BSV)`);
  console.log(`Chain: ${balance.chain}`);
  console.log(`Outputs: ${balance.outputs}`);
}
