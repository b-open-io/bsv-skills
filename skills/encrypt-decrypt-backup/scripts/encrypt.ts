#!/usr/bin/env bun
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";

const execAsync = promisify(exec);

// Flow's BSV convention
const BSV_DIR = "/.flow/.bsv";
const BACKUPS_DIR = `${BSV_DIR}/backups`;
const TEMP_DIR = `${BSV_DIR}/temp`;

interface EncryptOptions {
  inputFile: string;
  outputFile?: string;
  password?: string;
}

async function encrypt(options: EncryptOptions): Promise<void> {
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

  // Resolve input file path
  const inputPath = path.resolve(options.inputFile);

  // Check input file exists
  try {
    await fs.access(inputPath);
  } catch {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // Determine output file
  let outputPath: string;
  if (options.outputFile) {
    outputPath = path.resolve(options.outputFile);
  } else {
    // Default: save to Flow's backups directory
    const inputName = path.basename(options.inputFile, path.extname(options.inputFile));
    outputPath = `${BACKUPS_DIR}/${inputName}.bep`;
  }

  // Ensure backups directory exists
  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  console.log(`Encrypting ${inputPath}...`);
  console.log(`Output: ${outputPath}`);

  try {
    // Use bbackup CLI
    const { stdout, stderr } = await execAsync(
      `bbackup enc "${inputPath}" -p "${password}" -o "${outputPath}"`
    );

    if (stderr && !stderr.includes("Encrypted")) {
      console.error("Warning:", stderr);
    }

    console.log("✅ Encryption successful!");
    console.log(stdout);

    // Update config.json registry
    await updateBackupRegistry(path.basename(outputPath), inputPath);

  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

async function updateBackupRegistry(backupFile: string, source: string): Promise<void> {
  const configPath = `${BSV_DIR}/config.json`;

  try {
    const configData = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configData);

    config.backups = config.backups || {};
    config.backups[backupFile] = {
      created: new Date().toISOString(),
      source: path.basename(source),
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`Updated backup registry: ${configPath}`);
  } catch (error) {
    console.warn("Could not update backup registry:", error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: bun run encrypt.ts <input-file> [output-file] [password]");
  console.error("");
  console.error("Examples:");
  console.error("  bun run encrypt.ts wallet.json");
  console.error("  bun run encrypt.ts wallet.json my-wallet.bep");
  console.error("  bun run encrypt.ts wallet.json my-wallet.bep mypassword");
  console.error("");
  console.error("If no password is provided, uses FLOW_BACKUP_PASSPHRASE env var");
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];
const password = args[2];

encrypt({ inputFile, outputFile, password })
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
