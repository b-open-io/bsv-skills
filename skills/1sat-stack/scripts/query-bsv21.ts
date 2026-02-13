#!/usr/bin/env bun
/**
 * Query BSV21 tokens from 1sat-stack API
 *
 * Usage:
 *   bun run query-bsv21.ts <tokenId> [address]
 *
 * Examples:
 *   bun run query-bsv21.ts abc123def456  # Get token info
 *   bun run query-bsv21.ts abc123def456 1A2B3C4D5E  # Get balance for address
 */

const API_BASE = 'https://api.1sat.app';

interface BSV21Token {
  tokenId: string;
  symbol: string;
  name?: string;
  decimals: number;
  totalSupply: string;
  deployHeight: number;
  deployTxid: string;
}

interface TokenBalance {
  confirmed: string;
  pending: string;
  total: string;
}

interface TokenOutput {
  outpoint: string;
  amount: string;
  height?: number;
  spent: boolean;
}

async function queryToken(tokenId: string, address?: string): Promise<void> {
  try {
    console.log(`Querying BSV21 Token: ${tokenId}\n`);

    // Get token metadata
    const tokenResponse = await fetch(`${API_BASE}/bsv21/${tokenId}`);

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error(`Error: ${tokenResponse.status} - ${error}`);
      process.exit(1);
    }

    const token: BSV21Token = await tokenResponse.json();

    // Display token information
    console.log('Token Information:');
    console.log('=================');
    console.log(`Token ID: ${token.tokenId}`);
    console.log(`Symbol: ${token.symbol}`);
    if (token.name) {
      console.log(`Name: ${token.name}`);
    }
    console.log(`Decimals: ${token.decimals}`);
    console.log(`Total Supply: ${formatAmount(token.totalSupply, token.decimals)}`);
    console.log(`Deploy Height: ${token.deployHeight}`);
    console.log(`Deploy TX: ${token.deployTxid}`);

    // If address provided, get balance
    if (address) {
      console.log(`\nQuerying balance for address: ${address}\n`);

      const balanceResponse = await fetch(
        `${API_BASE}/bsv21/${tokenId}/p2pkh/${address}/balance`
      );

      if (!balanceResponse.ok) {
        console.error('Error fetching balance:', await balanceResponse.text());
      } else {
        const balance: TokenBalance = await balanceResponse.json();

        console.log('Balance Information:');
        console.log('==================');
        console.log(`Confirmed: ${formatAmount(balance.confirmed, token.decimals)} ${token.symbol}`);
        console.log(`Pending: ${formatAmount(balance.pending, token.decimals)} ${token.symbol}`);
        console.log(`Total: ${formatAmount(balance.total, token.decimals)} ${token.symbol}`);
      }

      // Get unspent outputs
      const unspentResponse = await fetch(
        `${API_BASE}/bsv21/${tokenId}/p2pkh/${address}/unspent`
      );

      if (unspentResponse.ok) {
        const unspent: TokenOutput[] = await unspentResponse.json();

        if (unspent.length > 0) {
          console.log('\nUnspent Outputs:');
          console.log('===============');
          unspent.forEach((output, i) => {
            console.log(`\nOutput ${i + 1}:`);
            console.log(`  Outpoint: ${output.outpoint}`);
            console.log(`  Amount: ${formatAmount(output.amount, token.decimals)} ${token.symbol}`);
            console.log(`  Height: ${output.height || 'Unconfirmed'}`);
          });
        } else {
          console.log('\nNo unspent outputs found.');
        }
      }

      // Get recent history
      const historyResponse = await fetch(
        `${API_BASE}/bsv21/${tokenId}/p2pkh/history?limit=5`
      );

      if (historyResponse.ok) {
        const history = await historyResponse.json();

        if (history.length > 0) {
          console.log('\nRecent History (last 5):');
          console.log('=======================');
          history.forEach((tx: any, i: number) => {
            console.log(`\nTransaction ${i + 1}:`);
            console.log(`  TXID: ${tx.txid}`);
            console.log(`  Height: ${tx.height || 'Unconfirmed'}`);
            console.log(`  Type: ${tx.type}`);
            if (tx.amount) {
              console.log(`  Amount: ${formatAmount(tx.amount, token.decimals)} ${token.symbol}`);
            }
          });
        }
      }
    } else {
      // Show general token statistics
      console.log('\nTo check a specific address balance, use:');
      console.log(`  bun run query-bsv21.ts ${tokenId} <address>`);

      // Get all token outputs count
      const outputsResponse = await fetch(
        `${API_BASE}/bsv21/${tokenId}/outputs?limit=1`
      );

      if (outputsResponse.ok) {
        const outputs = await outputsResponse.json();
        if (outputs.total) {
          console.log(`\nTotal Token Outputs: ${outputs.total}`);
        }
      }
    }

  } catch (error) {
    console.error('Error querying BSV21 token:', error);
    process.exit(1);
  }
}

function formatAmount(amount: string, decimals: number): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.replace(/0+$/, '');
  return `${whole}.${trimmed}`;
}

// Main execution
if (process.argv.length < 3) {
  console.log('Usage: bun run query-bsv21.ts <tokenId> [address]');
  console.log('\nExamples:');
  console.log('  bun run query-bsv21.ts abc123def456');
  console.log('  bun run query-bsv21.ts abc123def456 1A2B3C4D5E');
  process.exit(1);
}

const tokenId = process.argv[2];
const address = process.argv[3];
queryToken(tokenId, address);