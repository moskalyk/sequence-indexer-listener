# sequence-indexer-listeners
an ergonomic view as to how to create indexer listeners in order to recieve EventEmitter events when state changes on either: balance, or tx history

```js
const listener = new IndexerListener({ms: 8000 /*min 8000*/, client: 'https://mumbai-indexer.sequence.app'})

listener.onBalanceChange('0x...')

listener.on('balance', ({ token }) => {
    console.log(token)
})

listener.onTxChange('0x...')

listener.on('tx', ({ tx }) => {
    console.log(tx)
})

listener.on('err', (err: any) => {
    console.log(err)
})
```

## todo
- [ ] update listeners to poll for multiple changes at once