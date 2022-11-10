import Validator from "@lib/utils/validator";
import { getShardIDFromLastByte } from "@lib/common/common";
import { PriKeyType } from "@lib/core";
import { wasm } from "@lib/wasm";
import uniqBy from "lodash/uniqBy";
import { PTOKEN_ID } from "@lib/core";
import { decrypt } from "@lib/privacy/sjcl/sjcl";

/**
 * @param {Array} params.tokenList tokenIDs for scan
 * @return eg: { [tokenID]: { spentCoins: [], unspentCoins: [], latestBatchID: number } }
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
            console.log('coins from storage', coinsStore);

            if (params[PTOKEN_ID] && params[PTOKEN_ID].unspentCoins && params[PTOKEN_ID].unspentCoins.lengths > 0) {
                console.log("re-apply tokenList on previous result");
                params[PTOKEN_ID].unspentCoins = JSON.parse(await wasm.decryptCoinList(JSON.stringify({
                    CoinList: params[PTOKEN_ID].unspentCoins || [],
                    KeySet: this.key.base58CheckSerialize(PriKeyType),
                    TokenList: tokenList,
                })));
            }
        }
        coins = await this._scanCoins(params);
        // save coins to storage, get data for next step
        // await this.setStorageCoinsScan(coins)
    } catch (error) {
        console.log('SCAN COINS WITH ERROR: ', error)
        throw error;
    }
    return coins;
}

const ScanCoinBatchSize = 1000,
    // ScanCoinDecryptSize = 1000,
    MaxBatchCount = 300;


async function _scanCoins(cfg = {}) {
    const tokenList = cfg.tokenList || [];
    const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
    const lengths = await this.rpc.getCoinCount();
    const privkey = this.key.base58CheckSerialize(PriKeyType);

    let tokenIDs = Object.keys(lengths);
    let result = {};
    for (const tokenID of tokenIDs) {
        if (!cfg[tokenID]) cfg[tokenID] = { missingBatchIDs : {}};
        const coinlen = lengths[tokenID][shardID];
        const lastIndex = cfg[tokenID].latestIndex;
        const newLatestBatchID = Math.floor(coinlen / ScanCoinBatchSize);
        let lst = Object.keys(cfg[tokenID].missingBatchIDs).map(k => Number(k));
        if (!cfg[tokenID].latestBatchID) cfg[tokenID].latestBatchID = 0;
        // console.log('shard', shardID, 'token', tokenID, 'latest batchID', Number(cfg[tokenID].latestBatchID), '->', newLatestBatchID);
        let i = cfg[tokenID].latestBatchID;
        if (!(cfg[tokenID].missingBatchIDs[i])) { // avoid duplicates
            lst.push(i);
        }
        for (let i = cfg[tokenID].latestBatchID + 1; i <= newLatestBatchID; i++) {
            lst.push(i);
        }
        if (lst.length > MaxBatchCount) {
            // truncate the list before scan
            const temp = lst.slice(0, lst.length - MaxBatchCount);
            for (const bID of temp) cfg[tokenID].missingBatchIDs[bID] = true;
            lst = lst.slice(lst.length - MaxBatchCount, lst.length);
        }

        result[tokenID] = Object.assign({}, cfg[tokenID]);
        let resultForToken = [];
        console.log('shard', shardID, 'token', tokenID, 'list batchIDs to scan', lst);

        for (let i = 0; i < lst.length; i++) {
            const bID = lst[i];
            try {
                let batchStart = bID * ScanCoinBatchSize;
                if (bID == cfg[tokenID].latestBatchID && batchStart < lastIndex + 1) batchStart = lastIndex + 1;
                let batchEnd = batchStart + ScanCoinBatchSize - 1;
                if (batchEnd > coinlen - 1) batchEnd = coinlen - 1;
                let decryptedCoinList = [];
                if (batchEnd >= batchStart) {
                    const coinMap = await this.rpc.getOutputCoinByIndex(batchStart, batchEnd, shardID, tokenID);
                    decryptedCoinList = JSON.parse(await wasm.decryptCoinList(JSON.stringify({
                        CoinList: Object.values(coinMap),
                        KeySet: privkey,
                        TokenList: tokenList,
                    }))) || [];

                }
                console.log(`scan coins for index #${batchStart} - #${batchEnd}, shard ${shardID}, token ${tokenID.slice(58)}`);
                // console.log('-> found', decryptedCoinList.length, 'total', resultForToken.length);        
                // const keys = Object.keys(coins);
                // keys.forEach(tokenID => {
                //     delete coins[tokenID].spentCoins;
                // })
                result[tokenID] = Object.assign(await this.groupSpentCoins(decryptedCoinList, tokenID, result[tokenID]), { latestBatchID: newLatestBatchID, latestIndex: coinlen - 1 });
                delete result[tokenID].missingBatchIDs[bID];

                // const storageInf = {
                //     coinsLen,
                //     prvLen,
                //     tokenLen,
                //     tokenID,
                //     batchStart,
                // }
                // await this.setAccountStorage(COINS_INDEX_STORAGE_KEY, storageInf);
                await this.setStorageCoinsScan(result);
            } catch (e) {
                console.error(`scan & store coins batch ${bID} error:`, e);
                result[tokenID].missingBatchIDs[bID] = true;
            }
            await this.sleep(100);
        }

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

    // DEBUG: sometimes fail
    // if (crypto.randomBytes(1)[0] % 4 == 0) throw 'debug scan recovery';
    // END DEBUG

    return {
        unspentCoins,
        // spentCoins, // => No need spent coins, free up memory space
        missingBatchIDs: prevResult.missingBatchIDs
    };
}


export default {
    scanCoins,
    groupSpentCoins,
    _scanCoins,
};