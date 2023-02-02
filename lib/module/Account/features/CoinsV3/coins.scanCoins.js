import Validator from "@lib/utils/validator";
import { getShardIDFromLastByte } from "@lib/common/common";
import { OTAKeyType, PriKeyType, PRVIDSTR } from "@lib/core";
import { wasm } from "@lib/wasm";
import uniqBy from "lodash/uniqBy";
import { cloneDeep } from "lodash";
import { PTOKEN_ID } from "@lib/core";
import { decryptCoinAmount, parseCoinKeyImage } from "@lib/module/Account/features/HardwareWallet";

const COINS_INDEX_STORAGE_KEY = 'COINS_INDEX_STORAGE_KEY';
export const ScanCoinBatchSize = 1000, MaxBatchCount = 300 //, ScanCoinDecryptSize = 1000;

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
            // console.log('coins from storage', coinsStore, params[PTOKEN_ID] && params[PTOKEN_ID].unspentCoins && params[PTOKEN_ID].unspentCoins.lengths > 0);

            if (params[PTOKEN_ID] && params[PTOKEN_ID].unspentCoins && params[PTOKEN_ID].unspentCoins.lengths > 0) {
                console.log("re-apply tokenList on previous result");
                params[PTOKEN_ID].unspentCoins = JSON.parse(await wasm.decryptCoinList(JSON.stringify({
                    CoinList: params[PTOKEN_ID].unspentCoins || [],
                    KeySet: this.key.base58CheckSerialize(PriKeyType),
                    TokenList: tokenList,
                })));
            }
        }
        coins = await this.activeScanCoins(params);
    } catch (error) {
        console.log('SCAN COINS WITH ERROR: ', error)
        throw error;
    }
    return coins;
}

async function loopStorageCoins(coins) {
    await this.setStorageCoinsScan(coins);
    let index = 0
    while (true) {
        const _coinsScans = await this.getStorageCoinsScan();
        if (!_coinsScans || !_coinsScans[PTOKEN_ID]) {
            await this.setStorageCoinsScan(coins);
            index++;
            await this.sleep(150);
        } else {
            break;
        }
    }
}

async function activeScanCoins(cfg = {}) {
    const tokenList = cfg.tokenList || [];
    const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
    const lengths = await this.rpc.getCoinCount();
    const privkey = (this.key.KeySet.PrivateKey?.length == 32)  ? this.key.base58CheckSerialize(PriKeyType)
        : this.key.base58CheckSerialize(OTAKeyType);

    const prvLen = lengths[PRVIDSTR][shardID] || 0;
    const tokenLen = lengths[PTOKEN_ID][shardID] || 0;
    const coinsLen = prvLen + tokenLen;
    let result = cloneDeep(cfg);
    let started = false;
    for (const tokenID of [PRVIDSTR, PTOKEN_ID]) {
        if (!result[tokenID]) {
            result[tokenID] = {};
        }
        if (!result[tokenID].missingBatchIDs) {
            result[tokenID].missingBatchIDs = {};
        }
        const coinlen = lengths[tokenID][shardID];
        const lastIndex = result[tokenID].latestIndex || 0;
        const newLatestBatchID = Math.floor(coinlen / ScanCoinBatchSize);
        let lst = Object.keys(result[tokenID].missingBatchIDs || {}).map(k => Number(k));
        if (!result[tokenID].latestBatchID) result[tokenID].latestBatchID = 0;
        let i = result[tokenID].latestBatchID;
        if (!(result[tokenID].missingBatchIDs[i])) { // avoid duplicates
            lst.push(i);
        }
        for (let i = result[tokenID].latestBatchID + 1; i <= newLatestBatchID; i++) {
            lst.push(i);
        }
        
        for (const bID of lst) result[tokenID].missingBatchIDs[bID] = true;
        // if (!cfg[tokenID].latestBatchID) {
        //
        // } else if (lst.length > MaxBatchCount) {
        //     // truncate the list before scan
        //     const temp = lst.slice(0, lst.length - MaxBatchCount);
        //     for (const bID of temp) result[tokenID].missingBatchIDs[bID] = true;
        //     lst = lst.slice(lst.length - MaxBatchCount, lst.length);
        // }
        // let resultForToken = [];
        console.log(
            'shard', shardID,
            'token', tokenID,
            'lastIndex', lastIndex,
            'list batchIDs to scan', lst
        );
        for (let i = 0; i < lst.length; i++) {
            const bID = lst[i];
            try {
                let batchStart = bID * ScanCoinBatchSize;
                if (bID === result[tokenID].latestBatchID && batchStart < lastIndex + 1) {
                    if (!cfg[tokenID]?.missingBatchIDs || !cfg[tokenID].missingBatchIDs[bID]) {
                        // scan lastBatch from lastIndex, unless that batch was missing
                        batchStart = lastIndex + 1;
                    }
                }
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
                console.log(`activeScanCoins: scan coins for index #${batchStart} - #${batchEnd}, shard ${shardID}, token ${tokenID.slice(58)}`);
                if (this.hwTransport) {
                    for (let i = 0; i < decryptedCoinList.length; i++) {
                        await decryptCoinAmount(this.hwTransport, decryptedCoinList[i]);
                        await parseCoinKeyImage(this.hwTransport, decryptedCoinList[i]);
                    }
                }
                result[tokenID] = Object.assign(await this.groupSpentCoins(decryptedCoinList, tokenID, result[tokenID]), { latestBatchID: newLatestBatchID, latestIndex: coinlen - 1 });
                delete result[tokenID].missingBatchIDs[bID];
                console.log(`activeScanCoins: group coins index #${batchStart} - #${batchEnd}, shard ${shardID}, token ${tokenID.slice(58)}`);
                const isLatest = bID === lst[lst.length - 1];
                if (!isLatest || tokenID === PRVIDSTR) {
                    await this.setStorageCoinsScan(result);
                    if((i % 5 !== 0 || !started) && !cfg.finishScan) {
                        await this.sleep(150);
                        const storeStatus = { coinsLen, prvLen, tokenLen, tokenID, batchStart }
                        await this.setAccountStorage(COINS_INDEX_STORAGE_KEY, storeStatus);
                        started = true
                    }
                }
            } catch (e) {
                console.error(`scan & store coins batch ${bID} error:`, e);
                throw e;
            }
            await this.sleep(150);
        }

    }
    result.finishScan = true;
    await this.loopStorageCoins(result)
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
        }
    }

    return {
        unspentCoins,
        missingBatchIDs: prevResult.missingBatchIDs
    };
}


export default {
    scanCoins,
    activeScanCoins,
    groupSpentCoins,
    loopStorageCoins
};
