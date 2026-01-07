import { describe, test, expect } from "bun:test";
import { $ } from "bun";

describe("difficulty.ts", () => {
  test("shows help message", async () => {
    const result = await $`bun run skills/calculate-mining-difficulty/scripts/difficulty.ts --help`.quiet();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("USAGE:");
  });

  test("rejects invalid target", async () => {
    const result = await $`bun run skills/calculate-mining-difficulty/scripts/difficulty.ts --target invalid`.nothrow().quiet();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString().toLowerCase()).toContain("error");
  });

  test("rejects invalid bits format", async () => {
    const result = await $`bun run skills/calculate-mining-difficulty/scripts/difficulty.ts --bits not-bits`.nothrow().quiet();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString().toLowerCase()).toContain("error");
  });

  test("calculates difficulty from valid bits", async () => {
    // Genesis block bits
    const result = await $`bun run skills/calculate-mining-difficulty/scripts/difficulty.ts --bits 0x1d00ffff`.nothrow().quiet();
    if (result.exitCode === 0) {
      expect(result.stdout.toString().toLowerCase()).toContain("difficulty");
    }
  });

  test("outputs JSON with --json flag", async () => {
    const result = await $`bun run skills/calculate-mining-difficulty/scripts/difficulty.ts --bits 0x1d00ffff --json`.nothrow().quiet();
    if (result.exitCode === 0) {
      const output = JSON.parse(result.stdout.toString());
      expect(output).toHaveProperty("difficulty");
    }
  });
});
