/**
 * BRC-77 Private Signature Example
 *
 * Demonstrates BRC-77 signatures that only a specific recipient can verify.
 */

import { SignedMessage, PrivateKey, Utils } from "@bsv/sdk";

const { toArray, toBase64 } = Utils;

// Sender's key
const sender = PrivateKey.fromWif("KzmFJcMXHufPNHixgHNwXBt3mHpErEUG6WFbmuQdy525DezYAi82");
const senderAddress = sender.toAddress();

// Recipient's keys
const recipient = PrivateKey.fromWif("L1U5FS1PzJwCiFA43hahBUSLytqVoGjSymKSz5WJ92v8YQBBsGZ1");
const recipientPubKey = recipient.toPublicKey();
const recipientAddress = recipient.toAddress();

console.log("Sender address:", senderAddress);
console.log("Recipient address:", recipientAddress);

// Message to sign
const messageText = "This message is for the recipient's eyes only!";
const message = toArray(messageText, "utf8");

console.log("\nMessage:", messageText);

// --- Public Signature (Anyone Can Verify) ---
console.log("\n=== Public Signature ===");

const publicSig = SignedMessage.sign(message, sender);
console.log("Signature length:", publicSig.length, "bytes");
console.log("Signature (base64):", toBase64(publicSig));

// Anyone can verify
const publicValid = SignedMessage.verify(message, publicSig);
console.log("Public verification:", publicValid ? "✅ Valid" : "❌ Invalid");

// --- Private Signature (Recipient Only) ---
console.log("\n=== Private Signature ===");

const privateSig = SignedMessage.sign(message, sender, recipientPubKey);
console.log("Signature length:", privateSig.length, "bytes");
console.log("Signature (base64):", toBase64(privateSig));

// Try to verify without recipient key (should fail)
try {
  const attemptPublic = SignedMessage.verify(message, privateSig);
  console.log("Without recipient key:", attemptPublic ? "✅ Valid" : "❌ Invalid");
} catch (error) {
  console.log("Without recipient key: ❌ Requires specific private key");
}

// Verify with recipient's private key
const privateValid = SignedMessage.verify(message, privateSig, recipient);
console.log("With recipient key:", privateValid ? "✅ Valid" : "❌ Invalid");

// --- Signature Structure Analysis ---
console.log("\n=== Signature Structure ===");

function analyzeSignature(sig: number[]) {
  const version = sig.slice(0, 4);
  const senderPubKey = sig.slice(4, 37);
  const verifierFirst = sig[37];

  console.log("Version:", version.map(b => b.toString(16).padStart(2, '0')).join(''));
  console.log("Sender pubkey (first 8 bytes):", senderPubKey.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(''));

  if (verifierFirst === 0) {
    console.log("Verifier: Anyone (0x00)");
    console.log("Key ID:", toBase64(sig.slice(38, 70)));
  } else {
    console.log("Verifier: Specific recipient");
    console.log("Verifier pubkey (first 8 bytes):", sig.slice(37, 45).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log("Key ID:", toBase64(sig.slice(70, 102)));
  }
}

console.log("\nPublic signature:");
analyzeSignature(publicSig);

console.log("\nPrivate signature:");
analyzeSignature(privateSig);
