import { calculateR, calculateFirstC, calculateCoinPrivKey, genAlpha, setAlpha, calculateKeyImage, decryptCoin } from 'hw-app-incognito';
import { base64Decode, base64Encode, randBytes } from "@lib/privacy/utils";
import bn from 'bn.js';

const gRan = 'dGbumgh0umyq1F4ZBwSdzz8FT+WNju8hCcOTRcQZM1o=';
const MlsagPrefix = 2;
const Ed25519KeySize = 32;

async function hwBeforeCreate(hwTransport, inputCoins, tokenInputCoins, debugAlphaLst = null, tokenDebugAlphaLst = null) {
    let result = []
    {
        if (!debugAlphaLst) {
            await genAlpha(hwTransport, inputCoins.length + 1, false);
        } else {
            for (let i = 0; i < inputCoins.length + 1; i++) {
                await setAlpha(hwTransport, i, debugAlphaLst[i], false);
            }
        }
        let paramLst = inputCoins.map(c => c.PublicKey);
        paramLst.push(gRan)
        const temp = await calculateFirstC(hwTransport, paramLst, false);
        result.push(base64Encode(temp));
        console.info('will put cseed', result, 'to Sign PRV transfer')
    }

    if (tokenInputCoins?.length > 0) {
        if (!tokenDebugAlphaLst) {
            await genAlpha(hwTransport, tokenInputCoins.length + 2, true);
        } else {
            for (let i = 0; i < inputCoins.length + 1; i++) {
                await setAlpha(hwTransport, i, tokenDebugAlphaLst[i], true);
            }
        }
        let paramLst = tokenInputCoins.map(c => c.PublicKey);
        paramLst.push(gRan)
        paramLst.push(gRan)
        const temp = await calculateFirstC(hwTransport, paramLst, true);
        result.push(base64Encode(temp));
        console.info('will put cseed', result, 'to Sign Token transfer')
    }
    return result;
}

async function hwAfterCreate(hwTransport, txObj, inputCoins, inputCoinPosition, tokenInputCoins) {
    if (!tokenInputCoins?.length) {
        // decode partial ring signature
        let sig = Buffer.from(txObj.Sig, 'base64');
        console.info('PRV sig phase 1', txObj.Sig);
        const sigObj = decodeSig(sig, false);
        console.info('decoded signature', sigObj);

        let hLst = inputCoins.map(c => c.SharedRandom);
        hLst.push(sigObj.sumCommitmentPriv);
        // put data for device to compute input coins' private keys (they stay on device)
        await calculateCoinPrivKey(hwTransport, hLst, inputCoins.length);

        // fill out ring sig
        const rLst = await calculateR(hwTransport, sigObj.numInputs + 1, sigObj.cpi, false);
        console.info('coins row before', sigObj.R[inputCoinPosition[0]]);
        sigObj.R[inputCoinPosition[0]] = rLst;
        console.info('coins row after', sigObj.R[inputCoinPosition[0]]);
        txObj.Sig = encodeSig(sigObj);
        console.info(' PRV sig phase 2', txObj.Sig);
    } else {
        // decode partial ring signature
        const sig = Buffer.from(txObj.Tx.Sig, 'base64');
        console.info('PRV sig phase 1', txObj.Tx.Sig);
        let sigObj = decodeSig(sig, false);
        console.info('decoded signature', sigObj);

        let hLst = inputCoins.map(c => c.SharedRandom);
        hLst.push(sigObj.sumCommitmentPriv);
        // put data for device to compute input coins' private keys (they stay on device)
        await calculateCoinPrivKey(hwTransport, hLst, sigObj.numInputs);

        // fill out ring sig
        const rLst = await calculateR(hwTransport, sigObj.numInputs + 1, sigObj.cpi, false);
        console.info('coins row before', sigObj.R[inputCoinPosition[0]]);
        sigObj.R[inputCoinPosition[0]] = rLst;
        console.info('coins row after', sigObj.R[inputCoinPosition[0]]);
        txObj.Tx.Sig = encodeSig(sigObj);
        console.info(' PRV sig phase 2', txObj.Tx.Sig);

        {
            // decode partial ring signature
            const sig = Buffer.from(txObj.TxTokenPrivacyData.Sig, 'base64');
            console.info('token sig phase 1', txObj.TxTokenPrivacyData.Sig);
            sigObj = decodeSig(sig, true);
            console.info('decoded signature', sigObj);

            let hLst = tokenInputCoins.map(c => c.SharedRandom);
            if (!sigObj.sumAssetTagPriv) throw 'invalid partial signature';
            hLst.push(sigObj.sumAssetTagPriv);
            hLst.push(sigObj.sumCommitmentPriv);
            // put data for device to compute input coins' private keys (they stay on device)
            await calculateCoinPrivKey(hwTransport, hLst, sigObj.numInputs);

            // fill out ring sig
            const rLst = await calculateR(hwTransport, sigObj.numInputs + 2, sigObj.cpi, true);
            console.info('coins row before', sigObj.R[inputCoinPosition[1]]);
            sigObj.R[inputCoinPosition[1]] = rLst;
            console.info('coins row after', sigObj.R[inputCoinPosition[1]]);
            txObj.TxTokenPrivacyData.Sig = encodeSig(sigObj);
            console.info('token sig phase 2', txObj.TxTokenPrivacyData.Sig);
        }
    }
    return txObj;
}

