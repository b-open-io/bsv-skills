---
name: yours-wallet
description: This skill should be used when the user asks to integrate "Yours Wallet", "connect a BSV wallet", use "BRC-100", "pay with BSV wallet", add "wallet checkout in a web app", use "yours-wallet-provider", build a "pay with Yours Wallet" button, access "window.CWI", or connect a React app to a BRC-100 wallet.
---

# Yours Wallet Web App Integration

Integrate the Yours Wallet browser extension into a React web app through the BRC-100 Common Wallet Interface (CWI). Keep private keys inside the wallet and ask the wallet to authorize identity, fund actions, sign inputs, and broadcast transactions.

## Understand the Layers

Yours Wallet injects `window.CWI`, an implementation of the `WalletInterface` exported by `@bsv/sdk`. BRC-100 standardizes this app-to-wallet interface so application code can use actions, derived keys, signatures, encryption, certificates, and wallet queries without a wallet-specific transaction API.

Use the layers as follows:

| Layer | Role |
|---|---|
| Yours Wallet | Browser extension that owns keys and implements BRC-100 |
| `yours-wallet-provider` | React detection, context, status, and access to injected `window.CWI` |
| `WalletInterface` | BRC-100 method contract returned by `useCWI()` |
| `WalletClient` from `@bsv/sdk` | Optional transport-selecting client that also implements `WalletInterface` |

Do not wrap the value from `useCWI()` in another client. Call its `wallet` directly. Use `WalletClient` when an app needs the SDK's transport abstraction instead of the React provider.

## Install

```bash
bun add yours-wallet-provider
bun add react react-dom @bsv/sdk
```

The current CWI-based package is ESM-only and requires React 19 or newer and `@bsv/sdk` 2 or newer. Treat `YoursProvider`, `useYoursWallet()`, and `window.yours` as deprecated legacy APIs.

## Wire the React Provider and Hook

Wrap the component subtree that needs wallet access:

```tsx
import { CWIProvider } from 'yours-wallet-provider'

export function App() {
  return (
    <CWIProvider timeout={10_000}>
      <Checkout />
    </CWIProvider>
  )
}
```

Read the discriminated status before accessing the wallet:

```tsx
import { useCWI } from 'yours-wallet-provider'

function Checkout() {
  const cwi = useCWI()

  if (cwi.status === 'loading') return <p>Looking for Yours Wallet…</p>
  if (cwi.status === 'unavailable') return <p>Install or enable Yours Wallet.</p>

  return <p>BRC-100 wallet detected.</p>
}
```

`CWIProvider` checks for `window.CWI`, listens for the `cwiReady` event, and polls every 500 ms as a fallback. Its `timeout` defaults to 10 seconds. `useCWI()` throws outside the provider and returns exactly one of:

```typescript
type CWIContextValue =
  | { status: 'loading'; wallet: undefined }
  | { status: 'available'; wallet: WalletInterface }
  | { status: 'unavailable'; wallet: undefined }
```

Treat `available` as extension detection, not account authorization.

## Connect and Read Identity

Start authorization from a user gesture. Call `waitForAuthentication({})` before requesting identity; this is the modern equivalent of the legacy `connect()` flow.

```typescript
const { authenticated } = await wallet.waitForAuthentication({})
if (!authenticated) throw new Error('Wallet authentication failed')

const { publicKey: identityKey } = await wallet.getPublicKey({
  identityKey: true
})
```

Store the public identity key only when needed for application state. Never request or handle private keys.

## Build, Sign, and Broadcast a Payment

Call `createAction()` for a normal wallet-funded payment. Supply output locking scripts and satoshi amounts; let the wallet select its UTXOs and change, build the transaction, obtain approval, sign, and process the action. With `signAndProcess: true` and `noSend` omitted, the wallet signs and broadcasts in the same flow.

```typescript
import { P2PKH } from '@bsv/sdk'

const { txid } = await wallet.createAction({
  description: 'Pay merchant invoice',
  outputs: [{
    lockingScript: new P2PKH().lock(recipientAddress).toHex(),
    satoshis,
    outputDescription: 'Invoice payment'
  }],
  labels: ['invoice-payment'],
  options: {
    signAndProcess: true,
    acceptDelayedBroadcast: false,
    returnTXIDOnly: true
  }
})

if (!txid) throw new Error('Wallet did not return a transaction ID')
```

