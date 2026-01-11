#!/usr/bin/env bun
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execAsync = promisify(exec);
const BSV_DIR = "/.flow/.bsv";
const BACKUPS_DIR = `${BSV_DIR}/backups`;

function showHelp(): void {
	console.log("List BAP identity members in a backup file.");
	console.log("");
	console.log("Usage: bun run list.ts <backup-file> [password]");
	console.log("");
	console.log("Arguments:");
	console.log("  backup-file  Path to .bep backup file (or filename in backups dir)");
	console.log("  password     Optional password (uses BACKUP_PASSPHRASE if not provided)");
	console.log("");
	console.log("Examples:");
	console.log("  bun run list.ts identity.bep");
	console.log("  bun run list.ts identity.bep mypassword");
	console.log("  bun run list.ts /path/to/identity.bep");
	console.log("");
	console.log("Environment:");
	console.log("  BACKUP_PASSPHRASE  Password for encrypted backups");
}

async function checkBapCli(): Promise<void> {
	try {
		await execAsync("which bap");
	} catch {
		throw new Error(
			"bap CLI not installed. Install with:\n" +
				"  git clone https://github.com/b-open-io/bap-cli.git\n" +
				"  cd bap-cli && bun install && bun run build && bun link",
		);
	}
}

async function listMembers(
	backupFile: string,
	password?: string,
): Promise<void> {
	const pwd = password || process.env.BACKUP_PASSPHRASE;
	if (!pwd) {
		throw new Error(
			"No password provided. Set BACKUP_PASSPHRASE environment variable or pass as argument.",
		);
	}

	// Check bap CLI is available
	await checkBapCli();

	// Try backups directory if not absolute path
	const backupPath = path.isAbsolute(backupFile)
		? backupFile
		: `${BACKUPS_DIR}/${backupFile}`;

	console.log(`Listing members in: ${backupPath}\n`);

	try {
		const { stdout } = await execAsync(
			`bap list "${backupPath}" --password "${pwd}"`,
		);
		console.log(stdout);
	} catch (error: any) {
		throw new Error(`Failed to list members: ${error.message}`);
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

listMembers(args[0], args[1]).catch((e) => {
	console.error("❌", e.message);
	process.exit(1);
});
