---
name: bsocial
description: This skill should be used when the user asks to "post to BSocial", "like a post", "unlike", "follow user", "unfollow", "send message", "repost", "friend request", "on-chain social media", "BMAP", "BSocial protocol", "channel message", "create on-chain post", "read BSocial posts", or needs social operations (posts, likes, follows, messages, reposts, friends) on BSV blockchain.
allowed-tools: "Bash(bun:*)"
disable-model-invocation: false
---

# BSocial

Complete on-chain social protocol for BSV blockchain. Posts, likes, follows, messages, reposts, and friend requests using BitcoinSchema.org standards.

## When to Use

- Create social content (posts, replies, reposts)
- Social actions (likes, follows, friend requests)
- Real-time messaging (channels, direct messages)
- Query social data by address or transaction

## Create via CLI Scripts

Build and broadcast social transactions using raw WIF keys and the `@1sat/templates` BSocial class (included in this plugin).

### Post

```bash
bun run skills/bsocial/scripts/create-post.ts <wif> "Post content" [options]

# Options:
#   --channel <name>    Post to a channel
#   --url <url>         Associate with URL
#   --tags <t1,t2>      Comma-separated tags
#   --dry-run           Build tx without broadcasting
```

### Reply

```bash
bun run skills/bsocial/scripts/create-reply.ts <wif> <txid> "Reply content" [--tags <t1,t2>]
```

### Like

```bash
bun run skills/bsocial/scripts/create-like.ts <wif> <txid>
```

### Follow

```bash
bun run skills/bsocial/scripts/create-follow.ts <wif> <bapId>
```

### Repost

```bash
bun run skills/bsocial/scripts/create-repost.ts <wif> <txid> [--context <type> --value <val>]
```

### Message

```bash
bun run skills/bsocial/scripts/create-message.ts <wif> "Message" [options]

# Options:
#   --channel <name>    Send to channel
#   --to <bapId>        Direct message to user
```

### Friend

```bash
bun run skills/bsocial/scripts/create-friend.ts <wif> <bapId>
```

## Read Operations

Query social data from the BMAP API.

### Posts

```bash
bun run skills/bsocial/scripts/read-posts.ts <address> [--limit 20] [--json]
```

### Likes

```bash
bun run skills/bsocial/scripts/read-likes.ts --address <addr>
bun run skills/bsocial/scripts/read-likes.ts --txid <txid>
```

### Follows

```bash
bun run skills/bsocial/scripts/read-follows.ts <address> [--limit 100] [--json]
```

### Messages

```bash
bun run skills/bsocial/scripts/read-messages.ts --channel <name>
bun run skills/bsocial/scripts/read-messages.ts --address <addr>
```

### Friends

```bash
bun run skills/bsocial/scripts/read-friends.ts <address> [--json]
```

## Using @1sat/actions (via 1sat plugin)

For BRC-100 wallet users, `@1sat/actions` provides high-level social actions that handle B:// + MAP + AIP construction and wallet signing automatically. This requires the **1sat plugin** and the `@1sat/actions` package — it is not part of bsv-skills.

See the `1sat:transaction-building` skill for details.

```typescript
import { createSocialPost, createContext } from '@1sat/actions'

const ctx = createContext(wallet)

const result = await createSocialPost.execute(ctx, {
  app: 'my-app',           // MAP attribution — identifies the calling application
  content: 'Hello BSV!',
  contentType: 'text/plain', // or 'text/markdown'
  tags: ['intro', 'bsv'],   // optional
})

// result: { txid, rawtx, error }
```

The action:
- Signs with the wallet's BAP identity key via AIP (using `WalletSigner` from `@1sat/templates`)
- Stores the 0-sat OP_RETURN output in the `bsocial` basket for post history
- Tags outputs with MAP fields (`app:my-app`, `type:post`, `tag:intro`, etc.) for filtered queries

Query post history: `wallet.listOutputs({ basket: 'bsocial' })`

## Protocol Stack

```
[B Protocol] | [MAP Protocol] | [AIP Protocol]
   content       metadata         signature
```

- **B Protocol**: Binary content storage (text, media)
- **MAP Protocol**: Metadata key-value pairs (app, type, context)
- **AIP Protocol**: Author signature for verification

## Context Types

| Context | Use Case |
|---------|----------|
| `tx` | Reply/like a transaction |
| `channel` | Post/message to named channel |
| `bapID` | Target specific identity |
| `provider` | Associate with external URL or provider |
| `videoId` | Reference a video |
| `geohash` | Geolocation context |
| `btcTx` | Reference a BTC transaction |
| `ethTx` | Reference an ETH transaction |

## Dependencies

- `@bsv/sdk` - Transaction building
- `@1sat/templates` - BSocial protocol templates (Signer abstraction, BSocial class)
- `@1sat/actions` - BRC-100 action system (external — requires the 1sat plugin)

## API

Base URL: `https://bmap-api-production.up.railway.app`

### REST Endpoints
| Endpoint | Description |
|----------|-------------|
| `/social/post/bap/{bapId}` | Posts by BAP ID |
| `/social/feed/{bapId}` | Feed for BAP ID |
| `/social/post/{txid}/like` | Likes for a post |
| `/social/bap/{bapId}/like` | Likes by user |
| `/social/friend/{bapId}` | Friends for BAP ID |
| `/social/@/{bapId}/messages` | Messages for user |
| `/social/channels/{channelId}/messages` | Channel messages |

### Query API (fallback)
- Query: `/q/{collection}/{base64Query}`
- SSE: `/s/{collection}/{base64Query}`

### Ingest
- POST `/ingest` with `{ rawTx: tx.toHex() }`

## Friend Encryption

Friend requests use Type42 key derivation with BRC-43 invoice numbers (`2-friend-{sha256(friendBapId)}`) via the BRC-100 wallet.

```typescript
import { Hash, Utils } from "@bsv/sdk";
const { toHex, toArray } = Utils;

const keyID = toHex(Hash.sha256(toArray(friendBapId, "utf8")));

// Get encryption pubkey for friend request
const { publicKey } = await wallet.getPublicKey({
  protocolID: [2, "friend"],
  keyID,
  counterparty: "self",
});

// Encrypt private message for friend
const { ciphertext } = await wallet.encrypt({
  protocolID: [2, "friend"],
  keyID,
  counterparty: friendIdentityKey,
  plaintext: toArray("secret message", "utf8"),
});

// Decrypt message from friend
const { plaintext } = await wallet.decrypt({
  protocolID: [2, "friend"],
  keyID,
  counterparty: friendIdentityKey,
  ciphertext,
});
```

## See Also

- `references/schemas.md` - Full schema reference
- [BitcoinSchema.org](https://bitcoinschema.org) - Protocol specs
