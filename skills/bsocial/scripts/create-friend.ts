#!/usr/bin/env bun

import { PrivateKey, Script, Transaction, Utils } from "@bsv/sdk";
import {
  AIP,
  BitCom,
  MAP,
  PrivateKeySigner,
  type Protocol,
} from "@1sat/templates";
import { fundAndBroadcast } from "../lib/broadcast.js";

const MAP_PREFIX = "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5";
const AIP_PREFIX = "15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva";

const HELP = `
create-friend - Send a friend request on the BSV blockchain

USAGE:
  bun run create-friend.ts <wif> <bapId>

OPTIONS:
  --dry-run    Build tx but don't broadcast
  --json       Output JSON format
  -h, --help   Show this help

NOTE: Friend requests include the sender's public key for encrypted messaging.
      This creates a two-way relationship when both parties send friend requests.

EXAMPLES:
  bun run create-friend.ts L1... 1BAPSu...
`.trim();

interface Args {
  wif?: string;
  bapId?: string;
  dryRun: boolean;
  json: boolean;
  help: boolean;
}

function parseArgs(args: string[]): Args {
  const result: Args = { dryRun: false, json: false, help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      result.help = true;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    } else if (arg === "--json") {
      result.json = true;
    } else if (!arg.startsWith("--") && !result.wif) {
      result.wif = arg;
    } else if (!arg.startsWith("--") && !result.bapId) {
      result.bapId = arg;
    }
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.wif || !args.bapId) {
    console.log(HELP);
    process.exit(args.help ? 0 : 1);
  }

  try {
    const privateKey = PrivateKey.fromWif(args.wif);
    const publicKey = privateKey.toPublicKey().toString();

    // BSocial doesn't have a createFriend() method -- BSocialActionType doesn't
    // include "friend". Friend requests require custom MAP fields (bapID, publicKey)
    // that BSocial.lock() won't produce. Build MAP + AIP manually using the same
    // BitCom primitives that BSocial uses internally.

    const mapData: Record<string, string> = {
      app: "bsocial",
      type: "friend",
      bapID: args.bapId,
      publicKey: publicKey,
    };

    const mapScript = MAP.set(mapData);

    // Extract MAP protocol data (skip OP_RETURN and protocol address chunks)
    const mapChunks = mapScript.chunks.slice(2);
    const mapDataScript = new Script(mapChunks);

    const protocols: Protocol[] = [
      {
        protocol: MAP_PREFIX,
        script: mapDataScript.toBinary(),
        pos: 0,
      },
    ];

    // Sign with AIP -- mirrors BSocial.lock() signing logic exactly
    const signatureData: number[] = [];
    for (const proto of protocols) {
      signatureData.push(...Utils.toArray(proto.protocol, "utf8"));
      signatureData.push(...proto.script);
      signatureData.push(0x7c); // '|' separator
    }

    const signer = new PrivateKeySigner(privateKey);
    const aipData = await AIP.sign(signatureData, signer);
    const aipScript = aipData.lock();

    // Extract AIP data (skip OP_RETURN and protocol address chunks)
    const aipChunks = aipScript.chunks.slice(2);
    const aipDataScript = new Script(aipChunks);

    protocols.push({
      protocol: AIP_PREFIX,
      script: aipDataScript.toBinary(),
      pos: 1,
    });

    const bitcom = new BitCom(protocols);
    const lockingScript = bitcom.lock();

    const tx = new Transaction();
    tx.addOutput({
      satoshis: 0,
      lockingScript,
    });

    if (args.dryRun) {
      const result = {
        status: "dry-run",
        bapId: args.bapId,
        publicKey: publicKey,
        txSize: tx.toBinary().length,
      };
      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Dry run - would send friend request to: ${args.bapId}`);
        console.log(`Public key: ${publicKey.substring(0, 20)}...`);
        console.log(`TX size: ${result.txSize} bytes`);
      }
      process.exit(0);
    }

    const txid = await fundAndBroadcast(tx, privateKey);

    if (args.json) {
      console.log(JSON.stringify({ txid, friend: args.bapId }, null, 2));
    } else {
      console.log(`Friend request sent: ${txid}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

main();
