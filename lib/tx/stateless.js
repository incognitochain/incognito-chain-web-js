/**
 * A module for creating transactions
 * @module tx
 */
import bn from 'bn.js';
import {
    PDEX_ACCESS_ID,
} from './constants';
import {
    MetaStakingBeacon,
    MetaStakingShard,
    PaymentAddressType,
    ReadonlyKeyType,
    PriKeyType,
    OTAKeyType,
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
    KeyWallet,
    PDEPRVRequiredContributionRequestMeta,
    PortalV4UnshieldRequestMeta,
} from "../core";
import { pdexv3, BurnAddress } from "../core/constants";
import { checkEncode, checkDecode } from "../common/base58";
import {
    convertHashToStr,
    getShardIDFromLastByte,
} from "../common/common";
import {
    generateCommitteeKeyFromHashPrivateKey
} from "../common/committeekey";
import { ENCODE_VERSION } from "../common/constants";
import {
    hashSha3BytesToBytes,
    base64Decode,
    base64Encode,
    stringToBytes,
    toHexString,
} from "../privacy/utils";
import {
    CustomError,
    ErrorObject
} from '../common/errorhandler';
import { KeySet, addressAsObject } from '../common/keySet';
import {
    RpcClient
} from "../rpcclient/rpcclient";
import { wasm } from '../wasm';
import {
    defaultCoinChooser,
    AccessTicketChooser,
} from '../services/coinChooser';
import { Account } from '@lib/module/Account';

class StatelessTransactor extends Account {
    constructor(w, rpcUrl = null) {
        super(w);
        this.rpc = rpcUrl ? new RpcClient(rpcUrl) : w.RpcClient;
        this.timeout = 200;
        this.coin = this.getListUnspentCoins;
        this.convert = this.createAndSendConvertTx;
    }

    /**
     * modify inherited methods to transact without services
     * @param {string} rpcClient - fullnode URL
     */
    init(rpcClient) {
        let rpc = new RpcClient(rpcClient);
        this.setRPCClient(rpcClient);

        // duct-tape methods to skip services
        this.getUnspentCoinsV2 = async function({ tokenID, version }) { return this.getListUnspentCoins(tokenID, 2) }
        this.getUnspentCoinsByTokenIdV1 = async function({ tokenID, version }) {
            return { unspentCoins: await this.getListUnspentCoins(tokenID, 1) }
        }
        this.getUnspentCoinsExcludeSpendingCoins = this.getUnspentCoinsV2;
        this.rpcCoinService = {
            apiGetRandomCommitments: async function({ tokenID, shardID, version, limit }) {
                const result = await defaultCoinChooser.coinsForRing(rpc, shardID, limit, tokenID)
                result.CommitmentIndices = result.Indexes;
                return result;
            },
        }
        this.rpcTxService = {
            rpc: rpc,
            apiPushTx: async function({ rawTx }) {
                try {
                    let result = await this.rpc.sendRawTxCustomTokenPrivacy(rawTx);
                    return result;
                } catch (e) {
                    if (e.Code == -1003 && typeof(e.StackTrace) == 'string') {
                        console.log('retry sending TX as PRV transfer');
                        return await this.rpc.sendRawTx(rawTx);
                    }
                    throw e;
                }
            },
            apiGetTxStatus: async function() { return 'TBD' },
        }
        this.getListSpentCoinsStorage = async function() { return [] }
        this.getKeyInfo = async function() { return {} }
        this.submitOTAKey = async function() { return {} }
        this.requestAirdropNFT = async function() { return {} }
        this.removeTxHistoryByTxIDs = async function() { return {} };
        this.removeSpendingCoinsByTxIDs = async function() { return {} };
    }

