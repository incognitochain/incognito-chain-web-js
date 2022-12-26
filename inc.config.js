// require & await this module to connect to one of the preset networks
const { default: TransportNodeHid } = require('@ledgerhq/hw-transport-node-hid');
const inc = require('.');
require('dotenv').config();

const networks = {
    // local devnet: 2 shards + beacon. Connect to fullnode
    'local': {
        privateKeys: ['112t8roafGgHL1rhAP9632Yef3sx5k8xgp8cwK4MCJsCL1UWcxXvpzg97N4dwvcD735iKf31Q2ZgrAvKfVjeSUEvnzKJyyJD3GqqSZdxN4or', '112t8rnZDRztVgPjbYQiXS7mJgaTzn66NvHD7Vus2SrhSAY611AzADsPFzKjKQCKWTgbkgYrCPo9atvSMoCf9KT23Sc7Js9RKhzbNJkxpJU6', '112t8rne7fpTVvSgZcSgyFV23FYEv3sbRRJZzPscRcTo8DsdZwstgn6UyHbnKHmyLJrSkvF13fzkZ4e8YD5A2wg8jzUZx6Yscdr4NuUUQDAt', '112t8rnXoBXrThDTACHx2rbEq7nBgrzcZhVZV4fvNEcGJetQ13spZRMuW5ncvsKA1KvtkauZuK2jV8pxEZLpiuHtKX3FkKv2uC5ZeRC8L6we', '112t8rnZUQXxcbayAZvyyZyKDhwVJBLkHuTKMhrS51nQZcXKYXGopUTj22JtZ8KxYQcak54KUQLhimv1GLLPFk1cc8JCHZ2JwxCRXGsg4gXU'],
        rpcClient: 'http://localhost:8334',
        shardCount: 2,
        services: null,
    },
    'testnet': {
        privateKeys: [process.env.PRIVATEKEY || '112t8roafGgHL1rhAP9632Yef3sx5k8xgp8cwK4MCJsCL1UWcxXvpzg97N4dwvcD735iKf31Q2ZgrAvKfVjeSUEvnzKJyyJD3GqqSZdxN4or', '1111111Bb6ysL7BRNMR8wHEmF5UhAKiePmC4w3qr3kZMEyw6s2KYGLmktQQPW4nyvyvBZj6dBn49ZjaVyZwwe9TiFe874CeaanNhcxLaASi', '112t8rne7fpTVvSgZcSgyFV23FYEv3sbRRJZzPscRcTo8DsdZwstgn6UyHbnKHmyLJrSkvF13fzkZ4e8YD5A2wg8jzUZx6Yscdr4NuUUQDAt', '112t8rnXoBXrThDTACHx2rbEq7nBgrzcZhVZV4fvNEcGJetQ13spZRMuW5ncvsKA1KvtkauZuK2jV8pxEZLpiuHtKX3FkKv2uC5ZeRC8L6we', '111111kS6f4f8WWtnm99V87baV1yLTQXTRwouZ6mGpZWjsW2oj3otBY3kR8xwYbKCGG9n1jxFawh5jvHkTLP92YGD1woMfPycMVKn1inxA'],
        rpcClient: 'https://testnet.incognito.org/fullnode',
        shardCount: 8,
        services: process.env.SERVICES ? {
            coinSvc: 'https://api-coinservice-staging.incognito.org',
            apiSvc: 'https://staging-api-service.incognito.org',
            deviceID: '9AE4B404-3E61-495D-835A-05CEE34BE251',
        } : null,
    },
    'mainnet': {
        privateKeys: [process.env.PRIVATEKEY],
        rpcClient: 'https://beta-fullnode.incognito.org/fullnode',
        shardCount: 8,
        services: process.env.SERVICES ? {
            coinSvc: 'https://api-coinservice.incognito.org',
            apiSvc: 'https://api-service.incognito.org',
            deviceID: '9AE4B404-3E61-495D-835A-05CEE34BE251',
        } : null,
    }
}
const currentNetwork = process.env.NETWORK || 'local';
let cfg = networks[currentNetwork];
const { privateKeys, rpcClient, shardCount, services } = cfg;

const getPdexMethods = (privateKey) => {
    let p = new inc.PDexV3();
    p.setAccount(account);
    p.setRPCClient(account.rpc);
    p.setStorageServices(new inc.StorageServices());
    return p;
}

module.exports = async function(){
    console.log('Initializing Incognito...');
    await inc.init(null, rpcClient, shardCount, services);
    privateKeys.push(TransportNodeHid); // hardware wallet's account
    const senders = await Promise.all(privateKeys.map(k => inc.NewTransactor(k, services)));
    const addresses = senders.map(a => a.key.base58CheckSerialize(inc.constants.PaymentAddressType));

    if (!services && currentNetwork == 'local') {
        let balance = await senders[0].getBalance({ tokenID: inc.constants.PRVIDSTR, version: 1 });
        if (balance > 0) {
            const result = await senders[0].convert({ transfer: {}});
            await senders[0].waitTx(result.txId, 2);
        }
        balance = await senders[4].getBalance({ tokenID: inc.constants.PRVIDSTR, version: 2 });
        if (balance < 1000000000) {
            const { result } = await inc.Tx(senders[0]).to(addresses[1], '1000000000000').to(addresses[2], '1000000000000').to(addresses[3], '1000000000000').to(addresses[4], '1000000000000').send().catch(console.error);
            await senders[0].waitTx(result.txId, 2);
        }
    }

    Object.assign(global, inc, {
        privateKeys, rpcClient, shardCount, services,
        addresses,
        senders,
        getPdexMethods,
    });
    console.log('Done.');
}();
