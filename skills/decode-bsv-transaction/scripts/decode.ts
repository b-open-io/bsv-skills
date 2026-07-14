#!/usr/bin/env bun

import { type Script, Transaction, Utils } from "@bsv/sdk";

const args = process.argv.slice(2);

function base64ToHex(base64: string): string {
  const binary = atob(base64);
  const hex: string[] = [];
  for (let i = 0; i < binary.length; i++) {
    hex.push(binary.charCodeAt(i).toString(16).padStart(2, "0"));
  }
  return hex.join("");
}

// OP codes we pattern-match for output classification.
const OP_DUP = 118;
const OP_HASH160 = 169;
const OP_EQUALVERIFY = 136;
const OP_CHECKSIG = 172;
const OP_RETURN = 106;
const OP_FALSE = 0;

// Classify a locking script: derive a P2PKH address, or flag OP_RETURN / non-standard.
function classifyScript(script: Script | undefined): { type: string; address: string | null } {
  if (!script) return { type: "empty", address: null };
  const c = script.chunks;

  // P2PKH: OP_DUP OP_HASH160 <20> OP_EQUALVERIFY OP_CHECKSIG
  if (
    c.length === 5 &&
    c[0].op === OP_DUP &&
    c[1].op === OP_HASH160 &&
    c[2].data?.length === 20 &&
    c[3].op === OP_EQUALVERIFY &&
    c[4].op === OP_CHECKSIG
  ) {
    return { type: "p2pkh", address: Utils.toBase58Check(c[2].data as number[], [0x00]) };
  }

  // OP_RETURN data (bare OP_RETURN or OP_FALSE OP_RETURN prefix)
  if (c[0]?.op === OP_RETURN || (c[0]?.op === OP_FALSE && c[1]?.op === OP_RETURN)) {
    return { type: "op_return", address: null };
  }

  return { type: "nonstandard", address: null };
}

function showHelp(): void {
  console.log(`decode-bsv-transaction - Decode BSV transaction hex

USAGE:
  bun run decode.ts <tx-hex>
  bun run decode.ts --beef <beef-hex>
  bun run decode.ts --txid <txid>

OPTIONS:
  --beef <hex>   Parse as BEEF format (from WalletClient noSend)
  --txid <id>    Fetch and decode transaction by txid
  --json         Output in JSON format
  --no-fees      Skip prevout lookups (faster; no input values or fee)
  --help         Show this help message

FORMATS:
  raw    Standard transaction hex (01000000...)
  EF     Extended Format — auto-detected
  BEEF   Background Evaluation Extended Format — use --beef flag

EXAMPLES:
  bun run decode.ts 0100000001...
  bun run decode.ts --beef 0100beef...
  bun run decode.ts --txid abc123...`);
}

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

const jsonOutput = args.includes("--json");
const skipFees = args.includes("--no-fees");
const txidIndex = args.indexOf("--txid");
const beefIndex = args.indexOf("--beef");

// Fetch a raw transaction by txid: JungleBus (base64) first, WhatsOnChain (hex) fallback.
async function fetchTx(txid: string): Promise<Transaction | null> {
  try {
    const jb = await fetch(`https://junglebus.gorillapool.io/v1/transaction/get/${txid}`);
    if (jb.ok) {
      const data = await jb.json();
      if (data.transaction) return Transaction.fromHex(base64ToHex(data.transaction));
    }
  } catch {
    // fall through to WhatsOnChain
  }
  try {
    const woc = await fetch(`https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/hex`);
    if (woc.ok) return Transaction.fromHex((await woc.text()).trim());
  } catch {
    // give up
  }
  return null;
}

