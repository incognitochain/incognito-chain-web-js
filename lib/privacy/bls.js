const { base64Decode, base64Encode } = require('./utils');
import { wasm } from '@lib/wasm';

// seed is bytes array
async function generateBLSKeyPair(seed) {
    let seedStr = base64Encode(seed);
    
    let keyPairEncoded = await wasm.generateBLSKeyPairFromSeed(seedStr);
    let keyPairBytes = base64Decode(keyPairEncoded);

    let privateKey = keyPairBytes.slice(0, 32);
    let publicKey = keyPairBytes.slice(32);

    return {
        blsPrivateKey: privateKey,
        blsPublicKey: publicKey
    }
}

export {
    generateBLSKeyPair
}

