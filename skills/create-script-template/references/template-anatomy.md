# Script Template Anatomy

Structure of a `@bsv/sdk` ScriptTemplate implementation for ts-templates.

## File Location

```
src/template/bitcom/ProtocolName.ts    # BitCom protocols
src/template/opreturn/ProtocolName.ts  # Simple OP_RETURN
src/template/custom/ProtocolName.ts    # Custom scripts
```

## Required Imports

```typescript
import {
  ScriptTemplate,    // Interface to implement
  LockingScript,     // Return type for lock()
  UnlockingScript,   // Return type for unlock()
  Script,            // Script building/parsing
  Utils,             // Byte manipulation
  Transaction        // For unlock() signature
} from '@bsv/sdk'
```

Additional imports as needed:
- `OP` - Opcode constants
- `PrivateKey`, `PublicKey` - Key operations
- `BSM`, `Signature`, `BigNumber` - BSM signing (if needed)
- `SignedMessage` - BRC-77 signing (if needed)
- `BitCom, BitComDecoded` - BitCom protocol support

## Protocol Identifier

```typescript
export const PROTOCOL_PREFIX = 'identifier'
```

Common formats:
- Bitcoin address: `15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva` (AIP)
- Literal string: `SIGMA`, `MAP`, `B`
- Hex string: Protocol-specific

## Data Interface

```typescript
export interface ProtocolData {
  bitcomIndex?: number    // Position in BitCom array (optional)
  // Protocol-specific fields...
  valid?: boolean         // Verification result (for signed protocols)
}
```

## Options Interface (Optional)

```typescript
export interface ProtocolOptions {
  // Parameters for sign() or lock() methods
}
```

## Class Structure

```typescript
export default class ProtocolName implements ScriptTemplate {
  public readonly data: ProtocolData

  constructor(data: ProtocolData) {
    this.data = data
  }

  // Required: lock()
  // Required: unlock()
  // Optional: static decode()
  // Optional: static sign()
  // Optional: verify()
}
```

## Required Methods

### lock()

Generate locking script from data:

```typescript
lock(): LockingScript {
  const script = new Script()
  script.writeBin(Utils.toArray(this.data.field, 'utf8'))
  // ... add more fields
  return new LockingScript(script.chunks)
}
```

For BitCom protocols, wrap with BitCom:

```typescript
lock(): LockingScript {
  const script = new Script()
  // ... build protocol data

  const protocols = [{
    protocol: PROTOCOL_PREFIX,
    script: script.toBinary(),
    pos: 0
  }]

  return new BitCom(protocols).lock()
}
```

### unlock()

For OP_RETURN protocols (unspendable):

```typescript
unlock(): {
  sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>
  estimateLength: () => Promise<number>
} {
  throw new Error('OP_RETURN scripts cannot be unlocked')
}
```

For spendable scripts, implement actual unlocking logic.

## Optional Methods

### static decode()

Parse protocol from BitCom transaction:

```typescript
static decode(bitcom: BitComDecoded): ProtocolName[] {
  const results: ProtocolName[] = []

  if (!bitcom?.protocols?.length) return results

  for (const protocol of bitcom.protocols) {
    if (protocol.protocol !== PROTOCOL_PREFIX) continue

    try {
      const script = Script.fromBinary(protocol.script)
      const chunks = script.chunks

      // Extract fields from chunks
      const instance = new ProtocolName({
        field: Utils.toUTF8(chunks[0].data ?? []),
        // ...
      })

      results.push(instance)
    } catch {
      continue  // Skip invalid
    }
  }

  return results
}
```

### static decodeFromScript()

Convenience wrapper:

```typescript
static decodeFromScript(script: Script | LockingScript): ProtocolName[] {
  const bitcom = BitCom.decode(script)
  return bitcom ? ProtocolName.decode(bitcom) : []
}
```

### static sign() (for signed protocols)

Create signed instance. Implementation depends on signing method:
- BSM signing - Use `BSM.sign()` with recovery factor
- BRC-77 signing - Use `SignedMessage.sign()`
- External signing - Use `sigma-protocol` or similar

See ts-templates repo for specific implementations.

### verify() (for signed protocols)

Check verification result:

```typescript
verify(): boolean {
  return this.data.valid === true
}
```

Actual verification logic varies by protocol.

## Key Patterns

### Chunk-Based Parsing

Always use `script.chunks`, never string splitting:

```typescript
const script = Script.fromBinary(protocol.script)
const chunks = script.chunks

const stringField = Utils.toUTF8(chunks[0].data ?? [])
const bytesField = Array.from(chunks[1].data ?? [])
const numberField = parseInt(Utils.toUTF8(chunks[2].data ?? []), 10)
```

### Utils for Byte Manipulation

Use `@bsv/sdk` Utils, never Node.js Buffer:

```typescript
Utils.toArray(string, 'utf8')   // String → bytes
Utils.toUTF8(bytes)             // Bytes → string
Utils.toHex(bytes)              // Bytes → hex
Utils.toBase64(bytes)           // Bytes → base64
Utils.toArray(hex, 'hex')       // Hex → bytes
```

### Error Handling in decode()

Wrap parsing in try/catch, skip invalid:

```typescript
try {
  // Parse and validate
  if (chunks.length < REQUIRED) continue
  // ... extract fields
} catch {
  continue  // Skip malformed protocols
}
```

## Production Examples

See ts-templates repository for complete implementations:
https://github.com/b-open-io/ts-templates/tree/master/src/template

- `opreturn/OpReturn.ts` - Minimal (no signing)
- `bitcom/MAP.ts` - Data protocol (no signing)
- `bitcom/AIP.ts` - Signed protocol (BSM)
- `bitcom/Sigma.ts` - Signed protocol (BSM + BRC-77, uses sigma-protocol)
- `bitcom/BAP.ts` - Complex signed protocol
