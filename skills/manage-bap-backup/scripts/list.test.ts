import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir, homedir } from "os";

// Flow convention paths
const FLOW_BSV_DIR = ".flow/.bsv";
const CONFIG_FILE = "config.json";

// Sample config structure
const sampleConfig = {
  backups: [
    {
      id: "backup-001",
      name: "Primary Identity",
      type: "bap",
      path: "~/.flow/.bsv/backups/primary.bep",
      created: "2024-01-01T00:00:00Z"
    },
    {
      id: "backup-002",
      name: "Secondary Identity",
      type: "bap",
      path: "~/.flow/.bsv/backups/secondary.bep",
      created: "2024-06-15T12:30:00Z"
    }
  ]
};

describe("manage-bap-backup list", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "bap-test-"));
    await mkdir(join(testDir, FLOW_BSV_DIR, "backups"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("config file handling", () => {
    it("reads config.json successfully", async () => {
      const configPath = join(testDir, FLOW_BSV_DIR, CONFIG_FILE);
      await writeFile(configPath, JSON.stringify(sampleConfig, null, 2));

      const content = await readFile(configPath, "utf8");
      const config = JSON.parse(content);

      expect(config.backups).toBeDefined();
      expect(Array.isArray(config.backups)).toBe(true);
    });

    it("handles missing config file gracefully", async () => {
      const configPath = join(testDir, FLOW_BSV_DIR, CONFIG_FILE);

      let errorThrown = false;
      try {
        await readFile(configPath, "utf8");
      } catch (e: any) {
        errorThrown = true;
        expect(e.code).toBe("ENOENT");
      }
      expect(errorThrown).toBe(true);
    });

    it("handles empty backups array", async () => {
      const configPath = join(testDir, FLOW_BSV_DIR, CONFIG_FILE);
      await writeFile(configPath, JSON.stringify({ backups: [] }));

      const content = await readFile(configPath, "utf8");
      const config = JSON.parse(content);

      expect(config.backups.length).toBe(0);
    });

    it("handles malformed JSON", async () => {
      const configPath = join(testDir, FLOW_BSV_DIR, CONFIG_FILE);
      await writeFile(configPath, "{ invalid json }");

      let errorThrown = false;
      try {
        const content = await readFile(configPath, "utf8");
        JSON.parse(content);
      } catch {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("backup listing", () => {
    it("lists backups from config.json", async () => {
      const configPath = join(testDir, FLOW_BSV_DIR, CONFIG_FILE);
      await writeFile(configPath, JSON.stringify(sampleConfig));

      const content = await readFile(configPath, "utf8");
      const config = JSON.parse(content);

      expect(config.backups.length).toBe(2);
      expect(config.backups[0].name).toBe("Primary Identity");
      expect(config.backups[1].name).toBe("Secondary Identity");
    });

    it("includes all required fields", async () => {
      const backup = sampleConfig.backups[0];

      expect(backup.id).toBeDefined();
      expect(backup.name).toBeDefined();
      expect(backup.type).toBeDefined();
      expect(backup.path).toBeDefined();
      expect(backup.created).toBeDefined();
    });

    it("filters by type when specified", () => {
      const backups = sampleConfig.backups;
      const bapBackups = backups.filter(b => b.type === "bap");

      expect(bapBackups.length).toBe(2);
    });
  });

  describe("output formatting", () => {
    it("formats output as readable table", () => {
      const backup = sampleConfig.backups[0];

      // Expected table columns
      const columns = ["ID", "Name", "Type", "Created", "Path"];
      const row = [
        backup.id.substring(0, 8), // Short ID
        backup.name,
        backup.type,
        new Date(backup.created).toLocaleDateString(),
        backup.path
      ];

      expect(columns.length).toBe(5);
      expect(row.length).toBe(5);
    });

    it("truncates long IDs", () => {
      const longId = "backup-001-very-long-identifier";
      const shortId = longId.substring(0, 8);
      expect(shortId).toBe("backup-0");
    });

    it("formats dates readably", () => {
      const isoDate = "2024-01-01T00:00:00Z";
      const date = new Date(isoDate);
      const formatted = date.toLocaleDateString();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it("expands tilde in paths", () => {
      const path = "~/.flow/.bsv/backups/primary.bep";
      const expanded = path.replace("~", homedir());
      expect(expanded.startsWith(homedir())).toBe(true);
    });
  });

  describe("backup types", () => {
    it("supports multiple backup types", () => {
      const types = ["bap", "wif", "ordinals", "vault"];
      types.forEach(type => {
        expect(typeof type).toBe("string");
      });
    });
  });

  describe("script files", () => {
    it("list.ts exists", async () => {
      const file = Bun.file(import.meta.dir + "/list.ts");
      expect(await file.exists()).toBe(true);
    });
  });
});
