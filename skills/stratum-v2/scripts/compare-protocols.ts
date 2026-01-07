#!/usr/bin/env bun
/**
 * compare-protocols.ts - Compare Stratum v1 vs v2 for education/migration planning
 * Usage: bun run compare-protocols.ts --feature bandwidth|security|decentralization|--all
 */

const args = process.argv.slice(2);

function showHelp(): void {
  console.log(`Usage: bun run compare-protocols.ts [options]

Compare Stratum v1 vs v2 protocols for education and migration planning.

Options:
  --feature <name>        Compare specific feature
  --all                   Show all comparisons
  --json                  Output as JSON
  --help, -h              Show this help message

Available Features:
  bandwidth               Data efficiency comparison
  security                Security model differences
  decentralization        Job negotiation and template selection
  efficiency              Message overhead and performance
  encryption              Transport security
  jobselection            Miner's ability to choose transactions

Examples:
  bun run compare-protocols.ts --all
  bun run compare-protocols.ts --feature bandwidth
  bun run compare-protocols.ts --feature security --json`);
}

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

interface Comparison {
  feature: string;
  v1: string;
  v2: string;
  improvement: string;
  migrationNotes: string;
}

const comparisons: Comparison[] = [
  {
    feature: "bandwidth",
    v1: "JSON text protocol, verbose messages, ~2KB per job",
    v2: "Binary framing, compact encoding, ~200 bytes per job",
    improvement: "~90% bandwidth reduction",
    migrationNotes: "Requires binary message parsing implementation",
  },
  {
    feature: "security",
    v1: "No encryption, plaintext credentials, hash rate hijacking possible",
    v2: "Noise Protocol encryption, authenticated channels",
    improvement: "End-to-end encryption, prevents MITM attacks",
    migrationNotes: "Need to implement Noise Protocol handshake",
  },
  {
    feature: "decentralization",
    v1: "Pool selects all transactions, miners have no input",
    v2: "Job Negotiation Protocol allows miners to propose block templates",
    improvement: "Miners can select transactions, improved censorship resistance",
    migrationNotes: "Optional feature, requires template provider",
  },
  {
    feature: "efficiency",
    v1: "JSON parsing overhead, string manipulation",
    v2: "Direct binary read/write, fixed-size fields",
    improvement: "Lower CPU usage, faster message processing",
    migrationNotes: "Binary serialization library needed",
  },
  {
    feature: "encryption",
    v1: "None (plaintext TCP)",
    v2: "AEAD cipher (ChaCha20-Poly1305 or AES-GCM)",
    improvement: "Confidentiality and integrity protection",
    migrationNotes: "Certificate or key exchange setup required",
  },
  {
    feature: "jobselection",
    v1: "Miner accepts whatever pool sends",
    v2: "Job Declaration Protocol for miner-selected transactions",
    improvement: "Miners can prioritize transactions, build own templates",
    migrationNotes: "Advanced feature, pools may not support initially",
  },
];

const jsonOutput = args.includes("--json");
const showAll = args.includes("--all");
let selectedFeature: string | null = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--feature" && args[i + 1]) {
    selectedFeature = args[i + 1].toLowerCase();
    i++;
  }
}

if (!showAll && !selectedFeature) {
  console.error("Error: Specify --all or --feature <name>");
  showHelp();
  process.exit(1);
}

let results: Comparison[];

if (showAll) {
  results = comparisons;
} else {
  results = comparisons.filter((c) => c.feature === selectedFeature);
  if (results.length === 0) {
    console.error(`Error: Unknown feature '${selectedFeature}'`);
    console.error(`Available: ${comparisons.map((c) => c.feature).join(", ")}`);
    process.exit(1);
  }
}

if (jsonOutput) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log("Stratum Protocol Comparison: v1 vs v2\n");
  console.log("=".repeat(80));

  for (const comp of results) {
    console.log(`\nFeature: ${comp.feature.toUpperCase()}`);
    console.log("-".repeat(40));
    console.log(`Stratum v1: ${comp.v1}`);
    console.log(`Stratum v2: ${comp.v2}`);
    console.log(`Improvement: ${comp.improvement}`);
    console.log(`Migration: ${comp.migrationNotes}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("Summary: Stratum v2 offers significant improvements in bandwidth,");
  console.log("security, and miner autonomy over the legacy v1 protocol.");
}
