# Certificate Operations

## Acquire Certificate (Direct Protocol)

```typescript
import { AcquireCertificateArgs } from '@bsv/sdk'

async function acquireDirectCertificate(wallet: Wallet) {
  const args: AcquireCertificateArgs = {
    acquisitionProtocol: 'direct',
    type: 'https://example.com/user-certificate',
    certifier: 'certifier-identity-key',
    serialNumber: Utils.toArray('cert-serial-123', 'utf8'),
    subject: await wallet.getIdentityKey(),
    revocationOutpoint: 'txid.vout',
    fields: {
      name: Utils.toArray('Alice Smith', 'utf8'),
      email: Utils.toArray('alice@example.com', 'utf8')
    },
    keyringForSubject: { /* master keyring */ },
    signature: Utils.toArray('signature-bytes', 'base64')
  }

  const result = await wallet.acquireCertificate(args)
  console.log('Certificate acquired:', result.certificateId)
  return result
}
```

## Acquire Certificate (Issuance Protocol)

```typescript
async function requestCertificateIssuance(wallet: Wallet) {
  const args: AcquireCertificateArgs = {
    acquisitionProtocol: 'issuance',
    type: 'https://example.com/kyc-certificate',
    certifier: 'certifier-identity-key',
    certifierUrl: 'https://certifier.example.com',
    fields: {
      name: 'Alice Smith',
      birthdate: '1990-01-01',
      country: 'US'
    }
  }

  const result = await wallet.acquireCertificate(args)
  console.log('Certificate issued:', result.certificateId)
  return result
}
```

## List Certificates

```typescript
async function listMyCertificates(wallet: Wallet) {
  const result = await wallet.listCertificates({
    certifiers: ['certifier-identity-key'],
    types: ['https://example.com/user-certificate'],
    limit: 50,
    offset: 0
  })

  console.log(`Found ${result.totalCertificates} certificates`)
  result.certificates.forEach(cert => {
    console.log(`  Type: ${cert.type}, Certifier: ${cert.certifier}`)
  })

  return result
}
```

## Prove Certificate

```typescript
async function proveCertificate(wallet: Wallet, certificateId: string) {
  const result = await wallet.proveCertificate({
    certificateId,
    fieldsToReveal: ['name', 'email'],
    verifier: 'verifier-identity-key',
    privileged: false
  })

  console.log('Certificate proof:', result.keyringForVerifier)
  return result
}
```
