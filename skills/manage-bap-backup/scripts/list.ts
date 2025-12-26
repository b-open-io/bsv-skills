#!/usr/bin/env bun
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execAsync = promisify(exec);
const BSV_DIR = "/.flow/.bsv";
const BACKUPS_DIR = `${BSV_DIR}/backups`;

async function listMembers(backupFile: string, password?: string): Promise<void> {
  const pwd = password || process.env.FLOW_BACKUP_PASSPHRASE;
  if (!pwd) {
    throw new Error("No password. Set FLOW_BACKUP_PASSPHRASE or pass as argument.");
  }

  // Try backups directory if not absolute path
  const backupPath = path.isAbsolute(backupFile)
    ? backupFile
    : `${BACKUPS_DIR}/${backupFile}`;

  console.log(`Listing members in: ${backupPath}\n`);

  try {
    const { stdout } = await execAsync(`bap list "${backupPath}" --password "${pwd}"`);
    console.log(stdout);
  } catch (error: any) {
    throw new Error(`Failed to list members: ${error.message}`);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: bun run list.ts <backup-file> [password]");
  process.exit(1);
}

listMembers(args[0], args[1]).catch(e => {
  console.error("❌", e.message);
  process.exit(1);
});
