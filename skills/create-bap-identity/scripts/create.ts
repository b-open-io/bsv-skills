#!/usr/bin/env bun
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";

const execAsync = promisify(exec);

// Flow's BSV convention
const BSV_DIR = "/.flow/.bsv";
const BACKUPS_DIR = `${BSV_DIR}/backups`;

interface CreateIdentityOptions {
  name: string;
  type: "type42" | "legacy";
  outputFile?: string;
  password?: string;
}

async function createIdentity(options: CreateIdentityOptions): Promise<void> {
  // Use FLOW_BACKUP_PASSPHRASE if no password provided
  const password = options.password || process.env.FLOW_BACKUP_PASSPHRASE;

  if (!password) {
    throw new Error(
      "No password provided. Set FLOW_BACKUP_PASSPHRASE environment variable or pass password as argument."
    );
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  if (!options.name || options.name.trim().length === 0) {
    throw new Error("Identity name is required");
  }

  // Ensure backups directory exists
  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  // Determine output file
  let outputPath: string;
  if (options.outputFile) {
    outputPath = path.resolve(options.outputFile);
  } else {
    // Default: save to Flow's backups directory
    const safeName = options.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    outputPath = `${BACKUPS_DIR}/${safeName}-identity.bep`;
  }

  console.log(`Creating BAP ${options.type} identity...`);
  console.log(`Name: ${options.name}`);
  console.log(`Output: ${outputPath}`);

  try {
    // Use bap CLI to create identity
    const { stdout, stderr } = await execAsync(
      `bap new --type ${options.type} --password "${password}" --name "${options.name}" --output "${outputPath}"`
    );

    if (stderr) {
      console.error("Warning:", stderr);
    }

    console.log("✅ BAP identity created successfully!");
    console.log(stdout);

    // Update config.json registry
    await updateIdentityRegistry(
      path.basename(outputPath),
      options.name,
      options.type
    );

    console.log("\n📋 Next steps:");
    console.log("  1. List identity members: bap list " + path.basename(outputPath));
    console.log("  2. Export member identity: bap member " + path.basename(outputPath));
    console.log("  3. Use for signing attestations");

  } catch (error: any) {
    if (error.message.includes("command not found: bap")) {
      throw new Error(
        "bap CLI not installed. Install with:\n" +
        "  git clone https://github.com/b-open-io/bap-cli.git\n" +
        "  cd bap-cli && bun install && bun run build && bun link"
      );
    }
    throw new Error(`Identity creation failed: ${error.message}`);
  }
}

async function updateIdentityRegistry(
  backupFile: string,
  name: string,
  type: string
): Promise<void> {
  const configPath = `${BSV_DIR}/config.json`;

  try {
    let config: any;
    try {
      const configData = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(configData);
    } catch {
      config = { backups: {}, defaultBackup: null, identityBackup: null };
    }

    config.backups = config.backups || {};
    config.backups[backupFile] = {
      created: new Date().toISOString(),
      type: "BapMasterBackup",
      identityType: type,
      name: name,
    };

    // Set as default identity backup if none exists
    if (!config.identityBackup) {
      config.identityBackup = backupFile;
    }

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`\n✅ Updated identity registry: ${configPath}`);

  } catch (error) {
    console.warn("Could not update identity registry:", error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: bun run create.ts <name> <type> [output-file] [password]");
  console.error("");
  console.error("Arguments:");
  console.error("  name        - Identity name (e.g., 'Alice Smith')");
  console.error("  type        - 'type42' (recommended) or 'legacy'");
  console.error("  output-file - Optional custom output path");
  console.error("  password    - Optional password (uses FLOW_BACKUP_PASSPHRASE if not provided)");
  console.error("");
  console.error("Examples:");
  console.error("  bun run create.ts 'Alice Smith' type42");
  console.error("  bun run create.ts 'Bob Jones' legacy");
  console.error("  bun run create.ts 'Carol' type42 my-identity.bep");
  console.error("  bun run create.ts 'Dave' type42 dave.bep mypassword");
  process.exit(1);
}

const name = args[0];
const type = args[1] as "type42" | "legacy";
const outputFile = args[2];
const password = args[3];

if (type !== "type42" && type !== "legacy") {
  console.error("❌ Error: type must be 'type42' or 'legacy'");
  process.exit(1);
}

createIdentity({ name, type, outputFile, password })
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
