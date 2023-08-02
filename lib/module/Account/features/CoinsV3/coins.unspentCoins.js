import Validator from "@lib/utils/validator";
import { PRVIDSTR, PTOKEN_ID } from "@lib/core";
import {sleep} from "@lib/module/Account/account.utils";

async function loopGetUnspentCoinsV3() {
    let coins = null
    while (true) {
        await sleep(500);
        const _coinsScan = await this.getStorageCoinsScan();
        if (_coinsScan[PTOKEN_ID]) {
            coins = _coinsScan
            break;
        }
    }
    return coins
}

async function getUnspentCoinsV3(params) {
    console.log("[LOG] [getUnspentCoinsV3] ")
    let unspentCoins = []
    try {
        const { version, tokenID, isNFT = false } = params;

        console.log("[LOG] [getUnspentCoinsV3] params ", params)

        new Validator(`getUnspentCoinsV3-tokenID`, tokenID).required().string();
        new Validator(`getUnspentCoinsV3-version`, version).required().number();
        new Validator(`getUnspentCoinsV3-isNFT`, isNFT).boolean();

        let coinsScan = await this.getStorageCoinsScan();
        if (!coinsScan) return []
        if (!coinsScan[PTOKEN_ID]) {
            coinsScan = await this.loopGetUnspentCoinsV3();
        }
        // get PRV coins
        if (tokenID === PRVIDSTR && coinsScan[PRVIDSTR] && coinsScan[PRVIDSTR]?.unspentCoins) {
            unspentCoins = coinsScan[PRVIDSTR]?.unspentCoins || []
        }

        // get PTOKEN coins
        if (tokenID !== PRVIDSTR && coinsScan[PTOKEN_ID] && coinsScan[PTOKEN_ID]?.unspentCoins) {
            const tokenCoins = coinsScan[PTOKEN_ID]?.unspentCoins || [];
            console.log("[LOG] [getUnspentCoinsV3] tokenCoins ", tokenCoins)
            unspentCoins = tokenCoins
                .filter(({ TokenID: _tokenID }) => _tokenID.toLowerCase() === tokenID.toLowerCase());
        }
    } catch (error) {
        console.log("GET UNSPENT COINS V3 FAILED", error);
        throw error;
    }

    return unspentCoins
}

async function getNFTUnspentCoinsV3() {
    let NFTUnspentCoins = []
    try {

        let coinsScan = await this.getStorageCoinsScan();
        if (!coinsScan) return []
        if (!coinsScan[PTOKEN_ID]) {
            coinsScan = await this.loopGetUnspentCoinsV3();
        }
      
        // console.log("[getNFTUnspentCoinsV3] coinsScan", coinsScan);

        // get NFT Unspent Coin(s)
        if (coinsScan[PTOKEN_ID] && coinsScan[PTOKEN_ID]?.unspentCoins) {
            const unspentCoinsList = coinsScan[PTOKEN_ID]?.unspentCoins || [];
            NFTUnspentCoins = unspentCoinsList
                .filter(({ TokenID: _tokenID, Value: _value }) => _value === "1")
        };

        // console.log("[getNFTUnspentCoinsV3] NFTUnspentCoins 1 ", NFTUnspentCoins);

    } catch (error) {
        // console.log("[getNFTUnspentCoinsV3] FAILED", error);
        NFTUnspentCoins = []
    } finally {
    }

    // console.log("[getNFTUnspentCoinsV3] NFTUnspentCoins 2 ", NFTUnspentCoins);

    await this.setNFTUnspentCoinsList(NFTUnspentCoins)

    return NFTUnspentCoins || [];
}


async function getUnspentCoinsV3_NEW(params) {
    let unspentCoins = []
    try {
        const { version, tokenIDs = [], isNFT = false } = params;
        new Validator(`getUnspentCoinsV3-tokenID`, tokenID).required().string();
        new Validator(`getUnspentCoinsV3-version`, version).required().number();
        new Validator(`getUnspentCoinsV3-isNFT`, isNFT).boolean();

        let coinsScan = await this.getStorageCoinsScan();
        if (!coinsScan) return []
        if (!coinsScan[PTOKEN_ID]) {
            coinsScan = await this.loopGetUnspentCoinsV3();
        }
      
        // get PTOKEN coins
        if (coinsScan[PTOKEN_ID] && coinsScan[PTOKEN_ID]?.unspentCoins) {
            const tokenCoins = coinsScan[PTOKEN_ID]?.unspentCoins || [];
            unspentCoins = tokenCoins
                .filter(({ TokenID: _tokenID }) => {
                    const tokenIDLoweCase = _tokenID.toLowerCase()
                    if (!tokenIDs.includes(tokenIDLoweCase)) {
                        return true;
                    } else {
                        return false;
                    }
                    // _tokenID.toLowerCase() === tokenID.toLowerCase()
                });
        }
    } catch (error) {
        console.log("GET UNSPENT COINS V3 NEW FAILED", error);
        throw error;
    }
    return unspentCoins;
}

export default {
    getUnspentCoinsV3,
    loopGetUnspentCoinsV3,
    getNFTUnspentCoinsV3
}