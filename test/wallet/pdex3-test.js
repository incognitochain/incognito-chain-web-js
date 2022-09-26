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

async function TestGetOTAReceiveWithCfg() {
    try {
        const otaReceiverWithCfg = await accountSender.getOTAReceiveWithCfg();
        console.log('TestGetOTAReceiveWithCfg:::: ', otaReceiverWithCfg)
    } catch (e) {
        console.log('TestCreateContributeAccessOTA error: ', e);
    }
}

async function RunTest() {
    console.log("BEGIN WEB PDEX3 TEST");
    await setup();
    await TestGetOTAReceiveWithCfg();
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