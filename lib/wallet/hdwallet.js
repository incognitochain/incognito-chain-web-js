import keyset from '../keySet';
import key from '../key';
import * as constants from './constants';
import * as utils from './utils';
import * as privacyConstanst from 'privacy-js-lib/lib/constants';
import * as base58 from '../base58';
import CryptoJS from "crypto-js";
import BigInt from "bn.js";


class KeyWallet {
  constructor() {
    this.Depth = 0;              // 1 byte
    this.ChildNumber = new Uint8Array(4);       // 4 bytes
    this.ChainCode = new Uint8Array(32);         // 32 bytes
    this.KeySet = new keyset.KeySet();
  }

  fromSpendingKey(spendingKey) {
    this.Depth = 0;              // 1 byte
    this.ChildNumber = new Uint8Array(4);       // 4 bytes
    this.ChainCode = new Uint8Array(32);         // 32 bytes
    this.KeySet = new keyset.KeySet().importFromPrivateKey(spendingKey);
    return this;
  }

  newChildKey(childIdx) {
    let intermediary = this.getIntermediary(childIdx);
    let newSeed = intermediary.slice(0, 32);
    let newKeySet = new keyset.KeySet();
    newKeySet.generateKey(newSeed);

    let childKey = new KeyWallet();
    childKey.ChildNumber = new Uint8Array((new BigInt(childIdx)).toArray("be", 4));
    childKey.ChainCode = intermediary.slice(32);
    childKey.Depth = this.Depth + 1;
    childKey.KeySet = newKeySet;
    return childKey;
  }

  getIntermediary(childIdx) {
    let childIndexBytes = (new BigInt(childIdx)).toArray();
    var data = childIndexBytes.slice(0);

    let hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA512, this.ChainCode.toString());
    hmac.update(data)
    let a = Buffer.from(hmac.finalize() + '', "hex")
    let intermediary = new Uint8Array(a)

    return intermediary;
  }

  // Serialize a KeySet to a 78 byte byte slice
  serialize(keyType) {
    // Write fields to buffer in order
    let keyBytes;

    if (keyType === constants.PriKeyType) {
      keyBytes = new Uint8Array(constants.PriKeySerializeSize);
      let offset = 0;
      keyBytes.set([keyType], offset);
      offset += 1;

      keyBytes.set([this.Depth], offset);
      offset += 1;

      keyBytes.set(this.ChildNumber, offset);
      offset += 4;

      keyBytes.set(this.ChainCode, offset);
      offset += 32;

      keyBytes.set([this.KeySet.PrivateKey.length], offset);
      offset += 1;
      keyBytes.set(this.KeySet.PrivateKey, offset);
      console.log("Offset: ", offset);

    } else if (keyType === constants.PaymentAddressType) {
      keyBytes = new Uint8Array(constants.PaymentAddrSerializeSize);
      let offset = 0;
      keyBytes.set([keyType], offset);
      offset += 1;

      keyBytes.set([this.KeySet.PaymentAddress.Pk.length], offset);
      offset += 1;
      keyBytes.set(this.KeySet.PaymentAddress.Pk, offset);
      offset += privacyConstanst.COMPRESS_POINT_SIZE;

      keyBytes.set([this.KeySet.PaymentAddress.Tk.length], offset);
      offset += 1;
      keyBytes.set(this.KeySet.PaymentAddress.Tk, offset);

    } else if (keyType === constants.ReadonlyKeyType) {
      keyBytes = new Uint8Array(constants.ReadonlyKeySerializeSize);
      let offset = 0;
      keyBytes.set([keyType], offset);
      offset += 1;

      keyBytes.set([this.KeySet.ReadonlyKey.PublicKey.length], offset);
      offset += 1;
      keyBytes.set(this.KeySet.ReadonlyKey.PublicKey, offset);
      offset += privacyConstanst.COMPRESS_POINT_SIZE;

      keyBytes.set([this.KeySet.ReadonlyKey.ReceivingKey.length], offset);
      offset += 1;
      keyBytes.set(this.KeySet.ReadonlyKey.ReceivingKey, offset);
    }

    // Append key bytes to the standard doublesha256 checksum
    return utils.addChecksumToBytes(keyBytes);
  }

  base58CheckSerialize(keyType) {
    let serializedKey = this.serialize(keyType);
    return base58.checkEncode(serializedKey, 0x00);
  }

  static deserialize(bytes) {
    let key = new KeyWallet();

    // get key type
    let keyType = bytes[0];

    if (keyType === constants.PriKeyType) {
      key.Depth = bytes[1];
      key.ChildNumber = bytes.slice(2, 6);
      key.ChainCode = bytes.slice(6, 38);
      let keyLength = bytes[38];

      key.KeySet.PrivateKey = bytes.slice(39, 39 + keyLength);

    } else if (keyType === constants.PaymentAddressType) {
      let PublicKeyLength = bytes[1];
      key.KeySet.PaymentAddress.Pk = bytes.slice(2, 2 + PublicKeyLength);

      let TransmisionKeyLength = bytes[PublicKeyLength + 2];
      key.KeySet.PaymentAddress.Tk = bytes.slice(PublicKeyLength + 3, PublicKeyLength + 3 + TransmisionKeyLength);
    } else if (keyType === constants.ReadonlyKeyType) {

      let PublicKeyLength = bytes[1];
      key.KeySet.PaymentAddress.Pk = bytes.slice(2, 2 + PublicKeyLength);

      let ReceivingKeyLength = bytes[PublicKeyLength + 2];
      key.KeySet.PaymentAddress.ReceivingKey = bytes.slice(PublicKeyLength + 3, PublicKeyLength + 3 + ReceivingKeyLength);
    }

    // validate checksum
    let cs1 = base58.checkSumFirst4Bytes(bytes.slice(0, bytes.length - 4));
    let cs2 = bytes.slice(bytes.length - 4);

    if (cs1.length !== cs2.length) {
      throw error("Checksum wrong!!!")
    } else {
      for (let i = 0; i < cs1.length; i++) {
        if (cs1[i] !== cs2[i]) {
          throw error("Checksum wrong!!!")
        }
      }
    }
    return key;
  }

  static base58CheckDeserialize(str) {
    let bytes = base58.checkDecode(str).bytesDecoded;
    return this.deserialize(bytes);
  }
}

function NewMasterKey(seed) {
  let hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA512, "Constant Seed");
  hmac.update(seed)
  let a = Buffer.from(hmac.finalize() + '', "hex")
  let intermediary = new Uint8Array(a)

  // Split it into our PubKey and chain code
  let keyBytes = intermediary.slice(0, 32)  // use to create master private/public keypair
  let chainCode = intermediary.slice(32) // be used with public PubKey (in keypair) for new Child keys
  let keySet = new keyset.KeySet();
  keySet.generateKey(keyBytes);

  let keyWallet = new KeyWallet();
  keyWallet.KeySet = keySet;
  keyWallet.ChainCode = chainCode;
  keyWallet.Depth = 0;
  keyWallet.ChildNumber = new Uint8Array([0, 0, 0, 0]);
  return keyWallet;
}

module.exports = {KeyWallet, NewMasterKey};