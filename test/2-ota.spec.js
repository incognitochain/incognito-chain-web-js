const Inc = require('..');
const { setup, expect, bn } = require('./setup');

let getFirstTokenID = (lst) => {
    if (global.testingTokens && global.testingTokens[0]) return global.testingTokens[0];
    let tokens = lst.filter(t => t.Symbol.length >= 3);
    if (tokens.length > 0) return tokens[0].ID;
    else throw 'Error : a token is required'
}

// assume the pool is at rate 1:1
let createTxsWithSameOTAs = async (ctx, amount, tokenID, overrideSubOTA = false, sellPRV = true) => {
    ctx.transactors[0].offlineMode = true;
    ctx.transactors[1].offlineMode = true;
    transferAmount = new bn(amount);
    let sellAmount = transferAmount.muln(10);
    // make TXs from different origins to make sure there's no double spent input
    // send PRV and token to the same receiver in one tx
    const paymentInfos = [new Inc.types.PaymentInfo(ctx.incAddresses[0], transferAmount.toString())];
    let txTransferResult = await ctx.transactors[1].token({ transfer: { tokenID, prvPayments: paymentInfos, tokenPayments: paymentInfos, fee: 10 }});

    let output;
    if (sellPRV) {
        output = txTransferResult.Outputs[0];
    } else {
        output = txTransferResult.Outputs[txTransferResult.Outputs.length - 1];
    }
    const otaPubkey = Inc.utils.base58CheckDecode(output.PublicKey).bytesDecoded;
    console.log("Created PRV transfer that includes OTA", Inc.utils.byteToHexString(otaPubkey));
    const burningAddress = await ctx.inc.rpc.getBurningAddress(15);
    let prv = Inc.constants.PRVIDSTR;
    let tokenIDToBuyStr = prv;
    let tokenIDToSellStr = prv;
    if (sellPRV){
        tokenIDToBuyStr = tokenID;
    } else {
        tokenIDToSellStr = tokenID;
    }
    // tradingFee is 10
    amount = new bn(10);
    let tokenPaymentInfos = [];
    if (sellPRV){
        amount.iadd(sellAmount);
    }else{
        tokenPaymentInfos = [{
            PaymentAddress: burningAddress,
            Amount: sellAmount.toString(),
            Message: "",
        }];
    }

    const prvPaymentInfos = [{
        PaymentAddress: burningAddress,
        Amount: amount.toString(),
        Message: "",
    }];
    let pInf = {
        PaymentAddress: ctx.transactors[0].key.base58CheckSerialize(Inc.constants.PaymentAddressType),
        Amount: "0"
    }
    let temp = await ctx.transactors[0].wasm.createCoin(JSON.stringify({PaymentInfo : pInf, TokenID: null}));
    let newCoin = JSON.parse(temp);

    let metadata = {
        TokenIDToBuyStr: tokenIDToBuyStr,
        TokenIDToSellStr: tokenIDToSellStr,
        SellAmount: sellAmount.toString(),
        Type: 205,
        MinAcceptableAmount: 0,
        TradingFee: 10,
        TraderAddressStr: newCoin.PublicKey,
        TxRandomStr: newCoin.TxRandom,
        SubTraderAddressStr: newCoin.PublicKey,
        SubTxRandomStr: newCoin.TxRandom,
    };
    if (overrideSubOTA) {
        metadata.SubTraderAddressStr = output.PublicKey;
        metadata.SubTxRandomStr = output.TxRandom;
    } else {
        metadata.TraderAddressStr = output.PublicKey;
        metadata.TxRandomStr = output.TxRandom;
    }
    let txRequestResult;
    if (sellPRV){
        txRequestResult = await ctx.transactors[0].make({ transfer: { prvPayments: prvPaymentInfos, fee: 10 }, extra: { metadata }});
    }else{
        txRequestResult = await ctx.transactors[0].make({ transfer: { prvPayments: prvPaymentInfos, tokenPayments: tokenPaymentInfos, fee: 10 }, extra: { metadata, tokenIDToSell: tokenIDToSellStr }});
    }
    return [txTransferResult, txRequestResult]
}

let frontRunPRVTradeRequest = (amount) => async function() {
    let tokenID = getFirstTokenID(this.incTokens);
    let txTransferResult, txRequestResult;
    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID);
    let res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded);
    await this.transactors[0].waitTx(res.TxID, 2);
    let theError = {};
    res = await this.inc.rpc.sendRawTx(txRequestResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);

    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID, true);
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded);
    await this.transactors[0].waitTx(res.TxID, 2);
    res = await this.inc.rpc.sendRawTx(txRequestResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);
}

let frontRunTokenTradeRequest = (amount) => async function() {
    let tokenID = getFirstTokenID(this.incTokens);
    let txTransferResult, txRequestResult;
    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID, false, false);
    let res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded);
    await this.transactors[0].waitTx(res.TxID, 2);
    let theError = {};
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txRequestResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);
}

