
const {
    PRV_ID,
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

async function TestGetTxsHistory() {
    try {
        const params = {
            tokenID: PRV_ID,
            version: PRIVACY_VERSION,
            isPToken: true,
        };
        const txs = await accountSender.getTxsHistory({
            isPToken: true,
            ...params,
        });
        console.log('TestGetTxsHistory: ', txs)
    } catch(e) {
        console.log("TestGetTxsHistory error: ", e);
    }
}

async function TestGetListShare() {
    try {
        const share = await pDexV3Instance.getListShare();
        console.log('TestGetListShare: ', share)
    } catch (error) {
        console.log('TestGetListShare error: ', error)
    }
}

async function RunTest() {
    console.log("BEGIN WEB PDEX3 TEST");
    await setup();
    await TestGetBalance();
    await TestGetListShare();
    // await TestGetTxsHistory()
}

RunTest()