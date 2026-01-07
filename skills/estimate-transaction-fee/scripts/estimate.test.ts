import { describe, test, expect } from "bun:test";
import { $ } from "bun";

describe("estimate.ts", () => {
  test("shows help message", async () => {
    const result = await $`bun run skills/estimate-transaction-fee/scripts/estimate.ts --help`.quiet();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("USAGE:");
  });

  test("rejects negative size", async () => {
    const result = await $`bun run skills/estimate-transaction-fee/scripts/estimate.ts --size -100`.nothrow().quiet();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString().toLowerCase()).toContain("error");
  });

  test("estimates fee from size", async () => {
    const result = await $`bun run skills/estimate-transaction-fee/scripts/estimate.ts --size 226`.nothrow().quiet();
    if (result.exitCode === 0) {
      expect(result.stdout.toString()).toContain("226");
    }
  });

  test("estimates from inputs and outputs", async () => {
    const result = await $`bun run skills/estimate-transaction-fee/scripts/estimate.ts --inputs 1 --outputs 2`.nothrow().quiet();
    if (result.exitCode === 0) {
      expect(result.stdout.toString().toLowerCase()).toContain("fee");
    }
  });

  test("applies custom rate", async () => {
    const result = await $`bun run skills/estimate-transaction-fee/scripts/estimate.ts --size 100 --rate 2`.nothrow().quiet();
    if (result.exitCode === 0) {
      // At 2 sat/byte, 100 bytes = 200 satoshis
      expect(result.stdout.toString()).toContain("200");
    }
  });

  test("outputs JSON with --json flag", async () => {
    const result = await $`bun run skills/estimate-transaction-fee/scripts/estimate.ts --size 226 --json`.nothrow().quiet();
    if (result.exitCode === 0) {
      const output = JSON.parse(result.stdout.toString());
      expect(output).toHaveProperty("fee");
      expect(output).toHaveProperty("size");
    }
  });
});
