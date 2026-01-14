---
name: bsocial-posts
description: This skill should be used when the user asks to "post to BSocial", "create on-chain social post", "read BSocial posts", "on-chain social media", "BMAP post", or needs to create and read posts using BSocial protocol on BSV.
allowed-tools: "Bash(bun:*)"
---

# BSocial Posts

Create and read on-chain social media posts using BSocial protocol.

## When to Use

- Post messages to BSV blockchain
- Read on-chain social posts
- Create permanent, censorship-resistant content
- Build social media applications

## Features

**Create Posts**:
- Text content posted on-chain
- Permanent and immutable
- Associated with BSV address/identity
- Uses BMAP protocol structure

**Read Posts**:
- Query posts by address
- Filter by type/app
- Read post history

## Usage

```bash
# Create post (requires funding)
bun run /path/to/skills/bsocial-posts/scripts/create-post.ts <wif> "Post content here"

# Read posts from address
bun run /path/to/skills/bsocial-posts/scripts/read-posts.ts <address>
```

## Protocol

Uses BMAP (Bitcoin Mapping Protocol):
- OP_RETURN data with BMAP prefix
- Structured JSON payload
- Post content, timestamps, metadata
- Indexable by BMAP API services

## Requirements

- Funded wallet for creating posts (on-chain storage cost)
- BMAP API access for reading posts
- `bmap-api-types` package for type definitions
