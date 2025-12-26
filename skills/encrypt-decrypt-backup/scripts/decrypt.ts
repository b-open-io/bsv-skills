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

interface DecryptOptions {
  inputFile: string;
  outputFile?: string;
  password?: string;
  toConsole?: boolean;
}

async function decrypt(options: DecryptOptions): Promise<void> {
  // Use FLOW_BACKUP_PASSPHRASE if no password provided
  const password = options.password || process.env.FLOW_BACKUP_PASSPHRASE;

  if (!password) {
    throw new Error(
      "No password provided. Set FLOW_BACKUP_PASSPHRASE environment variable or pass password as argument."
    );
  }

  // Resolve input file path
  let inputPath = path.resolve(options.inputFile);

  // If file doesn't exist at path, try backups directory
  try {
    await fs.access(inputPath);
  } catch {
    const backupPath = `${BACKUPS_DIR}/${path.basename(options.inputFile)}`;
    try {
      await fs.access(backupPath);
      inputPath = backupPath;
      console.log(`Found backup in: ${backupPath}`);
    } catch {
      throw new Error(`Backup file not found: ${options.inputFile}`);
    }
  }

  console.log(`Decrypting ${inputPath}...`);

  try {
    // If no output file specified, decrypt to temp directory or console
    let outputPath: string | undefined = options.outputFile;
    let cleanupTemp = false;

    if (!outputPath && !options.toConsole) {
      // Default: decrypt to temp directory
      await fs.mkdir(TEMP_DIR, { recursive: true });
      const inputName = path.basename(inputPath, ".bep");
      outputPath = `${TEMP_DIR}/${inputName}.json`;
      cleanupTemp = true;
      console.log(`Temporary output: ${outputPath}`);
    }

    // Build command
    const cmd = outputPath
      ? `bbackup dec "${inputPath}" -p "${password}" -o "${outputPath}"`
      : `bbackup dec "${inputPath}" -p "${password}"`;

    const { stdout, stderr } = await execAsync(cmd);

    if (stderr && !stderr.includes("Decrypted")) {
      console.error("Warning:", stderr);
    }

    console.log("✅ Decryption successful!");

    if (options.toConsole || !outputPath) {
      // Output decrypted content to console
      console.log("\n--- Decrypted Content ---");
      console.log(stdout);
    } else {
      console.log(`Saved to: ${outputPath}`);

      // If using temp file, remind about cleanup
      if (cleanupTemp) {
        console.log("\n⚠️  Temporary file will be auto-cleaned after your operation.");
        console.log(`   If you need it longer, copy it elsewhere.`);
      }
    }

  } catch (error: any) {
    if (error.message.includes("Invalid password") || error.message.includes("Decryption failed")) {
      throw new Error("Decryption failed: Invalid password or corrupted backup file");
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: bun run decrypt.ts <backup-file> [output-file] [password]");
  console.error("");
  console.error("Examples:");
  console.error("  bun run decrypt.ts wallet.bep");
  console.error("  bun run decrypt.ts wallet.bep wallet.json");
  console.error("  bun run decrypt.ts wallet.bep wallet.json mypassword");
  console.error("  bun run decrypt.ts wallet.bep - mypassword  # Output to console");
  console.error("");
  console.error("If no password is provided, uses FLOW_BACKUP_PASSPHRASE env var");
  console.error("If no output file, decrypts to /.flow/.bsv/temp/");
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] === "-" ? undefined : args[1];
const password = args[2];
const toConsole = args[1] === "-";

decrypt({ inputFile, outputFile, password, toConsole })
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
