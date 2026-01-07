#!/usr/bin/env bun
import { BigNumber } from "@bsv/sdk";

const HELP = `
difficulty - Calculate and analyze BSV mining difficulty

USAGE:
  bun run difficulty.ts --current
  bun run difficulty.ts --target <hex>
  bun run difficulty.ts --bits <compact>
  bun run difficulty.ts --help

OPTIONS:
  --current          Fetch current network difficulty
  --target <hex>     Calculate difficulty from target (64-char hex)
  --bits <compact>   Calculate from compact bits (e.g., 0x1d00ffff)
  --json             Output in JSON format
  -h, --help         Show this help message

EXAMPLES:
  bun run difficulty.ts --current
  bun run difficulty.ts --bits 0x1d00ffff
  bun run difficulty.ts --target 00000000ffff0000000000000000000000000000000000000000000000000000
  bun run difficulty.ts --current --json
`.trim();

// Maximum target (difficulty 1) - genesis block target
const MAX_TARGET_HEX = "00000000ffff0000000000000000000000000000000000000000000000000000";

/**
 * Convert compact bits to target (256-bit number as hex)
 * Compact format: first byte = exponent, next 3 bytes = mantissa
 * target = mantissa * 2^(8*(exponent-3))
 */
function bitsToTarget(bits: number): string {
  const exponent = (bits >> 24) & 0xff;
  const mantissa = bits & 0x00ffffff;

  // Handle negative flag (high bit of mantissa)
  if (mantissa & 0x800000) {
    throw new Error("Negative target not allowed");
  }

  // Calculate target
  // target = mantissa * 2^(8*(exponent-3))
  const shift = 8 * (exponent - 3);

  let targetBN: BigNumber;
  if (shift >= 0) {
    targetBN = new BigNumber(mantissa).mul(new BigNumber(2).pow(new BigNumber(shift)));
  } else {
    targetBN = new BigNumber(mantissa).div(new BigNumber(2).pow(new BigNumber(-shift)));
  }

  // Convert to 64-character hex string (256 bits)
  let targetHex = targetBN.toHex();
  // Remove "0x" prefix if present
  if (targetHex.startsWith("0x")) {
    targetHex = targetHex.slice(2);
  }
  // Pad to 64 characters
  return targetHex.padStart(64, "0");
}

/**
 * Convert target (hex) to compact bits representation
 */
function targetToBits(targetHex: string): number {
  // Remove 0x prefix if present
  const cleanHex = targetHex.replace(/^0x/, "").toLowerCase();

  // Find first non-zero byte position
  let firstNonZero = 0;
  for (let i = 0; i < cleanHex.length; i += 2) {
    if (cleanHex.slice(i, i + 2) !== "00") {
      firstNonZero = i / 2;
      break;
    }
  }

  // Get the significant bytes (up to 3)
  const significantHex = cleanHex.slice(firstNonZero * 2);
  const byteLength = significantHex.length / 2;

  // Calculate exponent (number of bytes from the right)
  const exponent = 32 - firstNonZero;

  // Get mantissa (first 3 bytes)
  let mantissa: number;
  if (byteLength >= 3) {
    mantissa = parseInt(significantHex.slice(0, 6), 16);
  } else if (byteLength === 2) {
    mantissa = parseInt(significantHex.slice(0, 4), 16) << 8;
  } else if (byteLength === 1) {
    mantissa = parseInt(significantHex.slice(0, 2), 16) << 16;
  } else {
    mantissa = 0;
  }

  // If high bit of mantissa is set, shift right and increase exponent
  if (mantissa & 0x800000) {
    mantissa >>= 8;
    return ((exponent + 1) << 24) | mantissa;
  }

  return (exponent << 24) | mantissa;
}

/**
 * Calculate difficulty from target
 * difficulty = max_target / current_target
 */
function targetToDifficulty(targetHex: string): number {
  const maxTarget = new BigNumber(MAX_TARGET_HEX, 16);
  const target = new BigNumber(targetHex.replace(/^0x/, ""), 16);

  if (target.eqn(0)) {
    throw new Error("Target cannot be zero");
  }

  // Use BigNumber division for precision, then convert to number
  // For very high difficulties, we may lose some precision
  const diffBN = maxTarget.div(target);
  return Number(diffBN.toString());
}

/**
 * Calculate expected number of hashes to find a block
 * expectedHashes = 2^256 / (target + 1)
 * Simplified: expectedHashes = difficulty * 2^32
 */
