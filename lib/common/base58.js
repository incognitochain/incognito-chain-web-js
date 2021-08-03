import Validator from "@lib/utils/validator";
import { Buffer } from "safe-buffer";
import { hashSha3BytesToBytes, sha256 } from "../privacy/utils";

let alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
let alphabetIdx0 = "1";
let b58_map = new Uint8Array(256);
let base = 58;
let FACTOR = Math.log(base) / Math.log(256); // log(BASE) / log(256), rounded up
let iFACTOR = Math.log(256) / Math.log(base);

b58_map = [
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 255, 255, 255, 255, 255, 255,
  255, 9, 10, 11, 12, 13, 14, 15, 16, 255, 17, 18, 19, 20, 21, 255, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31, 32, 255, 255, 255, 255, 255, 255, 33, 34, 35, 36,
  37, 38, 39, 40, 41, 42, 43, 255, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
  55, 56, 57, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
];

function encode(source) {
  if (!Buffer.isBuffer(source)) throw new TypeError("Expected Buffer");
  if (source.length === 0) return "";

  // Skip & count leading zeroes.
  let zeroes = 0;
  let length = 0;
  let pbegin = 0;
  let pend = source.length;

  while (pbegin !== pend && source[pbegin] === 0) {
    pbegin++;
    zeroes++;
  }

  // Allocate enough space in big-endian base58 representation.
  let size = ((pend - pbegin) * iFACTOR + 1) >>> 0;
  let b58 = new Uint8Array(size);

  // Process the bytes.
  while (pbegin !== pend) {
    let carry = source[pbegin];

    // Apply "b58 = b58 * 256 + ch".
    let i = 0;
    for (
      let it = size - 1;
      (carry !== 0 || i < length) && it !== -1;
      it--, i++
    ) {
      carry += (256 * b58[it]) >>> 0;
      b58[it] = carry % base >>> 0;
      carry = (carry / base) >>> 0;
    }

    if (carry !== 0) throw new Error("Non-zero carry");
    length = i;
    pbegin++;
  }

  // Skip leading zeroes in base58 result.
  let it = size - length;
  while (it !== size && b58[it] === 0) {
    it++;
  }

  // Translate the result into a string.
  let str = alphabetIdx0.repeat(zeroes);
  for (; it < size; ++it) str += alphabet.charAt(b58[it]);

  return str;
}

if (Array.prototype.equals)
  console.warn(
    "Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code."
  );
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
  // if the other array is a falsy value, return
  if (!array) return false;

  // compare lengths - can save a lot of time
  if (this.length != array.length) return false;

  for (let i = 0, l = this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i])) return false;
    } else if (this[i] != array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
};
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {
  enumerable: false,
});

function decodeUnsafe(source) {
  if (typeof source !== "string") throw new TypeError("Expected String");
  if (source.length === 0) return Buffer.alloc(0);

  let psz = 0;

  // Skip leading spaces.
  if (source[psz] === " ") return;

  // Skip and count leading '1's.
  let zeroes = 0;
  let length = 0;
  while (source[psz] === alphabetIdx0) {
    zeroes++;
    psz++;
  }

  // Allocate enough space in big-endian base256 representation.
  let size = ((source.length - psz) * FACTOR + 1) >>> 0; // log(58) / log(256), rounded up.
  let b256 = new Uint8Array(size);

  // Process the characters.
  while (source[psz]) {
    // Decode character
    let carry = b58_map[source.charCodeAt(psz)];

    // Invalid character
    if (carry === 255) return;

    let i = 0;
    for (
      let it = size - 1;
      (carry !== 0 || i < length) && it !== -1;
      it--, i++
    ) {
      carry += (base * b256[it]) >>> 0;
      b256[it] = carry % 256 >>> 0;
      carry = (carry / 256) >>> 0;
    }

    if (carry !== 0) throw new Error("Non-zero carry");
    length = i;
    psz++;
  }

  // Skip trailing spaces.
  if (source[psz] === " ") return;

  // Skip leading zeroes in b256.
  let it = size - length;
  while (it !== size && b256[it] === 0) {
    it++;
  }

  let vch = Buffer.allocUnsafe(zeroes + (size - it));
  vch.fill(0x00, 0, zeroes);

  let j = zeroes;
  while (it !== size) {
    vch[j++] = b256[it++];
  }

  return vch;
}

function decode(string) {
  let buffer = decodeUnsafe(string);
  if (buffer) return buffer;
  throw new Error("Non-base" + base + " character");
}

function checkEncode(bytearrays, version = 0, useLegacyEncoding = false) {
  new Validator("checkEncode-bytearrays", bytearrays).required();
  new Validator("checkEncode-version", version).required().number();
  new Validator("checkEncode-useLegacyEncoding", useLegacyEncoding)
    .required()
    .boolean();
  let res = new Uint8Array(bytearrays.length + 5);
  if (
    !(Number(version) === version) ||
    !(Number(version) < 256) ||
    !(Number(version) >= 0)
  ) {
    throw new Error("CheckEncode: Wrong version!");
  }
  res[0] = version;
  res.set(bytearrays, 1);
  res.set(
    checkSumFirst4Bytes(res.slice(0, 1 + bytearrays.length), useLegacyEncoding),
    1 + bytearrays.length
  );
  return encode(Buffer.from(res));
}

function checkDecode(string) {
  let dCode = new Uint8Array(decode(string));
  let checkSum = checkSumFirst4Bytes(dCode.slice(0, dCode.length - 4), false);
  let last4Bytes = dCode.slice(dCode.length - 4, dCode.length);
  if (!checkSum.equals(last4Bytes)) {
    // accept checksum from both encodings
    checkSum = checkSumFirst4Bytes(dCode.slice(0, dCode.length - 4), true);
    if (!checkSum.equals(last4Bytes)) {
      throw new Error("CheckDecode: Wrong checksum!");
    }
  }
  return {
    version: dCode[0],
    bytesDecoded: dCode.slice(1, dCode.length - 4),
  };
}

function checkSumFirst4Bytes(data, useLegacyEncoding = false) {
  new Validator("checkSumFirst4Bytes-data", data).required();
  new Validator("checkSumFirst4Bytes-useLegacyEncoding", useLegacyEncoding)
    .required()
    .boolean();
  let res;
  if (useLegacyEncoding) {
    res = hashSha3BytesToBytes(data);
  } else {
    res = sha256(sha256(data));
  }
  res = res.slice(0, 4);
  return res;
}

export { checkEncode, checkDecode, checkSumFirst4Bytes };
