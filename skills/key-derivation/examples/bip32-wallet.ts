/**
 * BIP32 HD Wallet Examples
 *
 * Demonstrates legacy hierarchical deterministic key derivation using @bsv/sdk
 */

import { HD, Mnemonic } from "@bsv/sdk";

// =============================================================================
// Create HD Wallet from Mnemonic
// =============================================================================

function mnemonicWalletExample() {
  console.log("=== Mnemonic to HD Wallet ===\n");

  // Generate new 12-word mnemonic (128 bits entropy)
  const mnemonic = Mnemonic.fromRandom(128);
  console.log("Mnemonic:", mnemonic.toString());

  // Convert to seed (with optional passphrase)
  const seed = mnemonic.toSeed(); // No passphrase
  // const seed = mnemonic.toSeed("my-passphrase"); // With passphrase

  // Create HD key from seed
  const hdKey = HD.fromSeed(seed);
  console.log("Master xprv:", hdKey.toString().slice(0, 30) + "...");

  // Export public key for watch-only wallets
  const xpub = hdKey.toPublic().toString();
  console.log("Master xpub:", xpub.slice(0, 30) + "...");
}

// =============================================================================
// Standard BSV Wallet Paths (BIP44)
// =============================================================================

function bip44WalletExample() {
  console.log("\n=== BIP44 Standard Paths ===\n");

  // Create HD key (in production, from mnemonic or backup)
  const mnemonic = Mnemonic.fromRandom(128);
  const hdKey = HD.fromSeed(mnemonic.toSeed());

  // BSV coin type is 236
  // Path: m / purpose' / coin_type' / account' / change / address_index

  console.log("BSV Receiving Addresses (m/44'/236'/0'/0/x):");
  for (let i = 0; i < 5; i++) {
    const path = `m/44'/236'/0'/0/${i}`;
    const child = hdKey.derive(path);
    console.log(`  ${path} -> ${child.pubKey.toAddress()}`);
  }

  console.log("\nBSV Change Addresses (m/44'/236'/0'/1/x):");
  for (let i = 0; i < 3; i++) {
    const path = `m/44'/236'/0'/1/${i}`;
    const child = hdKey.derive(path);
    console.log(`  ${path} -> ${child.pubKey.toAddress()}`);
  }

  // Multiple accounts
  console.log("\nMultiple Accounts:");
  for (let account = 0; account < 3; account++) {
    const path = `m/44'/236'/${account}'/0/0`;
    const child = hdKey.derive(path);
    console.log(`  Account ${account}: ${child.pubKey.toAddress()}`);
  }
}

// =============================================================================
// BAP Identity Paths
// =============================================================================

function bapPathsExample() {
  console.log("\n=== BAP Identity Paths ===\n");

  const mnemonic = Mnemonic.fromRandom(128);
  const hdKey = HD.fromSeed(mnemonic.toSeed());

  // BAP uses 424150 as the purpose (concept of "BAP")
  const BAP_PREFIX = "m/424150'/0'/0'";

  console.log("BAP Root Path:", BAP_PREFIX);
  const bapRoot = hdKey.derive(BAP_PREFIX);
  console.log("BAP Root Address:", bapRoot.pubKey.toAddress());

  // Identity paths extend from root
  console.log("\nIdentity Signing Paths:");
  for (let i = 0; i < 3; i++) {
    const path = `m/424150'/0'/0'/0/0/${i}`;
    const child = hdKey.derive(path);
    console.log(`  ${path}`);
    console.log(`    Address: ${child.pubKey.toAddress()}`);
  }

  // Encryption path uses max hardened indices
  const ENCRYPTION_PATH = "m/424150'/2147483647'/2147483647'";
  console.log("\nEncryption Path:", ENCRYPTION_PATH);
  const encryptionKey = hdKey.derive(ENCRYPTION_PATH);
  console.log("Encryption Address:", encryptionKey.pubKey.toAddress());
}

// =============================================================================
// Hardened vs Non-Hardened Derivation
// =============================================================================

