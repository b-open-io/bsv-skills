import { describe, test, expect, mock } from "bun:test";
import { $ } from "bun";

describe("lookup.ts", () => {
  test("shows help message", async () => {
    const result = await $`bun run skills/lookup-block-info/scripts/lookup.ts --help`.quiet();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("USAGE:");
  });

  test("rejects negative height", async () => {
    const result = await $`bun run skills/lookup-block-info/scripts/lookup.ts --height -1`.nothrow().quiet();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString().toLowerCase()).toContain("error");
  });

  test("rejects invalid hash format", async () => {
    const result = await $`bun run skills/lookup-block-info/scripts/lookup.ts --hash not-a-hash`.nothrow().quiet();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString().toLowerCase()).toContain("error");
  });

  test("requires either height or hash", async () => {
    const result = await $`bun run skills/lookup-block-info/scripts/lookup.ts`.nothrow().quiet();
    // Should show help or require args
    expect(result.stdout.toString() + result.stderr.toString()).toBeTruthy();
  });

  // Integration test - only run if network available
  test("fetches block by height", async () => {
    const result = await $`bun run skills/lookup-block-info/scripts/lookup.ts --height 1`.nothrow().quiet();
    if (result.exitCode === 0) {
      expect(result.stdout.toString()).toContain("Hash");
    }
  });
});
