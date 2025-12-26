#!/usr/bin/env bun
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execAsync = promisify(exec);
const BSV_DIR = "/.flow/.bsv";
const BACKUPS_DIR = `${BSV_DIR}/backups`;

async function exportMember(
  backupFile: string,
  index: number,
  outputFile?: string,
  password?: string
): Promise<void> {
  const pwd = password || process.env.FLOW_BACKUP_PASSPHRASE;
  if (!pwd) {
    throw new Error("No password. Set FLOW_BACKUP_PASSPHRASE or pass as argument.");
  }

  const backupPath = path.isAbsolute(backupFile)
    ? backupFile
    : `${BACKUPS_DIR}/${backupFile}`;

  const output = outputFile || `${BACKUPS_DIR}/member-${index}.bep`;

  console.log(`Exporting member ${index} from: ${backupPath}`);
  console.log(`Output: ${output}\n`);

  try {
    const { stdout } = await execAsync(
      `bap member "${backupPath}" --password "${pwd}" --index ${index} --output "${output}"`
    );
    console.log("✅ Member exported successfully!");
    console.log(stdout);
  } catch (error: any) {
    throw new Error(`Failed to export member: ${error.message}`);
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: bun run export-member.ts <backup-file> <index> [output-file] [password]");
  process.exit(1);
}

exportMember(args[0], parseInt(args[1]), args[2], args[3]).catch(e => {
  console.error("❌", e.message);
  process.exit(1);
});
