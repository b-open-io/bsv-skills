import { describe, expect, it } from "bun:test";
import { existsSync } from "fs";

describe("lookup-bsv-address", () => {
  const scriptPath = "skills/lookup-bsv-address/scripts/lookup.ts";

  it("script exists", () => {
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("--help exits with code 0", async () => {
    const proc = Bun.spawn(["bun", "run", scriptPath, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  it("--help shows usage information", async () => {
    const proc = Bun.spawn(["bun", "run", scriptPath, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    expect(output.toLowerCase()).toContain("usage");
  });

  it("rejects invalid address with non-zero exit", async () => {
    const proc = Bun.spawn(["bun", "run", scriptPath, "invalid-address"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    expect(exitCode).not.toBe(0);
  });

  it("looks up genesis address (live API)", async () => {
    // Satoshi's genesis address
    const genesisAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
    const proc = Bun.spawn(["bun", "run", scriptPath, genesisAddress], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    expect(output.toLowerCase()).toMatch(/balance|address/);
  });

  it("--json returns valid JSON", async () => {
    const genesisAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
    const proc = Bun.spawn(["bun", "run", scriptPath, genesisAddress, "--json"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    const json = JSON.parse(output);
    expect(json).toHaveProperty("address");
    expect(json).toHaveProperty("balance");
  });
});
