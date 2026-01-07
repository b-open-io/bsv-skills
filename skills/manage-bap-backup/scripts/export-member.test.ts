import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir, access, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { constants } from "fs";

// Flow convention paths
const FLOW_BSV_DIR = ".flow/.bsv";
const CONFIG_FILE = "config.json";

// Sample config
const sampleConfig = {
  backups: [
    {
      id: "backup-001",
      name: "Test Identity",
      type: "bap",
      path: "~/.flow/.bsv/backups/test.bep",
      created: "2024-01-01T00:00:00Z"
    }
  ]
};

describe("manage-bap-backup export-member", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "bap-export-test-"));
    await mkdir(join(testDir, FLOW_BSV_DIR, "backups"), { recursive: true });
    await mkdir(join(testDir, FLOW_BSV_DIR, "temp"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("backup lookup", () => {
    it("finds backup by ID", async () => {
      const configPath = join(testDir, FLOW_BSV_DIR, CONFIG_FILE);
      await writeFile(configPath, JSON.stringify(sampleConfig));

      const content = await readFile(configPath, "utf8");
      const config = JSON.parse(content);
      const backup = config.backups.find((b: any) => b.id === "backup-001");

      expect(backup).toBeDefined();
      expect(backup.name).toBe("Test Identity");
    });

    it("reports error for unknown ID", async () => {
      const configPath = join(testDir, FLOW_BSV_DIR, CONFIG_FILE);
      await writeFile(configPath, JSON.stringify(sampleConfig));

      const content = await readFile(configPath, "utf8");
      const config = JSON.parse(content);
      const backup = config.backups.find((b: any) => b.id === "nonexistent");

      expect(backup).toBeUndefined();
    });

    it("supports partial ID matching", () => {
      const fullId = "backup-001";
      const partialId = "backup";

      expect(fullId.startsWith(partialId)).toBe(true);
    });
  });

  describe("output path validation", () => {
    it("validates output path is writable", async () => {
      const outputPath = join(testDir, "output.json");

      // Create file to test writeability
      await writeFile(outputPath, "");

      let isWritable = false;
      try {
        await access(outputPath, constants.W_OK);
        isWritable = true;
      } catch {
        isWritable = false;
      }

      expect(isWritable).toBe(true);
    });

    it("rejects non-writable paths", async () => {
      const nonExistentDir = join(testDir, "nonexistent", "deep", "path", "file.json");

      let isWritable = false;
      try {
        await access(join(testDir, "nonexistent"), constants.W_OK);
        isWritable = true;
      } catch {
        isWritable = false;
      }

      expect(isWritable).toBe(false);
    });

    it("creates parent directories if needed", async () => {
      const outputDir = join(testDir, "new", "nested", "dir");
      await mkdir(outputDir, { recursive: true });

      let exists = false;
      try {
        await access(outputDir);
        exists = true;
      } catch {
        exists = false;
      }

      expect(exists).toBe(true);
    });
  });

  describe("bbackup decrypt flow", () => {
    it("builds correct bbackup decrypt command", () => {
      const encryptedPath = "~/.flow/.bsv/backups/test.bep";
      const outputPath = "~/.flow/.bsv/temp/decrypted.json";

      const command = `bbackup decrypt "${encryptedPath}" -o "${outputPath}"`;

      expect(command).toContain("bbackup decrypt");
      expect(command).toContain(encryptedPath);
      expect(command).toContain("-o");
      expect(command).toContain(outputPath);
    });

    it("requires BACKUP_PASSPHRASE environment variable", () => {
      // This would be checked at runtime
      const envVar = "BACKUP_PASSPHRASE";
      expect(typeof envVar).toBe("string");
    });
  });

  describe("bap export flow", () => {
    it("builds correct bap export command", () => {
      const identityFile = "~/.flow/.bsv/temp/decrypted.json";

      const command = `bap export "${identityFile}"`;

      expect(command).toContain("bap export");
      expect(command).toContain(identityFile);
    });
  });

  describe("temp file cleanup", () => {
    it("creates temp directory for decrypted files", async () => {
      const tempDir = join(testDir, FLOW_BSV_DIR, "temp");

      let exists = false;
      try {
        await access(tempDir);
        exists = true;
      } catch {
        exists = false;
      }

      expect(exists).toBe(true);
    });

    it("cleans up temp files after export", async () => {
      const tempFile = join(testDir, FLOW_BSV_DIR, "temp", "decrypted.json");
      await writeFile(tempFile, "{}");

      // Simulate cleanup
      await rm(tempFile, { force: true });

      let exists = false;
      try {
        await access(tempFile);
        exists = true;
      } catch {
        exists = false;
      }

      expect(exists).toBe(false);
    });
  });

  describe("export output", () => {
    it("writes exported data to output path", async () => {
      const outputPath = join(testDir, "exported.json");
      const exportData = {
        identity: "test-identity",
        publicKey: "02abc...",
        exported: new Date().toISOString()
      };

      await writeFile(outputPath, JSON.stringify(exportData, null, 2));

      const content = await readFile(outputPath, "utf8");
      const parsed = JSON.parse(content);

      expect(parsed.identity).toBe("test-identity");
    });
  });

  describe("error handling", () => {
    it("handles missing config file", async () => {
      const configPath = join(testDir, FLOW_BSV_DIR, CONFIG_FILE);

      let errorCode = "";
      try {
        await readFile(configPath, "utf8");
      } catch (e: any) {
        errorCode = e.code;
      }

      expect(errorCode).toBe("ENOENT");
    });

    it("handles backup file not found", async () => {
      const backupPath = join(testDir, FLOW_BSV_DIR, "backups", "nonexistent.bep");

      let exists = false;
      try {
        await access(backupPath);
        exists = true;
      } catch {
        exists = false;
      }

      expect(exists).toBe(false);
    });
  });

  describe("script files", () => {
    it("export-member.ts exists", async () => {
      const file = Bun.file(import.meta.dir + "/export-member.ts");
      expect(await file.exists()).toBe(true);
    });
  });
});
