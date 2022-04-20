import Validator from '@lib/utils/validator';
import { LIMIT_DEFAULT } from '@lib/module/PDexV3/features/Liquidity/liquidity.constant';
import { camelCaseKeys } from '@lib/utils/camelCaseKeys';
import flatten from 'lodash/flatten';
import {PDEX_TRANSACTION_TYPE} from "@lib/module/Account";

async function getContributeHistoryByNFT({ offset = 0, limit = LIMIT_DEFAULT } = {}) {
  new Validator("getContributeHistoryByNFT-offset", offset).number();
  new Validator("getContributeHistoryByNFT-limit", limit).number();
  let histories = []
  try {
    const nftIds = (await this.getNFTTokenIDs()) || [];
    const tasks = nftIds.map(nftId => (
        this.rpcTradeService.apiGetContributeHistories({ offset, limit, nftId })
    ))
    histories = camelCaseKeys(((await Promise.all(tasks)) || []).filter(item => !!item));
    histories = flatten(histories || [])
        .map(item => ({ ...item, versionTx: PDEX_TRANSACTION_TYPE.NFT }));
  } catch (error) {
    histories = [];
    console.log('getContributeHistoryByNFT error: ', error);
  }
  return histories;
}
async function getContributeHistoryByOTAKey({ offset = 0, limit = LIMIT_DEFAULT } = {}) {
  new Validator("getContributeHistoryByOTAKey-offset", offset).number();
  new Validator("getContributeHistoryByOTAKey-limit", limit).number();
  let histories = [];
  const otaKey = this.getOTAKey();
  try {
    histories =
        (await this.rpcTradeService.apiGetContributeHistories({ offset, limit, otaKey })) || [];
    histories = camelCaseKeys(histories).map(item => ({ ...item, versionTx: PDEX_TRANSACTION_TYPE.ACCESS_ID }));;
  } catch (error) {
    histories = [];
    console.log('getContributeHistoryByNFT error: ', error);
  }
  return histories;
}
async function getContributeHistoriesApi() {
  let history = [];
  try {
    const tasks = [
      await this.getContributeHistoryByNFT(),
      await this.getContributeHistoryByOTAKey(),
    ];
    history = await Promise.all(tasks);
    history = flatten(history)
  } catch (error) {
    console.log('getContributeHistoriesApi: ', error);
  }
  return history
}

async function getRemoveLPHistoryByNFT({ offset = 0, limit = LIMIT_DEFAULT } = {}) {
  new Validator("getRemoveLPHistoryByNFT-offset", offset).number();
  new Validator("getRemoveLPHistoryByNFT-limit", limit).number();
  let histories = []
  try {
    const nftIds = (await this.getNFTTokenIDs()) || [];
    const tasks = nftIds.map(async (nftId) => {
      const history = await this.rpcTradeService.apiGetWithdrawContributeHistories({ offset, limit, nftId });
      if (!history) return null
      return history.map(item => ({ ...item, versionTx: PDEX_TRANSACTION_TYPE.NFT, nftId }));
    })
    histories = camelCaseKeys(((await Promise.all(tasks)) || []).filter(item => !!item));
    histories = flatten(histories || []);
  } catch (error) {
    histories = [];
    console.log('getContributeHistoryByNFT error: ', error);
  }
  return histories;
}
async function getRemoveLPHistoryByOTAKey({ offset = 0, limit = LIMIT_DEFAULT } = {}) {
  new Validator("getRemoveLPHistoryByOTAKey-offset", offset).number();
  new Validator("getRemoveLPHistoryByOTAKey-limit", limit).number();
  let histories = [];
  const otaKey = this.getOTAKey();
  try {
    histories =
        (await this.rpcTradeService.apiGetWithdrawContributeHistories({ offset, limit, otaKey })) || [];
    histories = camelCaseKeys(histories).map(item => ({ ...item, versionTx: PDEX_TRANSACTION_TYPE.ACCESS_ID }));;
  } catch (error) {
    histories = [];
    console.log('getContributeHistoryByNFT error: ', error);
  }
  return histories;
}
async function getRemoveLPHistoriesApi({ offset = 0, limit = LIMIT_DEFAULT } = {}) {
  new Validator("getLiquidityRemoveHistoriesApi-offset", offset).number();
  new Validator("getLiquidityRemoveHistoriesApi-limit", limit).number();
  const tasks = [
      await this.getRemoveLPHistoryByNFT(),
      await this.getRemoveLPHistoryByOTAKey(),
  ]
  let histories = flatten((await Promise.all(tasks)) || []).filter(item => !!item);
  histories = camelCaseKeys(histories || []);
  return histories;
}

async function getWithdrawFeeLPHistoryByNFT({ offset = 0, limit = LIMIT_DEFAULT } = {}) {
  new Validator("getWithdrawFeeLPHistoryByNFT-offset", offset).number();
  new Validator("getWithdrawFeeLPHistoryByNFT-limit", limit).number();
  let history = []
  try {
    const nftIds = (await this.getNFTTokenIDs()) || [];
    const tasks = nftIds.map(async (nftId) => {
      const history = await this.rpcTradeService.apiGetWithdrawFeeContributeHistories({ offset, limit, nftId });
      if (!history) return null
      return history.map(item => ({ ...item, versionTx: PDEX_TRANSACTION_TYPE.NFT, nftId }));
    })
    history = camelCaseKeys(((await Promise.all(tasks)) || []).filter(item => !!item));
    history = flatten(history || []);
  } catch (error) {
    history = [];
    console.log('getContributeHistoryByNFT error: ', error);
  }
  return history;
}
async function getWithdrawFeeLPHistoryByOTAKey({ offset = 0, limit = LIMIT_DEFAULT } = {}) {
  new Validator("getWithdrawFeeLPHistoryByOTAKey-offset", offset).number();
  new Validator("getWithdrawFeeLPHistoryByOTAKey-limit", limit).number();
  let histories = [];
  const otaKey = this.getOTAKey();
  try {
    histories =
        (await this.rpcTradeService.apiGetWithdrawFeeContributeHistories({ offset, limit, otaKey })) || [];
    histories = camelCaseKeys(histories).map(item => ({ ...item, versionTx: PDEX_TRANSACTION_TYPE.ACCESS_ID }));;
  } catch (error) {
    histories = [];
    console.log('getContributeHistoryByNFT error: ', error);
  }
  return histories;
}
async function getWithdrawFeeLPHistoriesApi({ offset = 0, limit = LIMIT_DEFAULT } = {}) {
  new Validator("getLiquidityWithdrawFeeHistoriesApi-offset", offset).required().number();
  new Validator("getLiquidityWithdrawFeeHistoriesApi-limit", limit).number();
  const tasks = [
    await this.getWithdrawFeeLPHistoryByNFT(),
    await this.getWithdrawFeeLPHistoryByOTAKey(),
  ]
  return flatten((await Promise.all(tasks)) || []).filter(item => !!item);
}

export default {
  getContributeHistoryByNFT,
  getContributeHistoryByOTAKey,
  getContributeHistoriesApi,

  getRemoveLPHistoryByNFT,
  getRemoveLPHistoryByOTAKey,
  getRemoveLPHistoriesApi,

  getWithdrawFeeLPHistoryByNFT,
  getWithdrawFeeLPHistoryByOTAKey,
  getWithdrawFeeLPHistoriesApi,
};

