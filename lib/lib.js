import "core-js/stable";
import "regenerator-runtime/runtime";
import PDexV3 from "@lib/module/PDexV3";
import { PANCAKE_CONSTANTS } from "@lib/module/Pancake";
import { UNI_CONSTANTS } from "@lib/module/Uni";
import { CURVE_CONSTANTS } from "@lib/module/Curve";
import { BSC_CONSTANT } from "@lib/module/BinanceSmartChain";
import { WEB3_CONSTANT } from "@lib/module/Web3";
import { PaymentInfo } from "./common/key";
import { RpcClient } from "./rpcclient/rpcclient";
import {
  hashSha3BytesToBytes,
  base64Decode,
  base64Encode,
  bytesToString,
  stringToBytes,
} from "./privacy/utils";
import {
  FailedTx,
  SuccessTx,
  ConfirmedTx,
  MetaStakingBeacon,
  MetaStakingShard,
  PaymentAddressType,
  ReadonlyKeyType,
  PriKeyType,
  OTAKeyType,
  BurningRequestMeta,
  BurningRequestToSCMeta,
  IssuingETHRequestMeta,
  WithDrawRewardRequestMeta,
  PDEContributionMeta,
  PDEPRVRequiredContributionRequestMeta,
  PDETradeRequestMeta,
  PDECrossPoolTradeRequestMeta,
  PDEWithdrawalRequestMeta,
  PortalV4ShieldingRequestMeta,
  PortalV4ShieldingResponseMeta,
  PortalV4UnshieldRequestMeta,
  PortalV4UnshieldingResponseMeta,
  PRVIDSTR,
  KeyWallet,
  TxHistoryInfo,
  toNanoPRV,
  toPRV,
  encryptMessageOutCoin,
  decryptMessageOutCoin,
} from "./core";
import {
  CustomTokenTransfer,
  CustomTokenInit,
  MAX_INPUT_PER_TX,
} from "./tx/constants";
import {
  checkEncode as base58CheckEncode,
  checkDecode as base58CheckDecode,
} from "./common/base58";
import {
  getShardIDFromLastByte,
  byteToHexString,
  hexStringToByte,
  convertHashToStr,
} from "./common/common";
import { Wallet, DefaultStorage } from "./wallet";
import { getMaxWithdrawAmount } from "./tx/utils";
import { generateECDSAKeyPair } from "./privacy/ecdsa";
import { generateBLSKeyPair } from "./privacy/bls";
import {
  generateBLSPubKeyB58CheckEncodeFromSeed,
  generateCommitteeKeyFromHashPrivateKey,
} from "./common/committeekey";
import { hybridEncryption, hybridDecryption } from "./privacy/hybridEncryption";
import { Account } from "./module/Account";
import StorageServices from "./services/storage";
import { StatelessTransactor, wasm } from "./tx/stateless";
import { newMnemonic } from "./core/mnemonic";
import { ENCODE_VERSION, setShardNumber } from "./common/constants";
import { isPaymentAddress, isOldPaymentAddress } from "./utils/paymentAddress";
import VerifierTx from "./module/VerifierTx";

let coinsToBase64 = (coinArray) =>
  coinArray.map((c) => {
    let result = {};
    Object.keys(c).forEach((k) => {
      try {
        const temp = base58CheckDecode(c[k]);
        result[k] = base64Encode(temp.bytesDecoded);
      } catch (e) {
        result[k] = c[k];
      } // keep any field that's not in base58 as-is
    });
    return result;
  });

const constants = {
  PaymentAddressType,
  PriKeyType,
  ReadonlyKeyType,
  OTAKeyType,
  CustomTokenTransfer,
  CustomTokenInit,
  PRVIDSTR,
  ENCODE_VERSION,
  FailedTx,
  SuccessTx,
  ConfirmedTx,
  MetaStakingBeacon,
  MetaStakingShard,
  BurningRequestMeta,
  BurningRequestToSCMeta,
  IssuingETHRequestMeta,
  WithDrawRewardRequestMeta,
  PDEContributionMeta,
  PDEPRVRequiredContributionRequestMeta,
  PDETradeRequestMeta,
  PDECrossPoolTradeRequestMeta,
  PDEWithdrawalRequestMeta,
  PortalV4ShieldingRequestMeta,
  PortalV4ShieldingResponseMeta,
  PortalV4UnshieldRequestMeta,
  PortalV4UnshieldingResponseMeta,
  CustomTokenTransfer,
  MAX_INPUT_PER_TX,
};
const utils = {
  base58CheckEncode,
  base58CheckDecode,
  base58CheckDeserialize: KeyWallet.base58CheckDeserialize,
  base64Encode,
  base64Decode,
  getMaxWithdrawAmount,
  toNanoPRV,
  toPRV,
  getShardIDFromLastByte,
  generateECDSAKeyPair,
  generateBLSKeyPair,
  encryptMessageOutCoin,
  decryptMessageOutCoin,
  byteToHexString,
  hexStringToByte,
  generateBLSPubKeyB58CheckEncodeFromSeed,
  generateCommitteeKeyFromHashPrivateKey,
  hashSha3BytesToBytes,
  convertHashToStr,
  hybridEncryption,
  hybridDecryption,
  bytesToString,
  stringToBytes,
  coinsToBase64,
};
const types = {
  TxHistoryInfo,
  RpcClient,
  PaymentInfo,
  KeyWallet,
  DefaultStorage,
};

class SimpleWallet {
  constructor() {
    this.Name = "";
    // timeout when waiting for TX confirmations
    this.timeout = 200;
    this.rpc = new RpcClient();
  }

  NewTransactor(privateKey) {
    let t = new StatelessTransactor(this, this.rpc.rpcHttpService.url);
    // by default, Transactors of SimpleWallet does NOT connect to coin service, but normal node instead
    t.useCoinsService = false;
    return t.setKey(privateKey).then((_) => {
      return t;
    });
  }

  setProvider(url, user, password) {
    this.rpc = new RpcClient(url, user, password);
  }
}

const init = async (wasmFile) => {
  const { load } = require("./wasm/loader.js");
  wasmFile = wasmFile || __dirname + "/../privacy.wasm";
  return await load(wasmFile);
};

// these libraries are built to NodeJS (for testing / requiring from Node REPL etc.)
export {
  SimpleWallet,
  StatelessTransactor as Transactor,
  Wallet,
  constants,
  types,
  utils,
  init,
  Account,
  StorageServices,
  wasm,
  newMnemonic,
  isPaymentAddress,
  isOldPaymentAddress,
  VerifierTx,
  PDexV3,
  setShardNumber,
  //
  PANCAKE_CONSTANTS,
  UNI_CONSTANTS,
  WEB3_CONSTANT,
  BSC_CONSTANT,
  CURVE_CONSTANTS,
};
