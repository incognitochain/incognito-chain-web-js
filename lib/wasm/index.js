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

const callwasm = (_worker, fname, ...args) => {
    if (_worker && typeof _worker.postMessage == 'function') {
        // call a WASM function by sending msg to the worker. It needs to have had ".wasm" binary + Go's "wasm_exec.js" loaded
        return new Promise(async (resolve, reject) => {
            // console.log('calling WASM through worker:', fname, ...args);
            _worker.onmessage = ev => resolve(ev.data);
            _worker.onerror = e => reject(e);
            _worker.onmessageerror = e => reject(e);
            _worker.postMessage({ fname, args });
        });
    } else {
        // call a WASM function internally
        // console.log('calling WASM internally:', fname, ...args);
        return wasm[fname](...args);
    }
}

export {
    wasm,
    callwasm,
};