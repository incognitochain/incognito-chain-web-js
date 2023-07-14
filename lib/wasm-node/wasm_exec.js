// Copyright 2021 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

"use strict";

// Node-specific polyfills
globalThis.require = require;
globalThis.fs = require("fs");
globalThis.TextEncoder = require("util").TextEncoder;
globalThis.TextDecoder = require("util").TextDecoder;

const crypto = require("crypto");
globalThis.crypto = {
  ...crypto,
  getRandomValues(b) {
    crypto.randomFillSync(b);
  },
};

// globalThis.performance = require("performance");
// console.log("globalThis.performance: ", globalThis.performance);

globalThis.performance = {
  now() {
    const [sec, nsec] = process.hrtime();
    return sec * 1000 + nsec / 1000000;
  },
  markResourceTiming() {

  }
};

import fetch, {
  Blob,
  File,
  FormData,
  Headers,
  Request,
  Response,
  blobFrom,
  blobFromSync,
  fileFrom,
  fileFromSync,
} from 'node-fetch'

if (!globalThis.fetch) {
  globalThis.fetch = fetch
  globalThis.Headers = Headers
  globalThis.Request = Request
  globalThis.Response = Response
}

require("../wasm/wasm_exec");
