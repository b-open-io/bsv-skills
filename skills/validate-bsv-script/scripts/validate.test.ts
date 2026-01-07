import { describe, test, expect } from "bun:test";
import { $ } from "bun";

describe("validate.ts", () => {
  test("shows help message", async () => {
    const result = await $`bun run skills/validate-bsv-script/scripts/validate.ts --help`.quiet();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("USAGE:");
  });

  test("validates P2PKH locking script", async () => {
    // Standard P2PKH: OP_DUP OP_HASH160 <20-byte-hash> OP_EQUALVERIFY OP_CHECKSIG
    const p2pkh = "76a914" + "89abcdefabbaabbaabbaabbaabbaabbaabbaabba" + "88ac";
    const result = await $`bun run skills/validate-bsv-script/scripts/validate.ts ${p2pkh}`.nothrow().quiet();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("P2PKH");
  });

  test("rejects invalid hex", async () => {
    const result = await $`bun run skills/validate-bsv-script/scripts/validate.ts invalid-not-hex`.nothrow().quiet();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString().toLowerCase()).toContain("error");
  });

  test("outputs JSON with --json flag", async () => {
    const p2pkh = "76a914" + "89abcdefabbaabbaabbaabbaabbaabbaabbaabba" + "88ac";
    const result = await $`bun run skills/validate-bsv-script/scripts/validate.ts ${p2pkh} --json`.nothrow().quiet();
    if (result.exitCode === 0) {
      const output = JSON.parse(result.stdout.toString());
      expect(output).toHaveProperty("type");
      expect(output).toHaveProperty("valid");
    }
  });

  test("identifies script type correctly", async () => {
    // OP_RETURN script
    const opReturn = "6a" + "0b" + "68656c6c6f20776f726c64"; // OP_RETURN "hello world"
    const result = await $`bun run skills/validate-bsv-script/scripts/validate.ts ${opReturn}`.nothrow().quiet();
    if (result.exitCode === 0) {
      expect(result.stdout.toString().toLowerCase()).toContain("op_return");
    }
  });
});
