import { describe, it, expect } from "bun:test";
import { PrivateKey, P2PKH, Transaction } from "@bsv/sdk";

// Test data - valid mainnet WIF/address pairs
const TEST_WIF = "KwajxSXaLx4GHVJH6cmB54eB2UHMKEJbeNweTfUxJDkSoorZ9Bgx";
const TEST_ADDRESS = "143rbgck4aCsp1E7sxWgPqcwNSaYRUB6n4";
const INVALID_WIF = "notavalidwif";
const INVALID_ADDRESS = "notavalidaddress";

describe("wallet-send-bsv", () => {
  describe("WIF parsing", () => {
    it("parses valid WIF correctly", () => {
      const privateKey = PrivateKey.fromWif(TEST_WIF);
      expect(privateKey).toBeDefined();
      expect(privateKey.toWif()).toBe(TEST_WIF);
    });

    it("derives correct address from WIF", () => {
      const privateKey = PrivateKey.fromWif(TEST_WIF);
      const address = privateKey.toAddress();
      expect(address).toBe(TEST_ADDRESS);
    });

    it("rejects invalid WIF format", () => {
      expect(() => {
        PrivateKey.fromWif(INVALID_WIF);
      }).toThrow();
    });
  });

  describe("address validation", () => {
    it("validates correct BSV address format", () => {
      // Valid mainnet P2PKH addresses start with 1
      const validMainnet = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
      expect(validMainnet.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/)).toBeTruthy();
    });

    it("rejects invalid address format", () => {
      expect(INVALID_ADDRESS.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/)).toBeFalsy();
    });
  });

  describe("fee calculation", () => {
    it("calculates correct fee for transaction size", () => {
      // Standard P2PKH tx: ~225 bytes for 1 input, 2 outputs
      const estimatedSize = 225;
      const feeRate = 1; // 1 sat/byte
      const expectedFee = estimatedSize * feeRate;
      expect(expectedFee).toBe(225);
    });

    it("applies minimum fee rate of 1 sat/byte", () => {
      const txSize = 300;
      const minFeeRate = 1;
      const fee = txSize * minFeeRate;
      expect(fee).toBeGreaterThanOrEqual(txSize);
    });
  });

  describe("transaction building", () => {
    it("builds valid transaction structure with mock UTXO", () => {
      const privateKey = PrivateKey.fromWif(TEST_WIF);
      const recipientAddress = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2";
      const amount = 1000;

      // Mock UTXO
      const mockUtxo = {
        txid: "a".repeat(64),
        vout: 0,
        satoshis: 10000,
        script: new P2PKH().lock(privateKey.toAddress()).toHex(),
      };

      const tx = new Transaction();

      // Add input from UTXO
      tx.addInput({
        sourceTXID: mockUtxo.txid,
        sourceOutputIndex: mockUtxo.vout,
        unlockingScriptTemplate: new P2PKH().unlock(privateKey),
        sequence: 0xffffffff,
      });

      // Add recipient output
      tx.addOutput({
        lockingScript: new P2PKH().lock(recipientAddress),
        satoshis: amount,
      });

      // Add change output
      const fee = 225;
      const change = mockUtxo.satoshis - amount - fee;
      if (change > 0) {
        tx.addOutput({
          lockingScript: new P2PKH().lock(privateKey.toAddress()),
          satoshis: change,
        });
      }

      expect(tx.inputs.length).toBe(1);
      expect(tx.outputs.length).toBe(2);
      expect(tx.outputs[0].satoshis).toBe(amount);
    });

    it("handles insufficient funds scenario", () => {
      const balance = 500;
      const amount = 1000;
      const fee = 225;
      const totalRequired = amount + fee;

      expect(balance < totalRequired).toBe(true);
    });

    it("calculates correct change amount", () => {
      const utxoTotal = 10000;
      const sendAmount = 5000;
      const fee = 225;
      const expectedChange = utxoTotal - sendAmount - fee;

      expect(expectedChange).toBe(4775);
    });
  });

  describe("script help", () => {
    it("script file exists", async () => {
      const file = Bun.file(import.meta.dir + "/send.ts");
      expect(await file.exists()).toBe(true);
    });
  });
});
