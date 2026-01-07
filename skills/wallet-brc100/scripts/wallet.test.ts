import { describe, expect, it } from "bun:test";
import { existsSync } from "fs";

describe("wallet-brc100", () => {
  const basePath = "skills/wallet-brc100/scripts";

  it("create-wallet.ts exists", () => {
    expect(existsSync(`${basePath}/create-wallet.ts`)).toBe(true);
  });

  it("create-wallet --help exits 0", async () => {
    const proc = Bun.spawn(["bun", "run", `${basePath}/create-wallet.ts`, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  it("create-wallet --help shows usage", async () => {
    const proc = Bun.spawn(["bun", "run", `${basePath}/create-wallet.ts`, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    expect(output.toLowerCase()).toContain("usage");
  });

  it("get-balance.ts exists", () => {
    expect(existsSync(`${basePath}/get-balance.ts`)).toBe(true);
  });

  it("get-balance --help exits 0", async () => {
    const proc = Bun.spawn(["bun", "run", `${basePath}/get-balance.ts`, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });
});
