import { describe, expect, it } from "bun:test";
import { existsSync } from "fs";

describe("stratum-v2", () => {
  const basePath = "skills/stratum-v2/scripts";

  it("encode-message.ts exists", () => {
    expect(existsSync(`${basePath}/encode-message.ts`)).toBe(true);
  });

  it("encode-message --help exits 0", async () => {
    const proc = Bun.spawn(["bun", "run", `${basePath}/encode-message.ts`, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  it("encode-message --help shows usage", async () => {
    const proc = Bun.spawn(["bun", "run", `${basePath}/encode-message.ts`, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    expect(output.toLowerCase()).toContain("usage");
  });

  it("decode-message.ts exists", () => {
    expect(existsSync(`${basePath}/decode-message.ts`)).toBe(true);
  });

  it("decode-message --help exits 0", async () => {
    const proc = Bun.spawn(["bun", "run", `${basePath}/decode-message.ts`, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  it("compare-protocols.ts exists", () => {
    expect(existsSync(`${basePath}/compare-protocols.ts`)).toBe(true);
  });

  it("compare-protocols --help exits 0", async () => {
    const proc = Bun.spawn(["bun", "run", `${basePath}/compare-protocols.ts`, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  it("compare-protocols --all shows comparison", async () => {
    const proc = Bun.spawn(["bun", "run", `${basePath}/compare-protocols.ts`, "--all"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    expect(output.toLowerCase()).toMatch(/v1|v2|stratum/);
  });
});
