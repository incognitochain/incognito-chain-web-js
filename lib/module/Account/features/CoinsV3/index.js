import unspentCoins from "./coins.unspentCoins";
import scanCoins from "./coins.scanCoins";
import storage from "./coins.storage";

const coinsPrototype = {
    ...scanCoins,
    ...unspentCoins,
    ...storage,
};

export default coinsPrototype;
