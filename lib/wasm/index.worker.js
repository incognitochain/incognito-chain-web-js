import "core-js/stable";
import "regenerator-runtime/runtime";
import { wasm } from './index';
import defaultWasmFile from "@privacy-wasm";

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