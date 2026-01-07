#!/usr/bin/env bun

const args = process.argv.slice(2);

function showHelp(): void {
  console.log(`lookup-bsv-address - Look up BSV address info

USAGE:
  bun run lookup.ts <address>

OPTIONS:
  --json       Output in JSON format
  --utxos      Include UTXO details
  --history    Include transaction history
  --help       Show this help message

EXAMPLES:
  bun run lookup.ts 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
  bun run lookup.ts --json 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`);
}

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

const jsonOutput = args.includes("--json");
const address = args.find(a => !a.startsWith("--"));

if (!address) {
  console.error("Error: Address required");
  console.error("Run with --help for usage");
  process.exit(1);
}

// Validate address format
if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
  console.error("Error: Invalid BSV address format");
  process.exit(1);
}

async function main() {
  try {
    const balanceResp = await fetch(
      `https://api.whatsonchain.com/v1/bsv/main/address/${address}/balance`
    );

    if (!balanceResp.ok) {
      throw new Error(`API request failed: ${balanceResp.statusText}`);
    }

    const balance = await balanceResp.json();

    const result = {
      address,
      balance: {
        confirmed: balance.confirmed,
        unconfirmed: balance.unconfirmed,
      },
      totalBsv: (balance.confirmed + balance.unconfirmed) / 100000000,
    };

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Address: ${result.address}`);
      console.log(`Balance: ${result.balance.confirmed} satoshis (${result.totalBsv.toFixed(8)} BSV)`);
      if (result.balance.unconfirmed > 0) {
        console.log(`Unconfirmed: ${result.balance.unconfirmed} satoshis`);
      }
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
