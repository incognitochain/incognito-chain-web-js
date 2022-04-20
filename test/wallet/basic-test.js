const { Wallet, Transactor : AccountWallet, constants, utils, KeyWallet, RpcClient } = require('../../');
const { PaymentAddressType, PRVIDSTR, ENCODE_VERSION } = constants;
const { base58CheckEncode : checkEncode } = utils;

// const rpcClient = new RpcClient("https://mainnet.incognito.org/fullnode");
// const rpcClient = new RpcClient("https://testnet.incognito.org/fullnode");
// const rpcClient = new RpcClient("http://localhost:9334");
// const rpcClient = new RpcClient("https://dev-test-node.incognito.org");
// const rpcClient = new RpcClient("http://54.39.158.106:9334");
// const rpcClient = new RpcClient("http://139.162.55.124:8334");   // dev-net

let wallet;
let senderPrivateKeyStr;
let senderKeyWallet;
let accountSender;
let senderPaymentAddressStr;
let receiverPaymentAddrStr;
let receiverPaymentAddrStr2;

let tokenID, secondTokenID, initialized = false;
// subsequent `setup()` calls will only change accountSender, while the first also populates the above variables
async function setup(_transactor){
    if (_transactor) accountSender = _transactor;
    if (initialized) {
        console.warn('Setup was done before. Skipping...');
        return
    }
    initialized = true;
    const [ token1, token2 ] = global.testingTokens || [];
    tokenID = token1 || "699a3006d1865ebdc437053b33df6a62c6c7c2f554f2fd0adf99a60f5117f945";
    secondTokenID = token2 || "46107357c32ffbb04d063cf8a08749cba83546a67e299fb9ffcc2a9955df4736";
    console.log(`Testing tokens ${tokenID}, ${secondTokenID}`);
    // await sleep(10000);
    // wallet = new Wallet();
    // wallet.setProvider("http://139.162.55.124:8334");
    senderPrivateKeyStr = "112t8rnXoBXrThDTACHx2rbEq7nBgrzcZhVZV4fvNEcGJetQ13spZRMuW5ncvsKA1KvtkauZuK2jV8pxEZLpiuHtKX3FkKv2uC5ZeRC8L6we";

    if (!accountSender) {
        accountSender = new AccountWallet(Wallet);
        await accountSender.setKey(senderPrivateKeyStr);
        accountSender.useCoinsService = false;
        await accountSender.submitKeyAndSync([PRVIDSTR, tokenID, secondTokenID]);
    }
    senderPaymentAddressStr = accountSender.key.base58CheckSerialize(PaymentAddressType);
    receiverPaymentAddrStr = "12shR6fDe7ZcprYn6rjLwiLcL7oJRiek66ozzYu3B3rBxYXkqJeZYj6ZWeYy4qR4UHgaztdGYQ9TgHEueRXN7VExNRGB5t4auo3jTgXVBiLJmnTL5LzqmTXezhwmQvyrRjCbED5xVWf4ETHbRCSP";
    receiverPaymentAddrStr2 = "12sm28usKxzw8HuwGiEojZZLWgvDinAkmZ3NvBNRQLuPrf5LXNLXVXiu4VBCMVDrDm97qjLrgFck3P36UTSWfqNX1PBP9PBD78Cpa95em8vcnjQrnwDNi8EdkdkSA6CWcs4oFatQYze7ETHAUBKH";
}
async function TestGetBalance() {
    await setup();
    // create and send PRV
    try {
        // accountSender.useCoinsService = true;
        let balance = await accountSender.getBalance();
        console.log("balance: ", balance.toString());
    } catch (e) {
        console.log("Error when get balance: ", e);
    }
}
async function TestGetAllPrivacyTokenBalance() {

    await setup();
    // create and send PRV
    try {
        let result = await accountSender.getAllPrivacyTokenBalance();
        console.log("result: ", result);
    } catch (e) {
        console.log("Error when get balance: ", e);
    }
}
async function TestGetRewardAmount() {

    await setup();
    // get reward amount
    let response0;
    try {
        response0 = await accountSender.getRewardAmount(false, "");
    } catch (e) {
        console.log(e);
    }
    console.log("Response getRewardAmount: ", response0);
}
async function TestCreateAndSendRewardAmountTx() {

    await setup();

    let fee = 10;
    let response;
    try {
        response = await accountSender.createAndSendWithdrawRewardTx({ transfer: { fee }});
        console.log("Response createAndSendWithdrawRewardTx: ", response);
        return response.Response.txId;
    } catch (e) {
        console.log(e);
        throw e;
    }
}
async function TestBurningRequestTx() {

    await setup();

    let fee = 20;
    // create and send burning request tx
    let response;
    try {
        response = await accountSender.createAndSendBurningRequestTx({ transfer: { fee, tokenID }, extra: { remoteAddress: "d5808Ba261c91d640a2D4149E8cdb3fD4512efe4", burnAmount: 100 }});
        console.log("Response createAndSendBurningRequestTx: ", response);
        return response.Response.txId;
    } catch (e) {
        // this tx specifically depends on bridge config, so we let it skip and review manually
        console.error(e);
        // throw e;
    }
}
async function TestStakerStatus() {

    // sender key
    await setup();

    // get staker status
    let response0;
    try {
        response0 = await accountSender.stakerStatus();
    } catch (e) {
        console.log(e);
    }

    console.log("Response status staker: ", response0);
}
async function TestCreateAndSendNativeToken() {

    await setup();
    let fee = 10;
    let info = "INFOFO";
    let amountTransfer = 1000000000; // in nano PRV
    console.log("Will Transfer: ", amountTransfer);

    let paymentInfosParam = [];
    paymentInfosParam[0] = {
        "PaymentAddress": receiverPaymentAddrStr,
        "Amount": amountTransfer,
        "Message": "ABC"
    };

    // create and send PRV
    try {
        let res = await accountSender.createAndSendNativeToken({ transfer: { prvPayments: paymentInfosParam, fee, info }, extra: { isEncryptMessage: true }});
        console.log('Send tx succesfully with TxID: ', res.Response.txId);
        return res.Response.txId;
    } catch (e) {
        console.log("Error when send PRV: ", e);
        throw e;
    }
}
async function TestSendMultiple() {
    await setup();

    let info = "";

    const receivers = [
        '12shR6fDe7ZcprYn6rjLwiLcL7oJRiek66ozzYu3B3rBxYXkqJeZYj6ZWeYy4qR4UHgaztdGYQ9TgHEueRXN7VExNRGB5t4auo3jTgXVBiLJmnTL5LzqmTXezhwmQvyrRjCbED5xVWf4ETHbRCSP',
        '12sm28usKxzw8HuwGiEojZZLWgvDinAkmZ3NvBNRQLuPrf5LXNLXVXiu4VBCMVDrDm97qjLrgFck3P36UTSWfqNX1PBP9PBD78Cpa95em8vcnjQrnwDNi8EdkdkSA6CWcs4oFatQYze7ETHAUBKH',
    ];
    const amount = 2020;
    const paymentInfos = receivers.map(item => ({
        "PaymentAddress": item,
        "Amount": amount,
    }));
    try{
        const res = await accountSender.createAndSendNativeToken({ transfer: { prvPayments: paymentInfos, fee: 100, info }});
        console.log('Send tx succesfully with TxID: ', res.Response.txId);
        return res.Response.txId;
    }catch(e){
        console.log("error:",e);
        throw e;
    }
}
async function TestCreateAndSendConversion() {

    await setup();
    let fee = 100;
    let info = "";
    console.log("Will convert all PRV");

    let paymentInfosParam = [];

    // create and send PRV
    try {
        let res = await accountSender.createAndSendConvertTx({ transfer: { prvPayments: paymentInfosParam, fee, info }, extra: { isEncryptMessage: true }});
        console.log('Send tx succesfully with TxID: ', res.Response.txId);
        return res.Response.txId;
    } catch (e) {
        console.log("Error when send PRV: ", e);
        throw e;
    }
}
async function TestCreateAndSendTokenConversion() {

    await setup();
    let fee = 100;
    let info = "";
    // use the global var tokenID instead
    // let tokenID = "89eddbfac0e6c4827f378c4c453c9011c2b78e50cc54479d70914c505946d526";
    console.log("Will convert all coins of token", tokenID);

    // PRV for fee, token for convert. So no payment info needed
    let paymentInfo = [];
    let tokenPaymentInfo = [];

    // create and send PRV
    try {
        let res = await accountSender.createAndSendTokenConvertTx({ transfer: { tokenID, prvPayments: paymentInfo, tokenPayments: tokenPaymentInfo, fee, info }, extra: { isEncryptMessageToken: true }});
        console.log('Send tx succesfully with TxID: ', res.Response.txId);
        return res.Response.txId;
    } catch (e) {
        console.log("Error when send PRV: ", e);
        throw e;
    }
}