async function main() {
  let txHex: string;
  let format = "raw";

  if (beefIndex !== -1) {
    const beefHex = args[beefIndex + 1];
    if (!beefHex) {
      console.error("Error: --beef requires a hex value");
      process.exit(1);
    }
    if (!/^[a-fA-F0-9]+$/.test(beefHex)) {
      console.error("Error: Invalid BEEF hex format");
      process.exit(1);
    }
    try {
      const tx = Transaction.fromHexBEEF(beefHex);
      await printTransaction(tx, beefHex.length / 2, "BEEF", jsonOutput);
    } catch (e: any) {
      console.error(`Error: Failed to parse BEEF transaction - ${e.message}`);
      process.exit(1);
    }
    return;
  }

  if (txidIndex !== -1 && args[txidIndex + 1]) {
    const txid = args[txidIndex + 1];
    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      console.error("Error: Invalid txid format (must be 64 hex characters)");
      process.exit(1);
    }
    const fetched = await fetchTx(txid);
    if (!fetched) {
      console.error(`Error: Transaction not found: ${txid}`);
      process.exit(1);
    }
    await printTransaction(fetched, fetched.toHex().length / 2, "raw", jsonOutput);
    return;
  }

  const hexArg = args.find(a => !a.startsWith("--"));
  if (!hexArg) {
    console.error("Error: Transaction hex required");
    console.error("Run with --help for usage");
    process.exit(1);
  }
  txHex = hexArg;

  if (!/^[a-fA-F0-9]+$/.test(txHex)) {
    console.error("Error: Invalid transaction hex");
    process.exit(1);
  }

  // Auto-detect format: try EF first, fall back to raw
  let tx: Transaction;
  try {
    tx = Transaction.fromHexEF(txHex);
    format = "EF";
  } catch {
    try {
      tx = Transaction.fromHex(txHex);
      format = "raw";
    } catch (error: any) {
      console.error(`Error: Failed to decode transaction - ${error.message}`);
      process.exit(1);
    }
  }

  await printTransaction(tx, txHex.length / 2, format, jsonOutput);
}

// Resolve each input's funding value + address, from embedded source txs (EF/BEEF) or by fetching.
async function resolveInputs(tx: Transaction): Promise<Array<{ satoshis: number | null; address: string | null }>> {
  const cache = new Map<string, Transaction | null>();
  const out: Array<{ satoshis: number | null; address: string | null }> = [];

  for (const input of tx.inputs) {
    const vout = input.sourceOutputIndex;
    let src: Transaction | null | undefined = input.sourceTransaction;

    if (!src && !skipFees && input.sourceTXID) {
      if (!cache.has(input.sourceTXID)) cache.set(input.sourceTXID, await fetchTx(input.sourceTXID));
      src = cache.get(input.sourceTXID);
    }

    const prevout = src?.outputs?.[vout];
    if (prevout) {
      out.push({ satoshis: prevout.satoshis ?? null, address: classifyScript(prevout.lockingScript).address });
    } else {
      out.push({ satoshis: null, address: null });
    }
  }
  return out;
}

async function printTransaction(tx: Transaction, byteSize: number, format: string, json: boolean) {
  const resolvedInputs = await resolveInputs(tx);

  const inputs = tx.inputs.map((input, i) => ({
    index: i,
    txid: input.sourceTXID,
    vout: input.sourceOutputIndex,
    sequence: input.sequence,
    satoshis: resolvedInputs[i].satoshis,
    address: resolvedInputs[i].address,
  }));

  const outputs = tx.outputs.map((output, i) => {
    const { type, address } = classifyScript(output.lockingScript);
    return {
      index: i,
      satoshis: output.satoshis,
      address,
      type,
      script: output.lockingScript?.toHex() ?? null,
    };
  });

  const totalOut = outputs.reduce((sum, o) => sum + (o.satoshis ?? 0), 0);
  const haveAllInputs = inputs.length > 0 && inputs.every(i => i.satoshis !== null);
  const totalIn = haveAllInputs ? inputs.reduce((sum, i) => sum + (i.satoshis as number), 0) : null;
  const fee = totalIn === null ? null : totalIn - totalOut;

  const result = {
    txid: tx.id("hex"),
    format,
    version: tx.version,
    locktime: tx.lockTime,
    size: byteSize,
    inputs,
    outputs,
    totalIn,
    totalOut,
    fee,
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Transaction Decode (${format})`);
  console.log(`TXID:     ${result.txid}`);
  console.log(`Version:  ${result.version}`);
  console.log(`Size:     ${result.size} bytes`);
  console.log(`Inputs:   ${result.inputs.length}`);
  result.inputs.forEach(inp => {
    const val = inp.satoshis === null ? "value unknown" : `${inp.satoshis} sats`;
    const addr = inp.address ? ` ${inp.address}` : "";
    console.log(`  [${inp.index}] ${inp.txid}:${inp.vout}  ${val}${addr}`);
  });
  console.log(`Outputs:  ${result.outputs.length}`);
  result.outputs.forEach(out => {
    const addr = out.address ? ` ${out.address}` : ` (${out.type})`;
    console.log(`  [${out.index}] ${out.satoshis} satoshis${addr}`);
    console.log(`        script: ${out.script}`);
  });
  console.log(`Total in:  ${result.totalIn === null ? "unknown (missing prevout values)" : `${result.totalIn} satoshis`}`);
  console.log(`Total out: ${result.totalOut} satoshis`);
  console.log(`Fee:       ${result.fee === null ? "unknown (missing prevout values)" : `${result.fee} satoshis`}`);
  console.log(`Locktime:  ${result.locktime}`);
}

main();
