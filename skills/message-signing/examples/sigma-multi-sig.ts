/**
 * Sigma Multi-Signature Example
 *
 * Demonstrates multiple signatures on the same transaction output
 * using both BSM and BRC-77 algorithms.
 */

import { Sigma, Algorithm } from "sigma-protocol";
import { PrivateKey, Script, Transaction, type TransactionOutput, Utils } from "@bsv/sdk";

const { toHex, toArray } = Utils;

// Keys for user and platform
const userKey = PrivateKey.fromWif("KzmFJcMXHufPNHixgHNwXBt3mHpErEUG6WFbmuQdy525DezYAi82");
const platformKey = PrivateKey.fromWif("L1U5FS1PzJwCiFA43hahBUSLytqVoGjSymKSz5WJ92v8YQBBsGZ1");

console.log("User address:", userKey.toAddress());
console.log("Platform address:", platformKey.toAddress());

// Create OP_RETURN output with data
const data = {
  app: "my-app",
  action: "post",
  content: "Hello, blockchain!"
};

const outputScriptAsm = `OP_0 OP_RETURN ${toHex(toArray(JSON.stringify(data)))}`;
const script = Script.fromASM(outputScriptAsm);

const txOut = { satoshis: 0, lockingScript: script } as TransactionOutput;
const tx = new Transaction(1, [], [txOut]);

console.log("\n=== Initial Transaction ===");
console.log("Output script (truncated):", script.toASM().slice(0, 80) + "...");

// --- First Signature: User with BSM ---
console.log("\n=== User Signature (BSM) ===");

const sigma1 = new Sigma(tx, 0, 0);

console.log("Input hash:", toHex(sigma1.getInputHash()));
console.log("Data hash:", toHex(sigma1.getDataHash()));
console.log("Message hash:", toHex(sigma1.getMessageHash()));

const { signedTx: afterUserSign } = sigma1.sign(userKey, Algorithm.BSM);

console.log("Algorithm:", sigma1.sig?.algorithm);
console.log("Address:", sigma1.sig?.address);
console.log("Verified:", sigma1.verify() ? "✅" : "❌");

// --- Second Signature: Platform with BRC-77 ---
console.log("\n=== Platform Signature (BRC-77) ===");

const sigma2 = new Sigma(afterUserSign, 0, 1);  // sigmaInstance=1 for second signature

console.log("Input hash:", toHex(sigma2.getInputHash()));
console.log("Data hash:", toHex(sigma2.getDataHash()));
console.log("Message hash:", toHex(sigma2.getMessageHash()));

sigma2.sign(platformKey, Algorithm.BRC77);

console.log("Algorithm:", sigma2.sig?.algorithm);
console.log("Address:", sigma2.sig?.address);
console.log("Verified:", sigma2.verify() ? "✅" : "❌");

// --- Verify Both Signatures ---
console.log("\n=== Final State ===");

console.log("Total signatures:", sigma2.getSigInstanceCount());

// Verify user signature
sigma2.setSigmaInstance(0);
console.log("\nSignature 0 (User):");
console.log("  Algorithm:", sigma2.sig?.algorithm);
console.log("  Address:", sigma2.sig?.address);
console.log("  Verified:", sigma2.verify() ? "✅" : "❌");

// Verify platform signature
sigma2.setSigmaInstance(1);
console.log("\nSignature 1 (Platform):");
console.log("  Algorithm:", sigma2.sig?.algorithm);
console.log("  Address:", sigma2.sig?.address);
console.log("  Verified:", sigma2.verify() ? "✅" : "❌");

// --- Final Transaction ---
console.log("\n=== Final Transaction ===");
const finalScript = sigma2.transaction.outputs[0].lockingScript.toASM();
console.log("Output script length:", finalScript.length, "chars");
console.log("Contains SIGMA markers:", (finalScript.match(/5349474d41/g) || []).length);
