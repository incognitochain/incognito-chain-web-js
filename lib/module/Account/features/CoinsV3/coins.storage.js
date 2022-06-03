import { COINS_STORAGE_KEY } from "@lib/module/Account/features/CoinsV3/coins.constants";
import { PRVIDSTR, PTOKEN_ID } from "@lib/core";
import { getShardIDFromLastByte } from "@lib/common/common";
import Validator from "@lib/utils/validator";

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
    await this.setAccountStorage(key, coins)
}

// Get all storage coins scanned from full-node
async function getStorageCoinsScan() {
    const key = this.getStorageCoinsScanKey();
    const coins = await this.getAccountStorage(key);
    return coins;
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

        // PTOKEN index at ShardID
        const tokenIndex = lengths[PTOKEN_ID][shardID];

        // Default coins scan for new user
        const coinsScan = {
            [PRVIDSTR]: {
                unspentCoins: [],
                latest: nativeIndex
            },
            [PTOKEN_ID]: {
                unspentCoins: [],
                latest: tokenIndex
            }
        }
        await this.setStorageCoinsScan(coinsScan)
    } catch (error) {
        console.log('')
    }
}

export default {
    getStorageCoinsScanKey,
    setStorageCoinsScan,
    getStorageCoinsScan,
    setNewAccountCoinsScan,
}