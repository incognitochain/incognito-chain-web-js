import bn from 'bn.js';
import {
    CustomTokenInit,
    TxNormalType,
    TxCustomTokenPrivacyType,
    CustomTokenTransfer,
    MaxInputNumberForDefragment,
    MAX_INPUT_PER_TX,
    PdexAccessTicketConfig,
    PDEX_ACCESS_ID,
} from './constants';
import {
    FailedTx,
    SuccessTx,
    MetaStakingBeacon,
    MetaStakingShard,
    PaymentAddressType,
    ReadonlyKeyType,
    PriKeyType,
    OTAKeyType,
    PDETradeRequestMeta,
    PDECrossPoolTradeRequestMeta,
    PDEWithdrawalRequestMeta,
    PDEFeeWithdrawalRequestMeta,
    StopAutoStakingMeta,
    UnStakingMeta,
    ShardStakingType,
    BurningRequestMeta,
    IssuingETHRequestMeta,
    InitTokenRequestMeta,
    WithDrawRewardRequestMeta,
    PRVID,
    PRVIDSTR,
    PercentFeeToReplaceTx,
    encryptMessageOutCoin,
    decryptMessageOutCoin,
    getBurningAddress,
    TxHistoryInfo,
    KeyWallet,
    PDEPRVRequiredContributionRequestMeta,
    PortalV4UnshieldRequestMeta,
} from "../core";
import { pdexv3 } from "../core/constants";
import {
    checkEncode,
    checkDecode
} from "../common/base58";
import {
    ENCODE_VERSION,
    ED25519_KEY_SIZE
} from "../common/constants";
import {
    convertHashToStr,
    getShardIDFromLastByte,
    getChildIdFromChildNumberArray
} from "../common/common";
import {
    generateCommitteeKeyFromHashPrivateKey,
    generateBLSPubKeyB58CheckEncodeFromSeed
} from "../common/committeekey";
import {
    hashSha3BytesToBytes,
    base64Decode,
    base64Encode,
    stringToBytes,
    bytesToString,
    toHexString,
    setRandBytesFunc
} from "../privacy/utils";
import {
    CustomError,
    ErrorObject
} from '../common/errorhandler';
import { KeySet, addressAsObject } from '../common/keySet';
import {
    RpcClient
} from"../rpcclient/rpcclient";
import { wasm } from '../wasm';
import {
    defaultCoinChooser,
    coinConsolidator,
    AccessTicketChooser,
} from '../services/coinChooser';
import { 
    newParamTxV2,
    newTokenParamV2,
} from '@lib/module/Account/account.utils';

const prepareInputForTxV2 = async(amountTransfer, fee, tokenID, account, inputVersion = 2, numOfOtherPks = 50, maxInputs = MAX_INPUT_PER_TX, coinChooser = defaultCoinChooser) => {
    const unspentCoinStrs = await account.getListUnspentCoins(tokenID, inputVersion);
    // total amount transfer and fee
    let feeBN = new bn(fee);
    let inputCoinsToSpent;
    if (amountTransfer < 0){
        // negative means use all inputs
        let arrayEnd = MAX_INPUT_PER_TX;
        if (unspentCoinStrs.length < arrayEnd){
            arrayEnd = unspentCoinStrs.length;
        }
        inputCoinsToSpent = unspentCoinStrs.slice(0, arrayEnd);
        amountTransfer = feeBN;
    }else{
        amountTransfer = amountTransfer.add(feeBN);
        const respChooseBestCoin = coinChooser.coinsToSpend(unspentCoinStrs, amountTransfer);
        inputCoinsToSpent = respChooseBestCoin.resultInputCoins;
        if (inputCoinsToSpent.length === 0 && amountTransfer.cmp(new bn(0)) !== 0) {
            throw new CustomError(ErrorObject.NotEnoughCoinError, "Not enough coin to spend");
        }
    }

    let totalValueInput = new bn(0);
    for (let i = 0; i < inputCoinsToSpent.length; i++) {
        totalValueInput = totalValueInput.add(new bn(inputCoinsToSpent[i].Value));
        inputCoinsToSpent[i].Info = "";
    }
    // console.log('will use', inputCoinsToSpent);
    // const paymentAddrSerialize = account.key.base58CheckSerialize(PaymentAddressType);
    const shardID = getShardIDFromLastByte(account.key.KeySet.PaymentAddress.Pk[(account.key.KeySet.PaymentAddress.Pk.length - 1)]);
    let cc = null;
    try{
        if (numOfOtherPks>0){
            cc = await coinChooser.coinsForRing(account.rpc, shardID, numOfOtherPks, tokenID);
        }
    }catch(e){
        console.error("Error while preparing input parameters", e);
        throw e;
    }
    let res = {
        // PaymentAddress: paymentAddrSerialize,
        inputCoinStrs: inputCoinsToSpent,
        totalValueInput: totalValueInput,
        coinsForRing: cc
    };
    return res;
};

const estimateFee = async(paymentAddrSerialize, numInputCoins, numOutputs, metadata, rpcClient, tokenParams = null) => {
    let tokenIDStr = null;
    if (tokenParams != null) {
        tokenIDStr = tokenParams.TokenID;
    }

    let resp;
    try {
        resp = await rpcClient.getEstimateFeePerKB(paymentAddrSerialize, tokenIDStr);
    } catch (e) {
        throw new CustomError(ErrorObject.GetUnitFeeErr, "Can not get unit fee when estimate");
    }

    let txSize = await estimateTxSize(numInputCoins, numOutputs, metadata, tokenParams);
    // check tx size
    if (txSize > MaxTxSize) {
        throw new CustomError(ErrorObject.TxSizeExceedErr, "tx size is exceed error");
    }
    return (txSize + 1) * resp.unitFee;
};

const getEstimateFee = async(from, to, amount, tokenObject, account) => {
    let amountBN = new bn(amount);
    let paymentInfos = [new PaymentInfo(to, amountBN.toString())];

    let tokenID = null, tokenParams = null;
    if (tokenObject) {
        tokenID = tokenObject.TokenID;
    }
    // prepare input for native token tx
    let inputForTx;
    try {
        inputForTx = await prepareInputForTxV2(amountBN, 0, tokenID, account);
    } catch (e) {
        throw e;
    }
    try {
        let fee;
        if (!tokenID) {
            fee = await estimateFee("", inputForTx.inputCoinStrs.length, paymentInfos.length, null, account.rpc, null);
        } else {
            tokenParams = {
                PaymentInfo: paymentInfos,
                InputCoins: inputForTx.inputCoinStrs,
                TokenID: tokenID,
                TokenName: tokenObject.TokenName,
                TokenSymbol: tokenObject.TokenSymbol
            }
            fee = await estimateFee("", 1, 1, null, account.rpc, tokenParams);
        }
        return fee;
    } catch (e) {
        throw e;
    }
};

/**
 *
 * @param {number} numInputCoins
 * @param {number} numOutputCoins
 * @param {bool} hasPrivacyForNativeToken
 * @param {bool} hasPrivacyForPToken
 * @param {*} metadata
 * @param {CustomTokenParamTx} customTokenParams
 * @param {PrivacyTokenParamTxObject} privacyCustomTokenParams
//  */
const estimateTxSize = async (numInputCoins, numOutputCoins, metadata, tokenParams) => {
    const params = {
        NumInputs: numInputCoins,
        NumPayments: numOutputCoins,
        Metadata: metadata,
        TokenParams: tokenParams
    }
    const sz = await wasm.estimateTxSize(JSON.stringify(params));
    return sz;
};

const removeSpentCoins = async (shardID, inCoinStrs, tokenID, rpcClient) => {
    let unspentCoinStrs = [];
    let keyImages = inCoinStrs.map(c => c.KeyImage);

    // check whether each input coin is spent or not
    let response;
    try {
        response = await rpcClient.hasSerialNumber(shardID, keyImages, tokenID);
    } catch (e) {
        throw e;
    }

    let existed = response.existed;
    if (existed.length != inCoinStrs.length) {
        throw new Error("Wrong response when check has serial number");
    }

    for (let i = 0; i < existed.length; i++) {
        if (!existed[i]) {
            unspentCoinStrs.push(inCoinStrs[i]);
        }
    }

    return unspentCoinStrs
};

class StatelessTransactor {
    constructor(w, rpcUrl = null) {
        this.updateProgressTx = async (prog, msg = '') => {
            if (w.updateProgressTx) {
                await w.updateProgressTx(prog);
                w.Debug = msg;
            }
        }
        this.rpc = rpcUrl ? new RpcClient(rpcUrl) : w.RpcClient;
        this.useCoinsService = true;
        this.offlineMode = false;
        // function aliases
        this.make = this._transact;
        this.prv = this.createAndSendNativeToken;
        this.token = this.createAndSendPrivacyToken;
        this.newToken = this.createAndSendInitTokenTx;
        this.stake = this.createAndSendStakingTx;
        this.unstake = this.createAndSendStopAutoStakingTx;
        this.withdraw = this.createAndSendWithdrawRewardTx;
        this.convert = this.createAndSendConvertTx;
        this.convertToken = this.createAndSendTokenConvertTx;
        this.trade = this.createAndSendNativeTokenTradeRequestTx;
        this.contribute = this.createAndSendTxWithContribution;
        this.withdrawDex = this.createAndSendWithdrawDexTx;
        this.withdrawDexFee = this.createAndSendWithdrawDexFeeTx;
        this.burn = this.createAndSendBurningRequestTx;
        this.shield = this.createAndSendIssuingEthRequestTx;
        this.unshieldPortal = this.createAndSendUnshieldPortalV4RequestTx;
        this.defrag = this.consolidate;
        this.coin = this.getListUnspentCoins;
        this.balance = this.getBalance;
        this.waitBalanceChange = this.waitUntilBalanceChange;
        this.wasm = wasm;
        this.txHistory = {
            NormalTx: [],
            PrivacyTokenTx: [],
            CustomTokenTx: []
        }
        this.coinChooser = defaultCoinChooser;
    };

