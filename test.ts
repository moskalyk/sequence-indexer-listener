
import { config as loadEnv } from 'dotenv';
import { ethers } from 'ethers'
import { sequence } from '0xsequence'
import { RpcRelayer } from '@0xsequence/relayer'
import { Wallet } from '@0xsequence/wallet'

loadEnv();

// sequence
const provider = new ethers.providers.JsonRpcProvider('https://nodes.sequence.app/polygon')
const serverPrivateKey = process.env!.PKEY!
const walletEOA = new ethers.Wallet(serverPrivateKey, provider)
const relayer = new RpcRelayer({url: 'https://polygon-relayer.sequence.app', provider: provider})

const getAddress = async () => {
    const wallet = (await Wallet.singleOwner(walletEOA)).connect(provider, relayer)
    return await wallet.getAddress()
}

const executeTx = async (address: string) => {

    console.log('running...')

    // Create your Sequence server wallet, controlled by your server EOA, and connect it to the relayer
    const wallet = (await Wallet.singleOwner(walletEOA)).connect(provider, relayer)

    const erc1155TokenAddress = '0xEcBD06a3E4d6485237320007d10e944C3a7E40a7'

    // Craft your transaction
    const erc1155Interface = new ethers.utils.Interface([
        'function claim(uint type_, address address_) public'
    ])

    try{

        const data = erc1155Interface.encodeFunctionData(
            'claim', [0, address]
        )
    
        const txn = {
            to: erc1155TokenAddress,
            data
        }
        // Request the possible fee options the relayer will accept for this transaction
        const [config, context] = await Promise.all([wallet.getWalletConfig(), wallet.getWalletContext()])
        const { options, quote } = await relayer.getFeeOptions(config[0], context, txn /* , txn2, txn3, etc... */)
        // const options = []
        // Choose a fee from the list of options returned by the relayer
        // MATIC is native to Polygon and needs to be handled differently than other ERC-20 tokens like USDC
        // === To pay the fee in native MATIC: ===
        const option: any= options.find((option: any)=> option.token.symbol === 'MATIC')
        console.log(options)

        if (!option) {
            console.log('sending the tx without a fee...')

            // Send your transaction with the fee and quote to the relayer for dispatch
            const tx = await wallet.sendTransaction(txn)
            console.log(tx)

            // Wait for transaction to be mined
            // const txnReceipt = await txnResponse.wait()

            // // Check if transaction was successful 
            // if (txnReceipt.status != 1) {
            //     console.log(`Unexpected status: ${txnReceipt.status}`)
            //     throw new Error(`Unexpected status: ${txnReceipt.status}`)
            // }

            return { tx: tx }
        } else { // to be used for mainnet / polygon
            console.log('sending the tx with a fee...')

            // // Craft the MATIC fee payment transaction
            // // revertOnError: true is required for fee payments
            const feeTxn = {
                to: option.to,
                value: option.value,
                gasLimit: option.gasLimit,
                revertOnError: true
            }
            // // === MATIC fee ===

            // // Send your transaction with the fee and quote to the relayer for dispatch
            const tx = await wallet.sendTransaction([txn, feeTxn], undefined, undefined, quote)
            console.log(tx)

            // // Wait for transaction to be mined
            // const txnReceipt = await txnResponse.wait()

            // // Check if transaction was successful 
            // if (txnReceipt.status != 1) {
            //     console.log(`Unexpected status: ${txnReceipt.status}`)
            //     throw new Error(`Unexpected status: ${txnReceipt.status}`)
            // }

            return { tx: tx }
        }
    }catch(e: any){
        console.log(e)
        throw new Error(e)
    }
};

(async () => {
    // console.log(await getAddress())
    const res = await executeTx(process.env.ADDRESS!)
    console.log(res)
})()