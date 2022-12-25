
const genKey= (storageKey) => {
    return `VERSION_3:(${storageKey})`;
};

const COINS_STORAGE_KEY = {
    COINS_SCAN: genKey("COINS_SCAN"),
}

export {
    COINS_STORAGE_KEY
}