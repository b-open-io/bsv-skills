#!/usr/bin/env bun

const args = process.argv.slice(2);

type Granularity = "balance" | "history" | "utxos" | "all";
const GRANULARITIES: Granularity[] = ["balance", "history", "utxos", "all"];

function showHelp(): void {
  console.log(`lookup-bsv-address - Look up BSV address info

USAGE:
  bun run lookup.ts <address> [granularity]

GRANULARITY (positional, default: all):
  balance      Confirmed + unconfirmed balance
  history      Transaction history (tx_hash + height)
  utxos        Unspent outputs (outpoint + value)
  all          Balance, UTXOs, and history

OPTIONS:
  --json       Output in JSON format
  --help       Show this help message

EXAMPLES:
  bun run lookup.ts 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
  bun run lookup.ts 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa utxos
  bun run lookup.ts 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa history --json`);
}

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

const jsonOutput = args.includes("--json");
const positional = args.filter(a => !a.startsWith("--"));
const address = positional[0];
const granularity = (positional[1] ?? "all") as Granularity;

if (!address) {
  console.error("Error: Address required");
  console.error("Run with --help for usage");
  process.exit(1);
}

// Validate address format
if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
  console.error("Error: Invalid BSV address format");
  process.exit(1);
}

if (!GRANULARITIES.includes(granularity)) {
  console.error(`Error: Invalid granularity "${granularity}" (use balance | history | utxos | all)`);
  process.exit(1);
}

const WOC = "https://api.whatsonchain.com/v1/bsv/main/address";

async function wocJson(path: string): Promise<any> {
  const resp = await fetch(`${WOC}/${address}/${path}`);
  if (!resp.ok) {
    throw new Error(`API request failed (${path}): ${resp.statusText}`);
  }
  return resp.json();
}

async function main() {
  try {
    const wantBalance = granularity === "balance" || granularity === "all";
    const wantUtxos = granularity === "utxos" || granularity === "all";
    const wantHistory = granularity === "history" || granularity === "all";

    const result: any = { address };

    if (wantBalance) {
      const balance = await wocJson("balance");
      result.balance = {
        confirmed: balance.confirmed,
        unconfirmed: balance.unconfirmed,
      };
      result.totalBsv = (balance.confirmed + balance.unconfirmed) / 100000000;
    }

    if (wantUtxos) {
      const utxos: Array<{ tx_hash: string; tx_pos: number; value: number; height: number }> =
        await wocJson("unspent");
      result.utxos = utxos.map(u => ({
        outpoint: `${u.tx_hash}.${u.tx_pos}`,
        satoshis: u.value,
        height: u.height,
      }));
      result.utxoCount = utxos.length;
      result.utxoTotal = utxos.reduce((sum, u) => sum + u.value, 0);
    }

    if (wantHistory) {
      const history: Array<{ tx_hash: string; height: number }> = await wocJson("history");
      result.history = history.map(h => ({ txid: h.tx_hash, height: h.height }));
      result.historyCount = history.length;
    }

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`Address: ${result.address}`);
    if (wantBalance) {
      console.log(`Balance: ${result.balance.confirmed} satoshis (${result.totalBsv.toFixed(8)} BSV)`);
      if (result.balance.unconfirmed !== 0) {
        console.log(`Unconfirmed: ${result.balance.unconfirmed} satoshis`);
      }
    }
    if (wantUtxos) {
      console.log(`UTXOs: ${result.utxoCount} (${result.utxoTotal} satoshis)`);
      result.utxos.forEach((u: any) => {
        console.log(`  ${u.outpoint}  ${u.satoshis} sats  (block ${u.height})`);
      });
    }
    if (wantHistory) {
      console.log(`History: ${result.historyCount} transactions`);
      result.history.forEach((h: any) => {
        console.log(`  ${h.txid}  (block ${h.height})`);
      });
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
