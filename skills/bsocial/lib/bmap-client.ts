/**
 * BMAP API client for querying BSocial data
 */

const BMAP_API_BASE = "https://b.map.sv/q/";

export interface BmapPost {
  tx: { h: string };
  blk?: { t: number; i: number };
  MAP: Array<{ app: string; type: string; [key: string]: string }>;
  B?: Array<{ content: string; "content-type": string; encoding: string }>;
  AIP?: Array<{ address: string; signature: string }>;
}

export interface BmapQuery {
  v: number;
  q: {
    find: Record<string, unknown>;
    sort?: Record<string, number>;
    limit?: number;
    skip?: number;
  };
}

function encodeQuery(query: BmapQuery): string {
  const json = JSON.stringify(query);
  return btoa(json);
}

export async function queryBmap(query: BmapQuery): Promise<BmapPost[]> {
  const encoded = encodeQuery(query);
  const response = await fetch(`${BMAP_API_BASE}${encoded}`);

  if (!response.ok) {
    throw new Error(`BMAP API error: ${response.status}`);
  }

  const data = await response.json();
  return data.c || data.u || [];
}

export function buildPostsQuery(address: string, limit = 20): BmapQuery {
  return {
    v: 3,
    q: {
      find: {
        "MAP.app": "bsocial",
        "MAP.type": "post",
        "AIP.address": address,
      },
      sort: { "blk.t": -1 },
      limit,
    },
  };
}

export function buildLikesQuery(options: { address?: string; txid?: string }, limit = 20): BmapQuery {
  const find: Record<string, unknown> = {
    "MAP.app": "bsocial",
    "MAP.type": "like",
  };

  if (options.address) {
    find["AIP.address"] = options.address;
  }
  if (options.txid) {
    find["MAP.tx"] = options.txid;
  }

  return {
    v: 3,
    q: {
      find,
      sort: { "blk.t": -1 },
      limit,
    },
  };
}

export function buildFollowsQuery(address: string, limit = 100): BmapQuery {
  return {
    v: 3,
    q: {
      find: {
        "MAP.app": "bsocial",
        "MAP.type": "follow",
        "AIP.address": address,
      },
      sort: { "blk.t": -1 },
      limit,
    },
  };
}

export function buildMessagesQuery(options: { channel?: string; address?: string }, limit = 50): BmapQuery {
  const find: Record<string, unknown> = {
    "MAP.app": "bsocial",
    "MAP.type": "message",
  };

  if (options.channel) {
    find["MAP.context"] = "channel";
    find["MAP.contextValue"] = options.channel;
  }
  if (options.address) {
    find["AIP.address"] = options.address;
  }

  return {
    v: 3,
    q: {
      find,
      sort: { "blk.t": -1 },
      limit,
    },
  };
}

export function buildFriendsQuery(address: string, limit = 100): BmapQuery {
  return {
    v: 3,
    q: {
      find: {
        "MAP.app": "bsocial",
        "MAP.type": "friend",
        "AIP.address": address,
      },
      sort: { "blk.t": -1 },
      limit,
    },
  };
}
