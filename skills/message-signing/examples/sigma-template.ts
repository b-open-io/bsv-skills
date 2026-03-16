/**
 * Sigma Template Example
 *
 * Demonstrates using @1sat/templates for script-level Sigma operations.
 * Use this approach when working with existing scripts or building BitCom transactions.
 *
 * For full transaction signing, use sigma-protocol instead.
 */

import { Sigma, SigmaAlgorithm, BitCom } from "@1sat/templates";
import { PrivateKey, Hash, Utils, Script, Transaction } from "@bsv/sdk";

const { toHex } = Utils;

// --- Decode Sigma from existing transaction ---
console.log("=== Decoding Sigma from Script ===");

// Example: Parse a transaction output containing Sigma signatures
const exampleTx = Transaction.fromHex("..."); // Your transaction hex
const script = exampleTx.outputs[0].lockingScript;

// Decode BitCom protocols, then extract Sigma
const bitcom = BitCom.decode(script);
if (bitcom) {
  const sigmas = Sigma.decode(bitcom);

  for (const sig of sigmas) {
    console.log({
      algorithm: sig.data.algorithm,
      address: sig.data.address,
      vin: sig.data.vin,
    });
  }
}

// --- Create Sigma signature using template ---
console.log("\n=== Creating Sigma with Template ===");

const privateKey = PrivateKey.fromWif("KzmFJcMXHufPNHixgHNwXBt3mHpErEUG6WFbmuQdy525DezYAi82");

// Calculate hashes (normally from transaction context)
const inputHash = Array.from(Hash.sha256(new Uint8Array(32))); // SHA256 of outpoint
const dataHash = Array.from(Hash.sha256(new Uint8Array([1, 2, 3]))); // SHA256 of script data

// Sign with BSM (default)
const sigmaBsm = Sigma.sign(inputHash, dataHash, privateKey);
console.log("BSM signature created:", sigmaBsm.data.address);

// Sign with BRC-77
const sigmaBrc77 = Sigma.sign(inputHash, dataHash, privateKey, {
  algorithm: SigmaAlgorithm.BRC77,
  vin: 0
});
console.log("BRC-77 signature created:", sigmaBrc77.data.address);

// Verify signatures
const bsmValid = sigmaBsm.verifyWithHashes(inputHash, dataHash);
const brc77Valid = sigmaBrc77.verifyWithHashes(inputHash, dataHash);

console.log("BSM verified:", bsmValid ? "✅" : "❌");
console.log("BRC-77 verified:", brc77Valid ? "✅" : "❌");

// --- Generate locking script ---
console.log("\n=== Generating Locking Script ===");

const lockingScript = sigmaBsm.lock();
console.log("Script hex:", toHex(lockingScript.toBinary()));
