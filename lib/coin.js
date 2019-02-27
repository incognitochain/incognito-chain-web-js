import bn from 'bn.js';
import * as ec from 'privacy-js-lib/lib/ec';
import * as constants from 'privacy-js-lib/lib/constants';
import * as privacyUtils from 'privacy-js-lib/lib/privacy_utils';
import {PedCom} from 'privacy-js-lib/lib/pedersen';
import * as hybridEnc from './hybridencryption';
import {getShardIDFromLastByte} from './common';

const P256 = ec.P256;
const zeroPoint = P256.curve.point(0, 0);

class Coin {
  constructor() {
    this.PublicKey = zeroPoint;
    this.CoinCommitment = zeroPoint;
    this.SNDerivator = new bn(0);
    this.SerialNumber = zeroPoint;
    this.Randomness = new bn(0);
    this.Value = new bn(0);
    this.Info = new Uint8Array(0);
    return this;
  }

  set(publicKey, coinCommitment, snd, serialNumber, randomness, value, info) {
    this.PublicKey = publicKey;
    this.SNDerivator = snd;
    this.SerialNumber = serialNumber;
    this.Randomness = randomness;
    this.Value = value;
    this.Info = info;
    if (coinCommitment !== null) {
      this.CoinCommitment = coinCommitment;
    } else {
      this.commitAll();
      this.commitAll();
    }

    return this;
  }

  // hash hashes coin bytes to 32 bytes array
  hash() {
    return utils.hashBytesToBytes(this.toBytes())
  }

  // toBytes converts coin to bytes array
  toBytes() {
    let partialBytes = new Array(7);
    let totalSize = 0;

    // Public key
    if (this.PublicKey !== null) {
      partialBytes[0] = new Uint8Array(34);
      partialBytes[0].set([constants.COMPRESS_POINT_SIZE], 0);
      partialBytes[0].set(this.PublicKey.compress(), 1);
      totalSize += 34
    } else {
      partialBytes[0] = new Uint8Array(1);
      partialBytes[0].set([0], 0);
      totalSize += 1
    }

    // Coin commitment
    if (this.CoinCommitment !== null) {
      partialBytes[1] = new Uint8Array(34);
      partialBytes[1].set([constants.COMPRESS_POINT_SIZE], 0);
      partialBytes[1].set(this.CoinCommitment.compress(), 1);
      totalSize += 34
    } else {
      partialBytes[1] = new Uint8Array(1);
      partialBytes[1].set([0], 0);
      totalSize += 1
    }

    // serial number derivator
    if (this.SNDerivator !== null) {
      partialBytes[2] = new Uint8Array(33);
      partialBytes[2].set([constants.BIG_INT_SIZE], 0);
      partialBytes[2].set(this.SNDerivator.toArray(), 1);
      totalSize += 33
    } else {
      partialBytes[2] = new Uint8Array(1);
      partialBytes[2].set([0], 0);
      totalSize += 1
    }

    // Serial number
    if (this.SerialNumber !== null) {
      partialBytes[3] = new Uint8Array(34);
      partialBytes[3].set([constants.COMPRESS_POINT_SIZE], 0);
      partialBytes[3].set(this.SerialNumber.compress(), 1);
      totalSize += 34
    } else {
      partialBytes[3] = new Uint8Array(1);
      partialBytes[3].set([0], 0);
      totalSize += 1
    }

    // randomness
    if (this.Randomness !== null) {
      partialBytes[4] = new Uint8Array(33);
      partialBytes[4].set([constants.BIG_INT_SIZE], 0);
      partialBytes[4].set(this.Randomness.toArray(), 1);
      totalSize += 33
    } else {
      partialBytes[4] = new Uint8Array(1);
      partialBytes[4].set([0], 0);
      totalSize += 1
    }

    // value
    if (this.Value > 0) {
      let valueBytes = this.Value.toArray();
      let valueBytesLen = valueBytes.length;

      partialBytes[5] = new Uint8Array(1 + valueBytesLen);
      partialBytes[5].set([valueBytesLen], 0);
      partialBytes[5].set(valueBytes, 1);
      totalSize = totalSize + 1 + valueBytesLen
    } else {
      partialBytes[5] = new Uint8Array(1);
      partialBytes[5].set([0], 0);
      totalSize += 1
    }

    // info
    if (this.Info.length > 0) {
      let infoLen = this.Info.length;

      partialBytes[6] = new Uint8Array(1 + infoLen);
      partialBytes[6].set([infoLen], 0);
      partialBytes[6].set(this.Info, 1);
      totalSize = totalSize + 1 + infoLen
    } else {
      partialBytes[6] = new Uint8Array(1);
      partialBytes[6].set([0], 0);
      totalSize += 1
    }

    let bytes = new Uint8Array(totalSize);
    let index = 0;
    for (let i = 0; i < partialBytes.length; i++) {
      bytes.set(partialBytes[i], index);
      index += partialBytes[i].length;
    }
    return bytes;
  }