    /**
     * import a private key to this account object (to view balance etc.)
     * @param {string|Array} privateKey - the key as byte array, or encoded in Base58
     */
    async setKey(privateKey) {
        // transactor needs private key to sign TXs. Read key in encoded or raw form
        if (typeof(privateKey) == 'string') {
            this.key = KeyWallet.base58CheckDeserialize(privateKey);
        } else if (privateKey.length && privateKey.length == 32) {
            this.key = new KeyWallet();
            this.key.KeySet.PrivateKey = privateKey;
        } else {
            this.key = new KeyWallet();
            return this.key;
        }
        let result = await this.key.KeySet.importFromPrivateKey(this.key.KeySet.PrivateKey);
        await this.submitKey().catch(e => {
            if (e.Code != -13001) throw e; // throw errors except "key already submitted"
        });
        return result;
    }

    /**
     * @returns {Object[]} list of all output coins (spent or not) of this account for a token
     * @param {string} tokenID - defaults to PRV
     * @param {number} version - coin version, defaults to 2
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
                if (version == -1 || c.Version == version) {
                    let params = {
                        Coin: c,
                        KeySet: privKeySerialize
                    }
                    try {
                        let coin = JSON.parse(await wasm.decryptCoin(JSON.stringify(params)));
                        return coin;
                    } catch (e) {
                        console.log(`skip coin ${params.Coin.PublicKey} - ${e}`);
                        return null;
                    }
                }
            }));
            return result.filter(c => c != null);
        } catch (e) {
            console.log(e);
            throw e;
        }
    }

    async removeSpentCoins(shardID, inCoinStrs, tokenID, rpcClient) {
        let unspentCoinStrs = [];
        // change to base58 to query RPC
        let keyImages = inCoinStrs.map(c => checkEncode(base64Decode(c.KeyImage)));

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
    }

    /**
     * @returns {Object[]} list of all unspent coins of this account for a token
     * @param {string} tokenID - defaults to PRV
     * @param {number} version - coin version, defaults to 2
     */
    async getListUnspentCoins(tokenID, version = 2) {
        let paymentAddrSerialize = this.key.base58CheckSerialize(PaymentAddressType);
        let allOutputCoinStrs;
        try {
            allOutputCoinStrs = await this.fetchOutputCoins(tokenID, version);
        } catch (e) {
            throw new CustomError(ErrorObject.GetOutputCoinsErr, e.message || "Can not get output coins when get unspent token");
        }
        let unspentCoins = await this.removeSpentCoins(paymentAddrSerialize, allOutputCoinStrs, tokenID, this.rpc);
        return unspentCoins;
    }

    /**
     * @returns {string} balance of this account for a token
     * @param {string} tokenID - defaults to PRV
     * @param {number} version - coin version, defaults to 2
     */
    async getBalance({tokenID = PRVIDSTR, version = 2} = {}) {
        try {
            const listUnspentCoins = await this.getListUnspentCoins(tokenID, version);
            const accountBalance = listUnspentCoins.reduce(
                (totalAmount, coin) => totalAmount.add(new bn(coin.Value)),
                new bn(0)
            );
            return accountBalance.toString();
        } catch (error) {
            throw error;
        }
    }

    /**
     * @param {string} paymentAddrStr
     * @param {bool} isGetAll
     * @param {string} tokenID
     * @returns {number} reward amount for a token (if isGetAll = false)
     * @returns {Object} all reward amounts (if isGetAll = true)
     */
    async getRewardAmount(paymentAddrStr, isGetAll = false, tokenID = "PRV") {
        try {
            paymentAddrStr = paymentAddrStr || this.key.base58CheckSerialize(PaymentAddressType);
            const resp = await this.rpc.getRewardAmount(paymentAddrStr);
            return isGetAll ? resp.rewards : resp.rewards[tokenID];
        } catch (e) {
            throw new CustomError(ErrorObject.GetRewardAmountErr, "Can not get reward amount");
        }
    }

    /**
     * @returns {Object} status of staker {Role: int, ShardID: int};
     * @property Role -1: not staked, 0: candidate, 1: validator
     * @property ShardID beacon: -1, shardID: 0->MaxShardNumber
     */
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

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    sleepCapped(ms, maxSeconds) {
        if (maxSeconds <= 0) {
            throw new CustomError(ErrorObject.UnexpectedErr, "wait time depleted");
        }
        maxSeconds -= ms / 1000;
        return this.sleep(ms)
            .then(_ => maxSeconds);
    }