let overridePRVTransfer = (amount) => async function() {
    let tokenID = getFirstTokenID(this.incTokens);
    let txTransferResult, txRequestResult;
    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID);
    let res = await this.inc.rpc.sendRawTx(txRequestResult.Tx.Encoded);
    await this.transactors[0].waitTx(res.TxID, 2);
    let theError = {};
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);

    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID, true);
    res = await this.inc.rpc.sendRawTx(txRequestResult.Tx.Encoded);
    await this.transactors[0].waitTx(res.TxID, 2);
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);
}

let overrideTokenTransfer = (amount) => async function() {
    let tokenID = getFirstTokenID(this.incTokens);
    let txTransferResult, txRequestResult;
    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID, false, false);
    let res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txRequestResult.Tx.Encoded);
    await this.transactors[0].waitTx(res.TxID, 2);
    let theError = {};
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);
}

let frontRunTradeRequestSameBlock = (amount) => async function() {
    let tokenID = getFirstTokenID(this.incTokens);
    let txTransferResult, txRequestResult;
    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID);
    let res = await this.inc.rpc.sendRawTx(txRequestResult.Tx.Encoded);
    let txId = res.TxID;
    let theError = {};
    // prv
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);
    await this.transactors[0].waitTx(txId, 2);
    // prv in sub
    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID, true);
    res = await this.inc.rpc.sendRawTx(txRequestResult.Tx.Encoded);
    txId = res.TxID;
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);
    await this.transactors[0].waitTx(txId, 2);
    // token
    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID, false, false);
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txRequestResult.Tx.Encoded);
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);
}

let overrideTransferSameBlock = (amount) => async function() {
    let tokenID = getFirstTokenID(this.incTokens);
    let txTransferResult, txRequestResult;
    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID);
    let res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded);
    let txId = res.TxID;
    let theError = {};
    res = await this.inc.rpc.sendRawTx(txRequestResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);
    await this.transactors[0].waitTx(txId, 2);

    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID, true);
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded);
    txId = res.TxID;
    res = await this.inc.rpc.sendRawTx(txRequestResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);
    await this.transactors[0].waitTx(txId, 2);

    [txTransferResult, txRequestResult] = await createTxsWithSameOTAs(this, amount, tokenID, false, false);
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txTransferResult.Tx.Encoded);
    res = await this.inc.rpc.sendRawTxCustomTokenPrivacy(txRequestResult.Tx.Encoded).catch((e) => theError = e);
    expect(theError, `TX not expected to succeed ${JSON.stringify(res)}`).to.have.property('Code').that.equals(-6005);
    console.error("Chain Rejected TX with :", theError);
}

let withdrawReward = () => async function() {
    console.log(this.incAddresses[0], " => wait for staker reward");
    let maxWaitTime = this.transactors[0].timeout;
    let rewardAmount = new bn(0);
    while(rewardAmount.lten(0)) {
        try {
            // get reward amount for acc0, shard0
            const response = await this.inc.rpc.getRewardAmount(this.incAddresses[0]);
            // console.log(response);
            rewardAmount = new bn(response.rewards.PRV);
            // wait 3sec between requests
            maxWaitTime = await this.transactors[0].sleepCapped(3000, maxWaitTime);
        } catch (e) {
            throw `Error querying reward : ${e}`
        }
    }
    console.log(`Reward : ${rewardAmount.toString()}`);
    const balanceBefore = await this.transactors[0].balance();
    const fee = 10;
    let res;
    try {
        res = await this.transactors[0].withdraw({ transfer: { fee }});
        await this.transactors[0].waitTx(res.Response.txId);
    } catch (e) {
        console.error(e);
        throw e;
    }
    const balance = await this.transactors[0].balance();
    const bChange = new bn(balance).addn(fee).sub(new bn(balanceBefore));
    expect(bChange, 'balance change vs reward mismatch').to.bignumber.equal(rewardAmount);
}

describe.skip('OTA tests', async function() {
    before(setup());
    const startAmount = 50;
    it('should fail to front-run trade request with a PRV transfer', frontRunPRVTradeRequest(startAmount));
    it('should fail to override OTA from a PRV transfer with a trade request', overridePRVTransfer(startAmount));
    
    it('should fail to front-run trade request with a token transfer', frontRunTokenTradeRequest(startAmount));
    it('should fail to override OTA from a token transfer with a trade request', overrideTokenTransfer(startAmount));

    it('should fail to front-run trade with a same-block transfer', frontRunTradeRequestSameBlock(startAmount));
    it('should fail to override OTA with a same-block trade request', overrideTransferSameBlock(startAmount));
    it('should withdraw reward for TEST staker successfully', withdrawReward())
})