#!/usr/bin/env bun

import { Script, OP } from "@bsv/sdk";

const HELP = `
validate - Validate and analyze BSV scripts

USAGE:
  bun run validate.ts <script-hex> [options]
  bun run validate.ts --help

OPTIONS:
  --type <locking|unlocking>  Specify script type
  --json                      Output in JSON format
  -h, --help                  Show this help message

EXAMPLES:
  bun run validate.ts 76a914...88ac
  bun run validate.ts 76a914...88ac --type locking --json
`.trim();

// Build reverse mapping: opcode number -> name
const opCodeNames: Record<number, string> = {};
for (const [name, value] of Object.entries(OP)) {
  if (typeof value === "number" && !opCodeNames[value]) {
    opCodeNames[value] = name;
  }
}

// Dangerous opcodes to warn about
const DANGEROUS_OPCODES = new Set([
  OP.OP_RESERVED,
  OP.OP_VERIF,
  OP.OP_VERNOTIF,
  OP.OP_RESERVED1,
  OP.OP_RESERVED2,
  OP.OP_VER,
]);

interface ValidationResult {
  type: string;
  typeName: string;
  opcodes: string[];
  length: number;
  valid: boolean;
  warnings: string[];
}

function isValidHex(str: string): boolean {
  return /^[0-9a-fA-F]*$/.test(str) && str.length % 2 === 0;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function identifyScriptType(script: Script): { type: string; typeName: string } {
  const chunks = script.chunks;
  const asm = script.toASM();

  // P2PKH: OP_DUP OP_HASH160 <20-byte-hash> OP_EQUALVERIFY OP_CHECKSIG
  if (
    chunks.length === 5 &&
    chunks[0].op === OP.OP_DUP &&
    chunks[1].op === OP.OP_HASH160 &&
    chunks[2].data?.length === 20 &&
    chunks[3].op === OP.OP_EQUALVERIFY &&
    chunks[4].op === OP.OP_CHECKSIG
  ) {
    return { type: "P2PKH", typeName: "Pay-to-Public-Key-Hash" };
  }

  // P2PK: <pubkey> OP_CHECKSIG
  if (
    chunks.length === 2 &&
    chunks[0].data &&
    (chunks[0].data.length === 33 || chunks[0].data.length === 65) &&
    chunks[1].op === OP.OP_CHECKSIG
  ) {
    return { type: "P2PK", typeName: "Pay-to-Public-Key" };
  }

  // OP_RETURN (data carrier)
  if (chunks.length > 0 && chunks[0].op === OP.OP_RETURN) {
    return { type: "OP_RETURN", typeName: "Data Carrier (OP_RETURN)" };
  }

  // Multisig: OP_M <pubkeys...> OP_N OP_CHECKMULTISIG
  if (
    chunks.length >= 4 &&
    chunks[chunks.length - 1].op === OP.OP_CHECKMULTISIG
  ) {
    const firstOp = chunks[0].op;
    const secondLastOp = chunks[chunks.length - 2].op;
    // OP_1 through OP_16 are 0x51 through 0x60
    if (firstOp >= OP.OP_1 && firstOp <= OP.OP_16 &&
        secondLastOp >= OP.OP_1 && secondLastOp <= OP.OP_16) {
      const m = firstOp - OP.OP_1 + 1;
      const n = secondLastOp - OP.OP_1 + 1;
      return { type: "MULTISIG", typeName: `${m}-of-${n} Multisig` };
    }
  }

  // P2SH (legacy): OP_HASH160 <20-byte-hash> OP_EQUAL
  if (
    chunks.length === 3 &&
    chunks[0].op === OP.OP_HASH160 &&
    chunks[1].data?.length === 20 &&
    chunks[2].op === OP.OP_EQUAL
  ) {
    return { type: "P2SH", typeName: "Pay-to-Script-Hash" };
  }

  // Push-only script (likely unlocking script)
  if (script.isPushOnly()) {
    return { type: "PUSH_ONLY", typeName: "Push-Only Script" };
  }

  return { type: "UNKNOWN", typeName: "Unknown Script Type" };
}

function validateScript(hex: string, specifiedType?: string): ValidationResult {
  const script = Script.fromHex(hex);
  const chunks = script.chunks;
  const warnings: string[] = [];

  // Build opcodes list
  const opcodes: string[] = [];
  for (const chunk of chunks) {
    if (chunk.data) {
      // Push data - show as hex with length indicator
      opcodes.push(`<${chunk.data.length}-bytes: ${bytesToHex(chunk.data)}>`);
    } else {
      const opName = opCodeNames[chunk.op] || `0x${chunk.op.toString(16)}`;
      opcodes.push(opName);
    }
  }

  // Identify script type
  const { type, typeName } = identifyScriptType(script);

  // Security checks
  // 1. OP_RETURN in unusual position
  for (let i = 1; i < chunks.length; i++) {
    if (chunks[i].op === OP.OP_RETURN) {
      warnings.push(`OP_RETURN at position ${i + 1} (unusual - typically first)`);
    }
  }

  // 2. Dangerous opcodes
  for (const chunk of chunks) {
    if (DANGEROUS_OPCODES.has(chunk.op)) {
      const opName = opCodeNames[chunk.op] || `0x${chunk.op.toString(16)}`;
      warnings.push(`Dangerous opcode: ${opName}`);
    }
  }

  // 3. Type mismatch warning
  if (specifiedType) {
    const isLocking = script.isLockingScript();
    const isUnlocking = script.isUnlockingScript();

    if (specifiedType === "locking" && !isLocking && isUnlocking) {
      warnings.push("Script appears to be unlocking type, not locking");
    } else if (specifiedType === "unlocking" && !isUnlocking && isLocking) {
      warnings.push("Script appears to be locking type, not unlocking");
    }
  }

  return {
    type,
    typeName,
    opcodes,
    length: hex.length / 2,
    valid: true,
    warnings,
  };
}

function formatOutput(result: ValidationResult, json: boolean): string {
  if (json) {
    return JSON.stringify(
      {
        type: result.type,
        typeName: result.typeName,
        opcodes: result.opcodes,
        length: result.length,
        valid: result.valid,
        warnings: result.warnings,
      },
      null,
      2
    );
  }

  const lines = [
    `Script Type: ${result.type} (${result.typeName})`,
    `Opcodes: ${result.opcodes.join(" ")}`,
    `Length: ${result.length} bytes`,
    `Valid: ${result.valid}`,
    `Warnings: ${result.warnings.length === 0 ? "none" : result.warnings.join(", ")}`,
  ];

  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  // Parse arguments
  const jsonOutput = args.includes("--json");
  let specifiedType: string | undefined;

  const typeIndex = args.indexOf("--type");
  if (typeIndex !== -1 && args[typeIndex + 1]) {
    specifiedType = args[typeIndex + 1];
    if (specifiedType !== "locking" && specifiedType !== "unlocking") {
      console.error("Error: --type must be 'locking' or 'unlocking'");
      process.exit(1);
    }
  }

  // Get script hex (first non-flag argument)
  const scriptHex = args.find(
    (arg, i) =>
      !arg.startsWith("--") &&
      !arg.startsWith("-") &&
      args[i - 1] !== "--type"
  );

  if (!scriptHex) {
    console.error("Error: Missing script hex argument");
    console.error("Usage: bun run validate.ts <script-hex> [options]");
    process.exit(1);
  }

  // Validate hex format
  if (!isValidHex(scriptHex)) {
    console.error("Error: Invalid hex string");
    process.exit(1);
  }

  if (scriptHex.length === 0) {
    console.error("Error: Empty script");
    process.exit(1);
  }

  // Validate and analyze script
  try {
    const result = validateScript(scriptHex, specifiedType);
    console.log(formatOutput(result, jsonOutput));
    process.exit(0);
  } catch (e) {
    const error = e as Error;
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
