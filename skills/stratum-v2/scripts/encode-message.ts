#!/usr/bin/env bun
/**
 * encode-message.ts - Encode Stratum v2 binary messages
 * Usage: bun run encode-message.ts --type SetupConnection --protocol 0 --min-version 2 --max-version 2 --vendor "TestMiner"
 */

const args = process.argv.slice(2);

function showHelp(): void {
  console.log(`Usage: bun run encode-message.ts [options]

Encode Stratum v2 binary messages.

Options:
  --type <name>           Message type (SetupConnection, OpenChannel, etc.)
  --protocol <num>        Protocol number (default: 0)
  --min-version <num>     Minimum supported version (default: 2)
  --max-version <num>     Maximum supported version (default: 2)
  --vendor <string>       Vendor/device identifier
  --json                  Output as JSON
  --help, -h              Show this help message

Message Types:
  SetupConnection         Initial connection setup (0x00)
  SetupConnectionSuccess  Connection accepted (0x01)
  SetupConnectionError    Connection rejected (0x02)
  OpenStandardMiningChannel    Open mining channel (0x10)
  OpenStandardMiningChannelSuccess (0x11)
  NewMiningJob           New job notification (0x15)
  SubmitSharesStandard   Submit share (0x1a)

Examples:
  bun run encode-message.ts --type SetupConnection --vendor "TestMiner/1.0"
  bun run encode-message.ts --type SetupConnection --protocol 0 --min-version 2 --max-version 2 --vendor "MyMiner" --json`);
}

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

// Message type IDs
const MESSAGE_TYPES: Record<string, number> = {
  SetupConnection: 0x00,
  SetupConnectionSuccess: 0x01,
  SetupConnectionError: 0x02,
  OpenStandardMiningChannel: 0x10,
  OpenStandardMiningChannelSuccess: 0x11,
  NewMiningJob: 0x15,
  SubmitSharesStandard: 0x1a,
};

// Parse arguments
let messageType: string | null = null;
let protocol = 0;
let minVersion = 2;
let maxVersion = 2;
let vendor = "Agent/1.0";
const jsonOutput = args.includes("--json");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--type" && args[i + 1]) {
    messageType = args[i + 1];
    i++;
  } else if (args[i] === "--protocol" && args[i + 1]) {
    protocol = Number.parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--min-version" && args[i + 1]) {
    minVersion = Number.parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--max-version" && args[i + 1]) {
    maxVersion = Number.parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--vendor" && args[i + 1]) {
    vendor = args[i + 1];
    i++;
  }
}

if (!messageType) {
  console.error("Error: --type is required");
  process.exit(1);
}

const typeId = MESSAGE_TYPES[messageType];
if (typeId === undefined) {
  console.error(`Error: Unknown message type '${messageType}'`);
  console.error(`Valid types: ${Object.keys(MESSAGE_TYPES).join(", ")}`);
  process.exit(1);
}

// Helper functions for encoding
function writeU8(value: number): number[] {
  return [value & 0xff];
}

function writeU16LE(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function writeU24LE(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff];
}

function writeSTR0_255(str: string): number[] {
  const bytes = new TextEncoder().encode(str);
  if (bytes.length > 255) {
    throw new Error("String too long (max 255 bytes)");
  }
  return [bytes.length, ...bytes];
}

// Build payload based on message type
let payload: number[] = [];

if (messageType === "SetupConnection") {
  // SetupConnection message format:
  // protocol (U8) + min_version (U16) + max_version (U16) + flags (U32) + endpoint_host (STR0_255) + endpoint_port (U16) + vendor (STR0_255) + ...
  payload = [
    ...writeU8(protocol),
    ...writeU16LE(minVersion),
    ...writeU16LE(maxVersion),
    0, 0, 0, 0, // flags (U32LE)
    ...writeSTR0_255(""), // endpoint_host
    ...writeU16LE(0), // endpoint_port
    ...writeSTR0_255(vendor), // vendor
    ...writeSTR0_255(""), // hardware_version
    ...writeSTR0_255(""), // firmware
    ...writeSTR0_255(""), // device_id
  ];
} else {
  // Generic empty payload for other types
  payload = [];
}

// Build frame: extension_type (2 LE) + msg_type (1) + length (3 LE) + payload
const extensionType = 0;
const frame = [
  ...writeU16LE(extensionType),
  ...writeU8(typeId),
  ...writeU24LE(payload.length),
  ...payload,
];

const frameHex = Buffer.from(frame).toString("hex");

const result = {
  messageType,
  typeId: `0x${typeId.toString(16).padStart(2, "0")}`,
  frame: frameHex,
  frameBreakdown: {
    extensionType: `0x${extensionType.toString(16).padStart(4, "0")}`,
    messageType: `0x${typeId.toString(16).padStart(2, "0")}`,
    payloadLength: payload.length,
    payload: Buffer.from(payload).toString("hex"),
  },
  totalLength: frame.length,
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Stratum v2 Message Encoded`);
  console.log(`Message Type: ${messageType} (0x${typeId.toString(16).padStart(2, "0")})`);
  console.log(`Frame: ${frameHex}`);
  console.log(`Total Length: ${frame.length} bytes`);
  console.log(`\nFrame Breakdown:`);
  console.log(`  Extension Type: ${result.frameBreakdown.extensionType} (2 bytes LE)`);
  console.log(`  Message Type: ${result.frameBreakdown.messageType} (1 byte)`);
  console.log(`  Payload Length: ${payload.length} bytes (3 bytes LE)`);
  if (payload.length > 0) {
    console.log(`  Payload: ${result.frameBreakdown.payload}`);
  }
}
