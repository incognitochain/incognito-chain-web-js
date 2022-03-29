const Inc = require('../../..');
const { Account, Wallet, Transactor, PDexV3, StorageServices } = Inc;

const privateKeys = ['112t8roafGgHL1rhAP9632Yef3sx5k8xgp8cwK4MCJsCL1UWcxXvpzg97N4dwvcD735iKf31Q2ZgrAvKfVjeSUEvnzKJyyJD3GqqSZdxN4or',
    '112t8rnZDRztVgPjbYQiXS7mJgaTzn66NvHD7Vus2SrhSAY611AzADsPFzKjKQCKWTgbkgYrCPo9atvSMoCf9KT23Sc7Js9RKhzbNJkxpJU6',
    '112t8rne7fpTVvSgZcSgyFV23FYEv3sbRRJZzPscRcTo8DsdZwstgn6UyHbnKHmyLJrSkvF13fzkZ4e8YD5A2wg8jzUZx6Yscdr4NuUUQDAt',
    '112t8rnXoBXrThDTACHx2rbEq7nBgrzcZhVZV4fvNEcGJetQ13spZRMuW5ncvsKA1KvtkauZuK2jV8pxEZLpiuHtKX3FkKv2uC5ZeRC8L6we',
    '112t8rnbcZ92v5omVfbXf1gu7j7S1xxr2eppxitbHfjAMHWdLLBjBcQSv1X1cKjarJLffrPGwBhqZzBvEeA9PhtKeM8ALWiWjhUzN5Fi6WVC',
    '112t8rnZUQXxcbayAZvyyZyKDhwVJBLkHuTKMhrS51nQZcXKYXGopUTj22JtZ8KxYQcak54KUQLhimv1GLLPFk1cc8JCHZ2JwxCRXGsg4gXU',
    '112t8rnXDS4cAjFVgCDEw4sWGdaqQSbKLRH1Hu4nUPBFPJdn29YgUei2KXNEtC8mhi1sEZb1V3gnXdAXjmCuxPa49rbHcH9uNaf85cnF3tMw',
    '112t8rnYoioTRNsM8gnUYt54ThWWrRnG4e1nRX147MWGbEazYP7RWrEUB58JLnBjKhh49FMS5o5ttypZucfw5dFYMAsgDUsHPa9BAasY8U1i',
    '112t8rnXtw6pWwowv88Ry4XxukFNLfbbY2PLh2ph38ixbCbZKwf9ZxVjd4s7jU3RSdKctC7gGZp9piy8nZoLqHwqDBWcsMHWsQg27S5WCdm4',
]
const snippets = [
    'let tx0 = await funder.convert()',
    'await funder.waitTx(tx0.Response.txId)',
    'let tx1 = await funder.prv({ transfer: { prvPayments: [new Inc.types.PaymentInfo(addresses[1], 8000)] , fee: 10 }})',
    'let tx2 = await funder.newToken({ transfer: { tokenPayments: [new Inc.types.PaymentInfo(addresses[1], 77000)] , fee: 50 }, extra: { tokenName: "My New Token", tokenSymbol: "MT1" }})',
    'let lst = await inc.rpc.listTokens()',
    'let coinList = await funder.coin(Inc.constants.PRVIDSTR, 2)',
    'await pdexSenders[0].createAndSendOrderRequestTx({})'
];
const rpcClient = 'http://localhost:9334';

async function createLocalTestPdexAccount(privateKey) {
    try {
        let account = new Account(Wallet);
        const fullNode = rpcClient;
        account.setRPCClient(fullNode);

        account._t = new Transactor(Wallet, fullNode);
        await account._t.setKey(privateKey);
        // duct-tape methods to skip services
        account.getUnspentCoinsV2 = async function({ tokenID, version }) {
            const result = await account._t.getListUnspentCoins(tokenID, version);
            return result
        }
        account.getUnspentCoinsExcludeSpendingCoins = account.getUnspentCoinsV2;
        account.rpcCoinService = {
            apiGetRandomCommitments: async function({ tokenID, shardID, version, limit }) {
                const result = await account._t.coinChooser.coinsForRing(account._t.rpc, shardID, limit, tokenID)
                result.CommitmentIndices = result.Indexes;
                return result;
            },
        }
        account.rpcTxService = {
            apiPushTx: async function({ rawTx }) {
                try {
                    let result = await account._t.send(rawTx, true);
                    return result;
                } catch (e) {
                    if (e.Code == -1003 && typeof(e.StackTrace) == 'string' && e.StackTrace.includes('Cannot parse TX as token transaction')) {
                        console.log('retry sending TX as PRV transfer');
                        return await account._t.send(rawTx, false)
                    }
                    throw e;
                }
            },
            apiGetTxStatus: async function() { return 'TBD' },
        }
        account.getListSpentCoinsStorage = async function() { return [] }
        account.getKeyInfo = async function() { return {} }
        account.submitOTAKey = async function() { return {} }
        account.requestAirdropNFT = async function() { return {} }
        account.removeTxHistoryByTxIDs = async function() { return {} };
        account.removeSpendingCoinsByTxIDs = async function() { return {} };
        await account.setKey(privateKey);

        let p = new PDexV3();
        p.setAccount(account);
        p.setRPCClient(rpcClient);
        p.setStorageServices(new StorageServices());
        return p;
    } catch (error) {
        console.log("create-acc error", privateKey, error);
    }
}

const m = async () => {
    console.log('Setting up DEV environment...')
    let inc = new Inc.SimpleWallet();
    inc.setProvider(rpcClient);
    await Inc.init();
    const funder = await inc.NewTransactor(privateKeys[0]);
    const pdexSenders = await Promise.all(privateKeys.map(createLocalTestPdexAccount));
    // aggregate relevant variables and unfold them onto global
    funder.isSubmitOtaKey = true;
    Object.assign(global, {
        privateKeys,
        addresses: pdexSenders.map(a => a.account.key.base58CheckSerialize(Inc.constants.PaymentAddressType)),
        Inc,
        inc,
        funder,
        pdexSenders,
        rpc: inc.rpc,
        snippets
    });
    console.log('Ready');
}

m();