function decodeSig(sig, isToken) {
    try {
        const l = sig.length;
        let cpi, sumCommitmentPriv, sumAssetTagPriv;
        if (isToken) {
            cpi = sig.subarray(l - 96, l - 64);
            sumAssetTagPriv = sig.subarray(l - 64, l - 32);
            sumCommitmentPriv = sig.subarray(l - 32, l);
            sig = sig.subarray(0, l - 96);
        } else {
            cpi = sig.subarray(l - 64, l - 32);
            sumCommitmentPriv = sig.subarray(l - 32, l);
            sig = sig.subarray(0, l - 64);
        }
        
        if (sig[0] != MlsagPrefix) throw 'mlsag prefix';
        let offset = 1;
        if (sig[offset] != Ed25519KeySize) throw 'key size';
        offset += 1;

        if (offset + Ed25519KeySize > sig.length) throw 'sig length';
        const c0 = sig.subarray(offset, offset + Ed25519KeySize);
        offset += Ed25519KeySize;

        let lenKeyImages = Number(sig[offset]);
        if (lenKeyImages != 0) throw 'keyImages length';
        offset += 1;

        const n = Number(sig[offset]);
        const m = Number(sig[offset + 1]);
        offset += 2;

        let R = [];
        for (let i = 0; i < n; i += 1) {
            R[i] = [];
            for (let j = 0; j < m; j += 1) {
                R[i].push(sig.subarray(offset, offset + Ed25519KeySize));
                offset += Ed25519KeySize;
            }
        }
        if (offset != sig.length) throw `total length ${offset} != ${sig.length}`;
        return { c0, cpi, sumCommitmentPriv, sumAssetTagPriv, R, ringSize: n, numInputs: isToken? m - 2 : m - 1 };
    } catch (e) {
        console.error(e)
        throw 'invalid encoded signature';
    }
}

const arrayConcat = (arrays) => {
    const flatNumberArray = arrays.reduce((acc, curr) => {
        acc.push(...curr);
        return acc;
    }, []);

    return new Uint8Array(flatNumberArray);
};

function encodeSig(sigObj) {
    try {
        let temp = [Buffer.from([MlsagPrefix, Ed25519KeySize])];
        temp.push(sigObj.c0);
        temp.push(Buffer.from([0]));

        const n = sigObj.R.length;
        const m = sigObj.R[0].length;

        temp.push(Buffer.from([n]));
        temp.push(Buffer.from([m]));
        for (let i = 0; i < n; i += 1) {
            if (m != sigObj.R[i].length) throw 'sig length' + m + sigObj.R[i].length;
            for (let j = 0; j < m; j += 1) {
                temp.push(sigObj.R[i][j]);
            }
        }

        return base64Encode(arrayConcat(temp));
    } catch (e) {
        console.error(e)
        throw 'invalid signature';
    }
}

async function decryptCoinAmount(hwTransport, coin) {
    if (Number(coin.Value) > 0) return false;
    if (!coin.TxRandom) throw 'coin missing TxRandom';
    if (!coin.Randomness) throw 'coin missing Randomness';
    if (!coin.CoinDetailsEncrypted) throw 'coin missing CoinDetailsEncrypted';
    const rawTxr = base64Decode(coin.TxRandom);
    const res = await decryptCoin(hwTransport, base64Encode(rawTxr.slice(36, 68)), coin.CoinDetailsEncrypted, coin.Randomness);
    if (typeof (res) !== 'object') return false;
    coin.CoinDetailsEncrypted = base64Encode(res.Amount);
    coin.Value = (new bn(res.Amount.reverse())).toString();
    coin.Randomness = base64Encode(res.Randomness);
    return true;
}

async function parseCoinKeyImage(hwTransport, coin) {
    if (coin.KeyImage) return false;
    if (!coin.SharedRandom) throw 'decrypted coin missing SharedRandom';
    const rawKeyImage = await calculateKeyImage(hwTransport, coin.SharedRandom, coin.PublicKey);
    coin.KeyImage = base64Encode(rawKeyImage);
    return true;
}

export {
    hwBeforeCreate,
    hwAfterCreate,
    parseCoinKeyImage,
    arrayConcat,
    decryptCoinAmount,
}