async function TestCreateAndSendPrivacyTokenInit() {

    await setup();
    // payment info for PRV
    let paymentInfos = [];
    // prepare token param for tx privacy token init
    let amountInit = 10000;
    let tokenParams = {
        TokenID: "",
        TokenName: "Rose1",
        TokenSymbol: "RSE",
        TokenTxType: CustomTokenInit,
        Amount: amountInit
    }
    let tokenPaymentInfo = [{
            PaymentAddress: senderPaymentAddressStr,
            Amount: amountInit,
            Message: "Your token",
    }]

    let feePRV = 50;

    try {
        let res = await accountSender.newToken({ transfer: { tokenPayments: tokenPaymentInfo, fee: feePRV }, extra: { tokenName: tokenParams.TokenName, tokenSymbol: tokenParams.TokenSymbol }});
        console.log('Send tx succesfully with TxID: ', res.Response.txId);
        console.log('Waiting for new token balance to update');
        const change = await accountSender.waitBalanceChange(res.TokenID);
        console.log(change);
        return {
            tokenID: res.TokenID,
            Response: res.Response
        }
    } catch (e) {
        console.log("Error when initing ptoken: ", e);
        throw e;
    }
}

async function TestCreateAndSendPrivacyTokenTransfer() {
    await setup();

    let paymentInfos = [];
    let amountTransfer = 44;

    // prepare token param for tx custom token init
    let tokenPaymentInfo = [{
            PaymentAddress: receiverPaymentAddrStr,
            Amount: amountTransfer,
            Message: "Transfer ptoken"
    }]

    let feePRV = 10;
    let hasPrivacy = true;

    try{
        let res = await accountSender.createAndSendPrivacyToken({ transfer: { tokenID, prvPayments: paymentInfos, tokenPayments: tokenPaymentInfo, fee: feePRV, info: "SOME INFO WHEN TRANSFERRING TOKEN" }});
        console.log('Send tx succesfully with TxID: ', res.Response.txId);
        return res.Response.txId;
    }catch (e) {
        console.log("Error when transferring ptoken: ", e);
        throw e;
    }
}

