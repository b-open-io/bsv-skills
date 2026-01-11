#!/usr/bin/env bun
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execAsync = promisify(exec);
const BSV_DIR = "/.flow/.bsv";
const BACKUPS_DIR = `${BSV_DIR}/backups`;

function showHelp(): void {
	console.log("Export a specific member identity from a BAP master backup.");
	console.log("");
	console.log("Usage: bun run export-member.ts <backup-file> <index> [output-file] [password]");
	console.log("");
	console.log("Arguments:");
	console.log("  backup-file  Path to .bep master backup file");
	console.log("  index        Member index to export (0-based)");
	console.log("  output-file  Optional output path (defaults to backups/member-<index>.bep)");
	console.log("  password     Optional password (uses BACKUP_PASSPHRASE if not provided)");
	console.log("");
	console.log("Examples:");
	console.log("  bun run export-member.ts identity.bep 0");
	console.log("  bun run export-member.ts identity.bep 0 alice.bep");
	console.log("  bun run export-member.ts identity.bep 0 alice.bep mypassword");
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

async function exportMember(
	backupFile: string,
	index: number,
	outputFile?: string,
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

	const backupPath = path.isAbsolute(backupFile)
		? backupFile
		: `${BACKUPS_DIR}/${backupFile}`;

	const output = outputFile || `${BACKUPS_DIR}/member-${index}.bep`;

	console.log(`Exporting member ${index} from: ${backupPath}`);
	console.log(`Output: ${output}\n`);

	try {
		const { stdout } = await execAsync(
			`bap member "${backupPath}" --password "${pwd}" --index ${index} --output "${output}"`,
		);
		console.log("✅ Member exported successfully!");
		console.log(stdout);
	} catch (error: any) {
		throw new Error(`Failed to export member: ${error.message}`);
	}
}

// Parse command line arguments
const args = process.argv.slice(2);

// Handle --help flag
if (args.includes("--help") || args.includes("-h")) {
	showHelp();
	process.exit(0);
}

if (args.length < 2) {
	showHelp();
	process.exit(1);
}

exportMember(args[0], parseInt(args[1]), args[2], args[3]).catch((e) => {
	console.error("❌", e.message);
	process.exit(1);
});
