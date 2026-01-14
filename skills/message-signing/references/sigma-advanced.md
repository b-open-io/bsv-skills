# Advanced Sigma Patterns

Advanced usage patterns for the Sigma protocol.

## Remote Signing

Sign with a key hosted on a remote server:

```typescript
const sigma = new Sigma(tx, 0, 0);

// Remote sign with auth token
const result = await sigma.remoteSign("https://keyhost.example.com", {
  type: "header",
  key: "Authorization",
  value: "Bearer <token>"
});

// Or with query parameter auth
const result2 = await sigma.remoteSign("https://keyhost.example.com", {
  type: "query",
  key: "api_key",
  value: "<api-key>"
});
```

### Remote Signing Server Requirements

The server must implement:

```
POST /sign
Content-Type: application/json

Request:
{
  "message": "<hex-encoded message hash>",
  "encoding": "hex"
}

Response:
{
  "address": "<signer address>",
  "sig": "<base64 compact signature>",
  "message": "<original message>",
  "ts": <timestamp>,
  "recovery": <0-3>
}
```

## Dynamic Input Reference

Use `-1` for refVin to reference the input at the same index as targetVout:

```typescript
// Useful for partially signed transactions where input order may change
const sigma = new Sigma(tx, 0, 0, -1);

// refVin=-1 means: use targetVout (0) as the input index
// Signature binds to input[0] regardless of how it was added
```

## Signature Replacement

Replace dummy signatures with real ones for accurate fee calculation:

```typescript
// 1. Create dummy signature before inputs
const tx = new Transaction(1, [], [txOut]);
const sigma = new Sigma(tx, 0, 0);
sigma.sign(dummyKey);  // Dummy for size estimation

// 2. Calculate fee based on signed tx size
const fee = calculateFee(sigma.transaction);

// 3. Add real inputs
tx.addInput(realInput);

// 4. Re-sign with real key (replaces dummy)
sigma.sign(realKey);
```

## Multi-Algorithm Signatures

Mix BSM and BRC-77 on the same output:

```typescript
// Platform signs with BRC-77 (instance 0)
const sigma = new Sigma(tx, 0, 0);
sigma.sign(platformKey, Algorithm.BRC77);

// User signs with BSM (instance 1)
const sigma2 = new Sigma(sigma.transaction, 0, 1);
sigma2.sign(userKey, Algorithm.BSM);

// Both signatures on same output
console.log(sigma2.getSigInstanceCount()); // 2
```

## Private BRC-77 Signatures in Sigma

Create Sigma signatures that only a specific party can verify:

```typescript
import { Sigma, Algorithm } from "sigma-protocol";
import { PrivateKey, PublicKey } from "@bsv/sdk";

const signer = PrivateKey.fromWif("L1...");
const verifierPubKey = PublicKey.fromString("02...");

// Sign with specific verifier
const sigma = new Sigma(tx, 0, 0);
sigma.sign(signer, Algorithm.BRC77, verifierPubKey);

// Only verifier can verify
const verifierPrivKey = PrivateKey.fromWif("K1...");
const isValid = sigma.verify(verifierPrivKey);
```

## Script Parsing

Parse Sigma signatures from existing transactions:

```typescript
import { Transaction } from "@bsv/sdk";
import { Sigma } from "sigma-protocol";

const tx = Transaction.fromHex(rawTxHex);
const sigma = new Sigma(tx, 0, 0);

// Get signature data
const sig = sigma.sig;
console.log({
  algorithm: sig?.algorithm,
  address: sig?.address,
  signature: sig?.signature,
  vin: sig?.vin
});

// Count signatures on output
const count = sigma.getSigInstanceCount();
```

## Sigma Script Format

In a BitCom OP_RETURN output:

```
... data ... | SIGMA | <algorithm> | <address> | <signature> | <vin>
```

Example ASM:
```
OP_RETURN
6d02                          # MAP prefix
... map data ...
7c                            # pipe
5349474d41                    # "SIGMA"
42534d                        # "BSM" or "BRC77"
31414...                      # address (hex-encoded)
1f17...                       # signature (raw bytes for BSM, BRC-77 structure for BRC77)
30                            # "0" (vin as string)
```

## Template Integration

Use Sigma template from @bopen-io/templates (requires sigma-protocol peer dependency):

```typescript
import { Sigma as SigmaTemplate, BitCom, SigmaAlgorithm } from "@bopen-io/templates";
import { Script } from "@bsv/sdk";

// Decode Sigma from script
const script = tx.outputs[0].lockingScript;
const bitcom = BitCom.decode(script);
const sigmas = SigmaTemplate.decode(bitcom);

for (const sig of sigmas) {
  console.log({
    algorithm: sig.data.algorithm,
    address: sig.data.address,
    vin: sig.data.vin,
    valid: sig.verify()
  });
}
```

## Hash Calculation Details

### Input Hash

```typescript
// SHA256 of outpoint (txid + output index)
function getInputHash(tx, vin) {
  const input = tx.inputs[vin];
  const txidBytes = hexToBytes(input.sourceTXID);
  const indexBytes = writeUint32LE(input.sourceOutputIndex);
  return Hash.sha256([...txidBytes, ...indexBytes]);
}
```

### Data Hash

```typescript
// SHA256 of script data BEFORE the SIGMA marker
function getDataHash(script, sigmaInstance) {
  const chunks = script.chunks;
  // Find SIGMA at sigmaInstance
  // Hash all chunks before the separator (| or OP_RETURN)
  const dataChunks = chunks.slice(0, sigmaPosition - 1);
  return Hash.sha256(dataChunks.toBinary());
}
```

### Message Hash

```typescript
// Final message = SHA256(inputHash + dataHash)
const combined = [...inputHash, ...dataHash];
const messageHash = Hash.sha256(combined);
```
