
const genKey= (storageKey) => {
    return `VERSION_3:(${storageKey})`;
};

const COINS_STORAGE_KEY = {
    COINS_SCAN: genKey("COINS_SCAN"),
    HARDWARE_ACCOUNT_INDEX: genKey("HARDWARE_ACCOUNT_INDEX"),
    NFT_UNSPENT_COINS: genKey("NFT_UNSPENT_COINS"),
}

export {
    COINS_STORAGE_KEY
}