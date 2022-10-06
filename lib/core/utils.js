import { checkSumFirst4Bytes, checkDecode } from "../common/base58";
import {PrivacyUnit, MaxSizeInfoCoin, BurnAddress, PaymentAddressType} from "./constants";
import { KeyWallet } from "./hdwallet";
import {
  stringToBytes,
  base64Encode,
  base64Decode,
  bytesToString,
} from "../privacy/utils";
import { CustomError, ErrorObject } from "../common/errorhandler";
import {
  hybridEncryption,
  hybridDecryption,
} from "../privacy/hybridEncryption";
import { createCoin } from "@lib/module/Account/account.utils";

/**
 *
 * @param {{paymentAddressStr: string (B58checkencode), amount: number, Message: "" }} paramPaymentInfos
 * return paramPaymentInfos with Message that was encrypted by transmissionKey and base64 encoded
 */
async function encryptMessageOutCoin(paramPaymentInfos, encodeOnly = false) {
  for (let i = 0; i < paramPaymentInfos.length; i++) {
    let p = paramPaymentInfos[i];
    if (p.Message) {
      if (encodeOnly) {
        const msgAsBytes = stringToBytes(paramPaymentInfos[i].Message);
        console.log(paramPaymentInfos[i].Message);
        console.log(msgAsBytes);
        const encoded = base64Encode(msgAsBytes);
        paramPaymentInfos[i].Message = encoded;
      } else {
        // get transmission key of receiver
        let keyWallet = KeyWallet.base58CheckDeserialize(p.PaymentAddress);
        let transmissionKey = keyWallet.KeySet.PaymentAddress.Tk;
        let msgBytes = stringToBytes(p.Message);

        // encrypt Message
        let ciphertext;
        try {
          ciphertext = await hybridEncryption(transmissionKey, msgBytes);
        } catch (e) {
          throw new CustomError(
            ErrorObject.EncryptMsgOutCoinErr,
            `PaymentAddress: ${p.paymentAddressStr}$`
          );
        }

        if (ciphertext > MaxSizeInfoCoin) {
          throw new CustomError(
            ErrorObject.EncryptMsgOutCoinErr,
            "Message is too large"
          );
        }

        // base64 encode ciphertext
        paramPaymentInfos[i].Message = ciphertext;
      }
    }
  }

  return paramPaymentInfos;
}
/**
 * @param {AccountWallet} accountWallet
 * @param {string} ciphertextInfoB58CheckEncode
 * @return string
 *
 */
async function decryptMessageOutCoin(
  accountWallet,
  ciphertextInfoB58CheckEncode,
  encodeOnly = false
) {
  let privateKeyBytes = accountWallet.key.KeySet.ReadonlyKey.Rk;

  let ciphertext = checkDecode(ciphertextInfoB58CheckEncode).bytesDecoded;
  if (ciphertext != "") {
    let plaintextBytes = await hybridDecryption(privateKeyBytes, ciphertext);
    let plaintextStr = bytesToString(plaintextBytes);

    return plaintextStr;
  } else {
    return "";
  }
}

async function getBurningAddress(rpcClient, beaconHeight = 0) {
  let burningAddress;
  try {
    // burningAddress = await rpcClient.getBurningAddress(beaconHeight);
    burningAddress = BurnAddress;
  } catch (e) {
    // burningAddress = BurnAddress;
  }
  return burningAddress;
}

async function createNewCoins(paymentAddress = "") {
  let pInf = {
    PaymentAddress: paymentAddress,
    Amount: "0"
  }
  // since we only use the PublicKey and TxRandom fields, the tokenID is irrelevant
  const newCoin = await createCoin({ paymentInfo: pInf, tokenID: null });
  return newCoin
}

/**
 *
 * @param {nanoAmountPRV : number} nanoAmountPRV
 */
const toPRV = (nanoAmountPRV) => parseFloat(nanoAmountPRV / PrivacyUnit);

/**
 *
 * @param {amountPRV : number} amountPRV
 */
const toNanoPRV = (amountPRV) => Number(amountPRV * PrivacyUnit);

export {
  toPRV,
  toNanoPRV,
  encryptMessageOutCoin,
  decryptMessageOutCoin,
  getBurningAddress,
  createNewCoins,
};
