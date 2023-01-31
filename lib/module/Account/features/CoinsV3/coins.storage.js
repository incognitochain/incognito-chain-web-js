import { COINS_STORAGE_KEY } from "@lib/module/Account/features/CoinsV3/coins.constants";
import { PRVIDSTR, PTOKEN_ID } from "@lib/core";
import { getShardIDFromLastByte } from "@lib/common/common";
import Validator from "@lib/utils/validator";
import {ScanCoinBatchSize} from "@lib/module/Account/features/CoinsV3/coins.scanCoins";

function getStorageCoinsScanKey() {
    try {
        const fullNode = this.rpc.rpcHttpService.url;
        new Validator("getStorageCoinsScanKey-fullNode", fullNode)
            .required()
            .string();
        const otaKey = this.getOTAKey();
        return `${otaKey}${fullNode}${COINS_STORAGE_KEY.COINS_SCAN}`
    } catch (error) {
        throw error;
    }
}

// Set all coins scanned to storage
async function setStorageCoinsScan(coins) {
    const key = this.getStorageCoinsScanKey();
    const keys = Object.keys(coins || []);
    keys.forEach(tokenID => {
        delete coins[tokenID].spentCoins;
    })
    await this.setAccountStorage(key, coins)
}

// Get all storage coins scanned from full-node
async function getStorageCoinsScan() {
    const key = this.getStorageCoinsScanKey();
    const coins = await this.getAccountStorage(key);
    return coins;
}

function getStorageHardwareAccountIndexKey() {
    try {
        const otaKey = this.getOTAKey();
        return `${otaKey}${COINS_STORAGE_KEY.HARDWARE_ACCOUNT_INDEX}`
    } catch (error) {
        throw error;
    }
}

// Set hardware account index to storage
async function setStorageHardwareAccountIndex(index) {
    const key = this.getStorageHardwareAccountIndexKey();
    await this.setAccountStorage(key, index)
}

// Get hardware account index for that otakey
function getStorageHardwareAccountIndex() {
    const key = this.getStorageHardwareAccountIndexKey();
    return this.getAccountStorage(key);
}

// Create new account no need scan all coins in full-node
// Can from create time
async function setNewAccountCoinsScan() {
    try {
        const lengths = await this.rpc.getCoinCount();

        // Get account shardID
        const shardID = getShardIDFromLastByte(
            this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]
        );

        // PRV index at ShardID
        const nativeIndex = lengths[PRVIDSTR][shardID];
        const nativeLatestBatchID = Math.floor(nativeIndex / ScanCoinBatchSize);

        // PTOKEN index at ShardID
        const tokenIndex = lengths[PTOKEN_ID][shardID];
        const tokenLatestBatchID = Math.floor(tokenIndex / ScanCoinBatchSize);

        // Default coins scan for new user
        const coinsScan = {
            [PRVIDSTR]: {
                unspentCoins: [],
                latest: nativeIndex,
                latestBatchID: nativeLatestBatchID,
                missingBatchIDs: {}
            },
            [PTOKEN_ID]: {
                unspentCoins: [],
                latest: tokenIndex,
                latestBatchID: tokenLatestBatchID,
                missingBatchIDs: {}
            },
            finishScan: true
        }
        await this.setStorageCoinsScan(coinsScan)
    } catch (error) {
        throw error;
    }
}

async function clearStorageCoinsScan() {
    try {
        const key = this.getStorageCoinsScanKey();
        await this.clearAccountStorage(key)
    } catch (error) {
        throw error;
    }
}

export default {
    getStorageCoinsScanKey,
    setStorageCoinsScan,
    getStorageCoinsScan,
    getStorageHardwareAccountIndexKey,
    getStorageHardwareAccountIndex,
    setStorageHardwareAccountIndex,
    setNewAccountCoinsScan,
    clearStorageCoinsScan,
}