    async waitTx(txId, confirmations = 5) {
        console.debug(txId, " => wait for", confirmations, "confirmations");
        let maxWaitTime = this.timeout;
        let blockHash = null;
        let response;
        while (!blockHash) {
            try {
                response = await this.rpc.getTransactionByHash(txId);
                if (response.blockHash && response.blockHash.length == 64) {
                    blockHash = response.blockHash;
                } else {
                    maxWaitTime = await this.sleepCapped(1000, maxWaitTime);
                }
            } catch (e) {
                throw new CustomError(ErrorObject.GetTxByHashErr, e.message);
            }
        }

        maxWaitTime = 200;
        let currentConfs = 0;
        while (currentConfs < confirmations) {
            try {
                response = await this.rpc.getBlockByHash(blockHash);
                let c = response.Confirmations;
                if (c) {
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
        while (!done) {
            try {
                response = await this.rpc.getBeaconBestState();
                if (response.bestState.BeaconHeight >= height) {
                    done = true;
                } else {
                    maxWaitTime = await this.sleepCapped(1000, maxWaitTime);
                }
            } catch (e) {
                throw new CustomError(ErrorObject.GetTxByHashErr, e.message);
            }
        }
        console.debug("Completed !")
    }

    async waitBalanceChange(tokenID, startBalance = null) {
        console.debug(this.key.base58CheckSerialize(PaymentAddressType), " => wait for balance change with token", tokenID);
        let maxWaitTime = this.timeout;
        startBalance = new bn(startBalance || await this.getBalance({tokenID}));
        let balance = startBalance;
        while (balance.eq(startBalance)) {
            try {
                maxWaitTime = await this.sleepCapped(1000, maxWaitTime);
                balance = new bn(await this.getBalance({tokenID}));
            } catch (e) {
                throw new CustomError(ErrorObject.GetTxByHashErr, e.message);
            }
        }
        return {
            oldBalance: startBalance.toString(),
            balance: balance.toString()
        }
    }

    /**
     * submit this account's `otakey` to fullnode for grouping your encrypted coins
     * @param {string} auth - authentication token. Can be null, in which case only coins AFTER submission are affected
     */
    async submitKey(auth = null) {
        const otaKey = this.key.base58CheckSerialize(OTAKeyType);
        let resp = await this.rpc.submitKey(otaKey, auth);
        if (!resp) throw `submitting key ${otaKey}: success = ${resp}`;
    }

    getPrivateKey() {
        return this.key.base58CheckSerialize(PriKeyType);
    }
}

let generateOTAReceivers = async (receivingTokenLst, paymentAddress) => {
    let result = {};
    for (const t of receivingTokenLst) {
        result[t] = await wasm.createOTAReceiver(paymentAddress);
    }
    return result;
}

let getTokensInPool = (id) => id.split('-').slice(0, 2)

let deriveTokenBuy = (tradePath, tokenSell) => {
    let currentBuy = tokenSell;
    for (const pid of tradePath) {
        const lst = getTokensInPool(pid);
        const nextSell = currentBuy;
        if (lst[0] == nextSell) currentBuy = lst[1];
        else if (lst[1] == nextSell) currentBuy = lst[0];
        else throw `invalid path ${tradePath} for tokenSell ${tokenSell}`;
    }
    return currentBuy
}

/**
 * @class sugar for TX creation functions to call from console. Check out examples.
 * @param {Object} transactor object (Account or StatelessTransactor)
 */
class TxBuilder {
    constructor(t) {
        Object.defineProperty(this, 'transactor', {value : t});
        this.params = {
            transfer: {
                prvPayments: [],
                fee: 100,
                tokenID: PRVIDSTR,
                tokenPayments: [],
            },
            extra: { txType: -1, version: 2 }
        }
        this.result = {};
    }

    reset() {
        this.params = {
            transfer: {
                prvPayments: [],
                fee: 100,
                tokenID: PRVIDSTR,
                tokenPayments: [],
            },
            extra: {}
        }
        this.result = {};
        return this;
    }

    async send() {
        // finish metadata prep
        if (typeof(this.params.extra.metadata) == 'function') this.params.extra.metadata = await this.params.extra.metadata();
        if (this.params.transfer.tokenPayments.length == 0) this.params.transfer.tokenPayments = null;
        this.result = await this.transactor.transact(this.params);
        return this;
    }

    async show() {
        if (this.params.transfer.tokenID != PRVIDSTR) {
            console.log(`Token ${this.params.transfer.tokenID}`);
            for (const inf of this.params.transfer.tokenPayments) {
                if (inf.PaymentAddress == BurnAddress) console.log(`  burn ${inf.Amount}`);
                else console.log(`  send ${inf.Amount} to ${inf.PaymentAddress}`);
            }
            console.log();
        }
        console.log('PRV');
        for (const inf of this.params.transfer.prvPayments) {
            if (inf.PaymentAddress == BurnAddress) console.log(`  burn ${inf.Amount}`);
            else console.log(`  send ${inf.Amount} to ${inf.PaymentAddress}`);
        }
        console.log(`  fee  ${this.params.transfer.fee}`);
        console.log();

        if (typeof(this.params.extra.metadata) == 'function') this.params.extra.metadata = await this.params.extra.metadata();
        if (Boolean(this.params.extra.metadata)) {
            console.log('Metadata');
            console.dir(this.params.extra.metadata, { depth: null });
            console.log();
        }

        return this;
    }

    getNewTokenID(txResult) {
        // re-compute token ID
        const shardID = getShardIDFromLastByte(this.transactor.key.KeySet.PaymentAddress.Pk[(this.transactor.key.KeySet.PaymentAddress.Pk.length - 1)]);
        // concatenate, then hash the raw bytes
        const content = stringToBytes(txResult.txId + shardID);
        // swap the endian to match Go code
        let hashed = hashSha3BytesToBytes(content);
        hashed.reverse();
        return toHexString(hashed);
    }

    to(addr, value) {
        let pInf = {
            PaymentAddress: addr,
            Amount: value,
        }
        let payments = (this.params.transfer.tokenID == PRVIDSTR) ? this.params.transfer.prvPayments : this.params.transfer.tokenPayments;
        payments.push(pInf);
        return this;
    }

    burn(value) {
        let pInf = {
            PaymentAddress: BurnAddress,
            Amount: value,
        }
        Object.assign(this.params.transfer, { prvPayments: [], tokenPayments: [] });
        let payments = (this.params.transfer.tokenID == PRVIDSTR) ? this.params.transfer.prvPayments : this.params.transfer.tokenPayments;
        payments.push(pInf);
        return this;
    }

    withAccess(ota) {
        this.params.transfer.tokenCoinChooser = new AccessTicketChooser(ota);
        this.params.transfer.tokenCoinForRingCount = 0;
        return this;
    }

    withFee(f) {
        this.params.transfer.fee = f;
        return this;
    }
    withTokenID(id) {
        if (id != this.params.transfer.tokenID) {
            if (id == PRVIDSTR) {
                this.params.transfer.prvPayments = this.params.transfer.tokenPayments;
                this.params.transfer.tokenPayments = [];
            } else {
                this.params.transfer.tokenPayments = this.params.transfer.prvPayments;
                this.params.transfer.prvPayments = [];
            }
            this.params.transfer.tokenID = id;
        }
        return this;
    }
    withInfo(info) {
        this.params.transfer.info = info;
        return this;
    }
    withMetadata(md) {
        this.params.extra.metadata = md;
        return this;
    }

    willReceive(...tokens) {
        return generateOTAReceivers(tokens, this.transactor.key.base58CheckSerialize(PaymentAddressType));
    }

    /* 
        Metadata prep methods
        They "construct" the metadata for tx, but defer the "await" calls to send() 
    */

    newToken(tokenName = '', tokenSymbol = '') {
        this.withTokenID(PRVIDSTR);
        let paymentLst = this.params.transfer.prvPayments;
        if (!paymentLst.length && paymentLst.length > 1) throw `invalid payment info ${paymentLst} for new custom token`;
        this.params.transfer.prvPayments = [];
        this.params.extra.metadata = async () => {
            let temp = await wasm.createCoin(JSON.stringify({
                PaymentInfo: paymentLst[0],
                TokenID: null
            }));
            let newCoin = JSON.parse(temp);
            return {
                Type: InitTokenRequestMeta,
                Amount: paymentLst[0].Amount,
                OTAStr: checkEncode(base64Decode(newCoin.PublicKey)),
                TxRandomStr: checkEncode(base64Decode(newCoin.TxRandom)),
                TokenName: tokenName,
                TokenSymbol: tokenSymbol
            };
        }
        return this;
    }

    withPool(id) {
        this.params.poolID = id;
        return this;
    }

    contribute(burnAmount, amplifier = 10000, poolID = null) {
        let tokenID = this.params.transfer.tokenID;
        poolID = poolID || this.params.poolID;
        let pairHash = toHexString(hashSha3BytesToBytes(stringToBytes(poolID + this.transactor.key.base58CheckSerialize(PaymentAddressType))));
        this.burn(burnAmount);
        let sharedAccessReceiver = (Boolean(this.params.extra.metadata) && this.params.extra.metadata.Type == pdexv3.AddLiquidityRequestMeta) ? this.params.extra.metadata.OtaReceiver : null;
        this.params.extra.metadata = async () => {
            let receiver = await this.willReceive(tokenID, PDEX_ACCESS_ID);
            if (Boolean(sharedAccessReceiver)) delete(receiver[PDEX_ACCESS_ID]); // 2nd contribution
            else sharedAccessReceiver = receiver[PDEX_ACCESS_ID]; // 1st contribution
            return {
                PoolPairID: '',
                PairHash: pairHash,
                TokenAmount: burnAmount,
                TokenID: tokenID,
                Amplifier: amplifier,
                OtaReceivers: receiver,
                OtaReceiver: sharedAccessReceiver,
                Type: pdexv3.AddLiquidityRequestMeta,
            };
        }
        return this;
    }

    contributeMore(burnAmount, accessID, poolID = null) {
        const amplifier = 10000; // later overridden by pool's amplifier
        let tokenID = this.params.transfer.tokenID;
        poolID = poolID || this.params.poolID;
        let pairHash = toHexString(hashSha3BytesToBytes(stringToBytes(poolID + this.transactor.key.base58CheckSerialize(PaymentAddressType))));
        this.burn(burnAmount);
        this.params.extra.metadata = async () => {
            return {
                PoolPairID: poolID,
                PairHash: pairHash,
                TokenAmount: burnAmount,
                TokenID: tokenID,
                Amplifier: amplifier,
                OtaReceivers: await this.willReceive(tokenID, PDEX_ACCESS_ID),
                AccessID: accessID,
                Type: pdexv3.AddLiquidityRequestMeta,
            };
        }
        return this;
    }

    trade(sellAmount, minBuyAmount = 0, tradingFee = 100, tradingFeeInPRV = false, tradePath = null) {
        let tokenIDSell = this.params.transfer.tokenID;
        tradePath = tradePath || [this.params.poolID];
        tradingFeeInPRV = tradingFeeInPRV || this.params.tradingFeeInPRV;
        let tokenIDBuy = deriveTokenBuy(tradePath, tokenIDSell); // infer tokenBuy

        if (tradingFeeInPRV && tokenIDSell != PRVIDSTR) {
            // pay fee with PRV
            Object.assign(this.params.transfer, {
                prvPayments: [{
                    PaymentAddress: BurnAddress,
                    Amount: new bn(tradingFee).toString(),
                }],
                tokenPayments: [{
                    PaymentAddress: BurnAddress,
                    Amount: new bn(sellAmount).toString(),
                }],
            });
        } else {
            this.to(BurnAddress, new bn(sellAmount).add(new bn(tradingFee)).toString());
        }

        this.params.extra.metadata = async () => {
            return {
                TradePath: tradePath,
                TokenToSell: tokenIDSell,
                SellAmount: sellAmount,
                MinAcceptableAmount: minBuyAmount,
                TradingFee: tradingFee,
                Receiver: await this.willReceive(tokenIDSell, tokenIDBuy, PRVIDSTR),
                Type: pdexv3.TradeRequestMeta,
            };
        }
        return this;
    }

    order(sellAmount, buyAmount, poolID = null) {
        let tokenIDSell = this.params.transfer.tokenID;
        poolID = poolID || this.params.poolID;
        let tokenIDBuy = deriveTokenBuy([poolID], tokenIDSell);
        this.burn(sellAmount);
        this.params.extra.metadata = async () => {
            return {
                PoolPairID: poolID,
                SellAmount: sellAmount,
                TokenToSell: tokenIDSell,
                Receiver: await this.willReceive(tokenIDSell, tokenIDBuy, PDEX_ACCESS_ID),
                RewardReceiver: await this.willReceive(PRVIDSTR, tokenIDSell),
                MinAcceptableAmount: buyAmount,
                Type: pdexv3.AddOrderRequestMeta,
            };
        }
        return this;
    }

    dexStake(amount) {
        let tokenID = this.params.transfer.tokenID; // staking pool ID is identical to the tokenID staked
        this.burn(amount);
        this.params.extra.metadata = async () => {
            return {
                TokenID: tokenID,
                TokenAmount: amount,
                OtaReceivers: await this.willReceive(tokenID, PDEX_ACCESS_ID),
                Type: pdexv3.StakingRequestMeta,
            };
        }
        return this;
    }

    withdrawLiquidity(shareAmount, accessID, poolTokenIDs = null, poolID = null) {
        poolID = poolID || this.params.poolID;
        poolTokenIDs = poolTokenIDs || getTokensInPool(poolID);
        this.withTokenID(PDEX_ACCESS_ID);
        this.burn(1);
        this.params.extra.metadata = async () => {
            return {
                PoolPairID: poolID,
                ShareAmount: shareAmount,
                BurntOTA: this.params.transfer.tokenCoinChooser.accessTicket,
                AccessID: accessID,
                OtaReceivers: await this.willReceive(PDEX_ACCESS_ID, ...poolTokenIDs),
                Type: pdexv3.WithdrawLiquidityRequestMeta,
            };
        }
        return this;
    }

    withdrawOrder(orderID, accessID, withdrawTokenIDs = null, poolID = null, amount = 0) {
        poolID = poolID || this.params.poolID;
        withdrawTokenIDs = withdrawTokenIDs || getTokensInPool(poolID);
        this.withTokenID(PDEX_ACCESS_ID);
        this.burn(1);
        this.params.extra.metadata = async () => {
            return {
                PoolPairID: poolID,
                OrderID: orderID,
                Amount: amount,
                BurntOTA: this.params.transfer.tokenCoinChooser.accessTicket,
                AccessID: accessID,
                Receiver: await this.willReceive(PDEX_ACCESS_ID, ...withdrawTokenIDs),
                Type: pdexv3.WithdrawOrderRequestMeta,
            };
        }
        return this;
    }

    dexUnstake(amount, accessID) {
        let stakingPoolID = this.params.poolID;
        this.withTokenID(PDEX_ACCESS_ID);
        this.burn(1);
        this.params.extra.metadata = async () => {
            return {
                StakingPoolID: stakingPoolID,
                UnstakingAmount: amount,
                BurntOTA: this.params.transfer.tokenCoinChooser.accessTicket,
                AccessID: accessID,
                OtaReceivers: await this.willReceive(PDEX_ACCESS_ID, stakingPoolID),
                Type: pdexv3.UnstakingRequestMeta,
            };
        }
        return this;
    }

    withdrawRewardLP(accessID, withdrawTokenIDs = null, poolID = null) {
        poolID = poolID || this.params.poolID;
        withdrawTokenIDs = withdrawTokenIDs || getTokensInPool(poolID);
        this.withTokenID(PDEX_ACCESS_ID);
        this.burn(1);
        this.params.extra.metadata = async () => {
            return {
                PoolPairID: poolID,
                BurntOTA: this.params.transfer.tokenCoinChooser.accessTicket,
                AccessID: accessID,
                Receivers: await this.willReceive(PDEX_ACCESS_ID, PRVIDSTR, ...withdrawTokenIDs),
                Type: pdexv3.WithdrawLPFeeRequestMeta,
            };
        }
        return this;
    }

    withdrawRewardStaking(accessID, poolID = null) {
        let stakingPoolID = this.params.poolID;
        this.withTokenID(PDEX_ACCESS_ID);
        this.burn(1);
        this.params.extra.metadata = async () => {
            return {
                StakingPoolID: stakingPoolID,
                BurntOTA: this.params.transfer.tokenCoinChooser.accessTicket,
                AccessID: accessID,
                Receivers: await this.willReceive(PDEX_ACCESS_ID, stakingPoolID),
                Type: pdexv3.WithdrawStakingRewardRequestMeta,
            };
        }
        return this;
    }

    stake(candidatePaymentAddress = null, candidateMiningSeedKey = null, rewardReceiverPaymentAddress = null, autoReStaking = true, stakingType = ShardStakingType) {
        const amount = new bn("1750000000000", 10);
        candidatePaymentAddress = candidatePaymentAddress || this.transactor.key.base58CheckSerialize(PaymentAddressType);
        rewardReceiverPaymentAddress = rewardReceiverPaymentAddress || this.transactor.key.base58CheckSerialize(PaymentAddressType);
        candidateMiningSeedKey = candidateMiningSeedKey || checkEncode(this.transactor.key.getMiningSeedKey(), ENCODE_VERSION);
        // generate committee key        
        let candidateKeyWallet = KeyWallet.base58CheckDeserialize(candidatePaymentAddress);
        let publicKeyBytes = candidateKeyWallet.KeySet.PaymentAddress.Pk;
        let candidateHashPrivateKeyBytes = checkDecode(candidateMiningSeedKey).bytesDecoded;
        this.withTokenID(PRVIDSTR);
        this.burn(amount.toString());
        this.params.extra.metadata = async () => {
            return {
                Type: stakingType === ShardStakingType ? MetaStakingShard : MetaStakingBeacon,
                FunderPaymentAddress: this.transactor.key.base58CheckSerialize(PaymentAddressType),
                RewardReceiverPaymentAddress: rewardReceiverPaymentAddress,
                StakingAmountShard: amount.toNumber(),
                CommitteePublicKey: await generateCommitteeKeyFromHashPrivateKey(candidateHashPrivateKeyBytes, publicKeyBytes),
                AutoReStaking: autoReStaking,
            };
        };
        return this;
    }

    unstake(candidatePaymentAddress = null, candidateMiningSeedKey = null, metadataType = UnStakingMeta) {
        candidatePaymentAddress = candidatePaymentAddress || this.transactor.key.base58CheckSerialize(PaymentAddressType);
        candidateMiningSeedKey = candidateMiningSeedKey || checkEncode(this.transactor.key.getMiningSeedKey(), ENCODE_VERSION);
        let candidateKeyWallet = KeyWallet.base58CheckDeserialize(candidatePaymentAddress);
        let publicKeyBytes = candidateKeyWallet.KeySet.PaymentAddress.Pk;
        let candidateHashPrivateKeyBytes = checkDecode(candidateMiningSeedKey).bytesDecoded;
        this.withTokenID(PRVIDSTR);
        this.burn(0);
        this.params.extra.metadata = async () => {
            return {
                Type: metadataType,
                CommitteePublicKey: await generateCommitteeKeyFromHashPrivateKey(candidateHashPrivateKeyBytes, publicKeyBytes)
            };
        };
        return this;
    }

    burningRequest(amount, remoteAddress, burningType = BurningRequestMeta) {
        let burningTokenID = this.params.transfer.tokenID;
        this.params.extra.metadata = async () => {
            let emptyKeySet = await new KeySet().importFromPrivateKey(new Uint8Array(32));
            return {
                BurnerAddress: addressAsObject(emptyKeySet.PaymentAddress),
                BurningAmount: amount,
                TokenID: burningTokenID,
                RemoteAddress: remoteAddress,
                Type: burningType,
            };
        };
        return this;
    }
}

export {
    StatelessTransactor,
    TxBuilder,
    wasm
};