async function TestMultipleSendPrivacyToken() {

    await setup();

    let paymentInfos = [];
    let amountTransfer = 100;

    // prepare token param for tx custom token init
    let tokenPaymentInfo = [{
            PaymentAddress: receiverPaymentAddrStr,
            Amount: amountTransfer,
            Message: "Transfer ptoken"
    },
    {
            PaymentAddress: receiverPaymentAddrStr2,
            Amount: amountTransfer,
            Message: "Transfer ptoken 2"
    }]

    let feePRV = 10;

    try{
        let res = await accountSender.createAndSendPrivacyToken({ transfer: { tokenID, prvPayments: paymentInfos, tokenPayments: tokenPaymentInfo, fee: feePRV }});
        console.log('Send tx succesfully with TxID: ', res.Response.txId);
        return res.Response.txId;
    }catch (e) {
        console.log("Error when transferring ptoken: ", e);
        throw e;
    }
}
async function TestCreateAndSendStakingTx() {
    await setup();

    let param = {
        type: 0
    };
    let fee = 30;
    let candidatePaymentAddress = senderPaymentAddressStr;
    // let candidateMiningSeedKey = "12VH5z8JCn9B8SyHvB3aYP4ZGr1Wf9Rywx2ZSBe3eQneADzJ3bL";
    let rewardReceiverPaymentAddress = senderPaymentAddressStr;
    let autoReStaking = true;

    let candidateMiningSeedKey = checkEncode(accountSender.key.getMiningSeedKey(), ENCODE_VERSION);

    // create and send staking tx
    try {
        // we only test that the staking TX is created successfully; submitting is skipped since we would need to keep a validator node running
        accountSender.offlineMode = true;
        let response = await accountSender.createAndSendStakingTx({ transfer: { fee }, extra: { candidatePaymentAddress, candidateMiningSeedKey, rewardReceiverPaymentAddress, autoReStaking, stakingType: param.type }});
        accountSender = new AccountWallet(Wallet);
        await accountSender.setKey(senderPrivateKeyStr);
        accountSender.useCoinsService = false;
        accountSender.isSubmitOtaKey = true;
        return response.Response.txId;
    } catch (e) {
        console.log("Error when staking: ", e);
        throw e;
    }
}
async function TestCreateAndSendStopAutoStakingTx() {

    await setup();
    let fee = 5;
    let candidatePaymentAddress = senderPaymentAddressStr;
    let candidateMiningSeedKey = checkEncode(accountSender.key.getMiningSeedKey(), ENCODE_VERSION);

    // create and send staking tx
    try {
        let response = await accountSender.createAndSendStopAutoStakingTx({ transfer: { fee }, extra: { candidatePaymentAddress, candidateMiningSeedKey }});
        return response.Response.txId;
    } catch (e) {
        // since we tolerate staking TX being rejected, we do the same for stop-staking TX
        console.error("Error when sending stop-staking TX: ", e);
        // throw e;
    }
}
async function TestDefragment() {
    await setup();
    // create and send defragment tx
    let response;
    try {
        response = await accountSender.defragmentNativeCoin({ transfer: { fee: 100 }});
    } catch (e) {
        console.log(e);
        throw e;
    }

    console.log("Response defragment: ", response);
}
async function TestMakeFragments() {
    await setup();
    const senders = [
        '112t8rnZDRztVgPjbYQiXS7mJgaTzn66NvHD7Vus2SrhSAY611AzADsPFzKjKQCKWTgbkgYrCPo9atvSMoCf9KT23Sc7Js9RKhzbNJkxpJU6'
    ];

    let utxos = 0;
    // the address of our testing Account; it will receive a lot of 'fragments'
    const receiver = '12sxXUjkMJZHz6diDB6yYnSjyYcDYiT5QygUYFsUbGUqK8PH8uhxf4LePiAE8UYoDcNkHAdJJtT1J6T8hcvpZoWLHAp8g6h1BQEfp4h5LQgEPuhMpnVMquvr1xXZZueLhTNCXc8fkVXseeVAGCt8';

    const amountTransfer = 200;
    let paymentInfos = new Array(30);
    paymentInfos.fill({
        "PaymentAddress": receiver,
        "Amount": amountTransfer,
    });

    while (utxos < 150) {
        for (const sender of senders) {
            let accountSender = new AccountWallet(Wallet);
            await accountSender.setKey(sender);

            // create and send PRV
            let res = await accountSender.createAndSendNativeToken({ transfer: { prvPayments: paymentInfos, fee: 100, info: "Fragment" }});
            console.log('Send tx succesfully with TxID: ', res.Response.txId);
            await accountSender.waitTx(res.Response.txId, 3);
        }

        utxos += paymentInfos.length * senders.length;
        console.log('NEW UTXOs', utxos);
    }
}
/************************* DEX **************************/

