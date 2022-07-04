import Validator from '@lib/utils/validator';
import { has, uniqBy } from 'lodash';
import { STORAGE_KEYS } from '@lib/module/Account/features/Liquidity/liquidity';
import { CACHE_KEYS, cachePromise } from '@lib/utils/cache';
import { mergeTokens } from '@lib/module/Account/features/Liquidity/liquidity.utils';

function createPairId ({ tokenID1, symbol1, tokenID2, symbol2 } = {}) {
  new Validator("createPairId-symbol1", symbol1).required().string();
  new Validator("createPairId-symbol2", symbol2).required().string();
  new Validator("createPairId-tokenID1", tokenID1).required().string();
  new Validator("createPairId-tokenID2", tokenID2).required().string();
  const paymentAddress = this.getPaymentAddress();
  const suffixAddress = paymentAddress.substring(paymentAddress.length - 5, paymentAddress.length);
  return `add-${tokenID1}-${symbol1}-${tokenID2}-${symbol2}-${suffixAddress}-${Date.now()}`;
}

function getKeyStoragePairId() {
  return `${STORAGE_KEYS.PAIR_ID}-${this.getPaymentAddress()}`;
}

async function getAllStoragePairIds () {
  try {
    const key = this.getKeyStoragePairId();
    return uniqBy((await this.getAccountStorage(key) || []), 'pairID');
  } catch (e) {
    throw e;
  }
}

async function setStoragePairId({ pairID, txId, tokenID }) {
  new Validator("setStoragePairId-pairID", pairID).required().string();
  new Validator("setStoragePairId-txId", txId).string();
  new Validator("setStoragePairId-tokenID", tokenID).string();

  try {
    const key = this.getKeyStoragePairId();
    let pairTxs = (await this.getAllStoragePairIds()) || [];
    const index = pairTxs.findIndex(pair => pair.pairID === pairID);
    if (index === -1) {
      pairTxs.push({
        pairID,
        txID1: txId,
        createTime1: Date.now(),
        tokenIDs: [tokenID]
      })
    } else {
      const pair = pairTxs[index];
      const txID1 = !!pair.txID1 ? pair.txID1 : txId;
      const txID2 = txID1 !== txId ? txId : '';
      pairTxs[index] = {
        ...pair,
        pairID,
        txID1,
        txID2,
        createTime2: Date.now(),
        tokenIDs: (pair.tokenIDs || []).concat(tokenID)
      }
    }
    await this.setAccountStorage(key, pairTxs);
  } catch (e) {
    throw e;
  }
}

async function getPairs() {
  try {
    const blockchainInfo = await this.rpc.getBlockChainInfo();
    const blockHeight = blockchainInfo?.BestBlocks?.['-1']?.Height;
    const tasks = [
      await cachePromise(CACHE_KEYS.P_TOKEN, this.rpcApiService.apiGetPTokens),
      await cachePromise(CACHE_KEYS.CUSTOM_TOKEN, this.rpcApiService.apiGetCustomTokens),
      await this.rpc.getPDEState(blockHeight),
    ];
    const [pTokens, chainTokens, chainPairs] = await Promise.all(tasks)

    console.log(chainPairs)
    if (!has(chainPairs, 'state')) {
      // throw new CustomError(ErrorCode.FULLNODE_DOWN);
    }
    const paymentAddressV1 = this.getPaymentAddressV1();
    return mergeTokens({ chainTokens, pTokens, chainPairs: chainPairs.state, paymentAddressV1 });
  } catch (e) {
    throw e;
  }
}

function getKeyStorageHistoriesRemovePool() {
  return `${STORAGE_KEYS.STORAGE_HISTORIES_REMOVE_POOL}-${this.getPaymentAddress()}`;
}

async function getStorageHistoriesRemovePool() {
  const key = this.getKeyStorageHistoriesRemovePool();
  const result = (await this.getAccountStorage(key)) || []
  return result
}

/**
 *
 * @param {amount} amount1
 * @param {amount} amount2
 * @param {string} tokenID
 * @param {string} requestTx
 * @param {number} status
 * @param {string} tokenId1
 * @param {string} tokenId2
 * @param {number} lockTime
 */
async function setStorageHistoriesRemovePool({
  amount1,
  amount2,
  requestTx,
  status,
  tokenId1,
  tokenId2,
  lockTime
}) {
  new Validator('amount1', amount1).required().amount();
  new Validator('amount2', amount2).required().amount();
  new Validator('requestTx', requestTx).required().string();
  new Validator('tokenId1', tokenId1).required().string();
  new Validator('tokenId2', tokenId2).required().string();
  new Validator('lockTime', lockTime).required().number();
  new Validator('status', status).required();

  const key = this.getKeyStorageHistoriesRemovePool();
  const histories = (await this.getStorageHistoriesRemovePool()) || [];
  const isExist = histories.some(history => requestTx === history?.requestTx)
  if (!isExist) {
    const params = { amount1, amount2, requestTx, status, tokenId1, tokenId2, lockTime };
    histories.push(params)
  }
  await this.setAccountStorage(key, histories)
}

export default {
  createPairId,
  getKeyStoragePairId,
  getAllStoragePairIds,
  setStoragePairId,
  getPairs,
  getKeyStorageHistoriesRemovePool,
  getStorageHistoriesRemovePool,
  setStorageHistoriesRemovePool,
};
