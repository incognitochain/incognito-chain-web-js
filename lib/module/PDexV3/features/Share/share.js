import { cachePromise } from "@lib/utils/cache";
import { camelCaseKeys } from "@lib/utils/camelCaseKeys";
import Validator from "@lib/utils/validator";
import flatten from "lodash/flatten";
import isArray from "lodash/isArray";
import { checkWithdrawableContribute } from "@lib/module/PDexV3/features/Share/share.utils";
import {PDEX_TRANSACTION_TYPE, TX_STATUS} from "@lib/module/Account";

async function getTradingVolume24h(poolId) {
  new Validator("getTradingVolume24h-poolId", poolId).required().string();
  let volume = 0;
  try {
    const data = await cachePromise("TRADING_VOLUME_24H", () =>
      this.rpcTradeService.apiGetTradingVolume24h(poolId)
    );
    if (data && data?.Value) {
      volume = data.Value;
    }
  } catch (error) {
    throw error;
  }
  return volume;
}

async function getListPools(pairId) {
  let list = [];
  try {
    new Validator("getListPools-pairId", pairId).string().required();
    list =
      (await cachePromise(`LIST_POOLS${pairId}`, () =>
        this.rpcTradeService.apiGetListPools(pairId)
      )) || [];
    if (isArray(list)) {
      list = list.map((pool) => camelCaseKeys(pool));
    } else {
      list = [];
    }
  } catch (error) {
    throw error;
  }
  return list;
}

async function getListPoolsDetail(poolIDs) {
  let list = [];
  try {
    new Validator("getListPoolsDetail-poolIDs", poolIDs).array().required();
    const key = poolIDs.join("-");
    list =
      (await cachePromise(`LIST_POOLS_DETAIL-${key}`, () =>
        this.rpcTradeService.apiGetListPoolsDetail(poolIDs)
      )) || [];
    if (list.length > 0) {
      list = list.map((pool) => camelCaseKeys(pool));
    }
  } catch (error) {
    list = [];
    throw error;
  }
  return list;
}

/** Get current contribute by NFTID Key */
async function getShareWithNFTID() {
  let res = [];
  try {
    const nftIds = (await this.getNFTTokenIDs()) || [];
    /** Handle load contribute by nftId */
    const tasks = nftIds.map(async(nftId) => {
      const res = (await this.rpcTradeService.apiGetListShare({ nftId })) || []
      return res.map((item) => {
        item = {
          ...camelCaseKeys(item),
          nftId,
          versionTx: PDEX_TRANSACTION_TYPE.NFT,
        };
        const withdrawable = checkWithdrawableContribute(item);
        const data = {
          ...item,
          withdrawable,
        };
        return data;
      })
    });
    const data = await Promise.all(tasks);
    if (tasks && tasks.length > 0) {
      res = flatten(data || []);
    }
  } catch (error) {
    console.log('getShareWithNFTID error: ', error)
  }
  return res;
}

/** Get current contribute by AccessOTA Key */
async function getShareWithOTAKey() {
  let share = [];
  const removeBurnTxIDs = [];
  try {
    const otaKey = this.getOTAKey();
    let burningTxs = await this.getStorageBurningTx();
    // Get List Share from api
    // Get Burning Status
    const tasks = [
      (await this.rpcTradeService.apiGetListShare({ otaKey })) || [],
      await Promise.all(
        burningTxs.map(async (item) => {
          const status =
              await this.account.rpcTxService.apiGetTxStatus({ txId: item.txID })
          return {
            ...item,
            status,
          }
        })
      ),
    ]
    const data = await Promise.all(tasks);
    share = data[0] || [];
    burningTxs = data[1];
    share = share.map((item) => {
      item = {
        ...camelCaseKeys(item),
        nftId: item.NFTID,
        versionTx: PDEX_TRANSACTION_TYPE.ACCESS_ID,
      };
      const withdrawable = checkWithdrawableContribute(item);
      let isBurningTx = item.isMintingNewAccessOta;
      const foundBurnTx = (burningTxs || []).find(burn =>
          burn.accessID.toLowerCase() === item.nftId.toLowerCase()
      );
      if (foundBurnTx && !isBurningTx) {
        isBurningTx =
            foundBurnTx.status === TX_STATUS.TXSTATUS_PENDING
            || foundBurnTx.status === TX_STATUS.PROCESSING
            || !(
                foundBurnTx.status === TX_STATUS.TXSTATUS_SUCCESS
                && !!item.currentAccessOta
                && item.currentAccessOta !== foundBurnTx.pubkey
            )
        if (!isBurningTx) {
          removeBurnTxIDs.push(foundBurnTx.txID)
        }
      }
      const data = {
        ...item,
        withdrawable,
        isBurningTx,
      };
      return data;
    });
    burningTxs = burningTxs.filter(burn => !removeBurnTxIDs.includes(burn.txID))
    await this.updateStorageBurningTx(burningTxs);
  } catch (error) {
    console.log('getShareWithOTAKey error: ', error)
    share = [];
  }
  return share;
}

