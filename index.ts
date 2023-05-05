import { config as loadEnv } from 'dotenv';
import IndexerListener from './lib/'

loadEnv();

(() => {

    const listener = new IndexerListener({ms: 8000, client: 'https://polygon-indexer.sequence.app'})

    // listener.onBalanceChange(process.env.ADDRESS!)

    // listener.on('balance', ({ token }) => {
    //     console.log('balance update')
    //     console.log(token)
    // })

    listener.onTxChange(process.env.TX_ADDRESS!)

    listener.on('tx', ({ tx }) => {
        console.log('tx recieve')
        console.log(tx)
    })

    listener.on('err', (err: any) => {
        console.log(err)
    })

})();