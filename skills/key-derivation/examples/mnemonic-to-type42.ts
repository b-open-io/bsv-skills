/**
 * Mnemonic to Type42 Master Key
 *
 * Converts BIP39 mnemonic to a single master key for Type42 derivation.
 * This maintains familiar mnemonic backup while using modern Type42 derivation.
 *
 * Based on: https://bsv.brc.dev/key-derivation (BRC-39 style)
 */

import { Mnemonic, Hash, PrivateKey, Utils, HD } from "@bsv/sdk";
const { toHex } = Utils;

// =============================================================================
// Mnemonic to Single Master Key
// =============================================================================

/**
 * Convert BIP39 mnemonic to a single PrivateKey for Type42 derivation.
 *
 * Process:
 * 1. Mnemonic -> Seed (standard BIP39)
 * 2. SHA256(seed) -> 256-bit private key
 *
 * This produces a single key (not extended key) suitable for Type42.
 */
function mnemonicToMasterKey(mnemonic: Mnemonic, passphrase = ""): PrivateKey {
  // Standard BIP39: mnemonic to seed
  const seed = mnemonic.toSeed(passphrase);

  // SHA256 produces exactly 256 bits needed for private key
  const keyBytes = Hash.sha256(seed);

  // Convert to PrivateKey
  const keyHex = toHex(keyBytes);
  return PrivateKey.fromString(keyHex, "hex");
}

// =============================================================================
// Basic Usage Example
// =============================================================================

function basicExample() {
  console.log("=== Mnemonic to Type42 Master Key ===\n");

  // Generate new mnemonic (or use existing)
  const mnemonic = Mnemonic.fromRandom(128); // 12 words
  console.log("Mnemonic:", mnemonic.toString());

  // Convert to single master key
  const masterKey = mnemonicToMasterKey(mnemonic);
  console.log("Master WIF:", masterKey.toWif());
  console.log("Master Address:", masterKey.toPublicKey().toAddress());

  // Now use Type42 derivation
  const signingKey = masterKey.deriveChild(
    masterKey.toPublicKey(),
    "1-bap-identity"
  );
  console.log("Signing Address:", signingKey.toPublicKey().toAddress());
}

// =============================================================================
// Deterministic Verification
// =============================================================================

function verificationExample() {
  console.log("\n=== Deterministic Verification ===\n");

  // Known test vector (from BRC spec)
  const testMnemonic = "dial tunnel valid cry exhaust stand match purse hope since demand palace";
  const expectedKeyHex = "1ad0895dd317163f0e83499c30bc593dbcc54cad96a5f57b065ce9f700513250";
  const expectedPubKey = "021c2361fa1c39e21422b1374c2a08106f99b5425ada71f46f55b8e8e9d4a932db";

  const mnemonic = Mnemonic.fromString(testMnemonic);
  const masterKey = mnemonicToMasterKey(mnemonic);

  const derivedKeyHex = toHex(masterKey.toArray());
  const derivedPubKey = masterKey.toPublicKey().toString();

  console.log("Test Mnemonic:", testMnemonic);
  console.log("\nExpected Key:", expectedKeyHex);
  console.log("Derived Key: ", derivedKeyHex);
  console.log("Key Match:", derivedKeyHex === expectedKeyHex);

  console.log("\nExpected PubKey:", expectedPubKey);
  console.log("Derived PubKey: ", derivedPubKey);
  console.log("PubKey Match:", derivedPubKey === expectedPubKey);
}

// =============================================================================
// BAP-Style Multi-Identity
// =============================================================================

function bapMultiIdentityExample() {
  console.log("\n=== BAP-Style Multi-Identity from Mnemonic ===\n");

  const mnemonic = Mnemonic.fromRandom(128);
  console.log("Mnemonic:", mnemonic.toString());

  const masterKey = mnemonicToMasterKey(mnemonic);
  const BAP_INVOICE = "1-bap-identity";

  console.log("\nDerived Identities:");
  for (let i = 0; i < 3; i++) {
    // Level 1: Member key using counter
    const memberKey = masterKey.deriveChild(
      masterKey.toPublicKey(),
      `bap:${i}`
    );

    // Level 2: Signing key using BAP invoice
    const signingKey = memberKey.deriveChild(
      memberKey.toPublicKey(),
      BAP_INVOICE
    );

    console.log(`\nIdentity ${i}:`);
    console.log(`  Member Address:  ${memberKey.toPublicKey().toAddress()}`);
    console.log(`  Signing Address: ${signingKey.toPublicKey().toAddress()}`);
  }
}

