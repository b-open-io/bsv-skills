/**
 * Minimal ScriptTemplate Example: OpReturn
 *
 * This is a simple template with no external dependencies.
 * For more complex examples (Sigma, AIP, MAP, BAP, etc.), see:
 * https://github.com/b-open-io/ts-templates/tree/master/src/template
 */

import { OP, Script, ScriptTemplate, LockingScript, UnlockingScript, Transaction, Utils } from '@bsv/sdk'

/**
 * OpReturn - Simple OP_RETURN data storage template
 *
 * Demonstrates the minimal ScriptTemplate interface:
 * - lock(): Create locking script
 * - unlock(): Create unlocking script (throws for OP_RETURN)
 * - decode(): Parse existing scripts (static method)
 */
export class OpReturn implements ScriptTemplate {
  /**
   * Create OP_RETURN locking script from data
   *
   * @param data - String, array of strings, or byte array
   * @param enc - Encoding: 'hex' | 'utf8' | 'base64'
   */
  lock(data: string | string[] | number[], enc?: 'hex' | 'utf8' | 'base64'): LockingScript {
    const script: Array<{ op: number; data?: number[] }> = [
      { op: OP.OP_FALSE },
      { op: OP.OP_RETURN }
    ]

    // Normalize to array
    if (typeof data === 'string') {
      data = [data]
    }

    // Handle byte array directly
    if (data.length > 0 && typeof data[0] === 'number') {
      script.push({ op: data.length, data: data as number[] })
    } else {
      // Handle string array
      for (const entry of data.filter(Boolean)) {
        const arr = Utils.toArray(entry, enc)
        script.push({ op: arr.length, data: arr })
      }
    }

    return new LockingScript(script)
  }

  /**
   * OP_RETURN scripts cannot be unlocked (unspendable)
   */
  unlock(): {
    sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>
    estimateLength: () => Promise<number>
  } {
    throw new Error('OP_RETURN scripts cannot be unlocked')
  }

  /**
   * Decode OP_RETURN data from script
   *
   * @param script - Script to decode
   * @returns Array of UTF8 decoded data pushes
   */
  static decode(script: Script): string[] {
    const chunks = script.chunks

    // Skip OP_FALSE OP_RETURN prefix
    const dataChunks = chunks.slice(2)

    return dataChunks
      .filter(chunk => chunk.data && chunk.data.length > 0)
      .map(chunk => Utils.toUTF8(chunk.data!))
  }
}

/**
 * Usage example:
 *
 * ```typescript
 * const template = new OpReturn()
 *
 * // Create locking script
 * const lockingScript = template.lock(['hello', 'world'])
 *
 * // Decode existing script
 * const data = OpReturn.decode(existingScript)
 * ```
 *
 * For more complex templates with signing, BitCom protocols,
 * and external dependencies, see:
 * https://github.com/b-open-io/ts-templates/tree/master/src/template
 *
 * Examples in ts-templates:
 * - Sigma.ts - Transaction-bound signatures (uses sigma-protocol)
 * - AIP.ts - Author Identity Protocol
 * - MAP.ts - Magic Attribute Protocol
 * - BAP.ts - Bitcoin Attestation Protocol
 * - B.ts - B:// file storage protocol
 */
