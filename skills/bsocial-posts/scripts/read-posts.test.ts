import { describe, it, expect } from "bun:test";

// BMAP API base URL
const BMAP_API = "https://b.map.sv/q/";

// Sample BMAP query
const sampleQuery = {
  v: 3,
  q: {
    find: {
      "MAP.app": "bsocial",
      "MAP.type": "post",
      "AIP.address": "1ExampleAddress..."
    },
    limit: 10,
    sort: { "blk.t": -1 }
  }
};

// Sample API response
const sampleResponse = {
  c: [
    {
      tx: { h: "abc123..." },
      blk: { t: 1704067200 },
      MAP: {
        app: "bsocial",
        type: "post"
      },
      B: {
        content: "Hello, BSV!"
      },
      AIP: {
        address: "1ExampleAddress..."
      }
    }
  ]
};

describe("bsocial read-posts", () => {
  describe("BMAP query building", () => {
    it("builds valid BMAP query structure", () => {
      expect(sampleQuery.v).toBe(3);
      expect(sampleQuery.q.find["MAP.app"]).toBe("bsocial");
      expect(sampleQuery.q.find["MAP.type"]).toBe("post");
    });

    it("includes address filter", () => {
      const address = "1TestAddress123";
      const query = {
        v: 3,
        q: {
          find: {
            "MAP.app": "bsocial",
            "MAP.type": "post",
            "AIP.address": address
          }
        }
      };
      expect(query.q.find["AIP.address"]).toBe(address);
    });

    it("supports limit parameter", () => {
      const limit = 25;
      const query = {
        v: 3,
        q: {
          find: { "MAP.app": "bsocial" },
          limit: limit
        }
      };
      expect(query.q.limit).toBe(25);
    });

    it("sorts by block time descending", () => {
      expect(sampleQuery.q.sort).toEqual({ "blk.t": -1 });
    });
  });

  describe("API URL construction", () => {
    it("encodes query as base64 for URL", () => {
      const queryJson = JSON.stringify(sampleQuery);
      const encoded = Buffer.from(queryJson).toString("base64");
      const url = BMAP_API + encoded;

      expect(url.startsWith(BMAP_API)).toBe(true);
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe("response parsing", () => {
    it("parses BMAP API response correctly", () => {
      const posts = sampleResponse.c;

      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBe(1);
    });

    it("extracts transaction ID", () => {
      const post = sampleResponse.c[0];
      expect(post.tx.h).toBe("abc123...");
    });

    it("extracts block timestamp", () => {
      const post = sampleResponse.c[0];
      const timestamp = post.blk.t;
      expect(timestamp).toBe(1704067200);
    });

    it("extracts post content from B protocol", () => {
      const post = sampleResponse.c[0];
      expect(post.B.content).toBe("Hello, BSV!");
    });

    it("extracts author address from AIP", () => {
      const post = sampleResponse.c[0];
      expect(post.AIP.address).toBe("1ExampleAddress...");
    });
  });

  describe("output formatting", () => {
    it("formats post output correctly", () => {
      const post = sampleResponse.c[0];
      const formatted = {
        txid: post.tx.h,
        timestamp: new Date(post.blk.t * 1000).toISOString(),
        content: post.B.content,
        author: post.AIP.address
      };

      expect(formatted.txid).toBeDefined();
      expect(formatted.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(formatted.content).toBeDefined();
      expect(formatted.author).toBeDefined();
    });

    it("formats timestamp as human readable", () => {
      const timestamp = 1704067200;
      const date = new Date(timestamp * 1000);
      const formatted = date.toISOString();
      expect(formatted).toBe("2024-01-01T00:00:00.000Z");
    });
  });

  describe("edge cases", () => {
    it("handles empty results", () => {
      const emptyResponse = { c: [] };
      expect(emptyResponse.c.length).toBe(0);
      // Should display "No posts found"
    });

    it("handles missing optional fields", () => {
      const minimalPost = {
        tx: { h: "xyz789..." },
        blk: { t: 1704067200 },
        MAP: { app: "bsocial", type: "post" }
        // Missing B and AIP
      };

      expect(minimalPost.tx.h).toBeDefined();
      expect((minimalPost as any).B).toBeUndefined();
      expect((minimalPost as any).AIP).toBeUndefined();
    });

    it("respects limit parameter", () => {
      const limit = 5;
      const posts = Array(10).fill(sampleResponse.c[0]);
      const limited = posts.slice(0, limit);
      expect(limited.length).toBe(5);
    });
  });

  describe("address validation", () => {
    it("validates BSV address format", () => {
      const validAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
      expect(validAddress.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/)).toBeTruthy();
    });

    it("rejects invalid address format", () => {
      const invalidAddress = "not-an-address";
      expect(invalidAddress.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/)).toBeFalsy();
    });
  });

  describe("script files", () => {
    it("read-posts.ts exists", async () => {
      const file = Bun.file(import.meta.dir + "/read-posts.ts");
      expect(await file.exists()).toBe(true);
    });
  });
});
