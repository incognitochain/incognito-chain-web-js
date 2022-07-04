import { HASH_SIZE, ShardNumber } from "./constants";

function getShardIDFromLastByte(lastByte) {
    return lastByte % ShardNumber
}

function parsePublicKeyBytesToShard(bytes) {
    const arr = bytes.split(',');
    const lastByte = arr[arr.length - 1];
    return lastByte % ShardNumber;
}

function convertHashToStr(hash) {
    let tmpHash = hash.slice();
    for (let i = 0; i < tmpHash.length / 2; i++) {
        let tmp = tmpHash[i];
        tmpHash[i] = tmpHash[HASH_SIZE - 1 - i];
        tmpHash[HASH_SIZE - 1 - i] = tmp;
    }
    return byteToHexString(tmpHash);
}

function byteToHexString(uint8arr) {
    if (!uint8arr) {
        return '';
    }

    var hexStr = '';
    for (var i = 0; i < uint8arr.length; i++) {
        var hex = (uint8arr[i] & 0xff).toString(16);
        hex = (hex.length === 1) ? '0' + hex : hex;
        hexStr += hex;
    }

    return hexStr.toLowerCase();
}

function hexStringToByte(str) {
    if (!str) {
        return new Uint8Array();
    }

    var a = [];
    for (var i = 0, len = str.length; i < len; i += 2) {
        a.push(parseInt(str.substr(i, 2), 16));
    }

    return new Uint8Array(a);
}

function newHashFromStr(str) {
    let bytes = hexStringToByte(str);
    for (let i = 0; i < bytes.length / 2; i++) {
        let tmp = bytes[i];
        bytes[i] = bytes[HASH_SIZE - 1 - i];
        bytes[HASH_SIZE - 1 - i] = tmp;
    }
    return bytes;
}

function base64ArrayBuffer(arrayBuffer) {
    var base64    = ''
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  
    var bytes         = new Uint8Array(arrayBuffer)
    var byteLength    = bytes.byteLength
    var byteRemainder = byteLength % 3
    var mainLength    = byteLength - byteRemainder
  
    var a, b, c, d
    var chunk
  
    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
  
      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
      d = chunk & 63               // 63       = 2^6 - 1
  
      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }
  
    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength]
  
      a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
  
      // Set the 4 least significant bits to zero
      b = (chunk & 3)   << 4 // 3   = 2^2 - 1
  
      base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
  
      a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4
  
      // Set the 2 least significant bits to zero
      c = (chunk & 15)    <<  2 // 15    = 2^4 - 1
  
      base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }
    
    return base64
}

function getChildIdFromChildNumberArray(array){
  let value = 0;
  for (let i = 0; i < array.length; i++) {
    value = value * 256 + array[i];
  }

  return value;
};

export {
    getShardIDFromLastByte,
    newHashFromStr,
    convertHashToStr,
    hexStringToByte,
    byteToHexString,
    base64ArrayBuffer,
    getChildIdFromChildNumberArray,
    parsePublicKeyBytesToShard
};