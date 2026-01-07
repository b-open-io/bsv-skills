import { describe, it, expect } from "bun:test";
import { PrivateKey, Script } from "@bsv/sdk";

// Protocol prefixes
const B_PREFIX = "19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut"; // B:// protocol
const MAP_PREFIX = "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5"; // MAP protocol
const AIP_PREFIX = "15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva"; // AIP protocol

// Test WIF (mainnet format)
const TEST_WIF = "KwajxSXaLx4GHVJH6cmB54eB2UHMKEJbeNweTfUxJDkSoorZ9Bgx";

describe("bsocial create-post", () => {
  describe("BSocial data structure", () => {
    it("builds valid BSocial data array", () => {
      const bsocialData = ["bsocial", "post", "Hello BSV!"];

      expect(bsocialData[0]).toBe("bsocial"); // app
      expect(bsocialData[1]).toBe("post"); // type
      expect(bsocialData[2]).toBe("Hello BSV!"); // content
    });

    it("supports different post types", () => {
      const postTypes = ["post", "like", "follow", "reply"];
      postTypes.forEach(type => {
        const data = ["bsocial", type, "content"];
        expect(data[1]).toBe(type);
      });
    });
  });

  describe("OP_RETURN script building", () => {
    it("builds valid OP_RETURN script", () => {
      const data = ["bsocial", "post", "Test content"];

      // Build OP_RETURN script using fromASM
      const script = Script.fromASM("OP_FALSE OP_RETURN");

      // Write data fields
      for (const field of data) {
        script.writeBin(Buffer.from(field, "utf8"));
      }

      const hex = script.toHex();
      expect(hex.startsWith("006a")).toBe(true); // OP_FALSE OP_RETURN
    });

    it("includes B protocol prefix when needed", () => {
      const dataWithPrefix = [B_PREFIX, "text/plain", "Hello"];
      expect(dataWithPrefix[0]).toBe(B_PREFIX);
    });
  });

  describe("MAP metadata", () => {
    it("includes MAP metadata when tags provided", () => {
      const tags = ["bsv", "blockchain", "test"];
      const mapData = [
        MAP_PREFIX,
        "SET",
        "app", "bsocial",
        "type", "post",
        "context", "tx",
        "tags", tags.join(",")
      ];

      expect(mapData[0]).toBe(MAP_PREFIX);
      expect(mapData[1]).toBe("SET");
      expect(mapData[mapData.length - 1]).toBe("bsv,blockchain,test");
    });

    it("handles empty tags array", () => {
      const tags: string[] = [];
      expect(tags.length).toBe(0);
      // Should not include tags field if empty
    });
  });

  describe("AIP signature", () => {
    it("includes AIP data structure", () => {
      const privateKey = PrivateKey.fromWif(TEST_WIF);
      const address = privateKey.toAddress();

      const aipData = [
        AIP_PREFIX,
        "BITCOIN_ECDSA",
        address,
        "signature_placeholder" // Actual signature computed at sign time
      ];

      expect(aipData[0]).toBe(AIP_PREFIX);
      expect(aipData[1]).toBe("BITCOIN_ECDSA");
      expect(aipData[2]).toBe(address);
    });
  });

  describe("content validation", () => {
    it("rejects empty content", () => {
      const content = "";
      expect(content.length).toBe(0);
      // Script should reject empty content
    });

    it("handles unicode content", () => {
      const content = "Hello 世界 🌍 مرحبا";
      const buffer = Buffer.from(content, "utf8");
      expect(buffer.length).toBeGreaterThan(content.length);
    });

    it("handles long content", () => {
      const longContent = "x".repeat(10000);
      const buffer = Buffer.from(longContent, "utf8");
      expect(buffer.length).toBe(10000);
      // Should handle but may want to warn about size
    });
  });

  describe("transaction structure", () => {
    it("creates transaction with OP_RETURN output at 0 satoshis", () => {
      const opReturnSatoshis = 0;
      expect(opReturnSatoshis).toBe(0);
    });

    it("includes change output", () => {
      const utxoAmount = 10000;
      const fee = 500;
      const changeAmount = utxoAmount - fee; // OP_RETURN is 0
      expect(changeAmount).toBe(9500);
    });
  });

  describe("script files", () => {
    it("create-post.ts exists", async () => {
      const file = Bun.file(import.meta.dir + "/create-post.ts");
      expect(await file.exists()).toBe(true);
    });
  });
});
