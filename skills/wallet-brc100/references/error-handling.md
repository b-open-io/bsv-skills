# Error Handling

## Standard Error Types

```typescript
import {
  WalletError,
  WERR_INVALID_PARAMETER,
  WERR_INTERNAL,
  WERR_REVIEW_ACTIONS
} from '@bsv/wallet-toolbox'

try {
  const result = await wallet.createAction({
    description: 'Test transaction',
    outputs: [/* ... */]
  })
} catch (eu: unknown) {
  const error = WalletError.fromUnknown(eu)

  if (error.name === 'WERR_INVALID_PARAMETER') {
    console.error('Invalid parameter:', error.message)
    console.error('Stack:', error.stack)
  } else if (error.name === 'WERR_REVIEW_ACTIONS') {
    // Handle transaction review errors
    console.error('Review required:', error.details)
  } else {
    console.error('Wallet error:', error.message)
  }
}
```

## Review Actions Error (Transaction Failed)

```typescript
async function handleCreateAction(wallet: Wallet) {
  try {
    return await wallet.createAction({
      description: 'Payment',
      outputs: [/* ... */]
    })
  } catch (eu: unknown) {
    const error = WalletError.fromUnknown(eu)

    if (error.name === 'WERR_REVIEW_ACTIONS') {
      // Access detailed failure info
      const details = error as any
      console.error('Delayed results:', details.notDelayedResults)
      console.error('Send results:', details.sendWithResults)
      console.error('Failed txid:', details.txid)

      // Handle double-spend
      if (details.notDelayedResults?.some(r => r.status === 'doubleSpend')) {
        console.error('Double-spend detected!')
        console.error('Competing txs:', details.notDelayedResults[0].competingTxs)
      }
    }

    throw error
  }
}
```
