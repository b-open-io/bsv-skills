import { describe, expect, it } from "bun:test";
import { existsSync } from "fs";

describe("decode-bsv-transaction", () => {
  const scriptPath = "skills/decode-bsv-transaction/scripts/decode.ts";

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

  it("rejects invalid hex with non-zero exit", async () => {
    const proc = Bun.spawn(["bun", "run", scriptPath, "invalid-hex-garbage"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    expect(exitCode).not.toBe(0);
  });

  it("decodes valid transaction hex", async () => {
    // Simple coinbase tx hex (genesis block coinbase)
    const coinbaseTx = "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0704ffff001d0104ffffffff0100f2052a0100000043410496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858eeac00000000";
    const proc = Bun.spawn(["bun", "run", scriptPath, coinbaseTx], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    expect(output.toLowerCase()).toMatch(/version|input|output/);
  });
});