    async setKey(privateKey){
        // transactor needs private key to sign TXs. Read key in encoded or raw form
        if (typeof(privateKey)=='string') {
            this.key = KeyWallet.base58CheckDeserialize(privateKey);
        } else if (privateKey.length && privateKey.length == 32) {
            this.key = new KeyWallet();
            this.key.KeySet.PrivateKey = privateKey;
        } else {
            this.key = new KeyWallet();
            return this.key;
        }
        let result = await this.key.KeySet.importFromPrivateKey(this.key.KeySet.PrivateKey);
        return result;
    };

    // fetchOutputCoins returns all output coins with tokenID
    // for native token: tokenID is null
    /**
     *
     * @param {string} tokenID
     * @param {RpcClient} rpcClient
     */
    async fetchOutputCoins(tokenID, version = 2) {
        let paymentAddrSerialize = this.key.base58CheckSerialize(PaymentAddressType);
        let readOnlyKeySerialize = "";
        let otaKeySerialize = this.key.base58CheckSerialize(OTAKeyType);
        let privKeySerialize = this.key.base58CheckSerialize(PriKeyType);

        try {
            let response = await this.rpc.getOutputCoin(paymentAddrSerialize, readOnlyKeySerialize, otaKeySerialize, tokenID, 0);
            let coins = response.outCoins;
            let result = await Promise.all(response.outCoins.map(async c => {
                // match the desired version. Version -1 means any
                if (version == -1 || c.Version == version){
                    let params = {
                        Coin: c,
                        KeySet: privKeySerialize
                    }
                    try{
                        let coin = JSON.parse(await wasm.decryptCoin(JSON.stringify(params)));
                        return coin;
                    }catch(e){
                        console.log(`skip coin ${params.Coin.PublicKey} - ${e}`);
                        return null;
                    }
                }
            }));
            return result.filter(c => c != null);
        }catch(e){
            console.log(e);
            throw e;
        }
    }

    // getListUnspentCoins returns unspent output coins with tokenID
    // for native token: tokenID is null
    /**
     *
     * @param {string} tokenID
     * @param {RpcClient} rpcClient
     */
    async getListUnspentCoins(tokenID, version = 2) {
        let paymentAddrSerialize = this.key.base58CheckSerialize(PaymentAddressType);
        // get all output coins of spendingKey
        let allOutputCoinStrs;
        try {
            allOutputCoinStrs = await this.fetchOutputCoins(tokenID, version);
        } catch (e) {
            throw new CustomError(ErrorObject.GetOutputCoinsErr, e.message || "Can not get output coins when get unspent token");
        }
        // check whether unspent coin from cache is spent or not
        let unspentCoins = await removeSpentCoins(paymentAddrSerialize, allOutputCoinStrs, tokenID, this.rpc);
        return unspentCoins;
    }

    // getBalance returns balance for token (native token or privacy token)
    // tokenID default is null: for PRV
    /**
     *
     * @param {string} tokenID
     */
    async getBalance(tokenID, version = 2) {
        let accountBalance = '0';
        try {
            const listUnspentCoins = await this.getListUnspentCoins(tokenID, version);
            accountBalance =
                listUnspentCoins?.reduce(
                    (totalAmount, coin) => totalAmount.add(new bn(coin.Value)),
                    new bn(0)
                ) || new bn(0);
        } catch (error) {
            throw error;
        }
        return accountBalance.toString();
    }

    async waitUntilBalanceChange(tokenID){
        console.debug(this.key.base58CheckSerialize(PaymentAddressType), " => wait for balance change with token", tokenID);
        let maxWaitTime = this.timeout;
        const startBalance = new bn(await this.getBalance(tokenID));
        let balance = startBalance;
        while (balance.eq(startBalance)){
            try {
                maxWaitTime = await this.sleepCapped(1000, maxWaitTime);
                balance = new bn(await this.getBalance(tokenID));
                // console.debug('balance is', balance);
            } catch (e) {
                throw new CustomError(ErrorObject.GetTxByHashErr, e.message);
            }
        }
        return {
            oldBalance: startBalance.toString(),
            balance: balance.toString()
        }
    }

    // getAllPrivacyTokenBalance returns list of privacy token's balance
    /**
     *
     * @returns [{TokenID: string, Balance: number}]
     */
    async getAllPrivacyTokenBalance() {
        try {
            // get list privacy token
            let privacyTokens = await this.rpc.listTokens();
            let pTokenList = privacyTokens.listPrivacyToken;

            // get balance for each privacy token
            let tasks = [];
            for (let i = 0; i < pTokenList.length; i++) {
                let tokenID = pTokenList[i].ID;

                const tokenBalanceItemPromise = new Promise((resolve) => {
                    this.getBalance(tokenID, -1)
                        .then(balance => {
                            resolve({
                                TokenID: tokenID,
                                Balance: balance,
                            });
                        })
                        .catch(() => null)
                });
                tasks.push(tokenBalanceItemPromise);
            }

            const allResult = await Promise.all(tasks);
            const hasBalanceResult = allResult && allResult.filter(r => r && r.Balance > 0)

            return hasBalanceResult;
        } catch (e) {

            throw e;
        }
    }

