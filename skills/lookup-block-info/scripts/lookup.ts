#!/usr/bin/env bun

const HELP = `
lookup - Retrieve block information from the BSV blockchain

USAGE:
  bun run lookup.ts --height <number>
  bun run lookup.ts --hash <block-hash>
  bun run lookup.ts --help

OPTIONS:
  --height <number>  Block height to lookup
  --hash <string>    Block hash to lookup (64 hex chars)
  --json             Output in JSON format
  -h, --help         Show this help message

EXAMPLES:
  bun run lookup.ts --height 800000
  bun run lookup.ts --hash 00000000000000000320e...
  bun run lookup.ts --height 800000 --json
`.trim();

interface BlockInfo {
  hash: string;
  height: number;
  time: number;
  size: number;
  txcount: number;
  merkleroot: string;
  previousblockhash: string;
  difficulty: number;
}

interface BlockOutput {
  height: number;
  hash: string;
  time: number;
  size: number;
  txCount: number;
  merkleRoot: string;
  previousHash: string;
  difficulty: number;
}

function parseArgs(args: string[]): { height?: number; hash?: string; json: boolean; help: boolean } {
  const result: { height?: number; hash?: string; json: boolean; help: boolean } = {
    json: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--json") {
      result.json = true;
    } else if (arg === "--height") {
      const val = args[++i];
      if (val === undefined) {
        console.error("Error: --height requires a value");
        process.exit(1);
      }
      const num = parseInt(val, 10);
      if (isNaN(num)) {
        console.error("Error: Height must be non-negative integer");
        process.exit(1);
      }
      result.height = num;
    } else if (arg === "--hash") {
      const val = args[++i];
      if (val === undefined) {
        console.error("Error: --hash requires a value");
        process.exit(1);
      }
      result.hash = val;
    }
  }

  return result;
}

function validateHeight(height: number): void {
  if (height < 0 || !Number.isInteger(height)) {
    console.error("Error: Height must be non-negative integer");
    process.exit(1);
  }
}

function validateHash(hash: string): void {
  const hexRegex = /^[0-9a-fA-F]{64}$/;
  if (!hexRegex.test(hash)) {
    console.error("Error: Hash must be 64 hex characters");
    process.exit(1);
  }
}

async function fetchBlockByHeight(height: number): Promise<BlockInfo> {
  const url = `https://api.whatsonchain.com/v1/bsv/main/block/height/${height}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      console.error("Error: Block not found");
      process.exit(1);
    }
    const text = await response.text();
    console.error(`Error: API request failed: ${response.status} ${text}`);
    process.exit(1);
  }

  return response.json();
}

async function fetchBlockByHash(hash: string): Promise<BlockInfo> {
  // WhatsOnChain provides complete block data (size, txcount, difficulty)
  // JungleBus block_header only provides header fields
  const url = `https://api.whatsonchain.com/v1/bsv/main/block/hash/${hash}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      console.error("Error: Block not found");
      process.exit(1);
    }
    const text = await response.text();
    console.error(`Error: API request failed: ${response.status} ${text}`);
    process.exit(1);
  }

  return response.json();
}

function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

function formatTimestamp(unixTime: number): string {
  const date = new Date(unixTime * 1000);
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function displayBlock(block: BlockInfo, jsonFormat: boolean): void {
  const output: BlockOutput = {
    height: block.height,
    hash: block.hash,
    time: block.time,
    size: block.size,
    txCount: block.txcount,
    merkleRoot: block.merkleroot,
    previousHash: block.previousblockhash || "0000000000000000000000000000000000000000000000000000000000000000",
    difficulty: block.difficulty,
  };

  if (jsonFormat) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`Block #${formatNumber(block.height)}`);
    console.log(`Hash: ${block.hash}`);
    console.log(`Time: ${formatTimestamp(block.time)}`);
    console.log(`Size: ${formatNumber(block.size)} bytes`);
    console.log(`Transactions: ${formatNumber(block.txcount)}`);
    console.log(`Merkle Root: ${block.merkleroot}`);
    console.log(`Previous: ${output.previousHash}`);
    console.log(`Difficulty: ${formatNumber(block.difficulty)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const parsed = parseArgs(args);

  if (parsed.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (parsed.height === undefined && parsed.hash === undefined) {
    console.error("Error: Either --height or --hash is required");
    console.log(HELP);
    process.exit(1);
  }

  try {
    let block: BlockInfo;

    if (parsed.height !== undefined) {
      validateHeight(parsed.height);
      block = await fetchBlockByHeight(parsed.height);
    } else {
      validateHash(parsed.hash!);
      block = await fetchBlockByHash(parsed.hash!);
    }

    displayBlock(block, parsed.json);
  } catch (error) {
    if (error instanceof Error && error.message.includes("fetch")) {
      console.error(`Error: API request failed: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Error: An unexpected error occurred");
    }
    process.exit(1);
  }
}

main();
