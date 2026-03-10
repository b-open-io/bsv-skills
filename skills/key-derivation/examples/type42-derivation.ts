/**
 * Type42 Key Derivation Examples
 *
 * Demonstrates BRC-42 key derivation patterns using @bsv/sdk
 */

import { PrivateKey, PublicKey } from "@bsv/sdk";

// =============================================================================
// Self-Derivation: Derive multiple keys from single master
// =============================================================================

function selfDerivationExample() {
  console.log("=== Self-Derivation ===\n");

  // Master key (in production, load from secure storage)
  const masterKey = PrivateKey.fromRandom();
  const masterPubKey = masterKey.toPublicKey();

  console.log("Master Address:", masterKey.toPublicKey().toAddress());

  // Derive keys for different purposes using invoice numbers
  const signingKey = masterKey.deriveChild(masterPubKey, "1-bapid-identity");
  const encryptionKey = masterKey.deriveChild(masterPubKey, "2-encryption-default");
  const paymentKey = masterKey.deriveChild(masterPubKey, "payment:0");

  console.log("Signing Address:", signingKey.toPublicKey().toAddress());
  console.log("Encryption Address:", encryptionKey.toPublicKey().toAddress());
  console.log("Payment Address:", paymentKey.toPublicKey().toAddress());

  // Sequential derivation for multiple payment addresses
  console.log("\nSequential Payment Addresses:");
  for (let i = 0; i < 3; i++) {
    const key = masterKey.deriveChild(masterPubKey, `payment:${i}`);
    console.log(`  payment:${i} ->`, key.toPublicKey().toAddress());
  }
}

// =============================================================================
// Counterparty Derivation: Two parties derive shared keys
// =============================================================================

function counterpartyDerivationExample() {
  console.log("\n=== Counterparty Derivation ===\n");

  // Alice and Bob each have their own keys
  const aliceKey = PrivateKey.fromRandom();
  const bobKey = PrivateKey.fromRandom();

  const alicePubKey = aliceKey.toPublicKey();
  const bobPubKey = bobKey.toPublicKey();

  console.log("Alice Public Key:", alicePubKey.toString().slice(0, 20) + "...");
  console.log("Bob Public Key:", bobPubKey.toString().slice(0, 20) + "...");

  // Agreed invoice number (can be shared publicly)
  const invoice = "order-12345";

  // Alice derives a key for receiving from Bob
  const aliceDerived = aliceKey.deriveChild(bobPubKey, invoice);
  const aliceAddress = aliceDerived.toPublicKey().toAddress();

  // Bob derives the same address (he can send to it)
  const bobDerived = bobKey.deriveChild(alicePubKey, invoice);
  const bobAddress = bobDerived.toPublicKey().toAddress();

  console.log("\nAlice derived address:", aliceAddress);
  console.log("Bob derived address:  ", bobAddress);
  console.log("Addresses match:", aliceAddress === bobAddress);

  // Alice owns the private key for this address
  console.log("\nAlice can sign with derived key:", aliceDerived.toWif().slice(0, 10) + "...");
}

// =============================================================================
// Chain Derivation: Multi-level key hierarchy
// =============================================================================

function chainDerivationExample() {
  console.log("\n=== Chain Derivation ===\n");

  const master = PrivateKey.fromRandom();

  // Level 1: Organization
  const orgKey = master.deriveChild(master.toPublicKey(), "org:acme-corp");

  // Level 2: Department
  const deptKey = orgKey.deriveChild(orgKey.toPublicKey(), "dept:engineering");

  // Level 3: Project
  const projectKey = deptKey.deriveChild(deptKey.toPublicKey(), "project:alpha");

  // Level 4: User
  const userKey = projectKey.deriveChild(projectKey.toPublicKey(), "user:alice");

  console.log("Organization:", orgKey.toPublicKey().toAddress());
  console.log("Department:  ", deptKey.toPublicKey().toAddress());
  console.log("Project:     ", projectKey.toPublicKey().toAddress());
  console.log("User:        ", userKey.toPublicKey().toAddress());
}

// =============================================================================
// BAP-Style Identity Derivation
// =============================================================================

function bapStyleDerivationExample() {
  console.log("\n=== BAP-Style Identity Derivation ===\n");

  const masterKey = PrivateKey.fromRandom();

  // BAP uses two-level derivation:
  // 1. Member key from counter
  // 2. Signing key from BAP invoice

  const BAP_INVOICE = "1-bapid-identity";

  for (let identityIndex = 0; identityIndex < 3; identityIndex++) {
    // Level 1: Member key
    const memberKey = masterKey.deriveChild(
      masterKey.toPublicKey(),
      `bap:${identityIndex}`
    );

    // Level 2: Signing key
    const signingKey = memberKey.deriveChild(
      memberKey.toPublicKey(),
      BAP_INVOICE
    );

    console.log(`Identity ${identityIndex}:`);
    console.log(`  Member:  ${memberKey.toPublicKey().toAddress()}`);
    console.log(`  Signing: ${signingKey.toPublicKey().toAddress()}`);
  }
}

// =============================================================================
// Run all examples
// =============================================================================

selfDerivationExample();
counterpartyDerivationExample();
chainDerivationExample();
bapStyleDerivationExample();

console.log("\n=== Type42 Derivation Examples Complete ===");
