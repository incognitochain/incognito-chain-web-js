import { camelCaseKeys } from "@lib/utils/camelCaseKeys";
import Validator from "@lib/utils/validator";
import orderBy from "lodash/orderBy";
import flatten from "lodash/flatten";
import isArray from "lodash/isArray";
import uniqBy from "lodash/uniqBy";
import {PDEX_TRANSACTION_TYPE, TX_STATUS, TX_TYPE} from "@lib/module/Account";
import { cachePromise } from "@lib/utils/cache";

async function getOrderLimitDetail({
  requestTx,
  token1ID,
  token2ID,
  poolid,
  version,
  fromStorage,
}) {
  let result = {};
  try {
    new Validator("getOrderLimitDetail-requestTx", requestTx)
      .required()
      .string();
    new Validator("getOrderLimitDetail-token1ID", token1ID).required().string();
    new Validator("getOrderLimitDetail-token2ID", token2ID).required().string();
    new Validator("getOrderLimitDetail-poolid", poolid).required().string();
    new Validator("getOrderLimitDetail-version", version).required().number();
    new Validator("getOrderLimitDetail-fromStorage", fromStorage)
      .required()
      .boolean();
    result = await cachePromise(`ORDER-TX-${requestTx}`, () =>
      this.rpcTradeService.apiGetTradeDetail({
        txhash: requestTx,
      })
    );
    if (isArray(result)) {
      result = result[0];
      result = camelCaseKeys(result);
    } else if (fromStorage) {
      const history = await this.getOrderLimitHistoryFromStorage({
        tokenIds: [token1ID, token2ID],
        version,
      });
      result = history.find((h) => h?.requestTx === requestTx);
    }
  } catch (error) {
    throw error;
  }
  return result;
}

function getKeyStorageMarkOrderTxSubmitted() {
  const otakey = this.getOTAKey();
  return `MARK-ORDER-TX-SUBMMITED-${otakey}`;
}

async function clearStorageMarkOrderTxSubmitted() {
  const key = this.getKeyStorageMarkOrderTxSubmitted();
  await this.clearStorage(key);
}

async function setMarkOrderTxSubmitted(params) {
  try {
    const { requestTx } = params;
    new Validator("setWithdrawOrderTx-requestTx", requestTx)
      .required()
      .string();
    const key = this.getKeyStorageMarkOrderTxSubmitted();
    const oldList = (await this.getMarkOrderTxSubmitted()) || [];
    const isExisted = oldList.findIndex((tx) => tx === requestTx) > -1;
    if (!isExisted) {
      let newList = [requestTx, ...oldList];
      await this.setStorage(key, newList);
    }
  } catch (error) {
    throw error;
  }
}

async function getMarkOrderTxSubmitted() {
  let result = [];
  try {
    const key = this.getKeyStorageMarkOrderTxSubmitted();
    result = (await this.getStorage(key)) || [];
  } catch (error) {
    console.log("getMarkOrderTxSubmitted-error", error);
  }
  return result;
}

async function getOrderLimitHistoryFromStorage({ tokenIds, version }) {
  let historyStorage = [];
  try {
    new Validator("getOrderLimitHistoryFromStorage-tokenIds", tokenIds)
      .required()
      .array();
    new Validator("getOrderLimitHistoryFromStorage-version", version)
      .required()
      .number();
    const listSubmitted = await this.getMarkOrderTxSubmitted();
    let history = await Promise.all(
      tokenIds.map((tokenID) =>
        this.account?.getTxsTransactorFromStorage({
          tokenID,
          version,
        })
      )
    );
    history = flatten(history);
    history = history.filter((h) => {
      const submitted = listSubmitted.includes(h?.txId);
      return !!h?.txId && h?.txType === TX_TYPE.ORDER_LIMIT && !submitted;
    });
    history = uniqBy(history, (h) => h?.txId);
    history = history.map(async (h) => {
      let data = {};
      let isSubmitted = false;
      try {
        const { metadata, txId, time, status: statusCode, statusStr, versionTx } = h;
        const {
          SellAmount,
          MinAcceptableAmount,
          PoolPairID,
          TokenToSell,
          NftID,
          TokenIDToBuy,
        } = metadata || {};
        let isCompleted = false;
        if (
          [TX_STATUS.TXSTATUS_CANCELED, TX_STATUS.TXSTATUS_FAILED].includes(
            statusCode
          )
        ) {
          isCompleted = true;
        }
        data = {
          amount: SellAmount,
          minAccept: MinAcceptableAmount,
          poolId: PoolPairID,
          sellTokenId: TokenToSell,
          nftid: NftID,
          requestTx: txId,
          requestime: time,
          buyTokenId: TokenIDToBuy,
          respondTxs: [],
          withdrawTxs: {},
          status: statusStr,
          statusCode,
          pairId: "",
          matched: 0,
          receiver: "",
          fee: 0,
          feeToken: "",
          isCompleted,
          sellTokenBalance: 0,
          buyTokenBalance: 0,
          sellTokenWithdrawed: 0,
          buyTokenWithdrawed: 0,
          fromStorage: true,
          versionTx
        };
        try {
          let result = await this.rpcTradeService.apiGetTradeDetail({
            txhash: txId,
          });
          if (isArray(result)) {
            result = result[0];
            result = camelCaseKeys(result);
            const { requestTx } = result;
            isSubmitted = !!result?.requestTx;
            await this.setMarkOrderTxSubmitted({ requestTx });
          }
        } catch (error) {
          console.log("error", error);
        }
      } catch (error) {
        console.log("getOrderLimitHistoryFromStorage-error", error);
      }
      return {
        ...data,
        isSubmitted,
      };
    });
    history = await Promise.all(history);
    history = flatten(history);
    historyStorage = history.filter(
      (h) => !h.isSubmitted & !!h.requestTx && !h?.isCompleted
    );
    console.log('getOrderLimitHistoryFromStorage:::4 ', history)
  } catch (error) {
    console.log("error", error);
  }
  return historyStorage;
}

