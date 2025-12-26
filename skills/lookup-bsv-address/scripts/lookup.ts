#!/usr/bin/env bun

async function lookupAddress(address: string, mode: string = "info"): Promise<void> {
  const baseUrl = `https://api.whatsonchain.com/v1/bsv/main/address/${address}`;

  try {
    if (mode === "balance" || mode === "info") {
      const response = await fetch(`${baseUrl}/balance`);
      if (!response.ok) throw new Error(`Failed to fetch balance: ${response.statusText}`);
      const balance = await response.json();

      console.log("\n💰 Address Balance\n");
      console.log(`Address: ${address}`);
      console.log(`Confirmed: ${balance.confirmed} satoshis`);
      console.log(`Unconfirmed: ${balance.unconfirmed} satoshis`);
      console.log(`Total: ${(balance.confirmed + balance.unconfirmed) / 100000000} BSV\n`);
    }

    if (mode === "history" || mode === "info") {
      const response = await fetch(`${baseUrl}/history`);
      if (!response.ok) throw new Error(`Failed to fetch history: ${response.statusText}`);
      const history = await response.json();

      console.log("📜 Transaction History\n");
      console.log(`Total transactions: ${history.length}`);
      if (history.length > 0) {
        console.log("\nRecent transactions:");
        history.slice(0, 5).forEach((tx: any) => {
          console.log(`  ${tx.tx_hash} (height: ${tx.height})`);
        });
      }
      console.log("");
    }

    if (mode === "utxos") {
      const response = await fetch(`${baseUrl}/unspent`);
      if (!response.ok) throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
      const utxos = await response.json();

      console.log("\n📦 Unspent Outputs (UTXOs)\n");
      console.log(`Total UTXOs: ${utxos.length}\n`);
      utxos.forEach((utxo: any, i: number) => {
        console.log(`UTXO ${i + 1}:`);
        console.log(`  TX: ${utxo.tx_hash}:${utxo.tx_pos}`);
        console.log(`  Value: ${utxo.value} satoshis`);
        console.log(`  Height: ${utxo.height}`);
        console.log("");
      });
    }

  } catch (error: any) {
    throw new Error(`Address lookup failed: ${error.message}`);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: bun run lookup.ts <address> [balance|history|utxos|info]");
  process.exit(1);
}

lookupAddress(args[0], args[1] || "info").catch(e => {
  console.error("❌", e.message);
  process.exit(1);
});
