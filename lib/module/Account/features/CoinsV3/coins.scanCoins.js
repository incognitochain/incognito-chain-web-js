import Validator from "@lib/utils/validator";

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
        coins = await this.activeScanCoins(params)

        // => No need spent coins, free up memory space
        const keys = Object.keys(coins);
        keys.forEach(tokenID => {
            delete coins[tokenID].spentCoins;
        })

        // save coins to storage, get data for next step
        await this.setStorageCoinsScan(coins)
    } catch (e) {
        console.log('SCAN COINS WITH ERROR: ', e)
    }
    return coins;
}


export default {
    scanCoins,
};