function hardenedVsNonHardenedExample() {
  console.log("\n=== Hardened vs Non-Hardened ===\n");

  const mnemonic = Mnemonic.fromRandom(128);
  const hdKey = HD.fromSeed(mnemonic.toSeed());

  // Hardened derivation (marked with ')
  // - Requires private key
  // - Cannot derive from xpub alone
  // - More secure

  console.log("Hardened Paths (require private key):");
  const hardened = hdKey.derive("m/44'/236'/0'");
  console.log(`  m/44'/236'/0' -> ${hardened.pubKey.toAddress()}`);

  // Non-hardened derivation
  // - Can derive from xpub
  // - Useful for watch-only wallets
  // - Less secure (child leak can reveal parent)

  console.log("\nNon-Hardened from xpub:");
  const account = hdKey.derive("m/44'/236'/0'");
  const xpub = account.toPublic();

  // These can be derived from xpub alone
  for (let i = 0; i < 3; i++) {
    const child = xpub.derive(`m/0/${i}`); // Relative path from account
    console.log(`  m/0/${i} -> ${child.pubKey.toAddress()}`);
  }

  // This would fail with xpub (hardened requires private key)
  try {
    xpub.derive("m/0'/0");
  } catch (e) {
    console.log("\nCannot derive hardened path from xpub (expected error)");
  }
}

// =============================================================================
// Watch-Only Wallet
// =============================================================================

function watchOnlyWalletExample() {
  console.log("\n=== Watch-Only Wallet ===\n");

  // Offline: Create master and export xpub
  const mnemonic = Mnemonic.fromRandom(128);
  const hdKey = HD.fromSeed(mnemonic.toSeed());

  // Export account-level xpub (after hardened derivation)
  const account = hdKey.derive("m/44'/236'/0'");
  const xpub = account.toPublic().toString();
  console.log("Export this xpub to online wallet:");
  console.log(`  ${xpub.slice(0, 50)}...`);

  // Online: Generate addresses without private key
  console.log("\nGenerate addresses from xpub (watch-only):");
  const watchOnly = HD.fromString(xpub);

  for (let i = 0; i < 5; i++) {
    const receiving = watchOnly.derive(`m/0/${i}`);
    console.log(`  Address ${i}: ${receiving.pubKey.toAddress()}`);
  }

  // Sign transactions offline using full hdKey
  console.log("\nOffline signing uses private key from full HD key");
}

// =============================================================================
// Backup and Recovery
// =============================================================================

function backupRecoveryExample() {
  console.log("\n=== Backup and Recovery ===\n");

  // Create wallet
  const mnemonic = Mnemonic.fromRandom(128);
  const original = HD.fromSeed(mnemonic.toSeed());
  const originalAddress = original.derive("m/44'/236'/0'/0/0").pubKey.toAddress();

  console.log("Original mnemonic:", mnemonic.toString());
  console.log("Original address:", originalAddress);

  // Recovery from mnemonic
  const recovered = HD.fromSeed(Mnemonic.fromString(mnemonic.toString()).toSeed());
  const recoveredAddress = recovered.derive("m/44'/236'/0'/0/0").pubKey.toAddress();

  console.log("\nRecovered address:", recoveredAddress);
  console.log("Recovery successful:", originalAddress === recoveredAddress);

  // Recovery from xprv
  const xprv = original.toString();
  const fromXprv = HD.fromString(xprv);
  const xprvAddress = fromXprv.derive("m/44'/236'/0'/0/0").pubKey.toAddress();

  console.log("\nFrom xprv address:", xprvAddress);
  console.log("xprv recovery successful:", originalAddress === xprvAddress);
}

// =============================================================================
// Run all examples
// =============================================================================

mnemonicWalletExample();
bip44WalletExample();
bapPathsExample();
hardenedVsNonHardenedExample();
watchOnlyWalletExample();
backupRecoveryExample();

console.log("\n=== BIP32 HD Wallet Examples Complete ===");