async function getOrderLimitHistoryByOTAKey({ poolid }) {
  let history = [];
  try {
    new Validator("getOrderLimitHistoryByOTAKey-poolid", poolid).required().string();
    const otaKey = this.getOTAKey();
    history = await cachePromise(`${otaKey}-${poolid}-OTA-KEY-HISTORY-ORDERS`, () =>
        this.rpcTradeService.apiGetHistory({
          queryStr: `poolid=${poolid}&otakey=${otaKey}&isorder=true`,
        })
    );
  } catch (error) {
    console.log("getOrderLimitHistoryByOTAKey", error);
  }
  return history;
}

async function getOrderLimitHistoryByNFT({ poolid, listNFTToken }) {
  let history = [];
  try {
    new Validator("getOrderLimitHistoryByNFT-poolid", poolid).required().string();
    new Validator("getOrderLimitHistoryByNFT-listNFTToken", listNFTToken)
        .required()
        .array();
    let task =
        (await Promise.all(
            listNFTToken.map((nftid) =>
                cachePromise(`${poolid}-${nftid}-HISTORY-ORDERS`, () =>
                    this.rpcTradeService.apiGetHistory({
                      queryStr: `poolid=${poolid}&nftid=${nftid}&isorder=true`,
                    })
                )
            )
        )) || [];
    if (task.length > 0) {
      history = flatten(task);
    }
  } catch (error) {
    console.log("getOrderLimitHistoryByNFT", error);
  }
  return history;
}

async function getOrderLimitHistoryFromApi({ poolid, version, listNFTToken }) {
  let history = [];
  try {
    new Validator("apiGetHistory-poolid", poolid).required().string();
    new Validator("apiGetHistory-version", version).required().number();
    new Validator("apiGetHistory-listNFTToken", listNFTToken)
      .required()
      .array();

    const [
      accessHistory,
      nftHistory
    ] = await Promise.all([
      this.getOrderLimitHistoryByOTAKey({ poolid }),
      this.getOrderLimitHistoryByNFT({ poolid, listNFTToken }),
    ]);

    history = [...accessHistory, ...nftHistory]
      .filter((h) => !!h?.RequestTx)
      .map((h) => camelCaseKeys(h))
      .filter((h) => !!h?.isCompleted);
    history = orderBy(history, "requestime", "desc");
  } catch (error) {
    console.log("getOrderLimitHistoryFromApi", error);
  }
  return history;
}

async function getOpenOrderLimitHistoryByOTAKey() {
  let history = [];
  try {
    const otaKey = this.getOTAKey();
    new Validator("getOpenOrderLimitHistoryByOTAKey-otaKey", otaKey).required().string();
    history =
        (await cachePromise(`${otaKey}-LIST-OPEN-ORDERS-LIMIT-BY-OTA-KEY`, () =>
            this.rpcTradeService.apiGetOpenOrder({
              otaKey,
            })
        )) || [];
    history = history.filter((h) => !!h?.RequestTx)
        .map((h) => ({
          ...camelCaseKeys(h),
          versionTx: PDEX_TRANSACTION_TYPE.ACCESS_ID
        }));
  } catch (error) {
    console.log("error", error);
  }
  return history;
}

/**
 * @param {array[string]} listNFTToken All owner NFT ID.
 **/
async function getOpenOrderLimitHistoryByNFT({ listNFTToken }) {
  let history = [];
  try {
    const otaKey = this.getOTAKey();
    new Validator("getOpenOrderLimitHistoryByNFT-otaKey", otaKey).required().string();
    new Validator("getOpenOrderLimitHistoryByNFT-listNFTToken", listNFTToken)
        .required()
        .array();
    if (!listNFTToken) {
      return [];
    }
    history =
        (await cachePromise(`${otaKey}-LIST-OPEN-ORDERS-LIMIT`, () =>
            this.rpcTradeService.apiGetOpenOrder({
              ID: listNFTToken,
            })
        )) || [];
    history = history.filter((h) => !!h?.RequestTx)
        .map((h) => ({
          ...camelCaseKeys(h),
          versionTX: PDEX_TRANSACTION_TYPE.NFT
        }));
  } catch (error) {
    console.log("error", error);
  }
  return history;
}

async function getOpenOrderLimitHistoryFromApi(params) {
  let history = [];
  try {
    const [accessHistory, nftHistory] = await Promise.all([
        this.getOpenOrderLimitHistoryByOTAKey(),
        this.getOpenOrderLimitHistoryByNFT(params),
    ]);
    history = [...nftHistory, ...accessHistory]
    history = orderBy(history, "requestime", "desc");
  } catch (error) {
    console.log("error", error);
  }
  return history;
}

export default {
  getOrderLimitDetail,
  getOrderLimitHistoryByNFT,
  getOrderLimitHistoryByOTAKey,
  getOrderLimitHistoryFromApi,
  getOrderLimitHistoryFromStorage,

  getOpenOrderLimitHistoryByOTAKey,
  getOpenOrderLimitHistoryByNFT,
  getOpenOrderLimitHistoryFromApi,

  getMarkOrderTxSubmitted,
  setMarkOrderTxSubmitted,

  getKeyStorageMarkOrderTxSubmitted,
  clearStorageMarkOrderTxSubmitted,
};
