# Script Template Anatomy

Complete breakdown of a ts-templates ScriptTemplate implementation.

## File Structure

```
src/template/bitcom/Protocol.ts
```

## Imports

```typescript
import {
  ScriptTemplate,
  LockingScript,
  UnlockingScript,
  PrivateKey,
  Utils,
  Script,
  OP,
  BigNumber,
  BSM,
  Signature
} from '@bsv/sdk'
import BitCom, { Protocol, BitComDecoded } from './BitCom.js'
```

Import only what you need. Common imports:
- `ScriptTemplate` - Interface to implement
- `LockingScript`, `UnlockingScript` - Return types
- `Script` - For building/parsing scripts
- `Utils` - Byte manipulation utilities
- `OP` - Opcode constants
- `BSM`, `Signature`, `BigNumber` - For signature operations

## Constants

```typescript
export const PROTOCOL_PREFIX = 'ProtocolIdentifier'
```

Protocol identifiers can be:
- Bitcoin addresses (like AIP: `15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva`)
- Literal strings (like SIGMA: `SIGMA`)
- Hex-encoded strings

## Enums (Optional)

```typescript
export enum ProtocolAlgorithm {
  BSM = 'BSM',
  ECDSA = 'ECDSA'
}
```

Use enums for constrained string fields.

## Data Interface

```typescript
export interface ProtocolData {
  /** BitCom protocol index within transaction */
  bitcomIndex?: number

  /** Protocol-specific fields */
  field1: string
  field2: number[]
  field3: number

  /** Verification result */
  valid?: boolean
}
```

Required fields:
- `bitcomIndex?: number` - Position in BitCom protocol array
- `valid?: boolean` - Signature verification result

## Options Interface (Optional)

```typescript
export interface ProtocolOptions {
  /** Optional configuration */
  algorithm?: ProtocolAlgorithm
  customField?: string
}
```

Use for sign() method parameters.

## Class Implementation

```typescript
export default class Protocol implements ScriptTemplate {
  public readonly data: ProtocolData

  constructor(data: ProtocolData) {
    this.data = data
  }
}
```

Key requirements:
- `default` export
- Implements `ScriptTemplate`
- `data` is `public readonly`
- Constructor accepts Data interface

## Static decode() Method

```typescript
static decode(bitcom: BitComDecoded): Protocol[] {
  const results: Protocol[] = []

  // Safety check
  if (bitcom?.protocols?.length === 0) {
    return results
  }

  for (let protoIdx = 0; protoIdx < bitcom.protocols.length; protoIdx++) {
    const protocol = bitcom.protocols[protoIdx]

    if (protocol.protocol === PROTOCOL_PREFIX) {
      try {
        const script = Script.fromBinary(protocol.script)
        const chunks = script.chunks

        // Validate minimum chunks
        if (chunks?.length < REQUIRED_CHUNKS) {
          continue
        }

        // Extract fields
        const instance = new Protocol({
          bitcomIndex: protoIdx,
          field1: Utils.toUTF8(chunks[0].data ?? []),
          field2: Array.from(chunks[1].data ?? []),
          field3: parseInt(Utils.toUTF8(chunks[2].data ?? []), 10),
          valid: undefined
        })

        results.push(instance)
      } catch {
        // Skip invalid protocols
        continue
      }
    }
  }

  return results
}
```

Pattern notes:
- Returns array (multiple instances possible)
- Wraps in try/catch for robustness
- Uses `Utils.toUTF8()` for string fields
- Uses `Array.from()` for byte array fields
- Uses `parseInt()` for numeric fields
- Sets `valid: undefined` initially

## Static decodeFromScript() Method (Optional)

```typescript
static decodeFromScript(script: Script | LockingScript): Protocol[] {
  const bitcom = BitCom.decode(script)
  if (bitcom == null) {
    return []
  }
  return Protocol.decode(bitcom)
}
```

Convenience method for direct script parsing.

## Static sign() Method

```typescript
static async sign(
  data: number[],
  privateKey: PrivateKey,
  options: ProtocolOptions = {}
): Promise<Protocol> {
  const algorithm = options.algorithm ?? ProtocolAlgorithm.BSM
  const address = privateKey.toAddress().toString()

  // Sign using BSM
  const sig = BSM.sign(data, privateKey, 'raw') as Signature
  const magicHash = BSM.magicHash(data)
  const recovery = sig.CalculateRecoveryFactor(
    privateKey.toPublicKey(),
    new BigNumber(magicHash)
  )

  // Get compact signature
  const compactSig = sig.toCompact(recovery, true, 'base64') as string
  const signatureArray = Array.from(Utils.toArray(compactSig, 'base64'))

  return new Protocol({
    algorithm,
    address,
    signature: signatureArray,
    valid: true
  })
}
```

Pattern notes:
- Async for consistency (even if not awaiting)
- Returns Promise<Protocol>
- Uses BSM for Bitcoin Signed Message
- Calculates recovery factor
- Sets `valid: true` for freshly signed

## lock() Method

```typescript
lock(): LockingScript {
  const script = new Script()

  // Add fields as push data
  script.writeBin(Utils.toArray(this.data.field1, 'utf8'))
  script.writeBin(this.data.field2)
  script.writeBin(Utils.toArray(this.data.field3.toString(), 'utf8'))

  // Create BitCom protocol
  const protocols: Protocol[] = [{
    protocol: PROTOCOL_PREFIX,
    script: script.toBinary(),
    pos: 0
  }]

  const bitcom = new BitCom(protocols)
  return bitcom.lock()
}
```

Pattern notes:
- Creates inner script with protocol data
- Wraps in BitCom for OP_RETURN structure
- Uses `writeBin()` for all data (not `writeOpCode()`)
- Converts numbers to strings before encoding

## unlock() Method

```typescript
unlock(): {
  sign: (tx: any, inputIndex: number) => Promise<UnlockingScript>
  estimateLength: () => Promise<number>
} {
  throw new Error('Protocol signatures cannot be unlocked')
}
```

Most OP_RETURN protocols don't have unlocking scripts.
Throw descriptive error rather than returning null.

## verify() Method

```typescript
verify(): boolean {
  return this.data.valid === true
}
```

Simple getter for verification result.
Actual verification happens in decode() or separate method.

## Verification Logic (for signed protocols)

```typescript
verifyWithData(data: number[]): boolean {
  try {
    const signatureBase64 = Utils.toBase64(this.data.signature)
    const sig = Signature.fromCompact(signatureBase64, 'base64')

    // Try all recovery factors
    for (let recovery = 0; recovery < 4; recovery++) {
      try {
        const publicKey = sig.RecoverPublicKey(
          recovery,
          new BigNumber(BSM.magicHash(data))
        )

        const valid = BSM.verify(data, sig, publicKey)
        if (valid && publicKey.toAddress().toString() === this.data.address) {
          this.data.valid = true
          return true
        }
      } catch {
        // Try next recovery factor
      }
    }

    this.data.valid = false
    return false
  } catch {
    this.data.valid = false
    return false
  }
}
```

Pattern notes:
- Tries all 4 recovery factors (0-3)
- Verifies both signature validity AND address match
- Sets `this.data.valid` as side effect
- Catches all errors and returns false
