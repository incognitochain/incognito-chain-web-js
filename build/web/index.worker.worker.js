!function(t){self.webpackChunkwallet=function(e,n){for(var i in n)t[i]=n[i];for(;e.length;)r[e.pop()]=1};var e={},r={0:1};function n(r){if(e[r])return e[r].exports;var i=e[r]={i:r,l:!1,exports:{}};return t[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}n.e=function(){return Promise.resolve()},n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},n.r=function(t){"undefined"!==typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"===typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)n.d(r,i,function(e){return t[e]}.bind(null,i));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="/assets/",n(n.s=11)}([function(t,e,r){t.exports=r(9)},function(t,e){function r(t,e,r,n,i,o,s){try{var a=t[o](s),l=a.value}catch(t){return void r(t)}a.done?e(l):Promise.resolve(l).then(n,i)}t.exports=function(t){return function(){var e=this,n=arguments;return new Promise((function(i,o){var s=t.apply(e,n);function a(t){r(s,i,o,a,l,"next",t)}function l(t){r(s,i,o,a,l,"throw",t)}a(void 0)}))}},t.exports.default=t.exports,t.exports.__esModule=!0},function(t,e,r){"use strict";(function(t){r.d(e,"a",(function(){return l}));var n=r(1),i=r.n(n),o=r(0),s=r.n(o),a=t||window||self,l=new Proxy({createTransaction:null,createConvertTx:null,newKeySetFromPrivate:null,decryptCoin:null,createCoin:null,generateBLSKeyPairFromSeed:null,hybridEncrypt:null,hybridDecrypt:null,initPrivacyTx:null,staking:null,stopAutoStaking:null,initPrivacyTokenTx:null,initBurningRequestTx:null,initWithdrawRewardTx:null,generateKeyFromSeed:null,scalarMultBase:null,randomScalars:null,getSignPublicKey:null,signPoolWithdraw:null,verifySign:null,initPRVContributionTx:null,initPTokenContributionTx:null,initPRVTradeTx:null,initPTokenTradeTx:null,withdrawDexTx:null,hybridEncryptionASM:null,hybridDecryptionASM:null,estimateTxSize:null,setShardCount:null,generateBTCMultisigAddress:null,createOTAReceiver:null},{get:function(t,e){return function(){for(var t=arguments.length,r=new Array(t),n=0;n<t;n++)r[n]=arguments[n];return new Promise(function(){var t=i()(s.a.mark((function t(n,i){var o;return s.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(o=function(){a.__gobridge__[e].apply(void 0,[].concat(r,[function(t){for(var e=arguments.length,r=new Array(e>1?e-1:0),o=1;o<e;o++)r[o-1]=arguments[o];return t?i(t):n.apply(void 0,r)}]))},e in a.__gobridge__){t.next=4;break}return i('There is nothing defined with the name "'.concat(e.toString(),'"')),t.abrupt("return");case 4:if("function"===typeof a.__gobridge__[e]){t.next=7;break}return n(a.__gobridge__[e]),t.abrupt("return");case 7:o();case 8:case"end":return t.stop()}}),t)})));return function(e,r){return t.apply(this,arguments)}}())}}})}).call(this,r(10))},function(t,e){t.exports=function(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=new Array(e);r<e;r++)n[r]=t[r];return n},t.exports.default=t.exports,t.exports.__esModule=!0},function(t,e,r){var n=r(5),i=r(6),o=r(7),s=r(8);t.exports=function(t){return n(t)||i(t)||o(t)||s()},t.exports.default=t.exports,t.exports.__esModule=!0},function(t,e,r){var n=r(3);t.exports=function(t){if(Array.isArray(t))return n(t)},t.exports.default=t.exports,t.exports.__esModule=!0},function(t,e){t.exports=function(t){if("undefined"!==typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)},t.exports.default=t.exports,t.exports.__esModule=!0},function(t,e,r){var n=r(3);t.exports=function(t,e){if(t){if("string"===typeof t)return n(t,e);var r=Object.prototype.toString.call(t).slice(8,-1);return"Object"===r&&t.constructor&&(r=t.constructor.name),"Map"===r||"Set"===r?Array.from(t):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?n(t,e):void 0}},t.exports.default=t.exports,t.exports.__esModule=!0},function(t,e){t.exports=function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")},t.exports.default=t.exports,t.exports.__esModule=!0},function(t,e,r){var n=function(t){"use strict";var e=Object.prototype,r=e.hasOwnProperty,n="function"===typeof Symbol?Symbol:{},i=n.iterator||"@@iterator",o=n.asyncIterator||"@@asyncIterator",s=n.toStringTag||"@@toStringTag";function a(t,e,r){return Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}),t[e]}try{a({},"")}catch(t){a=function(t,e,r){return t[e]=r}}function l(t,e,r,n){var i=e&&e.prototype instanceof h?e:h,o=Object.create(i.prototype),s=new T(n||[]);return o._invoke=function(t,e,r){var n="suspendedStart";return function(i,o){if("executing"===n)throw new Error("Generator is already running");if("completed"===n){if("throw"===i)throw o;return j()}for(r.method=i,r.arg=o;;){var s=r.delegate;if(s){var a=_(s,r);if(a){if(a===c)continue;return a}}if("next"===r.method)r.sent=r._sent=r.arg;else if("throw"===r.method){if("suspendedStart"===n)throw n="completed",r.arg;r.dispatchException(r.arg)}else"return"===r.method&&r.abrupt("return",r.arg);n="executing";var l=u(t,e,r);if("normal"===l.type){if(n=r.done?"completed":"suspendedYield",l.arg===c)continue;return{value:l.arg,done:r.done}}"throw"===l.type&&(n="completed",r.method="throw",r.arg=l.arg)}}}(t,r,s),o}function u(t,e,r){try{return{type:"normal",arg:t.call(e,r)}}catch(t){return{type:"throw",arg:t}}}t.wrap=l;var c={};function h(){}function f(){}function d(){}var p={};p[i]=function(){return this};var m=Object.getPrototypeOf,y=m&&m(m(E([])));y&&y!==e&&r.call(y,i)&&(p=y);var g=d.prototype=h.prototype=Object.create(p);function v(t){["next","throw","return"].forEach((function(e){a(t,e,(function(t){return this._invoke(e,t)}))}))}function w(t,e){var n;this._invoke=function(i,o){function s(){return new e((function(n,s){!function n(i,o,s,a){var l=u(t[i],t,o);if("throw"!==l.type){var c=l.arg,h=c.value;return h&&"object"===typeof h&&r.call(h,"__await")?e.resolve(h.__await).then((function(t){n("next",t,s,a)}),(function(t){n("throw",t,s,a)})):e.resolve(h).then((function(t){c.value=t,s(c)}),(function(t){return n("throw",t,s,a)}))}a(l.arg)}(i,o,n,s)}))}return n=n?n.then(s,s):s()}}function _(t,e){var r=t.iterator[e.method];if(void 0===r){if(e.delegate=null,"throw"===e.method){if(t.iterator.return&&(e.method="return",e.arg=void 0,_(t,e),"throw"===e.method))return c;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method")}return c}var n=u(r,t.iterator,e.arg);if("throw"===n.type)return e.method="throw",e.arg=n.arg,e.delegate=null,c;var i=n.arg;return i?i.done?(e[t.resultName]=i.value,e.next=t.nextLoc,"return"!==e.method&&(e.method="next",e.arg=void 0),e.delegate=null,c):i:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,c)}function x(t){var e={tryLoc:t[0]};1 in t&&(e.catchLoc=t[1]),2 in t&&(e.finallyLoc=t[2],e.afterLoc=t[3]),this.tryEntries.push(e)}function b(t){var e=t.completion||{};e.type="normal",delete e.arg,t.completion=e}function T(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(x,this),this.reset(!0)}function E(t){if(t){var e=t[i];if(e)return e.call(t);if("function"===typeof t.next)return t;if(!isNaN(t.length)){var n=-1,o=function e(){for(;++n<t.length;)if(r.call(t,n))return e.value=t[n],e.done=!1,e;return e.value=void 0,e.done=!0,e};return o.next=o}}return{next:j}}function j(){return{value:void 0,done:!0}}return f.prototype=g.constructor=d,d.constructor=f,f.displayName=a(d,s,"GeneratorFunction"),t.isGeneratorFunction=function(t){var e="function"===typeof t&&t.constructor;return!!e&&(e===f||"GeneratorFunction"===(e.displayName||e.name))},t.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,d):(t.__proto__=d,a(t,s,"GeneratorFunction")),t.prototype=Object.create(g),t},t.awrap=function(t){return{__await:t}},v(w.prototype),w.prototype[o]=function(){return this},t.AsyncIterator=w,t.async=function(e,r,n,i,o){void 0===o&&(o=Promise);var s=new w(l(e,r,n,i),o);return t.isGeneratorFunction(r)?s:s.next().then((function(t){return t.done?t.value:s.next()}))},v(g),a(g,s,"Generator"),g[i]=function(){return this},g.toString=function(){return"[object Generator]"},t.keys=function(t){var e=[];for(var r in t)e.push(r);return e.reverse(),function r(){for(;e.length;){var n=e.pop();if(n in t)return r.value=n,r.done=!1,r}return r.done=!0,r}},t.values=E,T.prototype={constructor:T,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=void 0,this.done=!1,this.delegate=null,this.method="next",this.arg=void 0,this.tryEntries.forEach(b),!t)for(var e in this)"t"===e.charAt(0)&&r.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=void 0)},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var e=this;function n(r,n){return s.type="throw",s.arg=t,e.next=r,n&&(e.method="next",e.arg=void 0),!!n}for(var i=this.tryEntries.length-1;i>=0;--i){var o=this.tryEntries[i],s=o.completion;if("root"===o.tryLoc)return n("end");if(o.tryLoc<=this.prev){var a=r.call(o,"catchLoc"),l=r.call(o,"finallyLoc");if(a&&l){if(this.prev<o.catchLoc)return n(o.catchLoc,!0);if(this.prev<o.finallyLoc)return n(o.finallyLoc)}else if(a){if(this.prev<o.catchLoc)return n(o.catchLoc,!0)}else{if(!l)throw new Error("try statement without catch or finally");if(this.prev<o.finallyLoc)return n(o.finallyLoc)}}}},abrupt:function(t,e){for(var n=this.tryEntries.length-1;n>=0;--n){var i=this.tryEntries[n];if(i.tryLoc<=this.prev&&r.call(i,"finallyLoc")&&this.prev<i.finallyLoc){var o=i;break}}o&&("break"===t||"continue"===t)&&o.tryLoc<=e&&e<=o.finallyLoc&&(o=null);var s=o?o.completion:{};return s.type=t,s.arg=e,o?(this.method="next",this.next=o.finallyLoc,c):this.complete(s)},complete:function(t,e){if("throw"===t.type)throw t.arg;return"break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&e&&(this.next=e),c},finish:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var r=this.tryEntries[e];if(r.finallyLoc===t)return this.complete(r.completion,r.afterLoc),b(r),c}},catch:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var r=this.tryEntries[e];if(r.tryLoc===t){var n=r.completion;if("throw"===n.type){var i=n.arg;b(r)}return i}}throw new Error("illegal catch attempt")},delegateYield:function(t,e,r){return this.delegate={iterator:E(t),resultName:e,nextLoc:r},"next"===this.method&&(this.arg=void 0),c}},t}(t.exports);try{regeneratorRuntime=n}catch(t){Function("r","regeneratorRuntime = r")(n)}},function(t,e){var r;r=function(){return this}();try{r=r||new Function("return this")()}catch(t){"object"===typeof window&&(r=window)}t.exports=r},function(t,e,r){"use strict";r.r(e);var n=r(4),i=r.n(n),o=r(1),s=r.n(o),a=r(0),l=r.n(a),u=r(2),c=r.p+"privacy.wasm",h=function(){var t=s()(l.a.mark((function t(e,n){var i,o,s,a;return l.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,Promise.resolve().then(r.t.bind(null,12,7));case 2:if(null!==(i=globalThis.__gobridge__)&&void 0!==i&&i.ready){t.next=11;break}return globalThis.__gobridge__={},o=new Go,t.next=7,WebAssembly.instantiateStreaming(fetch(e),o.importObject);case 7:s=t.sent,a=s.instance,o.run(a),globalThis.__gobridge__.ready=!0;case 11:return t.next=13,u.a.setCfg(JSON.stringify({shardCount:n,allowBase58:!0}));case 13:case"end":return t.stop()}}),t)})));return function(e,r){return t.apply(this,arguments)}}()(c,8);onmessage=function(t){h.then((function(e){return u.a[t.data.fname].apply(u.a,i()(t.data.args))})).then(self.postMessage).catch((function(t){throw t}))}},function(t,e,r){"use strict";(()=>{const t=()=>{const t=new Error("not implemented");return t.code="ENOSYS",t};if(!globalThis.fs){let e="";globalThis.fs={constants:{O_WRONLY:-1,O_RDWR:-1,O_CREAT:-1,O_TRUNC:-1,O_APPEND:-1,O_EXCL:-1},writeSync(t,n){e+=r.decode(n);const i=e.lastIndexOf("\n");return-1!=i&&(console.log(e.substr(0,i)),e=e.substr(i+1)),n.length},write(e,r,n,i,o,s){if(0!==n||i!==r.length||null!==o)return void s(t());s(null,this.writeSync(e,r))},chmod(e,r,n){n(t())},chown(e,r,n,i){i(t())},close(e,r){r(t())},fchmod(e,r,n){n(t())},fchown(e,r,n,i){i(t())},fstat(e,r){r(t())},fsync(t,e){e(null)},ftruncate(e,r,n){n(t())},lchown(e,r,n,i){i(t())},link(e,r,n){n(t())},lstat(e,r){r(t())},mkdir(e,r,n){n(t())},open(e,r,n,i){i(t())},read(e,r,n,i,o,s){s(t())},readdir(e,r){r(t())},readlink(e,r){r(t())},rename(e,r,n){n(t())},rmdir(e,r){r(t())},stat(e,r){r(t())},symlink(e,r,n){n(t())},truncate(e,r,n){n(t())},unlink(e,r){r(t())},utimes(e,r,n,i){i(t())}}}if(globalThis.process||(globalThis.process={getuid:()=>-1,getgid:()=>-1,geteuid:()=>-1,getegid:()=>-1,getgroups(){throw t()},pid:-1,ppid:-1,umask(){throw t()},cwd(){throw t()},chdir(){throw t()}}),!globalThis.crypto)throw new Error("globalThis.crypto is not available, polyfill required (crypto.getRandomValues only)");if(!globalThis.performance)throw new Error("globalThis.performance is not available, polyfill required (performance.now only)");if(!globalThis.TextEncoder)throw new Error("globalThis.TextEncoder is not available, polyfill required");if(!globalThis.TextDecoder)throw new Error("globalThis.TextDecoder is not available, polyfill required");const e=new TextEncoder("utf-8"),r=new TextDecoder("utf-8");globalThis.Go=class{constructor(){this.argv=["js"],this.env={},this.exit=t=>{0!==t&&console.warn("exit code:",t)},this._exitPromise=new Promise(t=>{this._resolveExitPromise=t}),this._pendingEvent=null,this._scheduledTimeouts=new Map,this._nextCallbackTimeoutID=1;const t=(t,e)=>{this.mem.setUint32(t+0,e,!0),this.mem.setUint32(t+4,Math.floor(e/4294967296),!0)},n=t=>this.mem.getUint32(t+0,!0)+4294967296*this.mem.getInt32(t+4,!0),i=t=>{const e=this.mem.getFloat64(t,!0);if(0===e)return;if(!isNaN(e))return e;const r=this.mem.getUint32(t,!0);return this._values[r]},o=(t,e)=>{if("number"===typeof e&&0!==e)return isNaN(e)?(this.mem.setUint32(t+4,2146959360,!0),void this.mem.setUint32(t,0,!0)):void this.mem.setFloat64(t,e,!0);if(void 0===e)return void this.mem.setFloat64(t,0,!0);let r=this._ids.get(e);void 0===r&&(r=this._idPool.pop(),void 0===r&&(r=this._values.length),this._values[r]=e,this._goRefCounts[r]=0,this._ids.set(e,r)),this._goRefCounts[r]++;let n=0;switch(typeof e){case"object":null!==e&&(n=1);break;case"string":n=2;break;case"symbol":n=3;break;case"function":n=4}this.mem.setUint32(t+4,2146959360|n,!0),this.mem.setUint32(t,r,!0)},s=t=>{const e=n(t+0),r=n(t+8);return new Uint8Array(this._inst.exports.mem.buffer,e,r)},a=t=>{const e=n(t+0),r=n(t+8),o=new Array(r);for(let t=0;t<r;t++)o[t]=i(e+8*t);return o},l=t=>{const e=n(t+0),i=n(t+8);return r.decode(new DataView(this._inst.exports.mem.buffer,e,i))},u=Date.now()-performance.now();this.importObject={go:{"runtime.wasmExit":t=>{t>>>=0;const e=this.mem.getInt32(t+8,!0);this.exited=!0,delete this._inst,delete this._values,delete this._goRefCounts,delete this._ids,delete this._idPool,this.exit(e)},"runtime.wasmWrite":t=>{const e=n((t>>>=0)+8),r=n(t+16),i=this.mem.getInt32(t+24,!0);fs.writeSync(e,new Uint8Array(this._inst.exports.mem.buffer,r,i))},"runtime.resetMemoryDataView":t=>{this.mem=new DataView(this._inst.exports.mem.buffer)},"runtime.nanotime1":e=>{t((e>>>=0)+8,1e6*(u+performance.now()))},"runtime.walltime":e=>{e>>>=0;const r=(new Date).getTime();t(e+8,r/1e3),this.mem.setInt32(e+16,r%1e3*1e6,!0)},"runtime.scheduleTimeoutEvent":t=>{t>>>=0;const e=this._nextCallbackTimeoutID;this._nextCallbackTimeoutID++,this._scheduledTimeouts.set(e,setTimeout(()=>{for(this._resume();this._scheduledTimeouts.has(e);)console.warn("scheduleTimeoutEvent: missed timeout event"),this._resume()},n(t+8)+1)),this.mem.setInt32(t+16,e,!0)},"runtime.clearTimeoutEvent":t=>{t>>>=0;const e=this.mem.getInt32(t+8,!0);clearTimeout(this._scheduledTimeouts.get(e)),this._scheduledTimeouts.delete(e)},"runtime.getRandomData":t=>{t>>>=0,crypto.getRandomValues(s(t+8))},"syscall/js.finalizeRef":t=>{t>>>=0;const e=this.mem.getUint32(t+8,!0);if(this._goRefCounts[e]--,0===this._goRefCounts[e]){const t=this._values[e];this._values[e]=null,this._ids.delete(t),this._idPool.push(e)}},"syscall/js.stringVal":t=>{o((t>>>=0)+24,l(t+8))},"syscall/js.valueGet":t=>{t>>>=0;const e=Reflect.get(i(t+8),l(t+16));t=this._inst.exports.getsp()>>>0,o(t+32,e)},"syscall/js.valueSet":t=>{t>>>=0,Reflect.set(i(t+8),l(t+16),i(t+32))},"syscall/js.valueDelete":t=>{t>>>=0,Reflect.deleteProperty(i(t+8),l(t+16))},"syscall/js.valueIndex":t=>{o((t>>>=0)+24,Reflect.get(i(t+8),n(t+16)))},"syscall/js.valueSetIndex":t=>{t>>>=0,Reflect.set(i(t+8),n(t+16),i(t+24))},"syscall/js.valueCall":t=>{t>>>=0;try{const e=i(t+8),r=Reflect.get(e,l(t+16)),n=a(t+32),s=Reflect.apply(r,e,n);t=this._inst.exports.getsp()>>>0,o(t+56,s),this.mem.setUint8(t+64,1)}catch(e){t=this._inst.exports.getsp()>>>0,o(t+56,e),this.mem.setUint8(t+64,0)}},"syscall/js.valueInvoke":t=>{t>>>=0;try{const e=i(t+8),r=a(t+16),n=Reflect.apply(e,void 0,r);t=this._inst.exports.getsp()>>>0,o(t+40,n),this.mem.setUint8(t+48,1)}catch(e){t=this._inst.exports.getsp()>>>0,o(t+40,e),this.mem.setUint8(t+48,0)}},"syscall/js.valueNew":t=>{t>>>=0;try{const e=i(t+8),r=a(t+16),n=Reflect.construct(e,r);t=this._inst.exports.getsp()>>>0,o(t+40,n),this.mem.setUint8(t+48,1)}catch(e){t=this._inst.exports.getsp()>>>0,o(t+40,e),this.mem.setUint8(t+48,0)}},"syscall/js.valueLength":e=>{t((e>>>=0)+16,parseInt(i(e+8).length))},"syscall/js.valuePrepareString":r=>{r>>>=0;const n=e.encode(String(i(r+8)));o(r+16,n),t(r+24,n.length)},"syscall/js.valueLoadString":t=>{const e=i((t>>>=0)+8);s(t+16).set(e)},"syscall/js.valueInstanceOf":t=>{t>>>=0,this.mem.setUint8(t+24,i(t+8)instanceof i(t+16)?1:0)},"syscall/js.copyBytesToGo":e=>{const r=s((e>>>=0)+8),n=i(e+32);if(!(n instanceof Uint8Array||n instanceof Uint8ClampedArray))return void this.mem.setUint8(e+48,0);const o=n.subarray(0,r.length);r.set(o),t(e+40,o.length),this.mem.setUint8(e+48,1)},"syscall/js.copyBytesToJS":e=>{const r=i((e>>>=0)+8),n=s(e+16);if(!(r instanceof Uint8Array||r instanceof Uint8ClampedArray))return void this.mem.setUint8(e+48,0);const o=n.subarray(0,r.length);r.set(o),t(e+40,o.length),this.mem.setUint8(e+48,1)},debug:t=>{console.log(t)}}}}async run(t){if(!(t instanceof WebAssembly.Instance))throw new Error("Go.run: WebAssembly.Instance expected");this._inst=t,this.mem=new DataView(this._inst.exports.mem.buffer),this._values=[NaN,0,null,!0,!1,globalThis,this],this._goRefCounts=new Array(this._values.length).fill(1/0),this._ids=new Map([[0,1],[null,2],[!0,3],[!1,4],[globalThis,5],[this,6]]),this._idPool=[],this.exited=!1;let r=4096;const n=t=>{const n=r,i=e.encode(t+"\0");return new Uint8Array(this.mem.buffer,r,i.length).set(i),r+=i.length,r%8!==0&&(r+=8-r%8),n},i=this.argv.length,o=[];this.argv.forEach(t=>{o.push(n(t))}),o.push(0);Object.keys(this.env).sort().forEach(t=>{o.push(n(`${t}=${this.env[t]}`))}),o.push(0);const s=r;o.forEach(t=>{this.mem.setUint32(r,t,!0),this.mem.setUint32(r+4,0,!0),r+=8});if(r>=12288)throw new Error("total length of command line and environment variables exceeds limit");this._inst.exports.run(i,s),this.exited&&this._resolveExitPromise(),await this._exitPromise}_resume(){if(this.exited)throw new Error("Go program has already exited");this._inst.exports.resume(),this.exited&&this._resolveExitPromise()}_makeFuncWrapper(t){const e=this;return function(){const r={id:t,this:this,args:arguments};return e._pendingEvent=r,e._resume(),r.result}}}})()}]);