Use `signAction()` only when intentionally creating a deferred action with `signAndProcess: false` or supplying custom inputs that require application-provided unlocking scripts. Avoid splitting a standard invoice payment into manual build, sign, and broadcast calls.

## Worked Example: Pay with Yours Wallet

Validate invoice data from a trusted backend, authorize on click, retrieve identity, and pay the invoice in one user-driven flow:

```tsx
import { useState } from 'react'
import { P2PKH } from '@bsv/sdk'
import { useCWI } from 'yours-wallet-provider'

type Invoice = Readonly<{
  id: string
  recipientAddress: string
  satoshis: number
}>

export function PayWithYoursWallet({ invoice }: { invoice: Invoice }) {
  const cwi = useCWI()
  const [pending, setPending] = useState(false)
  const [identityKey, setIdentityKey] = useState('')
  const [txid, setTxid] = useState('')
  const [error, setError] = useState('')

  if (cwi.status === 'loading') return <p>Looking for Yours Wallet…</p>
  if (cwi.status === 'unavailable') return <p>Install or enable Yours Wallet.</p>

  const wallet = cwi.wallet

  async function connectAndPay() {
    if (!Number.isSafeInteger(invoice.satoshis) || invoice.satoshis <= 0) {
      setError('Invoice amount must be a positive integer of satoshis.')
      return
    }

    setPending(true)
    setError('')

    try {
      await wallet.waitForAuthentication({})
      const identity = await wallet.getPublicKey({ identityKey: true })
      setIdentityKey(identity.publicKey)

      const result = await wallet.createAction({
        description: 'Pay merchant invoice',
        outputs: [{
          lockingScript: new P2PKH()
            .lock(invoice.recipientAddress)
            .toHex(),
          satoshis: invoice.satoshis,
          outputDescription: 'Invoice payment'
        }],
        labels: ['invoice-payment'],
        options: {
          signAndProcess: true,
          acceptDelayedBroadcast: false,
          returnTXIDOnly: true
        }
      })

      if (!result.txid) throw new Error('Wallet did not return a transaction ID')
      setTxid(result.txid)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <section>
      <p>Invoice {invoice.id}: {invoice.satoshis} satoshis</p>
      <button type="button" disabled={pending} onClick={connectAndPay}>
        {pending ? 'Waiting for wallet…' : 'Pay with Yours Wallet'}
      </button>
      {identityKey && <p>Connected identity: {identityKey}</p>}
      {txid && <p>Paid in transaction: {txid}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
```

Verify the returned transaction and invoice status on the backend before delivering valuable goods. Treat a client-rendered success state as user feedback, not final merchant settlement evidence.

## Relate the Provider to SDK `WalletClient`

Both objects expose BRC-100 methods, but reach them differently:

```typescript
import { WalletClient } from '@bsv/sdk'

// Create only after window.CWI has been injected.
const wallet = new WalletClient('window.CWI')
await wallet.waitForAuthentication({})
const { publicKey } = await wallet.getPublicKey({ identityKey: true })
```

Prefer `CWIProvider` plus `useCWI()` in React because it handles extension injection timing and exposes reactive availability. Prefer `WalletClient` for non-React code or code designed to select among supported wallet transports. Keep application payment functions typed against `WalletInterface` when wallet portability matters; both the injected Yours object and SDK client satisfy that contract.

## Handle Failures

- Distinguish extension unavailable, authorization rejected, invalid invoice, insufficient funds, and broadcast failure.
- Keep wallet calls inside `try`/`catch`; BRC-100 failures are thrown.
- Prevent duplicate checkout submissions while a request is pending.
- Keep human-readable action and output descriptions between 5 and 50 bytes.
- Use `noSend: true` only for an intentional BEEF verification or batched-transaction workflow.

## Related Skills

- `wallet-brc100` — implement wallets or study advanced actions, baskets, custom inputs, and BEEF flows
- `message-signing` — choose BSM, BRC-77, Sigma, or BRC-100 signing patterns
- `key-derivation` — design BRC-42 app-specific key protocols
