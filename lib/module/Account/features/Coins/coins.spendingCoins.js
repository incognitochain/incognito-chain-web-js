import { CustomError, ErrorObject } from "@lib/common/errorhandler";
import { TX_STATUS } from "@lib/module/Account/account.constants";
import Validator from "@lib/utils/validator";
import uniq from "lodash/uniq";
import { CACHE_KEYS, cachePromise } from "@lib/utils/cache";
import {PrivacyVersion} from "@lib/core/constants";

export const SPENDING_COINS_STORAGE = "SPENDING-COINS-STORAGE";

async function getSpendingCoinsStorageByTokenId(params) {
  try {
    const { tokenID, version } = params;
    new Validator("getSpendingCoinsStorageByTokenId-tokenID", tokenID)
      .required()
      .string();
    new Validator("getSpendingCoinsStorageByTokenId-version", version)
      .required()
      .number();
    const key = await this.getKeySpendingCoinsStorageByTokenId(params);
    const spendingCoins = (await this.getAccountStorage(key)) || [];
    const timeExpired = 2 * 60 * 1000;
    const lockTime = 40 * 1000;
    const spendingCoinsFilter = spendingCoins.filter(
      (item) => Date.now() - item.createdAt > lockTime
    );
    const txIds = uniq(spendingCoinsFilter.map((coin) => coin.txId));
    const tasks = txIds.map((txId) =>
      version === PrivacyVersion.ver3
          ? this.rpc.getTransactionByHash(txId, true)
          : this.rpcTxService.apiGetTxStatus({ txId })
    );
    let statuses = [];
    try {
      statuses = await Promise.all(tasks);
    } catch (e) {
      throw new CustomError(
        ErrorObject.GetStatusTransactionErr,
        "Message is too large",
        e
      );
    }
    statuses = txIds.map((txId, index) => ({
      txId,
      status: statuses[index],
    }));
    const spendingCoinsMapStatus = spendingCoins.map((item) => {
      /** success or fail, wait some minutes close lock */
      let { timeTxEnd } = item;
      let status = TX_STATUS.TXSTATUS_PENDING;
      const tx = statuses.find((status) => status.txId === item.txId);
      if (tx) {
        status = tx?.status;
      }
      /** update timeTxEnd when success or fail and didn't update before */
      if (status === TX_STATUS.TXSTATUS_SUCCESS && timeTxEnd === undefined) {
        timeTxEnd = Date.now();
      }
      return { ...item, status, timeTxEnd };
    });

    const spendingCoinsFilterByTime = spendingCoinsMapStatus.filter((item) => {
      const { status, timeTxEnd } = item;
      let timeTxEndExist;
      if (timeTxEnd !== undefined) {
        timeTxEndExist = Date.now() - timeTxEnd;
      }
      const timeExist = new Date().getTime() - item?.createdAt;
      const isTxEnd =
        (timeTxEndExist !== undefined && timeTxEndExist > timeExpired) ||
        (timeExist > timeExpired &&
          (status === TX_STATUS.TXSTATUS_CANCELED ||
            status === TX_STATUS.TXSTATUS_FAILED));
      return !isTxEnd;
    });
    await this.setAccountStorage(key, spendingCoinsFilterByTime);
    return spendingCoinsFilterByTime || [];
  } catch (error) {
    throw error;
  }
}

async function setSpendingCoinsStorage(params) {
  try {
    const { coins, tokenID, txId, version } = params;
    new Validator("setSpendingCoinsStorage-tokenID", tokenID)
      .required()
      .string();
    new Validator("setSpendingCoinsStorage-coins", coins).required().array();
    new Validator("setSpendingCoinsStorage-txId", txId).required().string();
    new Validator("setSpendingCoinsStorage-version", version)
      .required()
      .number();
    if (!coins) {
      return;
    }
    const key = this.getKeySpendingCoinsStorageByTokenId(params);
    const spendingCoins =
      (await this.getSpendingCoinsStorageByTokenId(params)) || [];
    const mapCoins = coins.map((item) => ({
      keyImage: item?.KeyImage,
      createdAt: new Date().getTime(),
      txId,
      tokenID,
      timeTxEnd: undefined, // tx success, wait couple minutes close lock
    }));
    mapCoins.forEach((item) => {
      const isExist = spendingCoins.some(
        (coin) => coin?.keyImage === item?.keyImage
      );
      if (!isExist) {
        spendingCoins.push(item);
      }
    });
    await this.setAccountStorage(key, spendingCoins);
  } catch (error) {
    throw error;
  }
}

