import { PrivacyVersion } from "@lib/core/constants";
import Validator from "@lib/utils/validator";
import { wasm as wasmFuncs } from "@lib/wasm";
import { LIMIT } from "@lib/module/Account/account.constants";
import { pagination } from "@lib/module/Account/account.utils";
import flatten from "lodash/flatten";
import uniqBy from "lodash/uniqBy";
import { CustomError, ErrorObject } from "@lib/common/errorhandler";
import { AIRDROP_STATUS } from '@lib/module/Account/account.constants';
import { CACHE_KEYS, cachePromise } from '@lib/utils/cache';

export const COINS_STORAGE = "COINS_STORAGE";
export const SUBMITTED_OTA_KEY = "SUBMITTED_OTA_KEY";
export const KEY_INFO_CACHE = "KEY_INFO_CACHE";
export const KEY_AIRDROP_NFT = "KEY_AIRDROP_NFT";

function getKeyParamOfCoins(params) {
  try {
    const { key, version } = params;
    new Validator("getKeyParamOfCoins-key", key).required().string();
    new Validator(`getKeyParamOfCoins-version`, version).required().number();
    let keyName = "";
    switch (version) {
      case PrivacyVersion.ver1:
        keyName = "viewkey";
        break;
      case PrivacyVersion.ver2:
        keyName = "otakey";
        break;
      default:
        break;
    }
    const result = `${keyName}=${key}`;
    return result;
  } catch (error) {
    throw error;
  }
}

async function decryptCoins({ coins, version }) {
  try {
    new Validator(`decryptCoins-coins`, coins).required().array();
    new Validator(`decryptCoins-version`, version).required().number();
    const { SNDerivators, PublicKeys } = coins.reduce(
      (prev, coin) => {
        const { SNDerivators, PublicKeys } = prev;
        const { SNDerivator, PublicKey } = coin;
        SNDerivators.push(SNDerivator);
        PublicKeys.push(PublicKey);
        return {
          SNDerivators,
          PublicKeys,
        };
      },
      { SNDerivators: [], PublicKeys: [] }
    );

    const privateKey = this.getPrivateKey();
    const LIMIT_PAGES = LIMIT * 2;
    let decryptedCoins = [];
    if (coins.length > LIMIT_PAGES) {
      const { times, remainder } = pagination(coins.length, LIMIT_PAGES);
      for (let index = 0; index < times; index++) {
        const sliceData = coins.slice(
          index * LIMIT_PAGES,
          index * LIMIT_PAGES + LIMIT_PAGES
        );
        const tasks = sliceData.map((coin) => {
          const param = {
            KeySet: privateKey,
            Coin: coin,
          };
          return wasmFuncs.decryptCoin(JSON.stringify(param));
        });
        const result = await Promise.all(tasks);
        decryptedCoins = decryptedCoins.concat(flatten(result));
      }
      if (remainder > 0) {
        let decryptCoins = coins.slice(
          times * LIMIT_PAGES,
          times * LIMIT_PAGES + remainder
        );
        const tasks = decryptCoins.map((coin) => {
          const param = {
            KeySet: privateKey,
            Coin: coin,
          };
          return wasmFuncs.decryptCoin(JSON.stringify(param));
        });
        const result = await Promise.all(tasks);
        decryptedCoins = decryptedCoins.concat(flatten(result));
      }
    } else {
      let task = coins.map((coin) => {
        const param = {
          KeySet: privateKey,
          Coin: coin,
        };
        return wasmFuncs.decryptCoin(JSON.stringify(param));
      });
      let result = await Promise.all(task);
      decryptedCoins = decryptedCoins.concat(result);
    }
    decryptedCoins = [
      ...decryptedCoins.map((coin) => {
        const coinObject = JSON.parse(coin);
        return {
          ...coinObject,
          CoinCommitment: coinObject?.Commitment,
        };
      }),
    ];
    const uniqValue =
      version === PrivacyVersion.ver2 ? "PublicKey" : "SNDerivator";
    decryptedCoins = uniqBy(decryptedCoins, (item) => item[uniqValue]);
    if (
      (version === PrivacyVersion.ver2 &&
        PublicKeys.length !== decryptedCoins.length) ||
      (version === PrivacyVersion.ver1 &&
        SNDerivators.length !== decryptedCoins.length)
    ) {
      throw new CustomError(
        ErrorObject.GetTxsTransactorFail,
        ErrorObject.GetTxsTransactorFail.description
      );
    }
    return decryptedCoins || [];
  } catch (error) {
    throw error;
  }
}

function getKeyImagesBase64Encode({ coinsDecrypted }) {
  new Validator(`getKeyImagesBase64Encode-coinsDecrypted`, coinsDecrypted)
    .required()
    .array();
  return coinsDecrypted.map((coin) => coin.KeyImage);
}

