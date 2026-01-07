#!/usr/bin/env bun

import { PrivateKey, PublicKey } from "@bsv/sdk";
import { createDecipheriv, createHash } from "crypto";

const HELP = `
decrypt-message - Decrypt a message using ECDH + AES-256-GCM

USAGE:
  bun run decrypt-message.ts <private-key-wif> <encrypted-json>
  bun run decrypt-message.ts --help

ARGUMENTS:
  private-key-wif    Your private key in WIF format (starts with K, L, or 5)
  encrypted-json     JSON object from encrypt-message.ts (can be quoted string or stdin)

OPTIONS:
  --help, -h         Show this help message

OUTPUT:
  The decrypted plaintext message

EXAMPLES:
  # Decrypt from command line
  bun run decrypt-message.ts L1abc... '{"ephemeralPublicKey":"02...","iv":"...","authTag":"...","ciphertext":"..."}'

  # Decrypt from pipe
  cat encrypted.json | xargs -0 bun run decrypt-message.ts L1abc...

CRYPTO:
  - ECDH on secp256k1 for key agreement
  - SHA256 for key derivation
  - AES-256-GCM for authenticated decryption
`.trim();

interface EncryptedData {
  ephemeralPublicKey: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

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

// Decrypt with AES-256-GCM
function decrypt(encryptedData: EncryptedData, privateKey: PrivateKey): string {
  // Parse ephemeral public key
  const ephemeralPub = PublicKey.fromString(encryptedData.ephemeralPublicKey);

  // Compute shared secret
  const sharedSecret = computeSharedSecret(privateKey, ephemeralPub);
  const key = deriveKey(sharedSecret);

  // Decrypt
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedData.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData.ciphertext, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function validateEncryptedData(data: unknown): data is EncryptedData {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.ephemeralPublicKey === "string" &&
    typeof obj.iv === "string" &&
    typeof obj.authTag === "string" &&
    typeof obj.ciphertext === "string"
  );
}

function main() {
  const args = process.argv.slice(2);

  // Handle help
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  // Parse arguments
  const [wifArg, ...jsonParts] = args;
  const jsonStr = jsonParts.join(" ");

  if (!wifArg) {
    console.error("Error: Missing private key WIF");
    console.error("Usage: bun run decrypt-message.ts <private-key-wif> <encrypted-json>");
    process.exit(1);
  }

  if (!jsonStr) {
    console.error("Error: Missing encrypted JSON data");
    console.error("Usage: bun run decrypt-message.ts <private-key-wif> <encrypted-json>");
    process.exit(1);
  }

  // Parse private key
  let privateKey: PrivateKey;
  try {
    privateKey = PrivateKey.fromWif(wifArg);
  } catch (e) {
    console.error(`Error: Invalid WIF format - ${(e as Error).message}`);
    process.exit(1);
  }

  // Parse encrypted JSON
  let encryptedData: unknown;
  try {
    encryptedData = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`Error: Invalid JSON - ${(e as Error).message}`);
    process.exit(1);
  }

  // Validate structure
  if (!validateEncryptedData(encryptedData)) {
    console.error("Error: Invalid encrypted data structure");
    console.error("Expected: { ephemeralPublicKey, iv, authTag, ciphertext }");
    process.exit(1);
  }

  // Decrypt
  try {
    const plaintext = decrypt(encryptedData, privateKey);
    console.log(plaintext);
  } catch (e) {
    console.error(`Error decrypting: ${(e as Error).message}`);
    console.error("This could mean: wrong key, tampered data, or corrupted ciphertext");
    process.exit(1);
  }
}

main();
