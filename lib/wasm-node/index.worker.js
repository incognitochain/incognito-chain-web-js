import { expose } from 'threads';
import { wasm, init } from './shared';

const m = init();
expose(async function callwasm(fname, args) {
    await m;
    return await wasm[fname](...args)
})