async function getKeyInfo({ version }) {
  try {
    new Validator(`getKeyInfo-version`, version).required().number();
    const otaKey = this.getOTAKey();
    const cacheKeyInfo = `${KEY_INFO_CACHE}-${version}-${otaKey}`;
    const result = await cachePromise(cacheKeyInfo, () =>
      this.rpcCoinService.apiGetKeyInfo({
        key: otaKey,
        version,
      })
    );
    return result
  } catch (error) {
    throw error;
  }
}

// COIN STORAGE TO TRACK / MEASURE

function getKeyCoinsStorageByTokenId(params) {
  try {
    const { tokenID, version } = params;
    new Validator("setCoinsStorage-tokenID", tokenID).required().string();
    new Validator(`setCoinsStorage-version`, version).required().number();
    const keyByTokenId = this.getKeyStorageByTokenId(params);
    const key = `${keyByTokenId}-${COINS_STORAGE}`;
    return key;
  } catch (error) {
    throw error;
  }
}

async function getCoinsStorage(params) {
  try {
    const { tokenID, version } = params;
    new Validator("getCoinsStorage-tokenID", tokenID).required().string();
    new Validator("getCoinsStorage-version", version).required().number();
    const key = this.getKeyCoinsStorageByTokenId(params);
    return this.getAccountStorage(key);
  } catch (error) {
    throw error;
  }
}

async function setCoinsStorage(params) {
  try {
    const { value = {}, tokenID, version } = params;
    new Validator("setCoinsStorage-value", value).object();
    new Validator("setCoinsStorage-tokenID", tokenID).required().string();
    new Validator(`setCoinsStorage-version`, version).required().number();
    const key = this.getKeyCoinsStorageByTokenId(params);
    const data = (await this.getAccountStorage(key)) || [];
    const newData = [value, ...data];
    await this.setAccountStorage(key, newData);
  } catch (error) {
    throw error;
  }
}

// SUBMIT OTA KEY
async function getFlagSubmittedOTAKey() {
  let submitted = false;
  try {
    const key = this.getOTAKey();
    submitted = await this.getAccountStorage(key);
  } catch (error) {
    console.log("error getFlagSubmittedOTAKey", error);
  }
  return !!submitted;
}

async function submitOTAKey() {
  try {
    const otaKey = this.getOTAKey();
    const submitted = await this.getFlagSubmittedOTAKey();
    if (!submitted) {
      const shardID = this.getShardID();
      const result = await this.rpcCoinService.apiSubmitOTAKey({
        otaKey,
        shardID,
      });
      if (!!result) {
        await this.setAccountStorage(otaKey, true);
      }
    }
  } catch {
    console.log("Submit failed!");
  }
}

// REQUEST AIRDROP TICKET
function getKeyFlagAirdropNFT() {
  return this.getOTAKey() + KEY_AIRDROP_NFT;
}

async function getFlagAirdropNFT() {
  let requested = false;
  try {
    const key = this.getKeyFlagAirdropNFT();
    requested = await this.getAccountStorage(key);
  } catch (error) {
    console.log("error", error);
  }
  return !!requested;
}

async function setFlagAirdropNFT() {
  let requested = false;
  try {
    const key = this.getKeyFlagAirdropNFT();
    requested = await this.setAccountStorage(key, true);
  } catch (error) {
    console.log("error", error);
  }
  return !!requested;
}

async function requestAirdropNFTNoCached() {
  // const paymentAddress = this.getPaymentAddress();
  // const status = this.rpcRequestService.apiRequestAirdropNFT({ paymentAddress });
  return AIRDROP_STATUS.SUCCESS
}

async function requestAirdropNFT() {
  let submited = false;
  let status = undefined;
  try {
    submited = await this.getFlagAirdropNFT();
  } catch (e) {
    console.log('getFlagAirdropNFT error: ', e)
  }
  try {
    if (!submited) {
      status = await this.requestAirdropNFTNoCached();
      if (AIRDROP_STATUS.FAIL !== status) {
        await this.setFlagAirdropNFT();
      }
    }
  } catch (e) {
    // throw new CustomError(
    //     ErrorObject.RequestAirdropErr,
    //     e.message || ErrorObject.RequestAirdropErr.description,
    //     e);
  }
}

export default {
  //ota key
  getFlagSubmittedOTAKey,
  submitOTAKey,

  getKeyParamOfCoins,

  decryptCoins,

  getKeyInfo,
  getKeyImagesBase64Encode,

  //coin storage to track
  getKeyCoinsStorageByTokenId,
  setCoinsStorage,
  getCoinsStorage,

  getKeyFlagAirdropNFT,
  getFlagAirdropNFT,
  setFlagAirdropNFT,
  requestAirdropNFTNoCached,
  requestAirdropNFT,
};
