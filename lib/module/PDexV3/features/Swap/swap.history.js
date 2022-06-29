import { PDEX_TX_STATUS_CODE, TX_TYPE } from "@lib/module/Account";
import { camelCaseKeys } from "@lib/utils/camelCaseKeys";
import { Validator } from "@lib/wallet";
import uniq from "lodash/uniq";
import flatten from "lodash/flatten";
import orderBy from "lodash/orderBy";
import differenceBy from "lodash/differenceBy";
import uniqBy from "lodash/uniqBy";
import isArray from "lodash/isArray";
import { EXCHANGE_SUPPORTED } from "@lib/module/PDexV3/PDexV3.constants";

function getKeySwapTokenIDs({ version }) {
  new Validator("getKeySwapTokenIDs-version", version).required().number();
  const otaKey = this.getOTAKey();
  return `${otaKey}-${version}-SWAP-TOKENS-IDS`;
}

async function getStorageSwapTokenIDs({ version }) {
  new Validator("getStorageSwapTokenIDs-version", version).required().number();
  const key = this.getKeySwapTokenIDs({ version });
  return await this.getStorage(key);
}

async function setStorageSwapTokenIDs({ tokenIDs = [], version }) {
  try {
    console.log("setStorageSwapTokenIDs-tokenIDs", tokenIDs);
    new Validator("setStorageSwapTokenIDs-version", version)
      .required()
      .number();
    new Validator("setStorageSwapTokenIDs-tokenIDs", tokenIDs)
      .required()
      .array();
    const oldTokenIDs = (await this.getStorageSwapTokenIDs({ version })) || [];
    const newTokenIDs = uniq(
      oldTokenIDs.concat(tokenIDs).filter((tokenID) => !!tokenID)
    );
    const key = this.getKeySwapTokenIDs({ version });
    let task = [this.setStorage(key, newTokenIDs)];
    if (this?.account) {
      task.push(
        this?.account?.addListFollowingToken({
          tokenIDs,
        })
      );
    }
    await Promise.all(task);
  } catch (error) {
    console.log("setStorageSwapTokenIDs-error", error);
    throw error;
  }
}

async function getOrderSwapDetail({ requestTx, version, fromStorage }) {
  let result = {};
  try {
    new Validator("getOrderSwapDetail-requestTx", requestTx)
      .required()
      .string();
    new Validator("getOrderSwapDetail-version", version).required().number();
    new Validator("getOrderSwapDetail-fromStorage", fromStorage)
      .required()
      .boolean();
    result = await this.rpcTradeService.apiGetTradeDetail({
      txhash: requestTx,
    });
    if (isArray(result)) {
      result = result[0];
      result = mappingHistoryFromApi(result);
    } else if (fromStorage) {
      const history = await this.getSwapHistoryFromStorage({
        version,
      });
      result = history.find((h) => h?.requestTx === requestTx);
    }
  } catch (error) {
    throw error;
  }
  return result;
}

async function getSwapHistoryFromStorage({ version }) {
  let historyStorage = [];
  try {
    new Validator("getSwapHistoryFromStorage-version", version)
      .required()
      .number();
    let tokenIds = [];
    const storageTokenIDs =
      (await this.getStorageSwapTokenIDs({ version })) || [];
    try {
      const keyInfo = await this.account?.getKeyInfo({ version });
      const coinsIndex = keyInfo?.coinindex;
      if (coinsIndex) {
        tokenIds = Object.keys(coinsIndex);
      }
    } catch {
      //
    }
    tokenIds = uniq(tokenIds.concat(storageTokenIDs));
    let history =
      (await Promise.all(
        tokenIds.map(async (tokenID) => {
          const histories =
            (await this.account?.getTxsTransactorFromStorage({
              tokenID,
              version,
            })) || [];
          return histories.filter((item) => item?.txType === TX_TYPE.SWAP);
        })
      )) || [];
    history = flatten(history);
    history = history.filter((h) => !!h?.txId);
    history = uniqBy(history, (h) => h?.txId);
    if (!history) {
      return [];
    }
    history = history?.map((h) => {
      try {
        const { metadata, txId, time, status: statusCode, statusStr } = h;
        const {
          TradePath,
          TokenToSell,
          SellAmount,
          TradingFee,
          MinAcceptableAmount,
          FeeToken,
          TokenToBuy,
        } = metadata || {};
        const result = {
          amount: SellAmount,
          minAccept: MinAcceptableAmount,
          sellTokenId: TokenToSell,
          requestTx: txId,
          requestime: time,
          buyTokenId: TokenToBuy,
          respondTxs: [],
          status: statusStr,
          statusCode,
          fee: TradingFee,
          feeToken: FeeToken,
          fromStorage: true,
          tradingPath: TradePath,
          price: MinAcceptableAmount,
          exchange: EXCHANGE_SUPPORTED.incognito,
        };
        return result;
      } catch (error) {
        console.log("getSwapHistoryFromStorage-error", error);
      }
      return null;
    });
    historyStorage = history;
  } catch (error) {
    console.log("get history storage error");
    throw error;
  }
  return historyStorage;
}

const mappingHistoryFromApi = (h) => {
  let history = camelCaseKeys(h);
  const {
    isCompleted,
    respondTokens,
    minAccept,
    respondAmounts,
    buyTokenId,
    requestime,
    statusCode,
  } = history;
  let price = 0;
  if (!isCompleted || statusCode === PDEX_TX_STATUS_CODE.TXSTATUS_FAILED) {
    price = minAccept;
  } else {
    const indexBuyToken = respondTokens.findIndex((t) => t === buyTokenId);
    price = respondAmounts[indexBuyToken];
  }
  return {
    ...history,
    price,
    exchange: EXCHANGE_SUPPORTED.incognito,
    requestime: requestime * 1000,
  };
};

async function getSwapHistoryFromApi({ version, limit, offset }) {
  let history = [];
  try {
    new Validator("apiGetHistory-version", version).required().number();
    new Validator("apiGetHistory-limit", limit).number();
    new Validator("apiGetHistory-offset", offset).number();
    history =
      (await this.rpcTradeService.apiGetHistory({
        offset,
        limit,
        queryStr: `otakey=${this.getOTAKey()}`,
      })) || [];
    history = history
      ?.filter((h) => !!h?.RequestTx)
      ?.map((h) => mappingHistoryFromApi(h));
  } catch (error) {
    console.log("getSwapHistoryFromApi-error", error);
    throw error;
  }
  return history;
}

async function getSwapHistory(params) {
  let history = [];
  const { version, limit = 1e9, offset = 0 } = params;
  try {
    new Validator("getSwapHistory-version", version).required().number();
    new Validator("getSwapHistory-limit", limit).number();
    new Validator("getSwapHistory-offset", offset).number();
    const otakey = this.getOTAKey();
    new Validator("getSwapHistory-otakey", otakey).required().string();
    let [historyFromApi, historyFromStorage] = await Promise.all([
      this.getSwapHistoryFromApi(params),
      this.getSwapHistoryFromStorage(params),
    ]);
    historyFromStorage = differenceBy(
      historyFromStorage,
      historyFromApi,
      (h) => h?.requestTx
    );
    history = [...historyFromStorage, ...historyFromApi];
  } catch (error) {
    console.log("getSwapHistory-error", error);
    throw error;
  }
  history = orderBy(history, "requestime", "desc");
  return history;
}

export default {
  getOrderSwapDetail,
  getSwapHistory,
  getSwapHistoryFromApi,
  getSwapHistoryFromStorage,
  getKeySwapTokenIDs,
  setStorageSwapTokenIDs,
  getStorageSwapTokenIDs,
};