  // fromBytes(bytes) {
  //     if (bytes.length === 0) {
  //         return null
  //     }
  //
  //     // Parse Public key
  //     let offset = 0;
  //     let lenField = bytes[offset];
  //     offset += 1;
  //     if (lenField) {
  //         this.Pk = P256.decompress(bytes.slice(offset, offset + lenField));
  //         offset += lenField;
  //     }
  //
  //     // Parse Coin commitment
  //     lenField = bytes[offset];
  //     offset += 1;
  //     if (lenField) {
  //         this.CoinCommitment = P256.decompress(bytes.slice(offset, offset + lenField));
  //         offset += lenField;
  //     }
  //
  //     // Parse SNDerivator
  //     lenField = bytes[offset];
  //     offset += 1;
  //     if (lenField) {
  //         this.SNDerivator = new BigInt(bytes.slice(offset, offset + lenField));
  //         offset += lenField;
  //     }
  //
  //     // Parse Serial number
  //     lenField = bytes[offset];
  //     offset += 1;
  //     if (lenField) {
  //         this.SerialNumber = P256.decompress(bytes.slice(offset, offset + lenField));
  //         offset += lenField;
  //     }
  //
  //     // Parse Randomness
  //     lenField = bytes[offset];
  //     offset += 1;
  //     if (lenField) {
  //         this.Randomness = new BigInt(bytes.slice(offset, offset + lenField));
  //         offset += lenField;
  //     }
  //
  //     // Parse Value
  //     lenField = bytes[offset];
  //     offset += 1;
  //     if (lenField) {
  //         this.Value = new BigInt(bytes.slice(offset, offset + lenField));
  //         offset += lenField;
  //     }
  //
  //     // Parse Value
  //     lenField = bytes[offset];
  //     offset += 1;
  //     if (lenField) {
  //         this.Info = bytes.slice(offset, offset + lenField);
  //     }
  //     return this;
  // }

  // eq return true if this = targetCoin
  eq(targetCoin) {
    if (!this.PublicKey.eq(targetCoin.Pk)) {
      return false;
    }
    if (!this.CoinCommitment.eq(targetCoin.CoinCommitment)) {
      return false;
    }
    if (!this.SNDerivator.eq(targetCoin.SNDerivator)) {
      return false;
    }
    if (!this.SerialNumber.eq(targetCoin.SerialNumber)) {
      return false;
    }
    if (!this.Randomness.eq(targetCoin.Randomness)) {
      return false;
    }
    if (!this.Value.eq(targetCoin.Value)) {
      return false;
    }
    return true;
  }

  commitAll() {
    let shardId = getShardIDFromLastByte(this.getPubKeyLastByte());
    let values = [new bn(0), this.Value, this.SNDerivator, new bn(shardId), this.Randomness];
    this.CoinCommitment = PedCom.commitAll(values);
    this.CoinCommitment = this.CoinCommitment.add(this.PublicKey)

  }

  getPubKeyLastByte() {
    let pubKeyBytes = this.PublicKey.compress();
    return pubKeyBytes[pubKeyBytes.length - 1];
  }
}

class InputCoin {
  constructor() {
    this.CoinDetails = new Coin();
    return this;
  }

  // toBytes converts input coin to bytes array
  toBytes() {
    return this.CoinDetails.toBytes();
  }
}

class OutputCoin {
  constructor() {
    this.CoinDetails = new Coin();
    this.CoinDetailsEncrypted = new hybridEnc.Ciphertext();
    return this;
  }

  // toBytes converts output coin to bytes array
  toBytes() {
    let coinDetailsEncryptedBytes;
    if (!this.CoinDetailsEncrypted.isNull()) {
      let ciphertextBytes = this.CoinDetailsEncrypted.toBytes();
      let ciphertextBytesLen = ciphertextBytes.length;

      coinDetailsEncryptedBytes = new Uint8Array(ciphertextBytesLen + 1);
      coinDetailsEncryptedBytes.set([ciphertextBytesLen], 0);
      coinDetailsEncryptedBytes.set(ciphertextBytes, 1);
    } else {
      coinDetailsEncryptedBytes = new Uint8Array(1);
      coinDetailsEncryptedBytes.set([0], 0);
    }
    let coinDetailsEncryptedBytesLen = coinDetailsEncryptedBytes.length;

    let coinDetailBytes = this.CoinDetails.toBytes();

    let bytes = new Uint8Array(coinDetailsEncryptedBytesLen + coinDetailBytes.length + 1);
    bytes.set(coinDetailsEncryptedBytes, 0);
    bytes.set([coinDetailBytes.length], coinDetailsEncryptedBytesLen);
    bytes.set(coinDetailBytes, coinDetailsEncryptedBytesLen + 1);

    return bytes;
  }

  // // fromBytes reverts output coin from bytes array
  // fromBytes(bytes) {
  //     if (bytes.length === 0){
  //         return this;
  //     }
  //
  //     let offset = 0;
  //     let lenCoinDetailEncrypted = bytes[offset];
  //     offset += 1;
  //     if (lenCoinDetailEncrypted) {
  //         this.CoinDetailsEncrypted = new CoinDetailsEncrypted();
  //         this.CoinDetailsEncrypted.fromBytes(bytes.slice(offset, offset + lenCoinDetailEncrypted));
  //         offset += lenCoinDetailEncrypted;
  //     }
  //
  //     let lenCoinDetail = bytes[offset];
  //     offset += 1;
  //     if (lenCoinDetail) {
  //         this.CoinDetails = new Coin();
  //         this.CoinDetails.fromBytes(bytes.slice(offset, offset + lenCoinDetail));
  //     }
  //
  //     return this;
  // }

  // encrypt encrypts output coins using recipient transmission key
  encrypt(recipientTK) {
    let valueBytes = this.CoinDetails.Value.toArray();
    let randomnessBytes = privacyUtils.addPaddingBigInt(this.CoinDetails.Randomness, constants.BIG_INT_SIZE);
    let msg = new Uint8Array(valueBytes.length + constants.BIG_INT_SIZE);
    msg.set(randomnessBytes, 0);
    msg.set(valueBytes, constants.BIG_INT_SIZE);

    this.CoinDetailsEncrypted = hybridEnc.hybridEncrypt(msg, recipientTK)
  }
}

export {Coin, InputCoin, OutputCoin};





