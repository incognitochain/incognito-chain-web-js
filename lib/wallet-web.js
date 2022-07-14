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
import Worker from "@lib/wasm/index.worker.js";
import coinsV3 from "@lib/module/Account/features/CoinsV3";
import uniqBy from "lodash/uniqBy";

console.log('START LOAD WALLET_WEB: ', globalThis)

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

let ScanCoinBatchSize = 1000,
  ScanCoinPoolSize = 5,
  ScanCoinSpawnWorkerThreshold = 50000;
// decorate Account with methods that use fullnode RPC
const coinMethods = {
  activeScanCoins: async function(cfg = {}, batchSize = ScanCoinBatchSize, poolSize = ScanCoinPoolSize) {
    const tokenList = cfg.tokenList || [];
    const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
    const lengths = await this.rpc.getCoinCount();
    const privkey = this.key.base58CheckSerialize(PriKeyType);

    let tokenIDs = Object.keys(lengths);
    const coinGapsByToken = tokenIDs.map(t => cfg[t] ? lengths[t][shardID] - cfg[t].latest : lengths[t][shardID]);
    let wpool = Array(poolSize).fill(null);
    // only spawn workers for decryption if gap is big
    // otherwise, decrypt sequentially
    if (globalThis.Worker && Math.max(...coinGapsByToken) > ScanCoinSpawnWorkerThreshold) {
      wpool = wpool.map(_ => new Worker());
    }
    let result = {};
    for (const tokenID of tokenIDs) {
      const start = cfg[tokenID]?.latest || 0;
      let coinlen = lengths[tokenID][shardID];
      let wqueues = Array(poolSize).fill(Promise.resolve([]));

      let tasks = [];
      let count = 0;
      for (let batchStart = start; batchStart < coinlen; batchStart += batchSize) {
        count++;
        const wi = count % poolSize;
        let batchEnd = batchStart + batchSize - 1;
        if (batchEnd > coinlen - 1) batchEnd = coinlen - 1;
        // send RPC requests in parallel
        tasks.push(this.rpc.getOutputCoinByIndex(batchStart, batchEnd, shardID, tokenID)
          .then(coinMap => {
            // after receiving coins from RPC, queue a decryption task to worker wi
            wqueues[wi] = wqueues[wi].then(async lst => {
              const prms = callwasm(wpool[wi], 'decryptCoinList', // it decrypts coins, pass on the indexes
                JSON.stringify({
                  CoinList: Object.values(coinMap),
                  KeySet: privkey,
                  TokenList: tokenList,
                }))
              let decryptedCoinList = JSON.parse(await prms);
              if (!decryptedCoinList?.length) decryptedCoinList = [];
              return lst.concat(decryptedCoinList);
            });
          }));
        console.log(`scan coins from index #${batchStart} - shard ${shardID} - token ${tokenID.slice(58)}`);
      }
      await Promise.all(tasks);
      // use tokenList on previous result
      if (tokenID === PTOKEN_ID && cfg[PTOKEN_ID]) {
        cfg[PTOKEN_ID].unspentCoins = JSON.parse(await wasm.decryptCoinList(JSON.stringify({
          CoinList: cfg[PTOKEN_ID].unspentCoins || [],
          KeySet: privkey,
          TokenList: tokenList,
        })));
      }
      let resultForToken = await Promise.all(wqueues);
      resultForToken = resultForToken.reduce((accumulatedLst, t) => accumulatedLst.concat(t), []); // flatten the coin lists
      result[tokenID] = Object.assign(await this.groupSpentCoins(resultForToken, tokenID, cfg[tokenID]), { latest: coinlen });
    }
    return result;
  },

  groupSpentCoins: async function(newCoins, tokenID, prevResult = {}) {
    const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
    let unspentCoins = [], spentCoins = [];
    const coins = uniqBy((newCoins || []).concat(prevResult.unspentCoins || []), "KeyImage")
    let keyImages = coins.map(c => c.KeyImage);
    let response;
    try {
      response = await this.rpc.hasSerialNumber(shardID, keyImages, tokenID);
    } catch (e) {
      throw e;
    }
    const spent = response.existed;
    if (spent.length !== coins.length) {
      throw new Error("Wrong response when check has serial number");
    }

    for (let i = 0; i < spent.length; i++) {
      if (!spent[i]) {
        unspentCoins.push(coins[i]);
      } else {
        spentCoins.push(coins[i])
      }
    }
    console.log('SANG TEST: ', { tokenID, spent, unspentCoins, spentCoins, coins })
    return { unspentCoins, spentCoins };
  }
};
Object.assign(
    Account.prototype,
    coinMethods,
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
  PTOKEN_ID
};