async function getListShare() {
  let share = { nftContribute: [], accessOTAContribute: [] };
  try {
    const tasks = [
      await this.getShareWithNFTID(),
      await this.getShareWithOTAKey(),
    ];
    const [
      nftContribute,
      accessOTAContribute,
    ] = await Promise.all(tasks);
    share = { nftContribute, accessOTAContribute }
  } catch (error) {
    // throw error;
  }
  return share;
}

async function getListPair() {
  let list = [];
  try {
    list =
      (await cachePromise("LIST_PAIR", () =>
        this.rpcTradeService.apiGetListPair()
      )) || [];
    list = camelCaseKeys(list);
  } catch (error) {
    throw error;
  }
  return list;
}

async function getEstimateTrade(params) {
  try {
    const { selltoken, buytoken, buyamount, sellamount, ismax } = params;
    new Validator("getEstimateTrade-selltoken", selltoken).required().string();
    new Validator("getEstimateTrade-buytoken", buytoken).required().string();
    new Validator("getEstimateTrade-buyamount", buyamount).amount();
    new Validator("getEstimateTrade-sellamount", sellamount).amount();
    new Validator("getEstimateTrade-ismax", ismax).boolean();
    const res = await this.rpcTradeService.apiEstimateTrade(params);
    return camelCaseKeys(res);
  } catch (error) {
    throw error;
  }
}

async function getOrderBook(params) {
  let data = {};
  try {
    const { poolid, decimal } = params;
    new Validator("getOrderBook-poolid", poolid).required().string();
    new Validator("getOrderBook-decimal", decimal).required().amount();
    let res = await this.rpcTradeService.apiGetOrderBook(params);
    data = camelCaseKeys(res);
  } catch (error) {
    throw error;
  }
  return data;
}

async function getPriceHistory(params) {
  let list = [];
  try {
    const { poolid, period, intervals } = params;
    new Validator("getPriceHistory-poolid", poolid).required().string();
    new Validator("getPriceHistory-period", period).required().string();
    new Validator("getPriceHistory-intervals", intervals).required().string();
    let res = (await this.rpcTradeService.apiGetPriceHistory(params)) || [];
    list = res.map((item) => ({
      ...camelCaseKeys(item),
    }));
  } catch (error) {
    throw error;
  }
  return list;
}
async function getPendingOrder(params) {
  let result = {};
  try {
    const { poolid } = params;
    new Validator("getPendingOrder-poolid", poolid).required().string();
    const res =
      (await this.rpcTradeService.apiGetPendingOrder({
        poolid,
      })) || [];
    result = camelCaseKeys(res);
  } catch (error) {
    throw error;
  }
  return result;
}

export default {
  getListPools,
  getListPoolsDetail,
  getListShare,
  getTradingVolume24h,
  getListPair,
  getEstimateTrade,
  getPriceHistory,
  getOrderBook,
  getPendingOrder,
  getShareWithNFTID,
  getShareWithOTAKey,
};
