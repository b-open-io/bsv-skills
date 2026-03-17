#!/usr/bin/env bun
import path from "node:path";
import fs from "node:fs/promises";

// Agent's BSV convention
const BSV_DIR = "/.flow/.bsv";
const BACKUPS_DIR = `${BSV_DIR}/backups`;
const TEMP_DIR = `${BSV_DIR}/temp`;

function showHelp(): void {
	console.log("Decrypt an encrypted BSV backup file (.bep format).");
	console.log("");
	console.log("Usage: bun run decrypt.ts <backup-file> [output-file] [password]");
	console.log("");
	console.log("Arguments:");
	console.log("  backup-file  Path to encrypted .bep file");
	console.log("  output-file  Output path (use '-' for console, omit for temp file)");
	console.log("  password     Optional password (uses BACKUP_PASSPHRASE if not provided)");
	console.log("");
	console.log("Examples:");
	console.log("  bun run decrypt.ts wallet.bep");
	console.log("  bun run decrypt.ts wallet.bep wallet.json");
	console.log("  bun run decrypt.ts wallet.bep wallet.json mypassword");
	console.log("  bun run decrypt.ts wallet.bep - mypassword  # Output to console");
	console.log("");
	console.log("Environment:");
	console.log("  BACKUP_PASSPHRASE  Password for encrypted backups");
}

async function checkBbackupCli(): Promise<void> {
	const proc = Bun.spawn(["which", "bbackup"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(
			"bbackup CLI not installed. Install with:\n" +
				"  bun add -g bitcoin-backup",
		);
	}
}

interface DecryptOptions {
  inputFile: string;
  outputFile?: string;
  password?: string;
  toConsole?: boolean;
}

async function decrypt(options: DecryptOptions): Promise<void> {
  // Use BACKUP_PASSPHRASE if no password provided
  const password = options.password || process.env.BACKUP_PASSPHRASE;

  if (!password) {
    throw new Error(
      "No password provided. Set BACKUP_PASSPHRASE environment variable or pass password as argument.",
    );
  }

  // Check bbackup CLI is available
  await checkBbackupCli();

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

    // Build command args to avoid shell injection
    const args = ["bbackup", "dec", inputPath, "-p", password];
    if (outputPath) {
      args.push("-o", outputPath);
    }

    const proc = Bun.spawn(args, {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      throw new Error(stderr || stdout || "bbackup dec exited with non-zero status");
    }

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

      // Remind about cleanup for temp files
      if (cleanupTemp) {
        console.log(
          "\n⚠️  This is a temporary file. Delete it when done:",
        );
        console.log(`   rm "${outputPath}"`);
      }
    }
  } catch (error: any) {
    if (
      error.message.includes("Invalid password") ||
      error.message.includes("Decryption failed")
    ) {
      throw new Error(
        "Decryption failed: Invalid password or corrupted backup file",
      );
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

// Handle --help flag
if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

if (args.length === 0) {
  showHelp();
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] === "-" ? undefined : args[1];
const password = args[2];
const toConsole = args[1] === "-";

decrypt({ inputFile, outputFile, password, toConsole }).catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
