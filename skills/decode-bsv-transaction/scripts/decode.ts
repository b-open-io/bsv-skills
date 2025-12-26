#!/usr/bin/env bun

async function decodeTransaction(txHexOrId: string): Promise<void> {
  try {
    let txHex = txHexOrId;

    // If looks like txid (64 hex chars), fetch the transaction first
    if (/^[a-fA-F0-9]{64}$/.test(txHexOrId)) {
      console.log(`Fetching transaction ${txHexOrId}...`);
      const txResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/main/tx/hash/${txHexOrId}`
      );
      if (!txResponse.ok) {
        throw new Error(`Failed to fetch transaction: ${txResponse.statusText}`);
      }
      const txData = await txResponse.json();
      txHex = txData.hex;
    }

    console.log("Decoding transaction...\n");

    const response = await fetch(
      "https://api.whatsonchain.com/v1/bsv/main/tx/decode",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHex }),
      }
    );

    if (!response.ok) {
      throw new Error(`Decode failed: ${response.statusText}`);
    }

    const decoded = await response.json();

    console.log("📄 Decoded Transaction\n");
    console.log(JSON.stringify(decoded, null, 2));

  } catch (error: any) {
    throw new Error(`Failed to decode transaction: ${error.message}`);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: bun run decode.ts <tx-hex-or-txid>");
  process.exit(1);
}

decodeTransaction(args[0]).catch(e => {
  console.error("❌", e.message);
  process.exit(1);
});