function expectedHashes(difficulty: number): string {
  const hashes = difficulty * Math.pow(2, 32);
  return hashes.toExponential(2);
}

/**
 * Validate hex string
 */
function isValidHex(str: string): boolean {
  const cleanHex = str.replace(/^0x/, "");
  return /^[0-9a-fA-F]+$/.test(cleanHex);
}

/**
 * Parse bits value from string (handles 0x prefix and decimal)
 */
function parseBits(bitsStr: string): number {
  const trimmed = bitsStr.trim().toLowerCase();
  if (trimmed.startsWith("0x")) {
    const parsed = parseInt(trimmed, 16);
    if (Number.isNaN(parsed)) {
      throw new Error("Invalid bits format");
    }
    return parsed;
  }
  const parsed = parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    throw new Error("Invalid bits format");
  }
  return parsed;
}

/**
 * Format difficulty with thousand separators
 */
function formatDifficulty(diff: number): string {
  if (diff >= 1e12) {
    return diff.toExponential(4);
  }
  return diff.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Fetch current network difficulty from WhatsOnChain
 */
async function fetchCurrentDifficulty(): Promise<{
  difficulty: number;
  bits: string;
  bestBlockHash: string;
}> {
  const response = await fetch("https://api.whatsonchain.com/v1/bsv/main/chain/info");
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return {
    difficulty: data.difficulty,
    bits: data.bits,
    bestBlockHash: data.bestblockhash,
  };
}

interface DifficultyResult {
  difficulty: number;
  target: string;
  bits: string;
  expectedHashes: string;
}

function displayResult(result: DifficultyResult, jsonOutput: boolean): void {
  if (jsonOutput) {
    console.log(JSON.stringify({
      difficulty: result.difficulty,
      target: result.target,
      bits: result.bits,
      expectedHashes: result.expectedHashes,
    }, null, 2));
  } else {
    console.log(`
Mining Difficulty Analysis
==========================
Difficulty: ${formatDifficulty(result.difficulty)}
Target: 0x${result.target}
Bits: 0x${result.bits}
Expected hashes: ${result.expectedHashes}
`.trim());
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  const jsonOutput = args.includes("--json");
  const currentIndex = args.indexOf("--current");
  const targetIndex = args.indexOf("--target");
  const bitsIndex = args.indexOf("--bits");

  try {
    if (currentIndex !== -1) {
      // Fetch current network difficulty
      const info = await fetchCurrentDifficulty();

      // Parse the bits to get the target
      const bitsNum = parseBits(info.bits);
      const targetHex = bitsToTarget(bitsNum);

      displayResult({
        difficulty: info.difficulty,
        target: targetHex,
        bits: bitsNum.toString(16).padStart(8, "0"),
        expectedHashes: expectedHashes(info.difficulty),
      }, jsonOutput);

    } else if (targetIndex !== -1) {
      // Calculate from target hex
      const targetArg = args[targetIndex + 1];
      if (!targetArg) {
        console.error("Error: --target requires a hex value");
        process.exit(1);
      }

      const cleanTarget = targetArg.replace(/^0x/, "").toLowerCase();
      if (!isValidHex(cleanTarget)) {
        console.error("Error: Invalid target hex");
        process.exit(1);
      }

      // Pad or truncate to 64 chars
      const targetHex = cleanTarget.padStart(64, "0").slice(0, 64);
      const difficulty = targetToDifficulty(targetHex);
      const bits = targetToBits(targetHex);

      displayResult({
        difficulty,
        target: targetHex,
        bits: bits.toString(16).padStart(8, "0"),
        expectedHashes: expectedHashes(difficulty),
      }, jsonOutput);

    } else if (bitsIndex !== -1) {
      // Calculate from compact bits
      const bitsArg = args[bitsIndex + 1];
      if (!bitsArg) {
        console.error("Error: --bits requires a value");
        process.exit(1);
      }

      const bitsNum = parseBits(bitsArg);
      if (bitsNum <= 0 || bitsNum > 0xffffffff) {
        console.error("Error: Invalid bits format");
        process.exit(1);
      }

      const targetHex = bitsToTarget(bitsNum);
      const difficulty = targetToDifficulty(targetHex);

      displayResult({
        difficulty,
        target: targetHex,
        bits: bitsNum.toString(16).padStart(8, "0"),
        expectedHashes: expectedHashes(difficulty),
      }, jsonOutput);

    } else {
      console.error("Error: Must specify --current, --target, or --bits");
      console.log("\nRun with --help for usage information");
      process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

main();
