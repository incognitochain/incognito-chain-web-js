const {
    PRV_ID,
    ACCESS_ID,
    PRIVACY_VERSION,
    setupWallet
} = require("./constants")

let wallet;
let accountSender;
let pDexV3Instance;

async function setup() {
    const data = await setupWallet();
    wallet = data.wallet;
    accountSender = data.accountSender;
    pDexV3Instance = data.pDexV3Instance;
}

async function TestGetBalance() {
    try {
        const keyInfo = await accountSender.getKeyInfo({
            version: PRIVACY_VERSION,
        });
        const tokenIDs = [
            PRV_ID,
        ];
        // console.log("KEY INFO", { keyInfo, tokenIDs });
        let task = tokenIDs.map((tokenID) =>
            accountSender.getBalance({
                tokenID,
                version: PRIVACY_VERSION,
            })
        );
        console.log("BALANCE", await Promise.all(task));
    } catch (e) {
        console.log("TestGetBalance error: ", e);
    }
}

async function TestGetBalanceAccessOTA() {
    try {
        const keyInfo = await accountSender.getKeyInfo({
            version: PRIVACY_VERSION,
        });
        console.log("KEY INFO", keyInfo, ACCESS_ID);
        const balance = await accountSender.getBalance({
            tokenID: ACCESS_ID,
            version: PRIVACY_VERSION,
            isNFT: true,
        })
        console.log("BALANCE ACCESS_OTA", balance);
    } catch (e) {
        console.log("TestGetBalance error: ", e);
    }
}

async function TestGetListShare() {
    try {
        const share = await pDexV3Instance.getListShare();
        // console.log('TestGetListShare: ', share)
    } catch (error) {
        console.log('TestGetListShare error: ', error)
    }
}

async function TestGetNFTData() {
    try {
        const start = new Date().getTime()
        const data = await pDexV3Instance.getNFTTokenData({ version: PRIVACY_VERSION });
        const end = new Date().getTime()
        console.log('NFT DATA: ', data);
        console.log('NFT LOAD TIME: ', end - start);
    } catch (error) {
        console.log('TestGetNFTData error: ', error);
    }
}

async function TestGetLPHistory() {
    try {
        const data = await pDexV3Instance.getRemoveLPHistoriesApi({ version: PRIVACY_VERSION });
        console.log('TestGetLPHistory: ', data);
    } catch (error) {
        console.log('TestGetLPHistory error: ', error);
    }
}

async function TestGetOrderHistory() {
    try {
        const listNFTToken = await pDexV3Instance.getNFTTokenIDs();
        const poolID =
            '0000000000000000000000000000000000000000000000000000000000000004-292f55f94a828084236d61125f49d6b4cdd93ba74bbf161a40564a0d1a3f142f-0eafc9bb42b577d2fbd8401571c31eeae6833e4665e5312e4948725e9ad6dc78'
        const data = await pDexV3Instance.getOrderLimitHistoryFromApi({
            poolid: poolID,
            listNFTToken,
            version: PRIVACY_VERSION,
        });
        console.log('TestGetOrderHistory: ', data);
    } catch (error) {
        console.log('TestGetOrderHistory error: ', error);
    }
}

async function TestGetOpenOrderHistory() {
    try {
        const listNFTToken = await pDexV3Instance.getNFTTokenIDs();
        const data = await pDexV3Instance.getOpenOrderLimitHistoryFromApi({
            listNFTToken,
        });
        console.log('TestGetOpenOrderHistory: ', data);
        console.log('TestGetOpenOrderHistory length: ', data.length);

    } catch (error) {
        console.log('TestGetOpenOrderHistory error: ', error);
    }
}

async function TestCreateContributeAccessOTA() {
    try {
        const tokenIDs = [
            PRV_ID,
            '81fda0081019672cd418c3fc0cbd81ef5937a164ac090c8dc41956f5940d863f',
        ]
        const PoolID = '0000000000000000000000000000000000000000000000000000000000000004-81fda0081019672cd418c3fc0cbd81ef5937a164ac090c8dc41956f5940d863f-0625bff2b7003e63162b57a056b44e63675e9dc7f8dcb49efb9953366ca29a15';
        const result = await accountSender.createContributeTxsWithAccessToken({
            fee: 100,
            tokenId1: tokenIDs[0],
            tokenId2: tokenIDs[1],
            amount1: 2,
            amount2: 1,
            poolPairID: PoolID,
        });
        console.log('TestCreateContributeAccessOTA:::: ', result)
    } catch (e) {
        console.log('TestCreateContributeAccessOTA error: ', e);
    }
}

