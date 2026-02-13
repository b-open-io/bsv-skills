#!/usr/bin/env bun
/**
 * Query transaction outputs from 1sat-stack API
 *
 * Usage:
 *   bun run query-txo.ts <outpoint>
 *   bun run query-txo.ts <txid>:<vout>
 *
 * Examples:
 *   bun run query-txo.ts abc123:0
 *   bun run query-txo.ts abc123def456:1
 */

const API_BASE = 'https://api.1sat.app';

interface TXOResponse {
  outpoint: string;
  txid: string;
  vout: number;
  satoshis: number;
  lockingScript: string;
  spend?: {
    txid: string;
    vin: number;
  };
  height?: number;
  idx?: number;
  tags?: string[];
  events?: any[];
}

async function queryTXO(outpoint: string): Promise<void> {
  try {
    // Validate outpoint format
    if (!outpoint.includes(':')) {
      console.error('Error: Invalid outpoint format. Use txid:vout');
      console.error('Example: abc123def456:0');
      process.exit(1);
    }

    const [txid, vout] = outpoint.split(':');
    if (!txid || isNaN(Number(vout))) {
      console.error('Error: Invalid outpoint format');
      process.exit(1);
    }

    console.log(`Querying TXO: ${outpoint}\n`);

    // Query the output
    const response = await fetch(`${API_BASE}/txo/${outpoint}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`Error: ${response.status} - ${error}`);
      process.exit(1);
    }

    const txo: TXOResponse = await response.json();

    // Display output information
    console.log('Output Information:');
    console.log('==================');
    console.log(`Outpoint: ${txo.outpoint}`);
    console.log(`Transaction: ${txo.txid}`);
    console.log(`Output Index: ${txo.vout}`);
    console.log(`Satoshis: ${txo.satoshis.toLocaleString()}`);
    console.log(`Block Height: ${txo.height || 'Unconfirmed'}`);

    if (txo.tags && txo.tags.length > 0) {
      console.log(`Tags: ${txo.tags.join(', ')}`);
    }

    // Check if spent
    if (txo.spend) {
      console.log('\nSpent Status:');
      console.log('=============');
      console.log(`Spent in: ${txo.spend.txid}`);
      console.log(`Input Index: ${txo.spend.vin}`);
    } else {
      console.log('\nSpent Status: UNSPENT');
    }

    // Query spend details if spent
    if (txo.spend) {
      const spendResponse = await fetch(`${API_BASE}/txo/${outpoint}/spend`);
      if (spendResponse.ok) {
        const spendData = await spendResponse.json();
        console.log('\nSpending Transaction Details:');
        console.log('============================');
        console.log(`Spending TX: ${spendData.txid}`);
        console.log(`Input #${spendData.vin}`);
      }
    }

    // Display script info
    console.log('\nScript Information:');
    console.log('==================');
    console.log(`Script Length: ${txo.lockingScript.length / 2} bytes`);
    console.log(`Script Hex: ${txo.lockingScript.substring(0, 64)}...`);

    // Try to decode standard scripts
    if (txo.lockingScript.startsWith('76a914') && txo.lockingScript.endsWith('88ac')) {
      // P2PKH script
      const pubKeyHash = txo.lockingScript.substring(6, 46);
      console.log(`Type: P2PKH (Pay to Public Key Hash)`);
      console.log(`PubKey Hash: ${pubKeyHash}`);
    } else if (txo.lockingScript.startsWith('006a')) {
      // OP_RETURN script
      console.log(`Type: OP_RETURN (Data Output)`);
      const dataLength = parseInt(txo.lockingScript.substring(4, 6), 16);
      console.log(`Data Length: ${dataLength} bytes`);
    }

    // Display events if any
    if (txo.events && txo.events.length > 0) {
      console.log('\nEvents:');
      console.log('=======');
      txo.events.forEach((event, i) => {
        console.log(`Event ${i + 1}: ${JSON.stringify(event)}`);
      });
    }

  } catch (error) {
    console.error('Error querying TXO:', error);
    process.exit(1);
  }
}

// Main execution
if (process.argv.length < 3) {
  console.log('Usage: bun run query-txo.ts <outpoint>');
  console.log('Example: bun run query-txo.ts abc123def456:0');
  process.exit(1);
}

const outpoint = process.argv[2];
queryTXO(outpoint);