    /**
     *
     * @param {{paymentAddressStr: string (B58checkencode), amount: number, message: "" }} prvPayments
     * @param {number} fee
     * @param {bool} isPrivacy
     * @param {string} info
     */
    async createAndSendNativeToken({ transfer: { prvPayments = [], fee, info = "" }, extra: { metadata = null, isEncryptMessage = false } = {}} = {}) {
        //(prvPayments, fee, info = "", isEncryptMessage = false, metadata = null) {
        // check fee
        if (fee < 0) {
            fee = 0
        }
        let messageForNativeToken = "";
        if (prvPayments.length > 0) {
            messageForNativeToken = prvPayments[0].Message;
        }
        await this.updateProgressTx(10, 'Encrypting Message');

        const isEncodeOnly = !isEncryptMessage;
        prvPayments = await encryptMessageOutCoin(prvPayments, isEncodeOnly);

        try {
            let result = await this._transact({ transfer: { prvPayments, fee, info }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async _transact({ transfer: { prvPayments = [], fee = 10, info = "", tokenID = null, tokenPayments = null, tokenParams = null, prvCoinChooser = defaultCoinChooser, tokenCoinChooser = defaultCoinChooser } = {}, extra: { metadata = null } = {}}) {
        await this.updateProgressTx(20, 'Preparing Your Payments');
        info = base64Encode(stringToBytes(info));

        let receiverPaymentAddrStr = new Array(prvPayments.length);
        let totalAmountTransfer = new bn(0);
        for (let i = 0; i < prvPayments.length; i++) {
            receiverPaymentAddrStr[i] = prvPayments[i].paymentAddressStr;
            totalAmountTransfer = totalAmountTransfer.add(new bn(prvPayments[i].Amount));
            prvPayments[i].Amount = new bn(prvPayments[i].Amount).toString();
        }

        await this.updateProgressTx(30, 'Selecting Coins');
        let inputForTx;
        try{
            inputForTx = await prepareInputForTxV2(totalAmountTransfer, fee, null, this, undefined, undefined, undefined, prvCoinChooser);
        }catch(e){
            console.error(e);
            throw new CustomError(ErrorObject.InitNormalTxErr, "Error while preparing inputs", e);
        }

        if (inputForTx.inputCoinStrs.length > MAX_INPUT_PER_TX) {
            throw new CustomError(ErrorObject.TxSizeExceedErr);
        }
        await this.updateProgressTx(40, "Packing Parameters");

        let txParams = newParamTxV2(
            this.key,
            prvPayments,
            inputForTx.inputCoinStrs,
            fee,
            null,
            metadata,
            info,
            inputForTx.coinsForRing
        );
        // handle token transfer
        let tokenReceiverPaymentAddrStr = [];
        let totalAmountTokenTransfer = new bn(0);
        let inputForToken = {
            inputCoinStrs: [],
            coinsForRing: {}
        };

        await this.updateProgressTx(50, 'Adding Token Info');
        // tokenID is non-null when transferring token; tokenParams is non-null when creating new token
        if (tokenPayments){
            let isInit = Boolean(tokenParams);
            let isTransfer = Boolean(tokenID);
            if (!(isInit || isTransfer)){
                throw new CustomError(ErrorObject.InitNormalTxErr, "Invalid Token parameters");
            }
            tokenReceiverPaymentAddrStr = new Array(tokenPayments.length);
            for (let i = 0; i < tokenPayments.length; i++) {
                receiverPaymentAddrStr[i] = tokenPayments[i].paymentAddressStr;
                totalAmountTokenTransfer = totalAmountTokenTransfer.add(new bn(tokenPayments[i].Amount));
                tokenPayments[i].Amount = new bn(tokenPayments[i].Amount).toString();
            }
            await this.updateProgressTx(60, 'Selecting Token Coins');
            if (isTransfer){
                try{
                    inputForToken = await prepareInputForTxV2(totalAmountTokenTransfer, 0, tokenID, this, undefined, undefined, undefined, tokenCoinChooser);
                }catch(e){
                    console.error(e);
                    throw new CustomError(ErrorObject.InitNormalTxErr, `Error while preparing inputs ${e}`);
                }
            }
            await this.updateProgressTx(70, 'Decorating Parameters');
            tokenParams = newTokenParamV2(
                tokenPayments,
                inputForToken.inputCoinStrs,
                tokenID,
                inputForToken.coinsForRing,
                tokenParams || {}
            );
            txParams.TokenParams = tokenParams;
        }

        let txParamsJson = JSON.stringify(txParams);
        await this.updateProgressTx(80, 'Signing Transaction');
        let theirTime = await this.rpc.getNodeTime();
        let wasmResult = await wasm.createTransaction(txParamsJson, theirTime);
        let { b58EncodedTx, hash, outputs, senderSeal } = JSON.parse(wasmResult);
        console.log(`TX Hash : ${hash} - Seal : ${senderSeal}`);
        if (b58EncodedTx === null || b58EncodedTx === "") {
            throw new CustomError(ErrorObject.InitNormalTxErr, "Can not init transaction tranfering PRV");
        }
        let tempBuf = checkDecode(b58EncodedTx).bytesDecoded;
        let theString = new TextDecoder("utf-8").decode(tempBuf);
        let txObj = JSON.parse(theString);
        txObj.Encoded = b58EncodedTx;
        // console.log("TX: ", txObj);
        // console.log("Encoded: ", b58EncodedTx)

        await this.updateProgressTx(90, 'Submitting Transaction');
        let response;
        try {
            response = await this.send(b58EncodedTx, Boolean(tokenPayments));
        } catch (e) {
            console.error(e);
            throw new CustomError(ErrorObject.SendTxErr, "Can not send PRV transaction", e);
        }

        if (response.TokenID && response.TokenID.length>0){
            tokenID = response.TokenID;
        }
        await this.updateProgressTx(95, 'Saving Records');
        return {
            Response: response,
            Tx: txObj,
            Hash: hash,
            Outputs: outputs,
            Amount: totalAmountTransfer.toString(),
            Inputs: inputForTx.inputCoinStrs,
            Receivers: prvPayments,
            TokenID: tokenID,
            TokenAmount: totalAmountTokenTransfer.toString(),
            TokenInputs: inputForToken.inputCoinStrs,
            TokenReceivers: tokenPayments,
            IsPrivacy: true,
            Metadata: metadata,
        }
    }

    async send(encodedTx, isToken){
        if (this.offlineMode){
            return {"offline": true}
        }
        let response;
        if (isToken){
            response = await this.rpc.sendRawTxCustomTokenPrivacy(encodedTx);
        }else{
            response = await this.rpc.sendRawTx(encodedTx);
        }
        return response;
    }

    async createAndSendConvertTx({ transfer: { prvPayments = [], fee = 10, info = ""} = {}, extra: { isEncryptMessage = false } = {}} = {}) {
        //(prvPayments, fee, info = "", isEncryptMessage = false) {
        // check fee
        if (fee < 0) {
            fee = 0
        }
        let messageForNativeToken = "";
        if (prvPayments.length > 0) {
            messageForNativeToken = prvPayments[0].Message;
        }
        await this.updateProgressTx(10, 'Encrypting Message');
        const isEncodeOnly = !isEncryptMessage;
        prvPayments = await encryptMessageOutCoin(prvPayments, isEncodeOnly);

        try {
            let result = await this._transactConvert({ transfer: { prvPayments, fee, info }});
                // prvPayments, fee, info);
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async createAndSendTokenConvertTx({ transfer: { prvPayments = [], fee, info = "", tokenID = null, tokenPayments = [] }, extra: { isEncryptMessage = false, isEncryptMessageToken = false } = {}}) {
        // (tokenID, prvPayments, tokenPayments, fee, info = "", isEncryptMessage = false, isEncryptMessageToken = false) {
        // check fee
        if (fee < 0) {
            fee = 0
        }
        let messageForNativeToken = "";
        if (prvPayments.length > 0) {
            messageForNativeToken = prvPayments[0].Message;
        }
        await this.updateProgressTx(10, 'Encrypting Message');
        let isEncodeOnly = !isEncryptMessage;
        prvPayments = await encryptMessageOutCoin(prvPayments, isEncodeOnly);
        isEncodeOnly = !isEncryptMessageToken;
        tokenPayments = await encryptMessageOutCoin(tokenPayments, isEncodeOnly);

        try {
            let result = await this._transactConvert({ transfer: { prvPayments, fee, info, tokenID, tokenPayments  }});
                // prvPayments, fee, info, tokenID, tokenPayments);
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async _transactConvert({ transfer: { prvPayments = [], fee, info = "", tokenID = null, tokenPayments } = {}, extra: { numOfDefragInputs = 0 } = {}}) {
        // (prvPayments, fee, info, tokenID = null, tokenPayments = null, numOfDefragInputs = 0) {
        await this.updateProgressTx(20, 'Preparing Your Payments');
        info = base64Encode(stringToBytes(info));

        let metadata = null;
        let receiverPaymentAddrStr = new Array(prvPayments.length);
        let totalAmountTransfer = new bn(0);
        for (let i = 0; i < prvPayments.length; i++) {
            receiverPaymentAddrStr[i] = prvPayments[i].paymentAddressStr;
            totalAmountTransfer = totalAmountTransfer.add(new bn(prvPayments[i].Amount));
            prvPayments[i].Amount = new bn(prvPayments[i].Amount).toString();
        }
        let isTokenConvert = (tokenID && tokenPayments);
        let isDefrag = numOfDefragInputs > 0;
        if (isDefrag && isTokenConvert){
            throw new CustomError(ErrorObject.SendTxErr, "Error: token defragment is not supported");
        }
        await this.updateProgressTx(35, 'Selecting Coins');
        let inputForTx;
        try{
            if (isTokenConvert){
                // converting token. We need v2 PRV coins
                inputForTx = await prepareInputForTxV2(totalAmountTransfer, fee, null, this);
            }else{
                // 0 means convert, otherwise we defrag
                if (isDefrag){
                    inputForTx = await prepareInputForTxV2(-1, fee, null, this, 2, 20, numOfDefragInputs);
                }else{
                    inputForTx = await prepareInputForTxV2(-1, fee, null, this, 1, 0);
                }
            }
        }catch(e){
            throw new CustomError(ErrorObject.SendTxErr, "Can not prepare inputs", e);
        }
        if (inputForTx.inputCoinStrs.length > MAX_INPUT_PER_TX) {
            throw new CustomError(ErrorObject.TxSizeExceedErr);
        }

        await this.updateProgressTx(50, 'Packing Parameters');
        let txParams = newParamTxV2(
            this.key,
            prvPayments,
            inputForTx.inputCoinStrs,
            fee,
            null,
            null,
            info,
            inputForTx.coinsForRing
        );
        // handle token transfer
        let tokenReceiverPaymentAddrStr = [];
        let totalAmountTokenTransfer = new bn(0);
        let inputForToken = {};
        if (isTokenConvert){
            tokenReceiverPaymentAddrStr = new Array(tokenPayments.length);
            for (let i = 0; i < tokenPayments.length; i++) {
                receiverPaymentAddrStr[i] = tokenPayments[i].paymentAddressStr;
                totalAmountTokenTransfer = totalAmountTokenTransfer.add(new bn(tokenPayments[i].Amount));
                tokenPayments[i].Amount = new bn(tokenPayments[i].Amount).toString();
            }
            inputForToken = await prepareInputForTxV2(-1, 0, tokenID, this, 1, 0);
            let tokenParams = newTokenParamV2(
                tokenPayments,
                inputForToken.inputCoinStrs,
                tokenID,
                inputForToken.coinsForRing
            );
            txParams.TokenParams = tokenParams;
        }
        let txParamsJson = JSON.stringify(txParams);
        let wasmResult;
        await this.updateProgressTx(80, 'Signing Transaction');
        let theirTime = await this.rpc.getNodeTime();
        if (isDefrag){
            wasmResult = await wasm.createTransaction(txParamsJson, theirTime);
        }else{
            wasmResult = await wasm.createConvertTx(txParamsJson, theirTime);
        }
        let { b58EncodedTx, hash } = JSON.parse(wasmResult);
        if (b58EncodedTx === null || b58EncodedTx === "") {
            throw new CustomError(ErrorObject.InitNormalTxErr, "Can not init transaction tranfering PRV");
        }
        let tempBuf = checkDecode(b58EncodedTx).bytesDecoded;
        let theString = new TextDecoder("utf-8").decode(tempBuf);
        let txObj = JSON.parse(theString);
        txObj.Encoded = b58EncodedTx;

        await this.updateProgressTx(90, 'Submitting Transaction');
        let response;
        try {
            response = await this.send(b58EncodedTx, (tokenID && tokenPayments));
        } catch (e) {
            throw new CustomError(ErrorObject.SendTxErr, "Can not send PRV transaction", e);
        }
        await this.updateProgressTx(95, 'Saving Records');
        return {
            Response: response,
            Tx: txObj,
            Hash: hash,
            Amount: totalAmountTransfer.toNumber(),
            Inputs: inputForTx.inputCoinStrs,
            Receivers: receiverPaymentAddrStr,
            TokenAmount: totalAmountTokenTransfer.toNumber(),
            TokenInputs: inputForToken.inputCoinStrs,
            TokenReceivers: tokenReceiverPaymentAddrStr,
            IsPrivacy: true,
            Metadata: metadata,
        }
    }

    // staking tx always send PRV to burning address with no privacy
    // type: 0 for shard
    // type: 1 for beacon
    /**
     *
     * @param {{type: number}} param
     * @param {number} fee
     * @param {string} candidatePaymentAddress
     * @param {string} candidateMiningSeedKey
     * @param {string} rewardReceiverPaymentAddress
     * @param {bool} autoReStaking
     */
    async createAndSendStakingTx({ transfer: { fee }, extra: { candidatePaymentAddress, candidateMiningSeedKey, rewardReceiverPaymentAddress, autoReStaking = true, stakingType = ShardStakingType } = {}}) {
        // (param, fee, candidatePaymentAddress, candidateMiningSeedKey, rewardReceiverPaymentAddress, autoReStaking = true) {
        await this.updateProgressTx(10, 'Generating Metadata');
        // check fee
        if (fee < 0) {
            fee = 0
        }
        // get amount staking
        let amountBN = new bn("1750000000000", 10);
        let feeBN = new bn(fee);

        // generate committee key
        let candidateKeyWallet = KeyWallet.base58CheckDeserialize(candidatePaymentAddress);
        let publicKeyBytes = candidateKeyWallet.KeySet.PaymentAddress.Pk;
        let candidateHashPrivateKeyBytes = checkDecode(candidateMiningSeedKey).bytesDecoded;
        let committeeKey;
        try {
            committeeKey = await generateCommitteeKeyFromHashPrivateKey(candidateHashPrivateKeyBytes, publicKeyBytes);
        } catch (e) {
            throw e;
        }
        let paymentAddressStr = this.key.base58CheckSerialize(PaymentAddressType);
        let type = stakingType === ShardStakingType ? MetaStakingShard : MetaStakingBeacon;
        let meta = {
            Type: type,
            FunderPaymentAddress: paymentAddressStr,
            RewardReceiverPaymentAddress: rewardReceiverPaymentAddress,
            StakingAmountShard: amountBN.toNumber(),
            CommitteePublicKey: committeeKey,
            AutoReStaking: autoReStaking,
        };
        let burningAddress = await getBurningAddress(this.rpc);
        let prvPayments = [{
            PaymentAddress: burningAddress,
            Amount: amountBN.toString(),
            Message: ""
        }];

        let messageForNativeToken = prvPayments[0].Message;
        try {
            let result = await this._transact({ transfer: { prvPayments, fee }, extra: { metadata: meta }});
                // prvPayments, fee, meta, "");
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    }

    // staking tx always send PRV to burning address with no privacy
    // type: 0 for shard
    // type: 1 for beacon
    /**
     *
     * @param {{type: number}} param
     * @param {number} fee
     * @param {string} candidatePaymentAddress
     * @param {string} candidateMiningSeedKey
     * @param {string} rewardReceiverPaymentAddress
     * @param {bool} autoReStaking
     */
    async createAndSendStopAutoStakingTx({ transfer: { fee }, extra: { candidatePaymentAddress, candidateMiningSeedKey, metadataType = UnStakingMeta } = {}}) {
        // (fee, candidatePaymentAddress, candidateMiningSeedKey) {
        // check fee
        if (fee < 0) {
            fee = 0
        }
        let amountBN = new bn(0);
        let feeBN = new bn(fee);
        await this.updateProgressTx(10, 'Generating Metadata');

        // generate committee key
        let candidateKeyWallet = KeyWallet.base58CheckDeserialize(candidatePaymentAddress);
        let publicKeyBytes = candidateKeyWallet.KeySet.PaymentAddress.Pk;

        let candidateHashPrivateKeyBytes = checkDecode(candidateMiningSeedKey).bytesDecoded;

        const committeeKey = await generateCommitteeKeyFromHashPrivateKey(candidateHashPrivateKeyBytes, publicKeyBytes);

        let meta = {
            Type: metadataType,
            CommitteePublicKey: committeeKey
        };

        let burningAddress = await getBurningAddress(this.rpc);
        let prvPayments = [{
            PaymentAddress: burningAddress,
            Amount: "0",
            Message: ""
        }];
        let messageForNativeToken = prvPayments[0].Message;

        try {
            let result = await this._transact({ transfer: { prvPayments, fee }, extra: { metadata: meta }});
                // prvPayments, fee, meta, "");
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    }

    /**
     *
     * @param {{paymentAddressStr: string, amount: number, message: string}} prvPaymentsForNativeToken
     * @param {{Privacy: bool, TokenID: string, TokenName: string, TokenSymbol: string, TokenTxType: bool, TokenAmount: number, TokenReceivers : [{PaymentAddress: string, Amount: number, Message: string}]}} submitParam
     * @param {number} fee
     * @param {number} feePToken
     * @param {bool} hasPrivacyForNativeToken
     * @param {bool} hasPrivacyForPToken
     * @param {string} info
     */
    async createAndSendPrivacyToken({ transfer: { prvPayments = [], fee, info = "", tokenID, tokenPayments = [], tokenParams = {}}, extra: { metadata = null, isEncryptMessage = false, isEncryptMessageToken = false } = {}}) {
        if (fee < 0) {
            fee = 0
        }
        await this.updateProgressTx(10, 'Encrypting Message');
        let messageForNativeToken = "";
        if (prvPayments.length > 0) {
            messageForNativeToken = prvPayments[0].Message;
        }
        let messageForPToken = tokenPayments[0].Message;
        let isEncodeOnly = !isEncryptMessage;
        prvPayments = await encryptMessageOutCoin(prvPayments, isEncodeOnly);
        isEncodeOnly = !isEncryptMessageToken;
        tokenPayments = await encryptMessageOutCoin(tokenPayments, isEncodeOnly);
        try {
            let result = await this._transact({ transfer: { prvPayments, fee, info, tokenID, tokenPayments, tokenParams }, extra: { metadata }});
                // prvPayments, fee, metadata, info, tokenID, tokenPayments, tokenParams);
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async createAndSendInitTokenTx({ transfer: { fee, info = "", tokenPayments }, extra: { tokenName = "", tokenSymbol = "" } = {}}) {
        // (tokenPayments, fee, tokenName = "", tokenSymbol = "", info = "") {
        // only the 1st payment info is relevant
        if (tokenPayments.length) tokenPayments = tokenPayments[0];
        const prvPaymentInfos = [];
        if (fee < 0) {
            fee = 0
        }
        await this.updateProgressTx(10, 'Generating Metadata');
        let messageForNativeToken = null;
        let newCoin;
        try {
            // since we only use the PublicKey and TxRandom fields, the tokenID is irrelevant
            let temp = await wasm.createCoin(JSON.stringify({PaymentInfo : tokenPayments, TokenID: null}));
            newCoin = JSON.parse(temp);
        }catch(e){
            throw e;
        }
        // prepare meta data for tx. It is normal trade request at first
        let metadata = {
            Type: InitTokenRequestMeta,
            Amount: new bn(tokenPayments.Amount).toString(),
            OTAStr: newCoin.PublicKey,
            TxRandomStr: newCoin.TxRandom,
            TokenName: tokenName,
            TokenSymbol: tokenSymbol
        };

        try {
            let result = await this._transact({ transfer: { prvPaymentInfos, fee, info }, extra: { metadata }});
                // prvPaymentInfos, fee, metadata, info);
            // re-compute token ID
            console.log("TX Hash is", result.Hash);
            const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
            console.log("Shard ID is", shardID);
            // concatenate, then hash the raw bytes
            const content = stringToBytes(result.Hash + shardID);
            console.log("Data to hash :", content);
            // swap the endian to match Go code
            let hashed = hashSha3BytesToBytes(content);
            hashed.reverse();
            result.TokenID = toHexString(hashed);
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async consolidate({ transfer: { fee = 100, tokenID = null } = {}, extra: { inputsPerTx = MaxInputNumberForDefragment, threshold = 200 } = {}}) {
        await this.updateProgressTx(20, `Analyzing Coins`);
        const info = base64Encode(stringToBytes('consolidate'));
        const inputVersion = 2;
        const prepareInput = async (fee, tokenID, account, numOfOtherPks = 20, maxInputs = inputsPerTx) => {
            const spendableCoins = await account.getListUnspentCoins(tokenID, inputVersion);
            const groupedCoins = coinConsolidator.coinsToSpend(spendableCoins, fee, maxInputs, threshold);
            if (groupedCoins.length === 0 || groupedCoins[0].length === 0) {
                return {};
            }
            const shardID = getShardIDFromLastByte(account.key.KeySet.PaymentAddress.Pk[(account.key.KeySet.PaymentAddress.Pk.length - 1)]);

            let coinsForRing = await coinConsolidator.coinsForRing(account.rpc, shardID, numOfOtherPks * groupedCoins.length, tokenID);
            return {
                groupedInputs: groupedCoins,
                coinsForRing
            };
        };
        let { groupedInputs, coinsForRing } = await prepareInput(fee, tokenID, this);
        if (!groupedInputs) {
            console.log('No coin below threshold. End consolidate');
            return [];
        }

        const finalize = async (txParams, isToken, returnedValues) => {
            let txParamsJson = JSON.stringify(txParams);
            
            let theirTime = await this.rpc.getNodeTime();
            let wasmResult = await wasm.createTransaction(txParamsJson, theirTime);
            let { b58EncodedTx, hash, outputs, senderSeal } = JSON.parse(wasmResult);
            console.log(`TX Hash : ${hash} - Seal : ${senderSeal}`);
            if (b58EncodedTx === null || b58EncodedTx === "") {
                throw new CustomError(ErrorObject.InitNormalTxErr, "Can not init transaction tranfering PRV");
            }
            let tempBuf = checkDecode(b58EncodedTx).bytesDecoded;
            let theString = new TextDecoder("utf-8").decode(tempBuf);
            let txObj = JSON.parse(theString);
            txObj.Encoded = b58EncodedTx;

            let response;
            try {
                response = await this.send(b58EncodedTx, isToken);
            } catch (e) {
                console.error(e);
                throw new CustomError(ErrorObject.SendTxErr, "Can not send PRV transaction", e);
            }

            if (response.TokenID && response.TokenID.length>0){
                tokenID = response.TokenID;
            }
            const result = Object.assign({
                Response: response,
                Tx: txObj,
                Hash: hash,
                Outputs: outputs,
                Amount: '',
                Inputs: [],
                Receivers: [],
                TokenID: tokenID,
                TokenAmount: '',
                TokenInputs: [],
                TokenReceivers: [],
                IsPrivacy: true,
                Metadata: null,
            }, returnedValues);
            if (isToken) await this.waitTx(hash, 3);
            return result;
        }
        
        await this.updateProgressTx(50, 'Signing & Sending Transaction');
        const isToken = tokenID && tokenID.length && tokenID != PRVIDSTR;
        let results = [];
        if (isToken){
            // consolidate token: send & wait for each tx to confirm
            for (const inputs of groupedInputs) {
                const { inputCoinStrs: prvInputs, coinsForRing: prvCoinsForRing } = await prepareInputForTxV2(new bn(0), fee, null, this);
                let txParams = newParamTxV2(this.key, [], prvInputs, fee, null, null, info, prvCoinsForRing);
                let tokenParams = newTokenParamV2([], inputs, tokenID, coinsForRing, {});
                txParams.TokenParams = tokenParams;
                let temp = await finalize(txParams, true, { 
                    TokenInputs: inputs,
                    TokenAmount: inputs.reduce((totalAmount, coin) => totalAmount.add(new bn(coin.Value)), new bn(0)).toString(),
                    Inputs: prvInputs, Amount: fee });
                results.push(temp);
            }
        } else {
            // consolidate PRV: create all transactions without overlapping inputs & send in parallel
            results = await Promise.all(groupedInputs.map(inputs => {
                const p = newParamTxV2(this.key, [], inputs, fee, null, null, info, coinsForRing);
                return finalize(p, false, {
                    Inputs: inputs,
                    Amount: inputs.reduce((totalAmount, coin) => totalAmount.add(new bn(coin.Value)), new bn(-fee)).toString()
                })
            }));
        }
        await this.updateProgressTx(100, 'Done');
        return results;
    }

    // createAndSendBurningRequestTx create and send tx burning ptoken when withdraw
    // remoteAddress (string) is an ETH/BTC address which users want to receive ETH/BTC (without 0x)
    /**
     *
     * @param {...{paymentAddressStr: string, amount: number, message: string}} prvPaymentsForNativeToken
     * @param {{Privacy: bool, TokenID: string, TokenName: string, TokenSymbol: string, TokenTxType: bool, TokenAmount: number, TokenReceivers : {PaymentAddress: string, Amount: number, Message: string}}} submitParam
     * @param {number} fee
     * @param {number} feePToken
     * @param {string} remoteAddress
     */
    async createAndSendBurningRequestTx({ transfer: { prvPayments = [], fee, info = "", tokenID = null }, extra: { burningType = BurningRequestMeta, isEncryptMessage = false, isEncryptMessageToken = false, burnAmount, remoteAddress } = {}}) {
        const burningTokenID = tokenID;

        if (remoteAddress.startsWith("0x")) {
            remoteAddress = remoteAddress.slice(2);
        }
        if (fee < 0) {
            fee = 0
        }
        await this.updateProgressTx(10, 'Encrypting Message');
        let burningAddress = await getBurningAddress(this.rpc);
        let tokenPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(burnAmount).toString(),
            Message: ""
        }];
        let messageForNativeToken = "";
        if (prvPayments.length>0){
            messageForNativeToken = prvPayments[0].Message;
        }
        let isEncodeOnly = !isEncryptMessage;
        prvPayments = await encryptMessageOutCoin(prvPayments, isEncodeOnly);
        isEncodeOnly = !isEncryptMessageToken;
        tokenPayments = await encryptMessageOutCoin(tokenPayments, isEncodeOnly);
        // use an empty payment address
        let emptyKeySet = new KeySet();
        await emptyKeySet.importFromPrivateKey(new Uint8Array(32));
        let addrForMd = addressAsObject(emptyKeySet.PaymentAddress);
        const paymentAddressStr = this.key.base58CheckSerialize(PaymentAddressType);
        await this.updateProgressTx(15, 'Generating Metadata');
        // prepare meta data for tx
        let burningReqMetadata = {
            BurnerAddress: addrForMd,
            BurningAmount: burnAmount,
            TokenID: burningTokenID,
            RemoteAddress: remoteAddress,
            Type: burningType,
        };
        try {
            let result = await this._transact({ transfer: { prvPayments, fee, info, tokenID: burningTokenID, tokenPayments }, extra: { metadata: burningReqMetadata }});
                // prvPayments, fee, burningReqMetadata, info, burningTokenID, tokenPayments);
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    // createAndSendIssuingEthRequestTx makes an issuing request based on a Deposit event from ETH bridge
    /**
     *
     * @param {...{paymentAddressStr: string, amount: number, message: string}} prvPaymentsForNativeToken
     * @param {{Privacy: bool, TokenID: string, TokenName: string, TokenSymbol: string, TokenTxType: bool, TokenAmount: number, TokenReceivers : {PaymentAddress: string, Amount: number, Message: string}}} submitParam
     * @param {number} fee
     * @param {number} feePToken
     * @param {string} remoteAddress
     */
    async createAndSendIssuingEthRequestTx({ transfer: { prvPayments = [], fee, info = "", tokenID = null }, extra: { isEncryptMessage = false, isEncryptMessageToken = false, ethBlockHash, ethDepositProof, txIndex } = {}}) {
        // (prvPayments = [], fee, tokenID, ethBlockHash, ethDepositProof, txIndex, info = "", isEncryptMessage = false,     isEncryptMessageToken = false) {
        if (!ethBlockHash.startsWith("0x")) {
            ethBlockHash = "0x" + ethBlockHash;
        }
        if (fee < 0) {
            fee = 0
        }
        await this.updateProgressTx(10, 'Encrypting Message');
        let messageForNativeToken = "";
        if (prvPayments.length>0){
            messageForNativeToken = prvPayments[0].Message;
        }
        let isEncodeOnly = !isEncryptMessage;
        prvPayments = await encryptMessageOutCoin(prvPayments, isEncodeOnly);
        isEncodeOnly = !isEncryptMessageToken;
        await this.updateProgressTx(15, 'Generating Metadata');
        // prepare meta data for tx
        let metadata = {
            BlockHash: ethBlockHash,
            TxIndex: txIndex,
            ProofStrs: ethDepositProof,
            IncTokenID: tokenID,
            Type: IssuingETHRequestMeta,
        }
        try {
            let result = await this._transact({ transfer: { prvPayments, fee, info }, extra: { metadata }});
                // prvPayments, fee, metadata, info);
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    // getRewardAmount returns amount rewards
    // if isGetAll is true: return all of reward types (such as PRV, pToken,..)
    /**
     *
     * @param {string} paymentAddrStr
     * @param {bool} isGetAll
     * @param {string} tokenID
     * @returns {number} (if isGetAll = false)
     * @returns {map[TokenID] : number} (if isGetAll = true)
     */
    async getRewardAmount(paymentAddrStr, isGetAll = true, tokenID = "") {
        let resp;
        try {
            resp = await this.rpc.getRewardAmount(paymentAddrStr);
        } catch (e) {

            throw new CustomError(ErrorObject.GetRewardAmountErr, "Can not get reward amount");
        }

        if (isGetAll) {
            return resp.rewards;
        } else {
            if (tokenID === "") {
                tokenID = "PRV";
            }

            return resp.rewards[tokenID];
        }
    }

    // createAndSendWithdrawRewardTx create and send tx withdraw reward amount
    /**
     *
     * @param {string} tokenID
     */
    async createAndSendWithdrawRewardTx({ transfer: { fee, tokenID = null }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        if (!tokenID || tokenID === "") {
            tokenID = convertHashToStr(PRVID)
        }
        let addrForMd = addressAsObject(this.key.KeySet.PaymentAddress);
        let md = {
            Type: WithDrawRewardRequestMeta,
            PaymentAddress: addrForMd,
            TokenID: tokenID,
            Version: 1
        };

        try {
            let result = await this._transact({ transfer: { fee, info: "" }, extra: { metadata: md }});
                // [], fee, md, "");
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    }

    /*
    * @param {number} fee
    * @param {string} pairID
    * @param {number} sellAmount
    * @param {string} info
    */
    async createAndSendWithdrawDexTx({ transfer: { fee, info = "" }, extra: { tokenIDs = [], withdrawalShareAmt } = {}}) {
        // (fee, withdrawalToken1IDStr, withdrawalToken2IDStr, withdrawalShareAmt, info = "") {
        let [ withdrawalToken1IDStr, withdrawalToken2IDStr ] = tokenIDs;
        await this.updateProgressTx(10, 'Generating Metadata');
        if (!withdrawalToken1IDStr || withdrawalToken1IDStr === "") {
            withdrawalToken1IDStr = convertHashToStr(PRVID)
        }
        if (!withdrawalToken2IDStr || withdrawalToken2IDStr === "") {
            withdrawalToken2IDStr = convertHashToStr(PRVID)
        }
        // let addrForMd = addressAsObject(this.key.KeySet.PaymentAddress);
        let md = {
            WithdrawerAddressStr: this.key.base58CheckSerialize(PaymentAddressType),
            WithdrawalToken1IDStr: withdrawalToken1IDStr,
            WithdrawalToken2IDStr: withdrawalToken2IDStr,
            WithdrawalShareAmt: new bn(withdrawalShareAmt).toString(),
            Type: PDEWithdrawalRequestMeta,
        };
        try {
            let result = await this._transact({ transfer: { fee, info: "" }, extra: { metadata: md }})
                // [], fee, md, "");
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    }

    async createAndSendWithdrawDexFeeTx({ transfer: { fee, info = "" }, extra: { tokenIDs = [], withdrawalFeeAmt } = {}}) {
        let [ withdrawalToken1IDStr, withdrawalToken2IDStr ] = tokenIDs;
        await this.updateProgressTx(10, 'Generating Metadata');
        if (!withdrawalToken1IDStr || withdrawalToken1IDStr === "") {
            withdrawalToken1IDStr = convertHashToStr(PRVID)
        }
        if (!withdrawalToken2IDStr || withdrawalToken2IDStr === "") {
            withdrawalToken2IDStr = convertHashToStr(PRVID)
        }
        // let addrForMd = addressAsObject(this.key.KeySet.PaymentAddress);
        let md = {
            WithdrawerAddressStr: this.key.base58CheckSerialize(PaymentAddressType),
            WithdrawalToken1IDStr: withdrawalToken1IDStr,
            WithdrawalToken2IDStr: withdrawalToken2IDStr,
            WithdrawalFeeAmt: new bn(withdrawalFeeAmt).toString(),
            Type: PDEFeeWithdrawalRequestMeta,
        };
        try {
            let result = await this._transact({ transfer: { fee, info: "" }, extra: { metadata: md }})
                // [], fee, md, "");
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    }

    /**
     *
     */
    // stakerStatus return status of staker
    // return object {{Role: int, ShardID: int}}
    // Role: -1: is not staked, 0: candidate, 1: validator
    // ShardID: beacon: -1, shardID: 0->MaxShardNumber
    async stakerStatus() {
        let blsPubKeyB58CheckEncode = await this.key.getBLSPublicKeyB58CheckEncode();
        let reps;
        try {
            reps = await this.rpc.getPublicKeyRole("bls:" + blsPubKeyB58CheckEncode);
        } catch (e) {
            throw e;
        }

        return reps.status;
    }

    /********************** DEX **********************/
    /**
     *
     * @param {number} fee
     * @param {string} pairID
     * @param {number} contributedAmount
     * @param {string} info
     */
    async createAndSendTxWithContribution({ transfer: { fee, info = "", tokenID = null }, extra: { pairID, contributedAmount } = {}}) {
        // (fee, pairID, contributedAmount, info = "", tokenIDStr = null) {
        if (fee < 0) {
            fee = 0
        }
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(contributedAmount).toString(),
            Message: ""
        }];
        let messageForNativeToken = burningPayments[0].Message;
        let contributorAddressStr = this.key.base58CheckSerialize(PaymentAddressType);
        let isToken = true;
        let tokenIDStr = tokenID;
        if (!tokenIDStr){
            isToken = false;
            tokenIDStr = convertHashToStr(PRVID);
        }
        // prepare meta data for tx
        let metadata = {
            PDEContributionPairID: pairID,
            ContributorAddressStr: contributorAddressStr,
            ContributedAmount: contributedAmount,
            TokenIDStr: tokenIDStr,
            Type: PDEPRVRequiredContributionRequestMeta,
        };

        try {
            let result;
            if (isToken){
                result = await this._transact({ transfer: { fee, info, tokenID: tokenIDStr, tokenPayments: burningPayments }, extra: { metadata }});
                    // [], fee, metadata, info, tokenIDStr, burningPayments);
            }else{
                result = await this._transact({ transfer: { prvPayments: burningPayments, fee, info }, extra: { metadata }});
                    // burningPayments, fee, metadata, info);
            }
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    /**
     *
     * @param {number} fee
     * @param {string} pairID
     * @param {number} sellAmount
     * @param {number} minAcceptableAmount
     * @param {number} tradingFee
     * @param {string} info
     */
    async createAndSendNativeTokenTradeRequestTx({ transfer: { fee, info = "", tokenID = null }, extra: { tokenIDToBuy = null, sellAmount, minAcceptableAmount, tradingFee, tokenIDToSell = null } = {}}) {
        // (fee, tokenIDToBuy, sellAmount, minAcceptableAmount, tradingFee, info = "", tokenIDToSell = null) {
        if (fee < 0) {
            fee = 0
        }
        await this.updateProgressTx(10, 'Generating Metadata');
        let prv = convertHashToStr(PRVID);
        let sellPRV = false;
        if (!tokenIDToSell || tokenIDToSell==prv){
            sellPRV = true;
            tokenIDToSell = prv;
        }
        let buyPRV = false;
        if (!tokenIDToBuy || tokenIDToBuy==prv){
            buyPRV = true;
            tokenIDToBuy = prv;
        }

        const burningAddress = await getBurningAddress(this.rpc);
        let amount = tradingFee;
        let tokenPaymentInfos = [];
        if (sellPRV){
            amount += sellAmount;
        }else{
            tokenPaymentInfos = [{
                PaymentAddress: burningAddress,
                Amount: sellAmount,
                Message: "",
            }];
        }

        const prvPaymentInfos = [{
            PaymentAddress: burningAddress,
            Amount: amount,
            Message: "",
        }];
        let messageForNativeToken = prvPaymentInfos[0].Message;
        let myAddressStr = this.key.base58CheckSerialize(PaymentAddressType);
        let pInf = {
            PaymentAddress: myAddressStr,
            Amount: "0"
        }
        let newCoin;
        try {
            // since we only use the PublicKey and TxRandom fields, the tokenID is irrelevant
            let temp = await wasm.createCoin(JSON.stringify({PaymentInfo : pInf, TokenID: null}));
            newCoin = JSON.parse(temp);
        }catch(e){
            throw e;
        }
        let newCoinForSub;
        try {
            let temp = await wasm.createCoin(JSON.stringify({PaymentInfo : pInf, TokenID: null}));
            newCoinForSub = JSON.parse(temp);
        }catch(e){
            throw e;
        }
        // prepare meta data for tx. It is normal trade request at first
        let metadata = {
            TokenIDToBuyStr: tokenIDToBuy,
            TokenIDToSellStr: tokenIDToSell,
            SellAmount: sellAmount,
            Type: PDECrossPoolTradeRequestMeta,
            MinAcceptableAmount: minAcceptableAmount,
            TradingFee: tradingFee,
            TraderAddressStr: newCoin.PublicKey,
            TxRandomStr: newCoin.TxRandom,
            SubTraderAddressStr: newCoinForSub.PublicKey,
            SubTxRandomStr: newCoinForSub.TxRandom,
        };

        try {
            let result;
            if (sellPRV){
                result = await this._transact({ transfer: { prvPayments: prvPaymentInfos, fee, info }, extra: { metadata }});
                    // prvPaymentInfos, fee, metadata, info);
            }else{
                result = await this._transact({ transfer: { prvPayments: prvPaymentInfos, fee, info, tokenID: tokenIDToSell, tokenPayments: tokenPaymentInfos }, extra: { metadata }});
                    // prvPaymentInfos, fee, metadata, info, tokenIDToSell, tokenPaymentInfos);
            }
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    /********************** pDex v3 **********************/

    async pdexv3TxMintNft({ transfer: { fee, info = ""}}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(pdexv3.MintNftAmount).toString(),
            Message: info
        }];
        let messageForNativeToken = burningPayments[0].Message;
        
        let tokenID = PRVIDSTR;
        // prepare meta data for tx
        let metadata = {
            Amount: pdexv3.MintNftAmount,
            OtaReceiver: await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType)),
            Type: pdexv3.UserMintNftRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: burningPayments, fee, info }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxContribute({ transfer: { fee, info = "", tokenID = null }, extra: { pairID, pairHash, contributedAmount, nftID = null, amplifier } = {}}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(contributedAmount).toString(),
            Message: info
        }];
        let messageForNativeToken = burningPayments[0].Message;
        
        if (!tokenID){ tokenID = PRVIDSTR }
        let isToken = (tokenID != PRVIDSTR);
        let receivingTokens = [tokenID];
        if (!nftID) receivingTokens.push(PDEX_ACCESS_ID);
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }
        // prepare meta data for tx
        let metadata = {
            PoolPairID: pairID,
            PairHash: pairHash,
            TokenAmount: contributedAmount,
            TokenID: tokenID,
            Amplifier: amplifier,
            Type: pdexv3.AddLiquidityRequestMeta,
        };
        if (!!nftID) Object.assign(metadata, {NftID: nftID, OtaReceiver: receiver[tokenID]});
        else metadata.OtaReceivers = receiver;

        try {
            let result;
            if (isToken){
                result = await this._transact({ transfer: { fee, info, tokenID, tokenPayments: burningPayments }, extra: { metadata }});
            }else{
                result = await this._transact({ transfer: { prvPayments: burningPayments, fee, info }, extra: { metadata }});
            }
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxTrade({ transfer: { fee, info = "" }, extra: { tokenIDToBuy, sellAmount, minAcceptableAmount, tradingFee, tokenIDToSell, tradePath, tradingFeeInPRV = false }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);  
        let messageForNativeToken = info;

        let isToken = (tokenIDToSell != PRVIDSTR);
        let receivingTokens = [tokenIDToSell, tokenIDToBuy];
        if (isToken && tradingFeeInPRV && tokenIDToBuy != PRVIDSTR) { 
            receivingTokens.push(PRVIDSTR);
        }
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }
        // prepare meta data for tx
        let metadata = {
            TradePath: tradePath,
            TokenToSell: tokenIDToSell,
            SellAmount: sellAmount,
            TradingFee: tradingFee,
            Receiver: receiver,
            Type: pdexv3.TradeRequestMeta,
        };

        try {
            let result, tokenPayments, prvPayments;
            if (isToken){
                if (tradingFeeInPRV) {
                    // pay fee with PRV
                    prvPayments = [{
                        PaymentAddress: burningAddress,
                        Amount: new bn(tradingFee).toString(),
                        Message: ""
                    }];
                    tokenPayments = [{
                        PaymentAddress: burningAddress,
                        Amount: new bn(sellAmount).toString(),
                        Message: info
                    }];
                } else {
                    tokenPayments = [{
                        PaymentAddress: burningAddress,
                        Amount: new bn(sellAmount + tradingFee).toString(),
                        Message: info
                    }];
                }
                result = await this._transact({ transfer: { fee, info, tokenID: tokenIDToSell, prvPayments, tokenPayments }, extra: { metadata }});
            }else{
                prvPayments = [{
                    PaymentAddress: burningAddress,
                    Amount: new bn(sellAmount + tradingFee).toString(),
                    Message: info
                }];
                result = await this._transact({ transfer: { prvPayments, fee, info }, extra: { metadata }});
            }
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxAddOrder({ transfer: { fee, info = "" }, extra: { tokenIDToSell, tokenIDToBuy, poolPairID, sellAmount, minAcceptableAmount, nftID = null }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(sellAmount).toString(),
            Message: info
        }];
        let messageForNativeToken = burningPayments[0].Message;
        
        let isToken = (tokenIDToSell != PRVIDSTR);
        let receivingTokens = [tokenIDToSell, tokenIDToBuy];
        let receiver = {}, rewardReceiver = {}; 
        if (!nftID) {
            for (const t of [PRVIDSTR, tokenIDToBuy]) {
                rewardReceiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
            }
            receivingTokens.push(PDEX_ACCESS_ID);
        }
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }
        // prepare meta data for tx
        let metadata = {
            PoolPairID: poolPairID,
            SellAmount: sellAmount,
            TokenToSell: tokenIDToSell,
            Receiver: receiver,
            MinAcceptableAmount: minAcceptableAmount,
            Type: pdexv3.AddOrderRequestMeta,
        };
        if (Boolean(nftID)) Object.assign(metadata, { NftID: nftID });
        else Object.assign(metadata, { RewardReceiver: rewardReceiver });

        try {
            let result;
            if (isToken){
                result = await this._transact({ transfer: { fee, info, tokenID: tokenIDToSell, tokenPayments: burningPayments }, extra: { metadata }});
            }else{
                result = await this._transact({ transfer: { prvPayments: burningPayments, fee, info }, extra: { metadata }});
            }
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxWithdrawLiquidity({ transfer: { fee, info = "" }, extra: { poolTokenIDs, poolPairID, shareAmount, nftID }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(1).toString(), // burn 1 of NFTID
            Message: info
        }];
        let messageForNativeToken = burningPayments[0].Message;

        let receivingTokens = [nftID].concat(poolTokenIDs);
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }

        // prepare meta data for tx
        let metadata = {
            PoolPairID: poolPairID,
            ShareAmount: shareAmount,
            NftID: nftID,
            OtaReceivers: receiver,
            Type: pdexv3.WithdrawLiquidityRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: nftID }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxWithdrawOrder({ transfer: { fee, info = "" }, extra: { withdrawTokenIDs, poolPairID, orderID, amount, nftID }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(1).toString(), // burn 1 of NFTID
            Message: info
        }];
        let messageForNativeToken = burningPayments[0].Message;
        
        let receivingTokens = [nftID].concat(withdrawTokenIDs);
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }
        // prepare meta data for tx
        let metadata = {
            PoolPairID: poolPairID,
            OrderID: orderID,
            Amount: amount,
            NftID: nftID,
            Receiver: receiver,
            Type: pdexv3.WithdrawOrderRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: [], tokenPayments: burningPayments, tokenID: nftID, fee, info }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxStake({ transfer: { fee, info = "", tokenID = PRVIDSTR }, extra: { tokenAmount, nftID = null }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(tokenAmount).toString(),
            Message: info
        }];
        let messageForNativeToken = burningPayments[0].Message;
        let isToken = (tokenID != PRVIDSTR);
        let receivingTokens = [tokenID];
        if (!nftID) receivingTokens.push(PDEX_ACCESS_ID);
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }

        // prepare meta data for tx
        let metadata = {
            TokenID: tokenID,
            TokenAmount: tokenAmount,
            Type: pdexv3.StakingRequestMeta,
        };
        if (!!nftID) Object.assign(metadata, {NftID: nftID, OtaReceiver: receiver[tokenID]});
        else metadata.OtaReceivers = receiver;

        try {
            let result;
            if (isToken) {
                result = await this._transact({ transfer: { fee, info, tokenID, tokenPayments: burningPayments }, extra: { metadata }});
            } else { 
                result = await this._transact({ transfer: { prvPayments: burningPayments, fee, info, tokenID }, extra: { metadata }});
            }
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxUnstake({ transfer: { fee, info = "" }, extra: { unstakingAmount, nftID, stakingTokenID, stakingPoolID }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(1).toString(), // burn 1 of NFTID
            Message: info
        }];
        let messageForNativeToken = burningPayments[0].Message;
        
        let receivingTokens = [stakingTokenID, nftID];
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }

        // prepare meta data for tx
        let metadata = {
            StakingPoolID: stakingPoolID,
            UnstakingAmount: unstakingAmount,
            NftID: nftID,
            OtaReceivers: receiver,
            Type: pdexv3.UnstakingRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: nftID }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxWithdrawLPFee({ transfer: { fee, info = "" }, extra: { withdrawTokenIDs, poolPairID, nftID }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(1).toString(), // burn 1 of NFTID
            Message: info
        }];
        let messageForNativeToken = burningPayments[0].Message;

        let receivingTokens = [nftID].concat(withdrawTokenIDs);
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }

        // prepare meta data for tx
        let metadata = {
            PoolPairID: poolPairID,
            NftID: nftID,
            Receivers: receiver,
            Type: pdexv3.WithdrawLPFeeRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: nftID }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxWithdrawStakingReward({ transfer: { fee, info = "" }, extra: { stakingTokenID, nftID }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(1).toString(), // burn 1 of NFTID
            Message: info
        }];
        let messageForNativeToken = burningPayments[0].Message;

        let receivingTokens = [stakingTokenID, nftID];
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }

        // prepare meta data for tx
        let metadata = {
            StakingTokenID: stakingTokenID,
            NftID: nftID,
            Receivers: receiver,
            Type: pdexv3.WithdrawStakingRewardRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: nftID }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    /********************** pDex v3 - AccessTicket **********************/
    async pdexv3GetAccessTickets(tokenID = PDEX_ACCESS_ID, useBase58Encoding = false) {
        const utxos = await this.getListUnspentCoins(tokenID, 2);
        let result = {};
        utxos.forEach(c => {
            try {
                const k = new AccessTicketChooser(null, useBase58Encoding).getAccessTicket(c);
                result[k] = c;
            } catch(e){
                throw e;
            }
        });
        return result;
    }

    async pdexv3TxWithdrawOrder_accessOTA({ transfer: { fee, tokenID = PDEX_ACCESS_ID, info = "" }, extra: { withdrawTokenIDs, poolPairID, orderID, amount, burnOTA, accessID, useBase58Encoding = false }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(1).toString(),
            Message: info
        }];      
        const messageForNativeToken = '';
        let receivingTokens = [PDEX_ACCESS_ID].concat(withdrawTokenIDs);
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }
        // prepare meta data for tx
        let metadata = {
            PoolPairID: poolPairID,
            OrderID: orderID,
            Amount: amount,
            BurntOTA: burnOTA,
            AccessID: accessID,
            Receiver: receiver,
            Type: pdexv3.WithdrawOrderRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: [], fee, tokenID, info, tokenPayments: burningPayments, tokenCoinChooser: new AccessTicketChooser(burnOTA, useBase58Encoding) }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxWithdrawLiquidity_accessOTA({ transfer: { fee, tokenID = PDEX_ACCESS_ID, info = "" }, extra: { poolTokenIDs, poolPairID, shareAmount, burnOTA, accessID, useBase58Encoding = false }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(1).toString(),
            Message: info
        }];      
        const messageForNativeToken = info;

        let receivingTokens = [PDEX_ACCESS_ID].concat(poolTokenIDs);
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }

        // prepare meta data for tx
        let metadata = {
            PoolPairID: poolPairID,
            ShareAmount: shareAmount,
            BurntOTA: burnOTA,
            AccessID: accessID,
            OtaReceivers: receiver,
            Type: pdexv3.WithdrawLiquidityRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: [], fee, info, tokenID, tokenPayments: burningPayments, tokenCoinChooser: new AccessTicketChooser(burnOTA, useBase58Encoding) }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxUnstake_accessOTA({ transfer: { fee, info = "", tokenID = PDEX_ACCESS_ID }, extra: { unstakingAmount, burnOTA, accessID, useBase58Encoding = false, stakingPoolID }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(1).toString(),
            Message: info
        }];
        let messageForNativeToken = info;
        
        let receivingTokens = [PDEX_ACCESS_ID, stakingPoolID];
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }

        // prepare meta data for tx
        let metadata = {
            StakingPoolID: stakingPoolID,
            UnstakingAmount: unstakingAmount,
            BurntOTA: burnOTA,
            AccessID: accessID,
            OtaReceivers: receiver,
            Type: pdexv3.UnstakingRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: [], fee, info, tokenID, tokenPayments: burningPayments, tokenCoinChooser: new AccessTicketChooser(burnOTA, useBase58Encoding) }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxWithdrawLPFee_accessOTA({ transfer: { fee, info = "", tokenID = PDEX_ACCESS_ID }, extra: { withdrawTokenIDs, poolPairID, burnOTA, accessID, useBase58Encoding = false }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(1).toString(),
            Message: info
        }];
        let messageForNativeToken = info;

        let receivingTokens = [PDEX_ACCESS_ID].concat(withdrawTokenIDs);
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }

        // prepare meta data for tx
        let metadata = {
            PoolPairID: poolPairID,
            BurntOTA: burnOTA,
            AccessID: accessID,
            Receivers: receiver,
            Type: pdexv3.WithdrawLPFeeRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: [], fee, info, tokenID, tokenPayments: burningPayments, tokenCoinChooser: new AccessTicketChooser(burnOTA, useBase58Encoding) }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    async pdexv3TxWithdrawStakingReward_accessOTA({ transfer: { fee, info = "", tokenID = PDEX_ACCESS_ID }, extra: { stakingPoolID, burnOTA, accessID, useBase58Encoding = false }}) {
        await this.updateProgressTx(10, 'Generating Metadata');
        let burningAddress = await getBurningAddress(this.rpc);
        let burningPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(1).toString(),
            Message: info
        }];
        let messageForNativeToken = info;

        let receivingTokens = [PDEX_ACCESS_ID, stakingPoolID];
        let receiver = {};
        // create new OTAs
        for (const t of receivingTokens) {
            receiver[t] = await wasm.createOTAReceiver(this.key.base58CheckSerialize(PaymentAddressType));
        }

        // prepare meta data for tx
        let metadata = {
            StakingPoolID: stakingPoolID,
            BurntOTA: burnOTA,
            AccessID: accessID,
            Receivers: receiver,
            Type: pdexv3.WithdrawStakingRewardRequestMeta,
        };

        try {
            let result = await this._transact({ transfer: { prvPayments: [], fee, info, tokenID, tokenPayments: burningPayments, tokenCoinChooser: new AccessTicketChooser(burnOTA, useBase58Encoding) }, extra: { metadata }});
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    // createAndSendUnshieldPortalV4RequestTx create and send tx unshield ptoken portalv4
    /**
     *
     * @param {{paymentAddressStr: string (B58checkencode), amount: number, message: "" }} prvPayments
     * @param {number} fee
     * @param {string} tokenID
     * @param {number} unshieldAmount
     * @param {string} remoteAddress
     */
    async createAndSendUnshieldPortalV4RequestTx({ transfer: { prvPayments = [], fee, info = "", tokenID}, extra: { burningType = PortalV4UnshieldRequestMeta, isEncryptMessage = false, isEncryptMessageToken = false, unshieldAmount, remoteAddress } = {}}) {
        const unshieldTokenID = tokenID;
        if (fee < 0) {
            fee = 0
        }
        await this.updateProgressTx(10, 'Encrypting Message');
        let burningAddress = await getBurningAddress(this.rpc);
        let tokenPayments = [{
            PaymentAddress: burningAddress,
            Amount: new bn(unshieldAmount).toString(),
            Message: ""
        }];
        let messageForNativeToken = "";
        if (prvPayments.length>0){
            messageForNativeToken = prvPayments[0].Message;
        }
        let isEncodeOnly = !isEncryptMessage;
        prvPayments = await encryptMessageOutCoin(prvPayments, isEncodeOnly);
        isEncodeOnly = !isEncryptMessageToken;
        tokenPayments = await encryptMessageOutCoin(tokenPayments, isEncodeOnly);
        // use an empty payment address
        let emptyKeySet = new KeySet();
        await emptyKeySet.importFromPrivateKey(new Uint8Array(32));

        await this.updateProgressTx(15, 'Generating Metadata');
        let myAddressStr = this.key.base58CheckSerialize(PaymentAddressType);
        let pInf = {
            PaymentAddress: myAddressStr,
            Amount: "0"
        }
        let newCoin;
        try {
            // since we only use the PublicKey and TxRandom fields, the tokenID is irrelevant
            let temp = await wasm.createCoin(JSON.stringify({PaymentInfo : pInf, TokenID: null}));
            newCoin = JSON.parse(temp);
        }catch(e){
            throw e;
        }

        // prepare meta data for tx
        let portalUnshieldRequest = {
            OTAPubKeyStr: newCoin.PublicKey,
            TxRandomStr: newCoin.TxRandom,
            RemoteAddress: remoteAddress,
            TokenID: tokenID,
            UnshieldAmount: unshieldAmount,
            Type: burningType,
        }

        try {
            let result = await this._transact({ transfer: { prvPayments, fee, info, tokenID: unshieldTokenID, tokenPayments }, extra: { metadata: portalUnshieldRequest }});
                // prvPayments, fee, portalUnshieldRequest, info, unshieldTokenID, tokenPayments);
            console.log(result)
            await this.updateProgressTx(100, 'Completed');
            return result;
        } catch (e) {
            throw e;
        }
    };

    sleep(ms){
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    sleepCapped(ms, maxSeconds){
        // console.debug("Wait up to", maxSeconds);
        if (maxSeconds<=0){
            throw new CustomError(ErrorObject.UnexpectedErr, "wait time depleted");
        }
        maxSeconds -= ms/1000;
        return this.sleep(ms)
        .then(_ => maxSeconds);
    }

    async waitTx(txId, confirmations = 5) {
        console.debug(txId, " => wait for", confirmations, "confirmations");
        let maxWaitTime = this.timeout;
        let blockHash = null;
        let response;
        while (!blockHash){
            try {
                response = await this.rpc.getTransactionByHash(txId);
                if (response.blockHash && response.blockHash.length==64){
                    blockHash = response.blockHash;
                }else{
                    maxWaitTime = await this.sleepCapped(1000, maxWaitTime);
                }
            } catch (e) {
                throw new CustomError(ErrorObject.GetTxByHashErr, e.message);
            }
        }

        maxWaitTime = 200;
        let currentConfs = 0;
        while (currentConfs < confirmations){
            try {
                response = await this.rpc.getBlockByHash(blockHash);
                let c = response.Confirmations;
                // console.debug(c, "confirmations");
                if (c){
                    currentConfs = c;
                }
                maxWaitTime = await this.sleepCapped(1000, maxWaitTime);
            } catch (e) {
                throw new CustomError(ErrorObject.GetTxByHashErr, e.message);
            }
        }
        console.debug("Confirmed !")
    }

    async waitHeight(height = 10) {
        console.debug("Waiting for beacon height to reach", height);
        let maxWaitTime = this.timeout;
        let done = false;
        let response;
        while (!done){
            try {
                response = await this.rpc.getBeaconBestState();
                if (response.bestState.BeaconHeight >= height){
                    done = true;
                }else{
                    maxWaitTime = await this.sleepCapped(1000, maxWaitTime);
                }
            } catch (e) {
                throw new CustomError(ErrorObject.GetTxByHashErr, e.message);
            }
        }
        console.debug("Completed !")
    }

    async submitKey(auth = null) {
        const otaKey = this.key.base58CheckSerialize(OTAKeyType);
        let resp = await this.rpc.submitKey(otaKey, auth);
        if (!resp) throw `submitting key ${otaKey}: success = ${resp}`;
        console.warn(`submit ${otaKey} to ${this.rpc.rpcHttpService.url}: done.`)
    }

    getPrivateKey() {
        return this.key.base58CheckSerialize(PriKeyType);
    }
}

export {
    StatelessTransactor,
    wasm
};