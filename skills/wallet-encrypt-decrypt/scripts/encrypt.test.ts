import { describe, it, expect } from "bun:test";
import { PrivateKey, PublicKey, Random } from "@bsv/sdk";
import { createCipheriv, createDecipheriv, createHash } from "crypto";

// Test key pairs
const alicePrivateKey = PrivateKey.fromRandom();
const alicePublicKey = alicePrivateKey.toPublicKey();
const bobPrivateKey = PrivateKey.fromRandom();
const bobPublicKey = bobPrivateKey.toPublicKey();

// Helper: ECDH shared secret
function computeSharedSecret(privateKey: PrivateKey, publicKey: PublicKey): Buffer {
  const point = publicKey.mul(privateKey);
  const sharedX = point.x?.toArray("be", 32);
  if (!sharedX) throw new Error("Failed to compute shared secret");
  return Buffer.from(sharedX);
}

// Helper: Derive AES key from shared secret
function deriveKey(sharedSecret: Buffer): Buffer {
  return createHash("sha256").update(sharedSecret).digest();
}

// Helper: Encrypt with AES-256-GCM
function encrypt(plaintext: string, recipientPubKey: PublicKey): {
  ephemeralPublicKey: string;
  iv: string;
  authTag: string;
  ciphertext: string;
} {
  const ephemeral = PrivateKey.fromRandom();
  const sharedSecret = computeSharedSecret(ephemeral, recipientPubKey);
  const key = deriveKey(sharedSecret);
  const iv = Buffer.from(Random(12));

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ephemeralPublicKey: ephemeral.toPublicKey().toString(),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    ciphertext: encrypted.toString("hex"),
  };
}

// Helper: Decrypt with AES-256-GCM
function decrypt(
  encryptedData: { ephemeralPublicKey: string; iv: string; authTag: string; ciphertext: string },
  privateKey: PrivateKey
): string {
  const ephemeralPub = PublicKey.fromString(encryptedData.ephemeralPublicKey);
  const sharedSecret = computeSharedSecret(privateKey, ephemeralPub);
  const key = deriveKey(sharedSecret);

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedData.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData.ciphertext, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

describe("wallet-encrypt-decrypt", () => {
  describe("key operations", () => {
    it("generates valid key pairs", () => {
      expect(alicePrivateKey).toBeDefined();
      expect(alicePublicKey).toBeDefined();
      expect(alicePublicKey.toString()).toMatch(/^[0-9a-fA-F]{66}$/);
    });

    it("computes ECDH shared secret", () => {
      const secret1 = computeSharedSecret(alicePrivateKey, bobPublicKey);
      const secret2 = computeSharedSecret(bobPrivateKey, alicePublicKey);
      expect(secret1.toString("hex")).toBe(secret2.toString("hex"));
    });
  });

  describe("encryption", () => {
    it("encrypts message and produces valid JSON output", () => {
      const result = encrypt("Hello, World!", bobPublicKey);

      expect(result.ephemeralPublicKey).toBeDefined();
      expect(result.ephemeralPublicKey.length).toBe(66); // Compressed pubkey
      expect(result.iv).toBeDefined();
      expect(result.iv.length).toBe(24); // 12 bytes hex = 24 chars
      expect(result.authTag).toBeDefined();
      expect(result.authTag.length).toBe(32); // 16 bytes hex = 32 chars
      expect(result.ciphertext).toBeDefined();
    });

    it("produces different ciphertext for same message (random IV)", () => {
      const result1 = encrypt("Same message", bobPublicKey);
      const result2 = encrypt("Same message", bobPublicKey);

      expect(result1.ciphertext).not.toBe(result2.ciphertext);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it("handles empty message", () => {
      const result = encrypt("", bobPublicKey);
      expect(result.ciphertext).toBeDefined();
      expect(result.ciphertext.length).toBe(0);
    });

    it("handles unicode message", () => {
      const unicodeMsg = "Hello 世界 🌍 مرحبا";
      const result = encrypt(unicodeMsg, bobPublicKey);
      expect(result.ciphertext.length).toBeGreaterThan(0);
    });
  });

  describe("decryption", () => {
    it("decrypts message back to original plaintext", () => {
      const originalMsg = "Secret message!";
      const encrypted = encrypt(originalMsg, bobPublicKey);
      const decrypted = decrypt(encrypted, bobPrivateKey);

      expect(decrypted).toBe(originalMsg);
    });

    it("works with different key pairs (A encrypts for B)", () => {
      const message = "From Alice to Bob";
      const encrypted = encrypt(message, bobPublicKey);
      const decrypted = decrypt(encrypted, bobPrivateKey);

      expect(decrypted).toBe(message);
    });

    it("fails decryption with wrong private key", () => {
      const encrypted = encrypt("Secret", bobPublicKey);

      expect(() => {
        decrypt(encrypted, alicePrivateKey); // Alice can't decrypt Bob's message
      }).toThrow();
    });

    it("handles unicode roundtrip", () => {
      const unicodeMsg = "Hello 世界 🌍 مرحبا";
      const encrypted = encrypt(unicodeMsg, bobPublicKey);
      const decrypted = decrypt(encrypted, bobPrivateKey);

      expect(decrypted).toBe(unicodeMsg);
    });
  });

  describe("tamper detection", () => {
    it("detects tampered ciphertext", () => {
      const encrypted = encrypt("Secret", bobPublicKey);

      // Tamper with ciphertext
      const tamperedCiphertext = encrypted.ciphertext.slice(0, -2) + "00";
      const tampered = { ...encrypted, ciphertext: tamperedCiphertext };

      expect(() => {
        decrypt(tampered, bobPrivateKey);
      }).toThrow();
    });

    it("detects tampered IV", () => {
      const encrypted = encrypt("Secret", bobPublicKey);

      // Tamper with IV
      const tamperedIv = "00".repeat(12);
      const tampered = { ...encrypted, iv: tamperedIv };

      expect(() => {
        decrypt(tampered, bobPrivateKey);
      }).toThrow();
    });

    it("detects tampered auth tag", () => {
      const encrypted = encrypt("Secret", bobPublicKey);

      // Tamper with auth tag
      const tamperedAuthTag = "00".repeat(16);
      const tampered = { ...encrypted, authTag: tamperedAuthTag };

      expect(() => {
        decrypt(tampered, bobPrivateKey);
      }).toThrow();
    });
  });

  describe("script files", () => {
    it("encrypt-message.ts exists", async () => {
      const file = Bun.file(import.meta.dir + "/encrypt-message.ts");
      expect(await file.exists()).toBe(true);
    });
  });
});
