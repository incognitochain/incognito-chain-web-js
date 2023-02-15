import { spawn, Pool, Worker } from 'threads';
import { methods } from './shared';
import '@lib/wasm/wasm_exec.js';

let pool = Pool(() => spawn(new Worker("./index.worker.js"))) // numWorkers defaults to numCPU

const wasm = function() {
    return new Proxy(methods, {
        get(_, key) {
            return (...args) =>  pool.queue(callwasm =>  callwasm(key, args))
        }
    });
}()

export {
    wasm,
}