async function TestCustomContribution(pdeContributionPairID, contributingTokenID, contributedAmount) {
    await setup();
    let fee = 50;
    // let pdeContributionPairID = "123";
    // let contributedAmount = 1000000;

    try {
        let response = await accountSender.createAndSendTxWithContribution({
            transfer: { fee, tokenID: contributingTokenID },
            extra: { pairID: pdeContributionPairID, contributedAmount }
        });
        return response.Response.txId;
    } catch (e) {
        console.log("Error when staking: ", e);
        throw e;
    }
}
async function TestCustomTradeRequest(tokenIDToSellStr, tokenIDToBuyStr, sellAmount, minAcceptableAmount) {
    await setup();

    let feePRV = 50;
    // let sellAmount = 300;
    // let tokenIDToSellStr = tokenID;
    // let tokenIDToBuyStr = null;
    // let minAcceptableAmount = 2900;
    let tradingFee = 50;

    // create and send staking tx
    try {
        let res = await accountSender.createAndSendNativeTokenTradeRequestTx({
            transfer: { feePRV },
            extra: { tokenIDToBuy: tokenIDToBuyStr, sellAmount, minAcceptableAmount, tradingFee, tokenIDToSell: tokenIDToSellStr }
        });
        return res.Response.txId;
        console.log("RESPONSE: ", res);
    } catch (e) {
        console.log("Error when trading native token: ", e);
        throw e;
    }
}

async function TestCreateAndSendPDEWithdrawTx() {
    await setup();
    let fee = 10;
    let withdrawShareAmount = 500;
    let tokenID1 = null;
    let tokenID2 = tokenID;

    try {
        let res = await accountSender.createAndSendWithdrawDexTx({
            transfer: { fee },
            extra: { tokenIDs: [ tokenID1, tokenID2 ], withdrawalShareAmt: withdrawShareAmount }
        });
        return res.Response.txId;
    } catch (e) {
        console.log("Error when withdrawing pdex: ", e);
        throw e;
    }
}
async function TestGetOutputCoins() {
    await setup();
    // get all PRV coins from both versions (including spent coins)
    let allCoins = await accountSender.fetchOutputCoins(null, -1);
    console.log("allCoins: ", allCoins);
}

async function GetListReceivedTx() {
    await setup();
    try{
        let receivedTxs = await accountSender.getReceivedTransaction();
        console.log(receivedTxs);
    }catch(e){
        throw e;
    }
}

