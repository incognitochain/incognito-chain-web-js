import "core-js/stable";
import "regenerator-runtime/runtime";
import defaultWasmFile from "@privacy-wasm";

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

const init = async (fileName, shardCount) => {
    await import("@lib/wasm/wasm_exec.js");
    if (!globalThis.__gobridge__?.ready) {
        globalThis.__gobridge__ = {};
        const go = new Go();
        const { instance } = await WebAssembly.instantiateStreaming(fetch(fileName), go.importObject);
        go.run(instance);
        globalThis.__gobridge__.ready = true;
    }
    await wasm.setCfg(JSON.stringify({ shardCount, allowBase58: true }));
};
let m = init(defaultWasmFile, 8);

onmessage = (event) => {
    m.then(_ => wasm[event.data.fname](...event.data.args))
        .then(self.postMessage)
        .catch(e => { throw e })
};