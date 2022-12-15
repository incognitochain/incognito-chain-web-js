import { calculateR, calculateFirstC, calculateCoinPrivKey, genAlpha, setAlpha } from 'hw-app-incognito';
import { base64Encode, randBytes } from "@lib/privacy/utils";

const gRan = 'dGbumgh0umyq1F4ZBwSdzz8FT+WNju8hCcOTRcQZM1o=';

async function hwBeforeCreate(hwTransport, inputCoins, debugAlphaLst = null) {
    if (!debugAlphaLst) {
        await genAlpha(hwTransport, inputCoins.length + 1);
    } else {
        for (let i = 0; i < inputCoins.length + 1; i++) {
            await setAlpha(hwTransport, i, debugAlphaLst[i]);
        }
    }
    let paramLst = inputCoins.map(c => c.PublicKey);
    paramLst.push(gRan)
    const temp = await calculateFirstC(hwTransport, paramLst);
    return base64Encode(temp);
}

async function hwAfterCreate(hwTransport, tx) {

}

export {
    hwBeforeCreate,
    hwAfterCreate,
}