#!/usr/bin/env bun
/**
 * decode-message.ts - Decode Stratum v2 binary frames
 * Usage: bun run decode-message.ts <hex-frame> [--json]
 */

const args = process.argv.slice(2);

function showHelp(): void {
  console.log(`Usage: bun run decode-message.ts <hex-frame> [options]

Decode Stratum v2 binary frames.

Options:
  --json                  Output as JSON
  --help, -h              Show this help message

Frame Format:
  +------------------+------------------+------------------+
  | Extension Type   | Message Type     | Message Length   |
  | (2 bytes LE)     | (1 byte)         | (3 bytes LE)     |
  +------------------+------------------+------------------+
  |                      Payload                           |
  +--------------------------------------------------------+

Examples:
  bun run decode-message.ts 000000060000
  bun run decode-message.ts 000000060000 --json`);
}

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

// Message type names
const MESSAGE_TYPES: Record<number, string> = {
  0x00: "SetupConnection",
  0x01: "SetupConnectionSuccess",
  0x02: "SetupConnectionError",
  0x10: "OpenStandardMiningChannel",
  0x11: "OpenStandardMiningChannelSuccess",
  0x15: "NewMiningJob",
  0x1a: "SubmitSharesStandard",
  0x1b: "SubmitSharesSuccess",
};

const jsonOutput = args.includes("--json");
const frameArg = args.find((arg) => !arg.startsWith("-"));

if (!frameArg) {
  console.error("Error: No frame provided");
  console.error("Usage: bun run decode-message.ts <hex-frame>");
  process.exit(1);
}

// Validate hex
if (!/^[0-9a-fA-F]+$/.test(frameArg)) {
  console.error("Error: Invalid hex format");
  process.exit(1);
}

if (frameArg.length < 12) {
  console.error("Error: Frame too short (minimum 6 bytes header)");
  process.exit(1);
}

const frameBytes = Buffer.from(frameArg, "hex");

// Parse header
// Extension type: 2 bytes LE
const extensionType = frameBytes[0] | (frameBytes[1] << 8);

// Message type: 1 byte
const messageType = frameBytes[2];

// Payload length: 3 bytes LE
const payloadLength = frameBytes[3] | (frameBytes[4] << 8) | (frameBytes[5] << 16);

// Validate frame length
const expectedLength = 6 + payloadLength;
if (frameBytes.length < expectedLength) {
  console.error(`Error: Incomplete frame (expected ${expectedLength} bytes, got ${frameBytes.length})`);
  process.exit(1);
}

// Extract payload
const payload = frameBytes.slice(6, 6 + payloadLength);

const messageTypeName = MESSAGE_TYPES[messageType] || `Unknown (0x${messageType.toString(16).padStart(2, "0")})`;

const result = {
  extensionType,
  messageType,
  messageTypeName,
  payloadLength,
  payload: payload.toString("hex"),
  frameLength: frameBytes.length,
  valid: true,
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Stratum v2 Frame Decoded`);
  console.log(`Extension Type: ${extensionType} (0x${extensionType.toString(16).padStart(4, "0")})`);
  console.log(`Message Type: ${messageTypeName} (0x${messageType.toString(16).padStart(2, "0")})`);
  console.log(`Payload Length: ${payloadLength} bytes`);
  if (payloadLength > 0) {
    console.log(`Payload: ${payload.toString("hex")}`);
  }
  console.log(`Total Frame: ${frameBytes.length} bytes`);
}