async function TestCreateTransactionPApps() {
    try {
        await pDexV3Instance.createTransactionPApps({
            transfer: { version: PRIVACY_VERSION },
            extra: {
                sellTokenID: '3a526c0fa9abfc3e3e37becc52c5c10abbb7897b0534ad17018e766fc6133590',
                senderFeeAddressShardID: 3,

                feeReceiverAddress: "12seyCLbpyNuz3mjtiWKegnE3dGY1nDtvrhgYwxfoHvyj6pDA3Bw1rkSE9HUwCnGeJn5ai4mLmbhB4CgNi8KRCbaR49BvbiuAxfLM6sjhJqVfkGWvrEBbAMsuEMNvZymnGmLZdnmvt7Q9Grc8qBY",
                feeTokenID: "0000000000000000000000000000000000000000000000000000000000000004",
                feeAmount: "1360490675",

                // data metadata
                sellAmount: "1000000",
                callContract: "0xf31D49B636C24a854Eabe9BB05e85baA7411A380", // proxy route
                callData: "421f4388000000000000000000000000c2c527c0cacf457746bd31b2a698fe89de2b6d49000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000f31d49b636c24a854eabe9bb05e85baa7411a38000000000000000000000000000000000000000000000000000000000000003e7000000000000000000000000000000000000000000000000000000a9861ddcf600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001",
                exchangeNetworkID: 1, // networkID exchange, exp: ETH = 1
                buyTokenID: "c2a62282b58500e329c51ab40bc4f298cd57cce4e17a2912f48d6aec1840b4be",
                buyContractID: "0x0000000000000000000000000000000000000000",
                // remoteAddress, case reDeposit = 0x0000000000000000000000000000000000000000
                // send out EVN use user address
                remoteAddress: "0x0000000000000000000000000000000000000000"
            }
        });
        console.log('TestCreateTransactionPApps:::: ')
    } catch (e) {
        console.log('TestCreateContributeAccessOTA error: ', e);
    }
}

async function TestSwapHistory() {
    try {
        const contract = [
            '0xf31D49B636C24a854Eabe9BB05e85baA7411A380',
            '0x0e2923c21E2C5A2BDD18aa460B3FdDDDaDb0aE18'
        ];

        // storage PApps
        await pDexV3Instance.setStorageSwapHistoryByCallContract({
            callContract: '0xf31D49B636C24a854Eabe9BB05e85baA7411A380',
            txHash: '56ab7e00bdcb29008227b5590005c28534e3a18cd13dcc7f19acbb32832b871e',
            sellTokenID: '0000000000000000000000000000000000000000000000000000000000000004',
            buyTokenID: 'd6644f62d0ef0475335ae7bb6103f358979cbfcd2b85481e3bde2b82101a095c',
            sellAmountText: '0.002',
            buyAmountText: '0.003',
        });

        // storage PDEX
        await pDexV3Instance.setStorageSwapHistoryByCallContract({
            callContract: 'incognito',
            txHash: 'aa066120cca1b10e202fd3747c9dd50e0f992983e5ea3c50d315060f398ac699',
            sellTokenID: '61e1efbf6be9decc46fdf8250cdae5be12bee501b65f774a58af4513b645f6a3',
            buyTokenID: '4584d5e9b2fc0337dfb17f4b5bb025e5b82c38cfa4f54e8a3d4fcdd03954ff82',
            sellAmountText: '0.004',
            buyAmountText: '0.006',
        });

        const txs = await pDexV3Instance.getSwapHistoryStorage({
            callContracts: contract
        })
        console.log('TestSwapHistory:::: ', txs)
    } catch (e) {
        console.log('TestSwapHistory error: ', e);
    }
}

async function TestCreateOTASenderID() {
    try {
        const OTA = await accountSender.getOTAReceiveWithCfg({ senderShardID: 3 });
        console.log('TestCreateOTASenderID ', OTA)
    } catch (e) {
        console.log('TestCreateOTASenderID error: ', e);
    }
}


async function RunTest() {
    console.log("BEGIN WEB PDEX3 TEST");
    await setup();
    await TestCreateOTASenderID();
    // await TestSwapHistory()
    // await TestCreateTransactionPApps();
    // await TestGetBalance();
    // await TestGetBalanceAccessOTA();
    // await TestGetListShare();
    // await TestGetTxsHistory()
    // await TestGetNFTData();
    // await TestGetLPHistory();
    // await TestGetOrderHistory();
    // await TestGetOpenOrderHistory();
}

RunTest()