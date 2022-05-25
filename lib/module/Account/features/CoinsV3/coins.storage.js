import { COINS_STORAGE_KEY } from "@lib/module/Account/features/CoinsV3/coins.constants";

function getStorageCoinsScanKey() {
    const otaKey = this.getOTAKey();
    return `${otaKey}${COINS_STORAGE_KEY.COINS_SCAN}`
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

export default {
    getStorageCoinsScanKey,
    setStorageCoinsScan,
    getStorageCoinsScan
}