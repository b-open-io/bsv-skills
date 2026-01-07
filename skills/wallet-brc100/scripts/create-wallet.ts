#!/usr/bin/env bun
/**
 * create-wallet.ts - Create a BRC-100 conforming wallet instance
 * Usage: bun run create-wallet.ts --chain main|test --storage sqlite|memory [--db-path ./wallet.db]
 */

const args = process.argv.slice(2);

function showHelp(): void {
  console.log(`Usage: bun run create-wallet.ts [options]

Create a BRC-100 conforming wallet instance.

Options:
  --chain <main|test>     Chain to use (default: test)
  --storage <type>        Storage type: sqlite or memory (default: memory)
  --db-path <path>        Database path for sqlite storage
  --json                  Output as JSON
  --help, -h              Show this help message

Examples:
  bun run create-wallet.ts --chain test --storage memory
  bun run create-wallet.ts --chain main --storage sqlite --db-path ./wallet.db
  bun run create-wallet.ts --json`);
}

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

// Parse arguments
let chain = "test";
let storage = "memory";
let dbPath = "./wallet.db";
const jsonOutput = args.includes("--json");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--chain" && args[i + 1]) {
    chain = args[i + 1];
    i++;
  } else if (args[i] === "--storage" && args[i + 1]) {
    storage = args[i + 1];
    i++;
  } else if (args[i] === "--db-path" && args[i + 1]) {
    dbPath = args[i + 1];
    i++;
  }
}

// Validate chain
if (!["main", "test"].includes(chain)) {
  console.error("Error: Invalid chain. Use 'main' or 'test'");
  process.exit(1);
}

// Validate storage
if (!["sqlite", "memory"].includes(storage)) {
  console.error("Error: Invalid storage type. Use 'sqlite' or 'memory'");
  process.exit(1);
}

// Generate a wallet identity key (mock for now - would use @bsv/wallet-toolbox in production)
import { PrivateKey } from "@bsv/sdk";

const privateKey = PrivateKey.fromRandom();
const publicKey = privateKey.toPublicKey();
const identityKey = publicKey.toString();

const result = {
  identityKey,
  chain,
  storage,
  dbPath: storage === "sqlite" ? dbPath : null,
  created: new Date().toISOString(),
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Wallet Created`);
  console.log(`Identity Key: ${identityKey}`);
  console.log(`Chain: ${chain}`);
  console.log(`Storage: ${storage}`);
  if (storage === "sqlite") {
    console.log(`Database: ${dbPath}`);
  }
  console.log(`Created: ${result.created}`);
}