async function getCoinsInMempoolCached() {
  let coins = [];
  try {
    coins = (await cachePromise(CACHE_KEYS.COIN_MEMPOOL_CACHE, () =>
        this.rpcCoinService.apiGetSpendingCoinInMemPool()
    )) || [];
  } catch (e) {
    coins = []
  }
  return coins;
}

async function getUnspentCoinsExcludeSpendingCoins(params) {
  try {
    const { tokenID, version } = params;
    new Validator(`getUnspentCoinsExcludeSpendingCoins-tokenID`, tokenID)
      .required()
      .string();
    new Validator(`getUnspentCoinsExcludeSpendingCoins-version`, version)
      .required()
      .number();
    let { unspentCoins: coins } = await this.getOutputCoins(params);
    const spendingCoinsStorage = await this.getSpendingCoinsStorageByTokenId(
      params
    );
    coins = coins.filter(
      (item) =>
        !spendingCoinsStorage?.find((coin) => coin?.keyImage === item?.KeyImage)
    );
    const spendingCoins = await this.getCoinsInMempoolCached();
    if (!!spendingCoins) {
      coins = coins.filter((coin) => !spendingCoins.includes(coin.KeyImage));
    }
    return coins || [];
  } catch (error) {
    console.log("getUnspentCoinsExcludeSpendingCoins FAILED", error);
    throw error;
  }
}

function getKeySpendingCoinsStorageByTokenId(params) {
  try {
    const { tokenID, version } = params;
    new Validator("getKeySpendingCoinsStorageByTokenId-tokenID", tokenID)
      .required()
      .string();
    new Validator("getKeySpendingCoinsStorageByTokenId-version", version)
      .required()
      .number();
    const keyByTokenId = this.getKeyStorageByTokenId(params);
    let suffix = "";
    if (version === PrivacyVersion.ver3) {
      suffix = this.rpc.rpcHttpService.url;
    }
    return `${keyByTokenId}-${SPENDING_COINS_STORAGE}${suffix}`;
  } catch (error) {
    throw error;
  }
}

async function removeSpendingCoinsByTxIDs({ txIDs, tokenIDs, version }) {
  try {
    new Validator("removeSpendingCoinsByTxIDs-txIDs", txIDs).required().array();
    new Validator("removeSpendingCoinsByTxIDs-tokenIDs", tokenIDs)
      .required()
      .array();
    new Validator("removeSpendingCoinsByTxIDs-version", version)
      .required()
      .number();
    tokenIDs = uniq(tokenIDs).filter((tokenID) => !!tokenID);
    txIDs = uniq(txIDs).filter((txID) => !!txID);
    const tasks = uniq(tokenIDs).map(async (tokenID) => {
      const oldSpendingCoins =
        (await this.getSpendingCoinsStorageByTokenId({
          tokenID,
          version,
        })) || [];
      const newSpendingCoins = oldSpendingCoins.filter(
        (spendingCoins) => !txIDs.includes(spendingCoins?.txId)
      );
      const key = await this.getKeySpendingCoinsStorageByTokenId({
        tokenID,
        version,
      });
      await this.setAccountStorage(key, newSpendingCoins);
    });
    await Promise.all(tasks);
  } catch (e) {
    throw e;
  }
}

export default {
  getUnspentCoinsExcludeSpendingCoins,
  getKeySpendingCoinsStorageByTokenId,
  getSpendingCoinsStorageByTokenId,
  setSpendingCoinsStorage,
  removeSpendingCoinsByTxIDs,
  getCoinsInMempoolCached,
};
