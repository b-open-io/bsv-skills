# Common Template Bugs

Known issues and fixes for script template implementations.

## Parsing Bugs

### Bug: String-Based Script Parsing

**Problem**: Using `toASM().split()` instead of chunk-based parsing.

```typescript
// BAD: Breaks on binary data, inconsistent spacing
static decode(bitcom: BitComDecoded): Protocol[] {
  for (const protocol of bitcom.protocols) {
    const script = Script.fromBinary(protocol.script)
    const parts = script.toASM().split(' ')  // WRONG!
    const field1 = parts[0]
  }
}
```

**Fix**: Always use `script.chunks` directly.

```typescript
// GOOD: Binary-safe, consistent
static decode(bitcom: BitComDecoded): Protocol[] {
  for (const protocol of bitcom.protocols) {
    const script = Script.fromBinary(protocol.script)
    const chunks = script.chunks
    const field1 = Utils.toUTF8(chunks[0].data ?? [])
  }
}
```

**Why it matters**: ASM representation can vary, binary data gets corrupted, and spacing is inconsistent.

---

### Bug: Missing Null Check on Chunk Data

**Problem**: Assuming chunk.data always exists.

```typescript
// BAD: Throws TypeError on OP codes
const field = Utils.toUTF8(chunks[0].data)
```

**Fix**: Provide default empty array.

```typescript
// GOOD: Handles OP codes gracefully
const field = Utils.toUTF8(chunks[0].data ?? [])
```

**Why it matters**: OP codes like OP_RETURN have no data property, causing crashes.

---

### Bug: Wrong Chunk Index

**Problem**: Off-by-one errors in chunk indexing.

```typescript
// BAD: Protocol prefix is often separate from data
const field1 = Utils.toUTF8(chunks[0].data ?? [])  // This might be the prefix!
```

**Fix**: Verify indices against protocol specification.

```typescript
// GOOD: Account for script structure
// BitCom extracts protocol-specific chunks, starting after prefix
const field1 = Utils.toUTF8(chunks[0].data ?? [])  // First data field
const field2 = Utils.toUTF8(chunks[1].data ?? [])  // Second data field
```

**How to verify**: Log chunk contents during development to confirm field positions.

---

## Byte Manipulation Bugs

### Bug: Buffer Usage

**Problem**: Using Node.js Buffer instead of @bsv/sdk Utils.

```typescript
// BAD: Not portable, breaks in browser
const bytes = Buffer.from(string)
const hex = Buffer.from(data).toString('hex')
```

**Fix**: Use Utils from @bsv/sdk.

```typescript
// GOOD: Works everywhere
const bytes = Utils.toArray(string, 'utf8')
const hex = Utils.toHex(data)
```

**Conversion table**:
| Buffer | Utils |
|--------|-------|
| `Buffer.from(str)` | `Utils.toArray(str, 'utf8')` |
| `Buffer.from(hex, 'hex')` | `Utils.toArray(hex, 'hex')` |
| `buf.toString()` | `Utils.toUTF8(arr)` |
| `buf.toString('hex')` | `Utils.toHex(arr)` |
| `buf.toString('base64')` | `Utils.toBase64(arr)` |

---

### Bug: TextEncoder/TextDecoder Usage

**Problem**: Using Web APIs directly.

```typescript
// BAD: Inconsistent with rest of codebase
const bytes = new TextEncoder().encode(str)
const str = new TextDecoder().decode(bytes)
```

**Fix**: Use Utils consistently.

```typescript
// GOOD: Consistent API
const bytes = Utils.toArray(str, 'utf8')
const str = Utils.toUTF8(bytes)
```

---

## Signature Bugs

### Bug: Single Recovery Factor

**Problem**: Only trying recovery factor 0.

```typescript
// BAD: Fails for most signatures
verify(): boolean {
  const publicKey = sig.RecoverPublicKey(0, hash)
  return publicKey.toAddress().toString() === this.data.address
}
```

**Fix**: Try all 4 recovery factors.

```typescript
// GOOD: Handles all valid signatures
verify(): boolean {
  for (let recovery = 0; recovery < 4; recovery++) {
    try {
      const publicKey = sig.RecoverPublicKey(recovery, hash)
      if (BSM.verify(message, sig, publicKey) &&
          publicKey.toAddress().toString() === this.data.address) {
        return true
      }
    } catch { continue }
  }
  return false
}
```

**Why it matters**: ECDSA signatures have 4 possible recovery factors. Only one is correct.

---

### Bug: Missing BSM.magicHash

**Problem**: Hashing raw message instead of Bitcoin-signed format.

```typescript
// BAD: Wrong hash for BSM verification
const hash = new BigNumber(SHA256.hash(Utils.toArray(message, 'utf8')))
```

**Fix**: Use BSM.magicHash for proper message prefix.

```typescript
// GOOD: Matches Bitcoin Signed Message format
const hash = new BigNumber(BSM.magicHash(message))
```

