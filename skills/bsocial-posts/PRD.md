# PRD: bsocial-posts

## Objective
Implement BSocial protocol post creation and reading.

## Dependencies (USE THESE)
- **@bsv/sdk** - Transaction building: `Transaction`, `P2PKH`, `Script`
  - Docs: https://github.com/bsv-blockchain/ts-sdk
- **Bitcoin Schema** - Protocol definitions
  - Docs: https://bitcoinschema.org
- **BMAP API** - Reading posts: `https://b.map.sv/q/{query}`

## Protocol Reference
BSocial uses OP_RETURN with these fields:
- MAP prefix: `1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5`
- `app`: "bsocial"
- `type`: "post"
- Content and metadata fields

## NOT in scope
- 1Sat Ordinals (different plugin)
- Media attachments
- Reply threading (basic posts only)

## Completion Promise
Output `<promise>DONE</promise>` ONLY when ALL of these are TRUE:

1. `bun test skills/bsocial-posts/scripts/*.test.ts` - ALL tests pass
2. `bun run skills/bsocial-posts/scripts/create-post.ts --help` - Exits 0
3. `bun run skills/bsocial-posts/scripts/read-posts.ts --help` - Exits 0
4. create-post builds valid OP_RETURN script
5. SKILL.md accurately describes the implementation

DO NOT output the promise if tests fail. DO NOT lie.

## Process Steps (MANDATORY)

### Step 1: Read existing code
```bash
cat skills/bsocial-posts/scripts/create-post.ts
cat skills/bsocial-posts/scripts/read-posts.ts
cat skills/bsocial-posts/scripts/*.test.ts
```

### Step 2: Run tests
```bash
bun test skills/bsocial-posts/scripts/*.test.ts
```

### Step 3: Implement/fix
- Fix any failing tests
- Ensure --help works
- Ensure OP_RETURN format is correct

### Step 4: Verify ALL criteria
```bash
bun test skills/bsocial-posts/scripts/*.test.ts
bun run skills/bsocial-posts/scripts/create-post.ts --help
bun run skills/bsocial-posts/scripts/read-posts.ts --help
```

### Step 5: Update progress.txt

### Step 6: Check completion
If ALL Step 4 succeeds, output `<promise>DONE</promise>`.

## Functional Requirements

### create-post.ts
1. Accept: `<wif> <content> [--tags tag1,tag2]`
2. Build MAP data array:
   - SET app=bsocial
   - SET type=post
   - Content field
3. Optional: Add tags as MAP metadata
4. Build OP_RETURN script
5. Create tx with OP_RETURN output (0 sats) + change
6. Sign and broadcast
7. Output txid

### read-posts.ts
1. Accept: `<address> [--limit N]`
2. Build BMAP query:
   ```json
   {
     "v": 3,
     "q": {
       "find": { "MAP.app": "bsocial", "MAP.type": "post" },
       "limit": 10
     }
   }
   ```
3. Query BMAP API
4. Parse and display posts

## Error Handling
- Empty content → reject
- Invalid WIF → clear error
- Network errors → show error
- No posts found → show message

## File Structure
```
skills/bsocial-posts/
├── SKILL.md
├── PRD.md
├── progress.txt
└── scripts/
    ├── create-post.ts
    ├── read-posts.ts
    ├── create-post.test.ts
    └── read-posts.test.ts
```

## Do NOT
- Broadcast during tests (mock)
- Skip OP_RETURN validation
- Output DONE if tests fail