// to run this test flow, make sure the Account has enough PRV to stake & some 10000 of this token
async function MainRoutine(){
    console.log("BEGIN WEB WALLET TEST");
    // sequential execution of tests
    try{
        let txh;
        // `convert` is not repeatable on devnet
        // txh = await TestCreateAndSendConversion();
        // await accountSender.waitTx(txh, 5);
        // txh = await TestCreateAndSendNativeToken();
        // await accountSender.waitTx(txh, 5);
        // txh = await TestCreateAndSendTokenConversion();
        // await accountSender.waitTx(txh, 5);

        await TestGetBalance();
        await TestGetAllPrivacyTokenBalance();

        txh = await TestCreateAndSendStakingTx();
        if (txh){
            await accountSender.waitTx(txh, 5);
        } else {
            console.warn('Tx was successfully created, but rejected !');
        }
        txh = await TestCreateAndSendStopAutoStakingTx();
        if (txh){
            await accountSender.waitTx(txh, 5);
        } else {
            console.warn('Tx was successfully created, but rejected !');
        }
        // await GetListReceivedTx();
        await TestStakerStatus();
        txh = await TestSendMultiple();
        await accountSender.waitTx(txh, 5);
        // burning TX could be rejected due to environment configs
        txh = await TestBurningRequestTx();
        if (txh){
            await accountSender.waitTx(txh, 5);
        } else {
            console.warn('Tx was successfully created, but rejected !');
        }
        txh = await TestCreateAndSendPrivacyTokenTransfer();
        await accountSender.waitTx(txh, 5);
        await accountSender.waitTx(txh, 5);
        await TestGetOutputCoins();
    }catch(e){
        console.log("Test failed");
        console.error(e);
        throw e;
    }
    console.log("END WEB WALLET TEST");
}
// MainRoutine();

// to run this test flow, make sure the Account has about 2.5mil PRV, 120k of each of FIRST and SECOND token; all version 2
async function PDERoutine(){
    console.log("BEGIN PDE TEST");
    try{
        let txh;
        // // 10:1 ratio; contribute 1mil PRV and 100k token
        txh = await TestCustomContribution("first-prv", null, 1000000);
        // console.debug(txh);
        await accountSender.waitTx(txh, 5);
        txh = await TestCustomContribution("first-prv", tokenID, 100000);
        await accountSender.waitTx(txh, 5);
        // sell 10000 PRV for at least 800 token
        txh = await TestCustomTradeRequest(null, tokenID, 10000, 800);
        await accountSender.waitTx(txh, 5);
        // sell 1000 token for at least 8000 PRV
        txh = await TestCustomTradeRequest(tokenID, null, 1000, 8000);
        // the final wait time is extended to accomodate beacon response delay
        await accountSender.waitTx(txh, 15);

        // to cross trade, we need the above pair and a new second-prv pair
        // also 10:1 ratio
        txh = await TestCustomContribution("second-prv", null, 1000000);
        await accountSender.waitTx(txh, 5);
        txh = await TestCustomContribution("second-prv", secondTokenID, 100000);
        await accountSender.waitTx(txh, 5);
        // sell 15000 FIRST for at least 14000 SECOND
        txh = await TestCustomTradeRequest(tokenID, secondTokenID, 15000, 10000);
        await accountSender.waitTx(txh, 5);
        // sell 5000 SECOND for at least 4000 PRV
        txh = await TestCustomTradeRequest(secondTokenID, tokenID, 5000, 3000);
        await accountSender.waitTx(txh, 15);

        // withdraw some from the first pair
        txh = await TestCreateAndSendPDEWithdrawTx();
        await accountSender.waitTx(txh, 5);
        // deprecated test flows
        // await TestCreateAndSendPRVContributionTx();
        // await wallet.sleep(10000);
        // await TestCreateAndSendPTokenContributionTx();
        // await wallet.sleep(30000);
        // await TestCreateAndSendNativeTokenTradeRequestTx();
        // await wallet.sleep(30000);
        // await TestCreateAndSendPTokenTradeRequestTx();
        // await wallet.sleep(100000);

        console.log("Remember to check the balance of these accounts")
    }catch(e){
        console.log("Test failed");
        console.error(e);
        throw e;
    }
    console.log("END PDE TEST");
}
// PDERoutine();

// to use this test flow, make sure acc1 has some 10000s in PRV in version 2 coins
async function DefragmentRoutine(){
    console.log("BEGIN DEFRAG TEST");
    try{
        await TestMakeFragments();
        // await wallet.sleep(20000);
        await TestDefragment();
    }catch(e){
        console.log("Test failed");
        console.error(e);
        throw e;
    }
    console.log("END DEFRAG TEST");
}
// DefragmentRoutine()

module.exports = {
    AccountWalletTestSetup: setup,
    MainRoutine,
    PDERoutine,
    DefragmentRoutine
}
