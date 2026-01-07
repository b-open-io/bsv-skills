#!/usr/bin/env bun
// Estimate transaction fees for BSV transactions

import { Transaction } from "@bsv/sdk";

const HELP = `
estimate - Estimate transaction fees for BSV transactions

USAGE:
  bun run estimate.ts --size <bytes>
  bun run estimate.ts --tx <hex>
  bun run estimate.ts --inputs <n> --outputs <n>
  bun run estimate.ts --help

OPTIONS:
  --size <bytes>     Transaction size in bytes
  --tx <hex>         Raw transaction hex
  --inputs <n>       Number of inputs (for estimation)
  --outputs <n>      Number of outputs (for estimation)
  --rate <sat/byte>  Fee rate (default: 1 sat/byte)
  --json             Output in JSON format
  -h, --help         Show this help message

EXAMPLES:
  bun run estimate.ts --size 226
  bun run estimate.ts --inputs 2 --outputs 2
  bun run estimate.ts --size 500 --rate 2
  bun run estimate.ts --size 226 --json
`.trim();

// Size constants for P2PKH transactions
const OVERHEAD_BYTES = 10; // version (4) + locktime (4) + varint overhead (~2)
const BYTES_PER_INPUT = 148; // txid (32) + vout (4) + scriptLen (1) + script (~107) + sequence (4)
const BYTES_PER_OUTPUT = 34; // value (8) + scriptLen (1) + script (~25)

interface FeeEstimate {
  size: number;
  rate: number;
  fee: number;
  feeBsv: number;
  inputs?: number;
  outputs?: number;
}

function parseArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

function estimateSizeFromInputsOutputs(inputs: number, outputs: number): number {
  return OVERHEAD_BYTES + inputs * BYTES_PER_INPUT + outputs * BYTES_PER_OUTPUT;
}

function getSizeFromTxHex(hex: string): number {
  try {
    const tx = Transaction.fromHex(hex);
    return tx.toHex().length / 2; // hex string is 2 chars per byte
  } catch {
    throw new Error("Invalid transaction hex");
  }
}

function formatOutput(estimate: FeeEstimate, json: boolean): string {
  if (json) {
    return JSON.stringify(estimate, null, 2);
  }

  const lines = [
    "Fee Estimation",
    "==============",
    `Size: ${estimate.size} bytes`,
    `Rate: ${estimate.rate} sat/byte`,
    `Fee: ${estimate.fee} satoshis (${estimate.feeBsv.toFixed(8)} BSV)`,
  ];

  if (estimate.inputs !== undefined && estimate.outputs !== undefined) {
    lines.push("Breakdown:");
    lines.push(`  - Inputs (${estimate.inputs}): ~${estimate.inputs * BYTES_PER_INPUT} bytes`);
    lines.push(`  - Outputs (${estimate.outputs}): ~${estimate.outputs * BYTES_PER_OUTPUT} bytes`);
    lines.push(`  - Overhead: ~${OVERHEAD_BYTES} bytes`);
  }

  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);

  // Handle help
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  // Parse arguments
  const sizeArg = parseArg(args, "--size");
  const txArg = parseArg(args, "--tx");
  const inputsArg = parseArg(args, "--inputs");
  const outputsArg = parseArg(args, "--outputs");
  const rateArg = parseArg(args, "--rate");
  const jsonOutput = args.includes("--json");

  // Parse and validate rate
  const rate = rateArg ? Number(rateArg) : 1;
  if (Number.isNaN(rate) || rate <= 0) {
    console.error("Error: Rate must be positive");
    process.exit(1);
  }

  let size: number;
  let inputs: number | undefined;
  let outputs: number | undefined;

  // Determine size from input method
  if (sizeArg !== undefined) {
    size = Number(sizeArg);
    if (Number.isNaN(size) || !Number.isInteger(size) || size <= 0) {
      console.error("Error: Size must be positive integer");
      process.exit(1);
    }
  } else if (txArg !== undefined) {
    try {
      size = getSizeFromTxHex(txArg);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  } else if (inputsArg !== undefined || outputsArg !== undefined) {
    inputs = inputsArg ? Number(inputsArg) : 1;
    outputs = outputsArg ? Number(outputsArg) : 1;

    if (Number.isNaN(inputs) || !Number.isInteger(inputs) || inputs <= 0) {
      console.error("Error: Inputs must be positive integer");
      process.exit(1);
    }
    if (Number.isNaN(outputs) || !Number.isInteger(outputs) || outputs <= 0) {
      console.error("Error: Outputs must be positive integer");
      process.exit(1);
    }

    size = estimateSizeFromInputsOutputs(inputs, outputs);
  } else {
    console.error("Error: Must provide --size, --tx, or --inputs/--outputs");
    console.log("\n" + HELP);
    process.exit(1);
  }

  // Calculate fee (always round up for safety)
  const fee = Math.ceil(size * rate);
  const feeBsv = fee / 100_000_000;

  const estimate: FeeEstimate = {
    size,
    rate,
    fee,
    feeBsv,
  };

  if (inputs !== undefined) estimate.inputs = inputs;
  if (outputs !== undefined) estimate.outputs = outputs;

  console.log(formatOutput(estimate, jsonOutput));
  process.exit(0);
}

main();
