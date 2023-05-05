import { EventEmitter } from 'events';
import util from 'util';

import { SequenceIndexerClient } from '@0xsequence/indexer'

const TIME = 8000

const wait = async (ms: number) => {
    await new Promise((res) => setTimeout(res, ms))
}

const fullIndexerTxPagination = async (indexer: any, address: string) => {
    const txs: any = []
  
    // here we query the Joy contract address, but you can use any
    const filter = {
        accountAddress: address,
    };
  
    // query Sequence Indexer for all token transaction history on Mumbai
    let txHistory = await indexer.getTransactionHistory({
        filter: filter,
        page: { pageSize: 10 }
    })
  
    
    txs.push(...txHistory.transactions)
  
    // if there are more transactions to log, proceed to paginate
    while(txHistory.page.more){  
        await wait(2000)

        txHistory = await indexer.getTransactionHistory({
            filter: filter,
            page: { 
                pageSize: 10, 
                // use the after cursor from the previous indexer call
                after: txHistory!.page!.after! 
            }
        })
        txs.push(...txHistory.transactions)
    }
  
    return txs
}

const fullIndexerBalancePagination = async (indexer: any, address: string) => {
    const txs: any = []

    // query Sequence Indexer for all token balance on network
    let txHistory = await indexer.getTokenBalances({
        accountAddress: address,
        includeMetadata: true
    })

    txs.push(...txHistory.balances)

    // if there are more transactions to log, proceed to paginate
    while(txHistory.page.more){  
        txHistory = await indexer.getTokenBalances({
            accountAddress: address,
            includeMetadata: true,
            page: { 
                pageSize: 10, 
                // use the after cursor from the previous indexer call
                after: txHistory!.page!.after! 
            }
        })
        txs.push(...txHistory.balances)
    }

    return txs
}
  
class IndexerListener extends EventEmitter {
    ms;
    indexer;

    constructor( { ms, client } = {ms: TIME, client: 'https://polygon-indexer.sequence.app' } ) {
        super();
        if(ms < TIME) this.ms = TIME
        else this.ms = ms
        console.log()
        console.log(`awaiting changes on ${client.split('-')[0].slice(8, client.split('-')[0].length)}:`)
        this.indexer = new SequenceIndexerClient(client)
        console.log()
    }
    
    onBalanceChange(address: any) {
        console.log(`onBalanceChange \tof \t${address}`)
        let balances: any
        let init = true

        setInterval(async () => {
            if(!balances) balances = new Map()
            try{
                const tokenBalances = await fullIndexerBalancePagination(this.indexer, address)
                tokenBalances.map((balance: any) => {
                    if(init){
                        balances.set(balance.contractAddress, balance.balance)
                    } else {
                        if(balances.get(balance.contractAddress) != balance.balance){
                            this.emit('balance', {token: balance})
                            balances.set(balance.contractAddress, balance.balance)
                        }
                    }
                })
                init = false
            }catch(e){
                this.emit('err', e)
            }
        }, this.ms)
    }
    
    onTxChange(address: any) {
        console.log(`onTxChange \t\tof \t${address}`)
        let txs: any;
        let init = true;
        setInterval(async () => {
            if(!txs) txs = new Map()
            try {
                const txHistory = await fullIndexerTxPagination(this.indexer, address)
                txHistory.map((tx: any) => {
                    if(init){
                        txs.set(tx.txnHash, true)
                    }else {
                        if(!txs.has(tx.txnHash)){
                            this.emit('tx', {tx: tx})
                            txs.set(tx.txnHash, true)
                        }
                    }
                })
                init = false
            }catch(e){
                this.emit('err', e)
            }
        }, this.ms)
    }
}

export default IndexerListener;