import { ED25519_KEY_SIZE } from './constants';
import { wasm } from '@lib/wasm';
import { base64Decode, base64Encode, convertUint8ArrayToArray } from './utils';

// publicKeyBytes is public key encryption, it is a 32-byte array
// msg is a bytes array 
// returns ciphertext in base64 
async function hybridEncryption(publicKeyBytes, msg) {
    let dataBytes = new Uint8Array(publicKeyBytes.length + msg.length);
    dataBytes.set(publicKeyBytes, 0);
    dataBytes.set(msg, ED25519_KEY_SIZE);
    let dataEncoded = base64Encode(convertUint8ArrayToArray(dataBytes));

    let result = await wasm.hybridEncrypt(dataEncoded);

    // let ciphertextBytes = base64Decode(ciphertextEncoded);
    return result;
}

// publicKeyBytes is public key encryption, it is a 32-byte array
// msg is a bytes array  
// returns plaintext in bytes array
async function hybridDecryption(privateKeyBytes, ciphertextBytes) {
    let dataBytes = new Uint8Array(privateKeyBytes.length + ciphertextBytes.length);
    dataBytes.set(privateKeyBytes, 0);
    dataBytes.set(ciphertextBytes, ED25519_KEY_SIZE);
    let dataEncoded = base64Encode(convertUint8ArrayToArray(dataBytes));

    let plainTextEncoded = await wasm.hybridDecrypt(dataEncoded);
    if (plainTextEncoded === null){
        throw new Error("Can not decrypt message with private key");
    }
    let plainTextBytes = base64Decode(plainTextEncoded);
    return plainTextBytes;

}

export {
    hybridEncryption, hybridDecryption
}