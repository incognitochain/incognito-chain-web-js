import { spawn, Pool, Worker } from 'threads';
import { methods, init, wasm as _wasm } from './shared';

let pool = (globalThis.Worker) ? Pool(() => spawn(new Worker("./index.worker.js")), 2) // numWorkers defaults to numCPU
    : init(); // fallback: load WASM to main thread

const wasm = function() {
    return new Proxy(methods, {
        get(_, key) {
            return (...args) =>  (globalThis.Worker) ? pool.queue(callwasm =>  callwasm(key, args))
                : pool.then(_ => _wasm[key](...args));
        }
    });
}()

export {
    wasm,
}
