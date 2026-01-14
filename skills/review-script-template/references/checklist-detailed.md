# Detailed Review Checklist

Extended validation criteria for script template reviews.

## File Structure

### Location and Naming

- [ ] Template file in `src/template/` under appropriate subdirectory
  - `bitcom/` - OP_RETURN BitCom protocols
  - `opreturn/` - Simple OP_RETURN templates
  - `p2pkh/` - Pay-to-public-key-hash variants
- [ ] Filename matches class name with PascalCase
- [ ] File extension is `.ts`

### Exports

- [ ] `PREFIX` - Protocol identifier constant (string)
- [ ] `<Name>Data` - Interface for protocol fields
- [ ] `<Name>Options` - Optional constructor options interface
- [ ] Default export - Template class
- [ ] All types exported properly for consumers

## Interface Validation

### Data Interface

```typescript
export interface ProtocolData {
  // Required fields
  bitcomIndex?: number   // Position in BitCom protocol array
  valid?: boolean        // Signature verification status

  // Protocol-specific fields...
}
```

Verify:
- [ ] `bitcomIndex` field present (optional number)
- [ ] `valid` field present for protocols with signatures
- [ ] All protocol fields have appropriate types
- [ ] Optional fields marked with `?`
- [ ] No `any` types used

### Class Structure

```typescript
export default class Protocol implements ScriptTemplate {
  public readonly data: ProtocolData

  constructor(data: ProtocolData) {
    this.data = data
  }
}
```

Verify:
- [ ] Implements `ScriptTemplate` interface
- [ ] `data` property is `public readonly`
- [ ] Constructor accepts Data interface
- [ ] No mutable state outside `data`

## Method Validation

### decode() Method

Static method to parse protocols from BitComDecoded.

```typescript
static decode(bitcom: BitComDecoded): Protocol[] {
  const results: Protocol[] = []
  for (const protocol of bitcom.protocols) {
    if (protocol.protocol !== PREFIX) continue
    try {
      const script = Script.fromBinary(protocol.script)
      const chunks = script.chunks
      // Parse fields...
      results.push(new Protocol({ ...fields, bitcomIndex: protocol.pos }))
    } catch {
      continue // Skip unparseable protocols
    }
  }
  return results
}
```

Verify:
- [ ] Returns array of instances (can be empty)
- [ ] Filters by PREFIX before parsing
- [ ] Uses try/catch to handle parse errors
- [ ] Sets `bitcomIndex` from `protocol.pos`
- [ ] Uses `script.chunks` not string splitting
- [ ] Null-checks chunk data: `chunks[i].data ?? []`

### lock() Method

Generate locking script for the protocol.

```typescript
lock(): LockingScript {
  const script = new Script()
  script.writeBin(Utils.toArray(this.data.field1, 'utf8'))
  // ...
  const protocols: Protocol[] = [{
    protocol: PREFIX,
    script: script.toBinary(),
    pos: 0
  }]
  return new BitCom(protocols).lock()
}
```

Verify:
- [ ] Returns `LockingScript`
- [ ] Uses `Utils.toArray()` for string encoding
- [ ] Uses `BitCom` class for OP_RETURN protocols
- [ ] Protocol array has correct structure
- [ ] Sets `pos` appropriately

### unlock() Method

```typescript
unlock(): { sign: Function; estimateLength: Function } {
  throw new Error('OP_RETURN outputs cannot be unlocked')
}
```

Verify:
- [ ] Throws for OP_RETURN protocols (cannot be spent)
- [ ] Returns proper unlock object for spendable outputs
- [ ] `estimateLength` returns accurate byte count

### verify() Method

For protocols with signatures:

```typescript
verify(): boolean {
  if (!this.data.signature || !this.data.address) return false

  const sig = Signature.fromCompact(
    Utils.toArray(this.data.signature, 'base64'),
    'base64'
  )
  const message = this.buildMessage()

  for (let recovery = 0; recovery < 4; recovery++) {
    try {
      const publicKey = sig.RecoverPublicKey(
        recovery,
        new BigNumber(BSM.magicHash(message))
      )
      if (BSM.verify(message, sig, publicKey) &&
          publicKey.toAddress().toString() === this.data.address) {
        return true
      }
    } catch { continue }
  }
  return false
}
```

Verify:
- [ ] Returns `boolean`
- [ ] Tries all 4 recovery factors
- [ ] Uses `Signature.fromCompact()` correctly
- [ ] Verifies address matches recovered public key
- [ ] Uses `BSM.magicHash()` for message hashing
- [ ] Handles missing signature/address gracefully

### sign() Method (if applicable)

Static factory for creating signed instances:

```typescript
static async sign(params: SignParams, signer: Function): Promise<Protocol> {
  const message = buildSigningMessage(params)
  const { signature, address } = await signer(message)
  return new Protocol({
    ...params,
    signature,
    address,
    valid: true
  })
}
```

Verify:
- [ ] Returns `Promise<Protocol>`
- [ ] Builds consistent signing message
- [ ] Accepts signer function (not private key)
- [ ] Sets `valid: true` on signed instances

## Import Validation

### Required Imports

```typescript
import {
  ScriptTemplate,
  LockingScript,
  UnlockingScript,
  Script,
  Utils
} from '@bsv/sdk'
```

Verify:
- [ ] `ScriptTemplate` interface imported
- [ ] `Script` class for parsing
- [ ] `Utils` for byte manipulation
- [ ] No `Buffer` imports
- [ ] No Node.js built-in imports

### BitCom Imports

```typescript
import BitCom, { Protocol, BitComDecoded } from './BitCom.js'
```

Verify:
- [ ] Relative import with `.js` extension
- [ ] `BitComDecoded` type for decode() parameter
- [ ] `Protocol` type for building protocol array

## mod.ts Integration

```typescript
// Class and constants
export { default as Protocol, PREFIX as PROTOCOL_PREFIX } from './src/template/...'

// Types
export type { ProtocolData, ProtocolOptions } from './src/template/...'
```

Verify:
- [ ] Default export re-exported with name
- [ ] PREFIX renamed to avoid conflicts (PROTOCOL_PREFIX)
- [ ] Types exported with `type` keyword
- [ ] Path correct with `.js` extension
- [ ] No circular dependencies

## Protocol-Specific Checks

### Signature Protocols (AIP, SIGMA)

- [ ] Uses BSM for signing/verification
- [ ] Signature stored as base64 string
- [ ] Address stored as string
- [ ] Indices array for signed field positions
- [ ] Recovery factor handling

### Metadata Protocols (MAP)

- [ ] Key-value pairs parsed correctly
- [ ] SET/DELETE commands handled
- [ ] App/Type fields validated
- [ ] Arbitrary keys supported

### File Protocols (B)

- [ ] Media type field present
- [ ] Encoding field supported
- [ ] Filename optional
- [ ] Data as bytes or string

## Testing Considerations

While tests may not be required in the skill, note:

- [ ] Template should be testable in isolation
- [ ] decode() should handle malformed input
- [ ] verify() should return false (not throw) on invalid signatures
- [ ] lock() should produce valid OP_RETURN scripts
