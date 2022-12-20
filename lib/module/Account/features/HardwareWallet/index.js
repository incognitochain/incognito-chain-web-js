import { calculateR, calculateFirstC, calculateCoinPrivKey, genAlpha, setAlpha, calculateKeyImage } from '../../../../../../hw-app-neato/ledger-hw-app';
import { base64Encode, randBytes } from "@lib/privacy/utils";

const gRan = 'dGbumgh0umyq1F4ZBwSdzz8FT+WNju8hCcOTRcQZM1o=';
const MlsagPrefix = 2;
const Ed25519KeySize = 32;

async function hwBeforeCreate(hwTransport, inputCoins, debugAlphaLst = null) {
    if (!debugAlphaLst) {
        await genAlpha(hwTransport, inputCoins.length + 1);
    } else {
        for (let i = 0; i < inputCoins.length + 1; i++) {
            await setAlpha(hwTransport, i, debugAlphaLst[i]);
        }
        await getAlpha(hwTransport, 2, []);
    }
    let paramLst = inputCoins.map(c => c.PublicKey);
    paramLst.push(gRan)

    const temp = await calculateFirstC(hwTransport, paramLst);
    const result = base64Encode(temp);

    console.info('will put cseed', result, 'to Sign function')
    return result;
}

async function hwAfterCreate(hwTransport, txObj, inputCoins, inputCoinPosition) {
    // decode partial ring signature
    let sig = Buffer.from(txObj.Sig, 'base64');
    console.info('sig phase 1', txObj.Sig);
    const sigObj = decodeSig(sig);
    console.info('decoded signature', sigObj);

    let hLst = inputCoins.map(c => c.SharedRandom);
    hLst.push(sigObj.sumCommitmentPriv);
    // put data for device to compute input coins' private keys (they stay on device)
    await calculateCoinPrivKey(hwTransport, hLst);

    // fill out ring sig
    const rLst = await calculateR(hwTransport, sigObj.numInputs + 1, sigObj.cpi);
    console.info('coins row before', sigObj.R[inputCoinPosition]);
    sigObj.R[inputCoinPosition] = rLst;
    console.info('coins row after', sigObj.R[inputCoinPosition]);
    txObj.Sig = encodeSig(sigObj);
    console.info('sig phase 2', txObj.Sig);
    return txObj;
}

function decodeSig(sig) {
    try {
        const l = sig.length;
        const cpi = sig.subarray(l - 64, l - 32);
        const sumCommitmentPriv = sig.subarray(l - 32, l);
        sig = sig.subarray(0, l - 64);
        
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
        return { c0, cpi, sumCommitmentPriv, R, ringSize: n, numInputs: m - 1 };
    } catch(e) {
        console.error(e)
        throw 'invalid encoded signature';
    }
}

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
            if (m != sigObj.R[i].length) throw 'sig length';
            for (let j = 0; j < m; j += 1) {
                temp.push(sigObj.R[i][j]);
            }
        }

        return Buffer.concat(temp).toString('base64');
    } catch(e) {
        console.error(e)
        throw 'invalid signature';
    }
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
}