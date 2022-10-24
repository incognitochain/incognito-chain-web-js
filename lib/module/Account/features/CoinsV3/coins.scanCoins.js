import Validator from "@lib/utils/validator";
import { getShardIDFromLastByte } from "@lib/common/common";
import { PriKeyType } from "@lib/core";
import { wasm, callwasm } from "@lib/wasm";
import uniqBy from "lodash/uniqBy";
import { PTOKEN_ID } from "@lib/core";

let ScanCoinBatchSize = 1000,
    ScanCoinPoolSize = 5,
    ScanCoinSpawnWorkerThreshold = 50000;

/**
 * @param {Array} params.tokenList tokenIDs for scan
 * @return eg: { [tokenID]: { spentCoins: [], unspentCoins: [], latest: number } }
 * 0005 include all pToken, filter by field TokenID
 * */
async function scanCoins(params) {
    let coins = {};
    try {
        const coinsStore = await this.getStorageCoinsScan();
        const { tokenList } = params;
        new Validator("scanCoins-tokenList", tokenList).required().array();

        // Scan next coins if scanned before
        if (!!coinsStore) {
            params = { ...params, ...coinsStore }
        }
        coins = await this._scanCoins(params)

        // => No need spent coins, free up memory space
        const keys = Object.keys(coins);
        keys.forEach(tokenID => {
            delete coins[tokenID].spentCoins;
        })

        // save coins to storage, get data for next step
        await this.setStorageCoinsScan(coins)
    } catch (error) {
        console.log('SCAN COINS WITH ERROR: ', error)
        throw error;
    }
    return coins;
}

async function _scanCoins(cfg = {}, batchSize = ScanCoinBatchSize, poolSize = ScanCoinPoolSize) {
    const tokenList = cfg.tokenList || [];
    const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
    const lengths = await this.rpc.getCoinCount();
    const privkey = this.key.base58CheckSerialize(PriKeyType);

    let tokenIDs = Object.keys(lengths);
    const coinGapsByToken = tokenIDs.map(t => cfg[t] ? lengths[t][shardID] - cfg[t].latest : lengths[t][shardID]);
    let wpool = Array(poolSize).fill(null);
    // only spawn workers for decryption if gap is big
    // otherwise, decrypt sequentially
    if (globalThis.Worker && Math.max(...coinGapsByToken) > ScanCoinSpawnWorkerThreshold) {
        const { Worker } = await import("@lib/wasm/index.worker.js");
        wpool = wpool.map(_ => new Worker());
    }
    let result = {};
    for (const tokenID of tokenIDs) {
        const start = cfg[tokenID]?.latest || 0;
        let coinlen = lengths[tokenID][shardID];
        let wqueues = Array(poolSize).fill(Promise.resolve([]));

        let tasks = [];
        let count = 0;
        let missing = cfg[tokenID]?.missing || [];
        for (let batchStart = start; batchStart < coinlen; batchStart += batchSize) {
            count++;
            const wi = count % poolSize;
            let batchEnd = batchStart + batchSize - 1;
            if (batchEnd > coinlen - 1) batchEnd = coinlen - 1;

            await this.rpc.getOutputCoinByIndex(batchStart, batchEnd, shardID, tokenID)
                .then(coinMap => {
                    // after receiving coins from RPC, queue a decryption task to worker wi
                    wqueues[wi] = wqueues[wi].then(async lst => {
                        const prms = callwasm(wpool[wi], 'decryptCoinList', // it decrypts coins, pass on the indexes
                            JSON.stringify({
                                CoinList: Object.values(coinMap),
                                KeySet: privkey,
                                TokenList: tokenList,
                            }))
                        let decryptedCoinList = JSON.parse(await prms);
                        if (!decryptedCoinList?.length) decryptedCoinList = [];
                        return lst.concat(decryptedCoinList);
                    });
                })
                .catch(e => {
                    console.error(e);
                    missing.push(batchStart);
                })
            console.log(`scan coins from index #${batchStart} - shard ${shardID} - token ${tokenID.slice(58)}`);
        }
        // await Promise.all(tasks);
        // use tokenList on previous result
        if (tokenID === PTOKEN_ID && cfg[PTOKEN_ID]) {
            cfg[PTOKEN_ID].unspentCoins = JSON.parse(await wasm.decryptCoinList(JSON.stringify({
                CoinList: cfg[PTOKEN_ID].unspentCoins || [],
                KeySet: privkey,
                TokenList: tokenList,
            })));
        }
        let resultForToken = await Promise.all(wqueues);
        resultForToken = resultForToken.reduce((accumulatedLst, t) => accumulatedLst.concat(t), []); // flatten the coin lists
        result[tokenID] = Object.assign(await this.groupSpentCoins(resultForToken, tokenID, cfg[tokenID]), { latest: coinlen, missing });
    }
    return result;
}

async function groupSpentCoins(newCoins, tokenID, prevResult = {}) {
    const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
    let unspentCoins = [],
        spentCoins = [];
    const coins = uniqBy((newCoins || []).concat(prevResult.unspentCoins || []), "KeyImage")
    let keyImages = coins.map(c => c.KeyImage);
    let response;
    try {
        response = await this.rpc.hasSerialNumber(shardID, keyImages, tokenID);
    } catch (e) {
        throw e;
    }
    const spent = response.existed;
    if (spent.length !== coins.length) {
        throw new Error("Wrong response when check has serial number");
    }

    for (let i = 0; i < spent.length; i++) {
        if (!spent[i]) {
            unspentCoins.push(coins[i]);
        } else {
            spentCoins.push(coins[i])
        }
    }
    return { unspentCoins, spentCoins };
}


export default {
    scanCoins,
    _scanCoins,
    groupSpentCoins,
};