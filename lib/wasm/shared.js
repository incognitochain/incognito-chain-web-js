import defaultWasmFile from '@privacy-wasm';
import { ShardNumber } from '@lib/common/constants';

const g = global || window || self;

const methods = {
    'createTransaction': null,
    'createConvertTx': null,
    'newKeySetFromPrivate': null,
    'decryptCoin': null,
    'createCoin': null,
    'generateBLSKeyPairFromSeed': null,
    'hybridEncrypt': null,
    'hybridDecrypt': null,
    'initPrivacyTx': null,
    'staking': null,
    'stopAutoStaking': null,
    'initPrivacyTokenTx': null,
    'initBurningRequestTx': null,
    'initWithdrawRewardTx': null,
    'generateKeyFromSeed': null,
    'scalarMultBase': null,
    'randomScalars': null,
    'getSignPublicKey': null,
    'signPoolWithdraw': null,
    'verifySign': null,
    'initPRVContributionTx': null,
    'initPTokenContributionTx': null,
    'initPRVTradeTx': null,
    'initPTokenTradeTx': null,
    'withdrawDexTx': null,
    'hybridEncryptionASM': null,
    'hybridDecryptionASM': null,
    'estimateTxSize': null,
    'setShardCount': null,
    'generateBTCMultisigAddress': null,
    'createOTAReceiver': null,
    'setCfg': null,
    'decryptCoinList': null,
}

const wasm = function() {
    let temp = new Proxy(methods, {
        get(_, key) {
            return (...args) => {
                return new Promise(async (resolve, reject) => {
                    let run = () => {
                        let cb = (err, ...msg) => (err ? reject(err) : resolve(...msg));
                        g.__gobridge__[key].apply(undefined, [...args, cb]);
                    };
                    if (!(key in g.__gobridge__)) {
                        reject(`There is nothing defined with the name "${key.toString()}"`);
                        return;
                    }
                    if (typeof g.__gobridge__[key] !== 'function') {
                        resolve(g.__gobridge__[key]);
                        return;
                    }
                    run();
                });
            };
        }
    });
    return temp;
}()

const init = async function(){
    await import('@lib/wasm/wasm_exec.js');
    globalThis.__gobridge__ = {};
    const go = new Go();
    const { instance } = await WebAssembly.instantiateStreaming(fetch(defaultWasmFile), go.importObject);
    go.run(instance);
    globalThis.__gobridge__.ready = true;
    await wasm.setCfg(JSON.stringify({ shardCount: ShardNumber, allowBase58: true }));
};

export {
    wasm,
    methods,
    init,
};
