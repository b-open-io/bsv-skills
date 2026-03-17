#!/usr/bin/env bun
import path from "node:path";
import fs from "node:fs/promises";

// Flow's BSV convention
const BSV_DIR = "/.flow/.bsv";
const BACKUPS_DIR = `${BSV_DIR}/backups`;

function showHelp(): void {
	console.log("Encrypt a JSON file to BSV backup format (.bep).");
	console.log("");
	console.log("Usage: bun run encrypt.ts <input-file> [output-file] [password]");
	console.log("");
	console.log("Arguments:");
	console.log("  input-file   JSON file to encrypt");
	console.log("  output-file  Output .bep path (defaults to backups/<name>.bep)");
	console.log("  password     Optional password (uses BACKUP_PASSPHRASE if not provided)");
	console.log("");
	console.log("Examples:");
	console.log("  bun run encrypt.ts wallet.json");
	console.log("  bun run encrypt.ts wallet.json my-wallet.bep");
	console.log("  bun run encrypt.ts wallet.json my-wallet.bep mypassword");
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

interface EncryptOptions {
	inputFile: string;
	outputFile?: string;
	password?: string;
}

async function encrypt(options: EncryptOptions): Promise<void> {
	const password = options.password || process.env.BACKUP_PASSPHRASE;

	if (!password) {
		throw new Error(
			"No password provided. Set BACKUP_PASSPHRASE environment variable or pass password as argument.",
		);
	}

	if (password.length < 8) {
		throw new Error("Password must be at least 8 characters long");
	}

	// Check bbackup CLI is available
	await checkBbackupCli();

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
		const inputName = path.basename(
			options.inputFile,
			path.extname(options.inputFile),
		);
		outputPath = `${BACKUPS_DIR}/${inputName}.bep`;
	}

	// Ensure backups directory exists
	await fs.mkdir(BACKUPS_DIR, { recursive: true });

	console.log(`Encrypting ${inputPath}...`);
	console.log(`Output: ${outputPath}`);

	try {
		// Use bbackup CLI with array args to avoid shell injection
		const proc = Bun.spawn(["bbackup", "enc", inputPath, "-p", password, "-o", outputPath], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const exitCode = await proc.exited;
		const stdout = await new Response(proc.stdout).text();
		const stderr = await new Response(proc.stderr).text();

		if (exitCode !== 0) {
			throw new Error(stderr || stdout || "bbackup enc exited with non-zero status");
		}

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

async function updateBackupRegistry(
	backupFile: string,
	source: string,
): Promise<void> {
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
const outputFile = args[1];
const password = args[2];

encrypt({ inputFile, outputFile, password }).catch((error) => {
	console.error("❌ Error:", error.message);
	process.exit(1);
});
