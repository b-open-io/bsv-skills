/**
 * BSM (Bitcoin Signed Message) Example
 *
 * Demonstrates standard Bitcoin message signing and verification.
 */

import { BSM, PrivateKey, Signature, BigNumber, Utils } from "@bsv/sdk";

const { toArray, toHex } = Utils;

// Create a private key
const privateKey = PrivateKey.fromWif("KzmFJcMXHufPNHixgHNwXBt3mHpErEUG6WFbmuQdy525DezYAi82");
const address = privateKey.toAddress();

console.log("Address:", address);

// Message to sign (as byte array)
const messageText = "Hello, Bitcoin!";
const message = toArray(messageText, "utf8");

console.log("Message:", messageText);
console.log("Message bytes:", toHex(message));

// Sign the message
const signature = BSM.sign(message, privateKey, "raw") as Signature;

// Calculate recovery factor
const magicHashValue = new BigNumber(BSM.magicHash(message));
const recovery = signature.CalculateRecoveryFactor(privateKey.toPublicKey(), magicHashValue);

// Get compact signature (base64 format)
const compactSig = signature.toCompact(recovery, true, "base64") as string;

console.log("Signature (base64):", compactSig);
console.log("Recovery factor:", recovery);

// Verify the signature
console.log("\n--- Verification ---");

const sigToVerify = Signature.fromCompact(compactSig, "base64");

// Try all recovery factors to find matching address
let verified = false;
for (let r = 0; r < 4; r++) {
  try {
    const recoveredPubKey = sigToVerify.RecoverPublicKey(
      r,
      new BigNumber(BSM.magicHash(message))
    );

    if (BSM.verify(message, sigToVerify, recoveredPubKey)) {
      const recoveredAddress = recoveredPubKey.toAddress();
      console.log("Recovered address:", recoveredAddress);

      if (recoveredAddress === address) {
        console.log("✅ Signature verified! Address matches.");
        verified = true;
        break;
      }
    }
  } catch {
    // Try next recovery factor
  }
}

if (!verified) {
  console.log("❌ Signature verification failed");
}