**Why it matters**: BSM adds "Bitcoin Signed Message:\n" prefix before hashing.

---

### Bug: Signature Decode Error

**Problem**: Using wrong format for signature decoding.

```typescript
// BAD: Compact format requires specific handling
const sig = Signature.fromDER(sigBytes)
```

**Fix**: Use fromCompact for BSM signatures.

```typescript
// GOOD: Correct format for Bitcoin Signed Messages
const sig = Signature.fromCompact(
  Utils.toArray(this.data.signature, 'base64'),
  'base64'
)
```

---

## BitCom Integration Bugs

### Bug: Missing Protocol Position

**Problem**: Not setting `pos` in protocol array.

```typescript
// BAD: BitCom may order incorrectly
const protocols = [{
  protocol: PREFIX,
  script: script.toBinary()
  // pos missing!
}]
```

**Fix**: Always set protocol position.

```typescript
// GOOD: Explicit ordering
const protocols = [{
  protocol: PREFIX,
  script: script.toBinary(),
  pos: 0
}]
```

---

### Bug: Forgetting bitcomIndex

**Problem**: Not preserving protocol position from decode.

```typescript
// BAD: Loses ordering information
static decode(bitcom: BitComDecoded): Protocol[] {
  return bitcom.protocols
    .filter(p => p.protocol === PREFIX)
    .map(p => new Protocol({ field1: '...' }))
}
```

**Fix**: Always include bitcomIndex from protocol.pos.

```typescript
// GOOD: Preserves ordering
static decode(bitcom: BitComDecoded): Protocol[] {
  return bitcom.protocols
    .filter(p => p.protocol === PREFIX)
    .map(p => new Protocol({
      field1: '...',
      bitcomIndex: p.pos  // Preserve position!
    }))
}
```

---

## Error Handling Bugs

### Bug: Throwing in decode()

**Problem**: Exceptions crash entire parsing.

```typescript
// BAD: One bad protocol kills all parsing
static decode(bitcom: BitComDecoded): Protocol[] {
  return bitcom.protocols
    .filter(p => p.protocol === PREFIX)
    .map(p => {
      const script = Script.fromBinary(p.script)  // Can throw!
      return new Protocol({ ... })
    })
}
```

**Fix**: Wrap in try/catch, skip bad protocols.

```typescript
// GOOD: Resilient to malformed data
static decode(bitcom: BitComDecoded): Protocol[] {
  const results: Protocol[] = []
  for (const protocol of bitcom.protocols) {
    if (protocol.protocol !== PREFIX) continue
    try {
      const script = Script.fromBinary(protocol.script)
      results.push(new Protocol({ ... }))
    } catch {
      continue  // Skip unparseable, don't crash
    }
  }
  return results
}
```

---

### Bug: Throwing in verify()

**Problem**: Exceptions instead of returning false.

```typescript
// BAD: Caller must handle exceptions
verify(): boolean {
  const sig = Signature.fromCompact(this.data.signature)  // Can throw!
  return BSM.verify(message, sig, publicKey)
}
```

**Fix**: Return false on any error.

```typescript
// GOOD: Always returns boolean
verify(): boolean {
  try {
    const sig = Signature.fromCompact(this.data.signature)
    // ... verification logic
    return true
  } catch {
    return false  // Invalid = false, not exception
  }
}
```

---

## Export Bugs

### Bug: Missing mod.ts Entry

**Problem**: Template not exported from package.

```typescript
// mod.ts - template missing!
export { default as AIP } from './src/template/bitcom/AIP.js'
// Protocol not exported...
```

**Fix**: Add all required exports.

```typescript
// mod.ts - complete exports
export { default as Protocol, PREFIX as PROTOCOL_PREFIX } from './src/template/...'
export type { ProtocolData, ProtocolOptions } from './src/template/...'
```

---

### Bug: Circular Import

**Problem**: Template imports from mod.ts.

```typescript
// BAD: Creates circular dependency
import { BitCom } from '../../mod.js'
```

**Fix**: Use relative imports within src/.

```typescript
// GOOD: Direct import
import BitCom from './BitCom.js'
```

---

## Type Bugs

### Bug: Using `any`

**Problem**: Losing type safety.

```typescript
// BAD: No type checking
export interface ProtocolData {
  metadata: any  // What is this?
}
```

**Fix**: Define proper types.

```typescript
// GOOD: Type-safe
export interface ProtocolData {
  metadata: Record<string, string>
}
```

---

### Bug: Missing Optional Markers

**Problem**: Required fields that should be optional.

```typescript
// BAD: All instances must have signature
export interface ProtocolData {
  signature: string  // Not always present!
}
```

**Fix**: Mark truly optional fields.

```typescript
// GOOD: Signature only present when signed
export interface ProtocolData {
  signature?: string
  valid?: boolean
}
```
