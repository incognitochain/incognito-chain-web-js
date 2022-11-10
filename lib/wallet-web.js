import "core-js/stable";
import "regenerator-runtime/runtime";
import {
  Wallet,
  Account,
  DefaultStorage,
  TxHistoryInfo,
  RpcClient,
  PaymentInfo,
  KeyWallet,
  PaymentAddressType,
  CustomTokenTransfer,
  CustomTokenInit,
  PRVIDSTR,
  PTOKEN_ID,
  ENCODE_VERSION,
  FailedTx,
  SuccessTx,
  ConfirmedTx,
  MetaStakingBeacon,
  MetaStakingShard,
  checkEncode,
  toNanoPRV,
  toPRV,
  getShardIDFromLastByte,
  generateECDSAKeyPair,
  generateBLSKeyPair,
  //
  BurningPBSCRequestMeta,
  BurningRequestMeta,
  BurningPRVERC20RequestMeta,
  BurningPRVBEP20RequestMeta,
  BurningPDEXERC20RequestMeta,
  BurningPDEXBEP20RequestMeta,
  BurningPBSCForDepositToSCRequestMeta,
  BurningPLGRequestMeta,
  BurningPLGForDepositToSCRequestMeta,
  BurningFantomRequestMeta,
  BurningFantomForDepositToSCRequestMeta,
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
  hybridEncryption,
  hybridDecryption,
  encryptMessageOutCoin,
  decryptMessageOutCoin,
  createNewCoins,
  constants,
  coinChooser,
  newMnemonic,
  newSeed,
  validateMnemonic,
  PrivacyVersion,
  Validator,
  ACCOUNT_CONSTANT,
  byteToHexString,
  hexStringToByte,
  TX_STATUS,
  ErrorObject,
  setShardNumber,
  isPaymentAddress,
  isOldPaymentAddress,
  VerifierTx,
  VERFIER_TX_STATUS,
  gomobileServices,
  RpcHTTPCoinServiceClient,
  PDexV3,
  EXCHANGE_SUPPORTED,
  //
  PANCAKE_CONSTANTS,
  UNI_CONSTANTS,
  CURVE_CONSTANTS,
  WEB3_CONSTANT,
  BSC_CONSTANT,
  loadBackupKey,
  parseStorageBackup,
} from '@lib/wallet';
import defaultWasmFile from "@privacy-wasm";
import { wasm, callwasm } from "@lib/wasm";
import { PriKeyType } from "@lib/core";
import { base64Decode } from "@lib/privacy/utils";
import coinsV3 from "@lib/module/Account/features/CoinsV3";
import uniqBy from "lodash/uniqBy";

console.log('START LOAD WALLET_WEB: ', globalThis)

const COINS_INDEX_STORAGE_KEY = 'COINS_INDEX_STORAGE_KEY';

/**
 * @async perform initialization (load WASM binary etc.)
 */
export const init = async (fileName, shardCount) => {
  // load Go symbols for browser/extension target. See Webpack config webCfg
  await import("@lib/wasm/wasm_exec.js");
  if (!globalThis.__gobridge__?.ready) {
    globalThis.__gobridge__ = {};
    const go = new Go();
    // privacy.wasm is added by file-loader
    const { instance } = await WebAssembly.instantiateStreaming(fetch(fileName || defaultWasmFile), go.importObject);
    go.run(instance);
    globalThis.__gobridge__.ready = true;
  }
  await setShardNumber(shardCount);
  await wasm.setCfg(JSON.stringify({ shardCount, allowBase58: true }));
};

Object.assign(
    Account.prototype,
    coinsV3
);

export {
  Wallet,
  Account,
  DefaultStorage,
  TxHistoryInfo,
  RpcClient,
  PaymentInfo,
  KeyWallet,
  PaymentAddressType,
  CustomTokenTransfer,
  CustomTokenInit,
  PRVIDSTR,
  ENCODE_VERSION,
  FailedTx,
  SuccessTx,
  ConfirmedTx,
  MetaStakingBeacon,
  MetaStakingShard,
  checkEncode,
  toNanoPRV,
  toPRV,
  getShardIDFromLastByte,
  generateECDSAKeyPair,
  generateBLSKeyPair,
  //
  BurningPBSCRequestMeta,
  BurningRequestMeta,
  BurningPRVERC20RequestMeta,
  BurningPRVBEP20RequestMeta,
  BurningPDEXERC20RequestMeta,
  BurningPDEXBEP20RequestMeta,
  BurningPBSCForDepositToSCRequestMeta,
  BurningPLGRequestMeta,
  BurningPLGForDepositToSCRequestMeta,
  BurningFantomRequestMeta,
  BurningFantomForDepositToSCRequestMeta,
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
  hybridEncryption,
  hybridDecryption,
  encryptMessageOutCoin,
  decryptMessageOutCoin,
  constants,
  coinChooser,
  newMnemonic,
  newSeed,
  validateMnemonic,
  PrivacyVersion,
  Validator,
  ACCOUNT_CONSTANT,
  byteToHexString,
  hexStringToByte,
  TX_STATUS,
  ErrorObject,
  setShardNumber,
  isPaymentAddress,
  isOldPaymentAddress,
  VerifierTx,
  VERFIER_TX_STATUS,
  gomobileServices,
  RpcHTTPCoinServiceClient,
  PDexV3,
  EXCHANGE_SUPPORTED,
  //
  PANCAKE_CONSTANTS,
  UNI_CONSTANTS,
  CURVE_CONSTANTS,
  WEB3_CONSTANT,
  BSC_CONSTANT,
  loadBackupKey,
  parseStorageBackup,
  wasm,
  PTOKEN_ID,
  createNewCoins
};