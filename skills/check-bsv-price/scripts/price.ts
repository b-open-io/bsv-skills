#!/usr/bin/env bun

async function getBSVPrice(): Promise<void> {
  try {
    const response = await fetch(
      "https://api.whatsonchain.com/v1/bsv/main/exchangerate"
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    console.log("\n💰 BSV Price Information\n");
    console.log(`Price: $${data.rate} USD`);
    console.log(`Currency: ${data.currency}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log("");

  } catch (error: any) {
    throw new Error(`Failed to fetch BSV price: ${error.message}`);
  }
}

getBSVPrice().catch(e => {
  console.error("❌", e.message);
  process.exit(1);
});