// =============================================================================
// With Passphrase (25th Word)
// =============================================================================

function passphraseExample() {
  console.log("\n=== Passphrase (25th Word) Example ===\n");

  const mnemonic = Mnemonic.fromRandom(128);
  console.log("Mnemonic:", mnemonic.toString());

  // Without passphrase
  const keyNoPass = mnemonicToMasterKey(mnemonic, "");
  console.log("\nWithout passphrase:");
  console.log("  Address:", keyNoPass.toPublicKey().toAddress());

  // With passphrase (acts as 25th word)
  const keyWithPass = mnemonicToMasterKey(mnemonic, "my-secret-passphrase");
  console.log("\nWith passphrase:");
  console.log("  Address:", keyWithPass.toPublicKey().toAddress());

  console.log("\nAddresses differ:",
    keyNoPass.toPublicKey().toAddress() !== keyWithPass.toPublicKey().toAddress()
  );
}

// =============================================================================
// Comparison: Type42 vs BIP32 from Same Mnemonic
// =============================================================================

function comparisonExample() {
  console.log("\n=== Type42 vs BIP32 from Same Mnemonic ===\n");

  const mnemonic = Mnemonic.fromRandom(128);
  console.log("Mnemonic:", mnemonic.toString());

  // Type42 approach: mnemonic -> single key -> Type42 derivation
  const type42Master = mnemonicToMasterKey(mnemonic);
  const type42Child = type42Master.deriveChild(
    type42Master.toPublicKey(),
    "bap:0"
  );

  // BIP32 approach: mnemonic -> extended key -> path derivation
  const bip32Master = HD.fromSeed(mnemonic.toSeed());
  const bip32Child = bip32Master.derive("m/424150'/0'/0'/0/0/0");

  console.log("\nType42 Master:", type42Master.toPublicKey().toAddress());
  console.log("BIP32 Master: ", bip32Master.pubKey.toAddress());
  console.log("Masters differ:",
    type42Master.toPublicKey().toAddress() !== bip32Master.pubKey.toAddress()
  );

  console.log("\nType42 Child (bap:0):", type42Child.toPublicKey().toAddress());
  console.log("BIP32 Child (m/424150'/0'/0'/0/0/0):", bip32Child.pubKey.toAddress());
  console.log("Children differ:",
    type42Child.toPublicKey().toAddress() !== bip32Child.pubKey.toAddress()
  );

  console.log("\nNote: Same mnemonic produces DIFFERENT keys with different derivation methods.");
  console.log("This is expected - Type42 and BIP32 are incompatible derivation schemes.");
}

// =============================================================================
// Backup Recommendations
// =============================================================================

function backupRecommendations() {
  console.log("\n=== Backup Recommendations ===\n");

  const mnemonic = Mnemonic.fromRandom(128);
  const masterKey = mnemonicToMasterKey(mnemonic);

  console.log("For Type42 wallets, store EITHER:");
  console.log("\n1. Mnemonic (familiar, recoverable):");
  console.log(`   ${mnemonic.toString()}`);

  console.log("\n2. WIF (direct, no conversion needed):");
  console.log(`   ${masterKey.toWif()}`);

  console.log("\nBoth recover the same master key.");
  console.log("Choose based on your security model:");
  console.log("  - Mnemonic: Easier to write down, familiar to users");
  console.log("  - WIF: Shorter, direct import without conversion step");
}

// =============================================================================
// Run all examples
// =============================================================================

basicExample();
verificationExample();
bapMultiIdentityExample();
passphraseExample();
comparisonExample();
backupRecommendations();

console.log("\n=== Mnemonic to Type42 Examples Complete ===");
