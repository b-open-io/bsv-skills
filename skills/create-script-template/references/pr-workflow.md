# Pull Request Workflow for ts-templates

Complete guide for contributing a new template to b-open-io/ts-templates.

## Prerequisites

- Fork of b-open-io/ts-templates
- Local clone with remotes configured
- @bsv/sdk installed (`npm install`)

## Step 1: Create Feature Branch

```bash
cd ts-templates  # Your local clone
git checkout master
git pull origin master
git checkout -b feature/protocol-name-template
```

Branch naming convention: `feature/<protocol>-template`

## Step 2: Create Template File

Location: `src/template/bitcom/ProtocolName.ts`

Follow the template structure in `template-anatomy.md`.

## Step 3: Export from mod.ts

Add exports to `mod.ts`:

```typescript
// Add with other bitcom exports
export { default as ProtocolName, PROTOCOL_PREFIX } from './src/template/bitcom/ProtocolName.js'

// Add type exports at bottom
export type { ProtocolData, ProtocolOptions } from './src/template/bitcom/ProtocolName.js'
```

## Step 4: Build and Verify

```bash
npm run build
```

Verify:
- No TypeScript errors
- Outputs generated in `dist/`
- Types generated correctly

## Step 5: Run Tests (if applicable)

```bash
npm test
```

Add tests for new template in `__tests__/` directory if test infrastructure exists.

## Step 6: Commit Changes

```bash
git add src/template/bitcom/ProtocolName.ts mod.ts
git commit -m "$(cat <<'EOF'
Add ProtocolName template

- Implement ScriptTemplate for ProtocolName protocol
- Add decode() for parsing from BitCom transactions
- Add lock() for generating locking scripts
- Export from mod.ts
EOF
)"
```

## Step 7: Push and Create PR

```bash
git push -u origin feature/protocol-name-template
```

Create PR via GitHub CLI or web interface:

```bash
gh pr create --title "Add ProtocolName template" --body "$(cat <<'EOF'
## Summary

Adds ScriptTemplate implementation for ProtocolName protocol.

## Changes

- `src/template/bitcom/ProtocolName.ts` - Template implementation
- `mod.ts` - Export new template

## Protocol Specification

[Link to protocol documentation]

## Testing

- [ ] Build passes
- [ ] Manual testing with example transactions
EOF
)"
```

## PR Checklist

Before submitting:
- [ ] Template file in correct location
- [ ] Implements ScriptTemplate interface
- [ ] Uses chunk-based parsing (not toASM().split())
- [ ] Uses @bsv/sdk Utils (not Buffer)
- [ ] Proper error handling in decode()
- [ ] Added to mod.ts exports
- [ ] Build passes without errors
- [ ] Commit message is descriptive

## After Merge

Update local master:
```bash
git checkout master
git pull origin master
git branch -d feature/protocol-name-template
```

## Repository Information

| Field | Value |
|-------|-------|
| Repository | b-open-io/ts-templates |
| Main branch | master |
| Package name | @bopen-io/templates |
| License | SEE LICENSE IN LICENSE.txt |
