import Validator from "@lib/utils/validator";
import { PRVIDSTR, PTOKEN_ID } from "@lib/core";

async function getUnspentCoinsV3(params) {
    let unspentCoins = []
    try {
        const { version, tokenID, isNFT = false } = params;
        new Validator(`getUnspentCoinsV3-tokenID`, tokenID).required().string();
        new Validator(`getUnspentCoinsV3-version`, version).required().number();
        new Validator(`getUnspentCoinsV3-isNFT`, isNFT).boolean();

        const coinsScan = await this.getStorageCoinsScan();
        if (!coinsScan) return []

        // get PRV coins
        if (tokenID === PRVIDSTR && coinsScan[PRVIDSTR] && coinsScan[PRVIDSTR]?.unspentCoins) {
            unspentCoins = coinsScan[PRVIDSTR]?.unspentCoins || []
        }
        // get PTOKEN coins
        if (tokenID !== PRVIDSTR && coinsScan[PTOKEN_ID] && coinsScan[PTOKEN_ID]?.unspentCoins) {
            const tokenCoins = coinsScan[PTOKEN_ID]?.unspentCoins || [];
            unspentCoins = tokenCoins
                .filter(({ TokenID: _tokenID }) =>
                    _tokenID.toLowerCase() === tokenID.toLowerCase()
                );
        }
    } catch (error) {
        console.log("GET UNSPENT COINS V3 FAILED", error);
        throw error;
    }
    return unspentCoins;
}

export default {
    getUnspentCoinsV3
}