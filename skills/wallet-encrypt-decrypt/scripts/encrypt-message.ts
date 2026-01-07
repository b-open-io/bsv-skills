#!/usr/bin/env bun

import { PrivateKey, PublicKey, Random } from "@bsv/sdk";
import { createCipheriv, createHash } from "crypto";

const HELP = `
encrypt-message - Encrypt a message using ECDH + AES-256-GCM

USAGE:
  bun run encrypt-message.ts <recipient-pubkey-hex> <message>
  bun run encrypt-message.ts --help

ARGUMENTS:
  recipient-pubkey-hex  Recipient's public key in hex (66 chars, starts with 02/03)
  message               The message to encrypt

OPTIONS:
  --help, -h            Show this help message

OUTPUT:
  JSON object with:
  - ephemeralPublicKey: Ephemeral public key for ECDH
  - iv: 12-byte initialization vector (hex)
  - authTag: 16-byte authentication tag (hex)
  - ciphertext: Encrypted message (hex)

EXAMPLES:
  # Encrypt a message
  bun run encrypt-message.ts 02abc...def "Hello, World!"

  # Pipe output for decryption
  bun run encrypt-message.ts 02abc...def "Secret" | bun run decrypt-message.ts L1...

CRYPTO:
  - ECDH on secp256k1 for key agreement
  - SHA256 for key derivation
  - AES-256-GCM for authenticated encryption
`.trim();

// Compute ECDH shared secret
function computeSharedSecret(privateKey: PrivateKey, publicKey: PublicKey): Buffer {
  const point = publicKey.mul(privateKey);
  const sharedX = point.x?.toArray("be", 32);
  if (!sharedX) throw new Error("Failed to compute shared secret");
  return Buffer.from(sharedX);
}

// Derive AES key from shared secret
function deriveKey(sharedSecret: Buffer): Buffer {
  return createHash("sha256").update(sharedSecret).digest();
}

// Encrypt with AES-256-GCM
function encrypt(plaintext: string, recipientPubKey: PublicKey): {
  ephemeralPublicKey: string;
  iv: string;
  authTag: string;
  ciphertext: string;
} {
  // Generate ephemeral key pair
  const ephemeral = PrivateKey.fromRandom();

  // Compute shared secret
  const sharedSecret = computeSharedSecret(ephemeral, recipientPubKey);
  const key = deriveKey(sharedSecret);

  // Generate random IV
  const iv = Buffer.from(Random(12));

  // Encrypt
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ephemeralPublicKey: ephemeral.toPublicKey().toString(),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    ciphertext: encrypted.toString("hex"),
  };
}

function main() {
  const args = process.argv.slice(2);

  // Handle help
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  // Parse arguments
  const [pubkeyHex, ...messageParts] = args;
  const message = messageParts.join(" ");

  if (!pubkeyHex) {
    console.error("Error: Missing recipient public key");
    console.error("Usage: bun run encrypt-message.ts <recipient-pubkey-hex> <message>");
    process.exit(1);
  }

  if (!message) {
    console.error("Error: Missing message to encrypt");
    console.error("Usage: bun run encrypt-message.ts <recipient-pubkey-hex> <message>");
    process.exit(1);
  }

  // Parse recipient public key
  let recipientPubKey: PublicKey;
  try {
    recipientPubKey = PublicKey.fromString(pubkeyHex);
  } catch (e) {
    console.error(`Error: Invalid public key - ${(e as Error).message}`);
    process.exit(1);
  }

  // Encrypt message
  try {
    const result = encrypt(message, recipientPubKey);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`Error encrypting: ${(e as Error).message}`);
    process.exit(1);
  }
}

main();
