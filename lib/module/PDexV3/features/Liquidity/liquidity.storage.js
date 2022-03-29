import Validator from '@lib/utils/validator';
import { STORAGE_KEYS } from '@lib/module/PDexV3/features/Liquidity/liquidity.constant';
import { TX_STATUS } from '@lib/wallet';
import uniq from "lodash/uniq";
import uniqBy from 'lodash/uniqBy';

function createPairId ({ tokenID1, symbol1, tokenID2, symbol2 } = {}) {
  const address = this.getPaymentKey()
  new Validator("createPairId-symbol1", symbol1).required().string();
  new Validator("createPairId-symbol2", symbol2).required().string();
  new Validator("createPairId-tokenID1", tokenID1).required().string();
  new Validator("createPairId-tokenID2", tokenID2).required().string();
  new Validator("createPairId-address", address).required().string();
  const suffixAddress = address.substring(address.length - 5, address.length);
  return `add-${tokenID1}-${symbol1}-${tokenID2}-${symbol2}-${suffixAddress}-${Date.now()}`;
}

function getKeyStoragePairId () {
  const address = this.getPaymentKey()
  new Validator("getKeyStoragePairId-address", address).required().string();
  return `${STORAGE_KEYS.PAIR_ID}-${address}`;
}

async function getAllStoragePairIds () {
  try {
    const key = this.getKeyStoragePairId();
    return uniqBy((await this.getStorage(key) || []), 'pairID');
  } catch (e) {
    throw e;
  }
}

async function setStoragePairId ({ pairID, txId, tokenID }) {
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
    await this.setStorage(key, pairTxs);
  } catch (e) {
    throw e;
  }
}

function getKeyStorageHistoriesRemoveLP() {
  const address = this.getPaymentKey()
  return `${STORAGE_KEYS.STORAGE_HISTORIES_REMOVE_POOL}-${address}`;
}

async function getStorageHistoriesRemoveLP() {
  const key = this.getKeyStorageHistoriesRemoveLP();
  return (await this.getStorage(key)) || []
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
 * @param {number} type
 */
async function setStorageHistoriesWithdrawLP({
  amount1,
  amount2,
  requestTx,
  status,
  tokenId1,
  tokenId2,
  lockTime,
  type,
  poolId,
  nftId,
}) {
  new Validator('setStorageHistoriesRemovePool-amount1', amount1).required().amount();
  new Validator('setStorageHistoriesRemovePool-amount2', amount2).required().amount();
  new Validator('setStorageHistoriesRemovePool-requestTx', requestTx).required().string();
  new Validator('setStorageHistoriesRemovePool-tokenId1', tokenId1).string();
  new Validator('setStorageHistoriesRemovePool-tokenId2', tokenId2).string();
  new Validator('setStorageHistoriesRemovePool-lockTime', lockTime).required().number();
  new Validator('setStorageHistoriesRemovePool-status', status).required();
  new Validator('setStorageHistoriesRemovePool-type', type).required().number();
  new Validator('setStorageHistoriesRemovePool-poolId', poolId).required().string();
  // nftId will be deprecated
  if (nftId) new Validator('setStorageHistoriesRemovePool-nftId', nftId).required().string();

  const key = this.getKeyStorageHistoriesRemoveLP();
  const histories = (await this.getStorageHistoriesRemoveLP()) || [];
  const isExist = histories.some(history => requestTx === history?.requestTx)
  if (!isExist) {
    const params = {
      amount1,
      amount2,
      requestTx,
      status,
      tokenId1,
      tokenId2, requestTime: lockTime,
      type,
      poolId,
      nftId
    };
    histories.push(params)
  }
  await this.setStorage(key, histories)
}

function getKeyWithdrawLPWithPool({ poolId, nftId }) {
  new Validator('getKeyWithdrawLPWithPool-poolId', poolId).required().string();
  new Validator('getKeyWithdrawLPWithPool-nftId', nftId).required().string();
  return `${poolId}-${nftId}`;
}

function getKeyStoragePairHash() {
  const address = this.account.getPaymentAddress();
  return `${STORAGE_KEYS.PAIR_HASH}-${address}`;
}

async function getStoragePairHash() {
  const key = this.getKeyStoragePairHash();
  return this.getStorage(key);
}

async function setStoragePairHash(params) {
  const { pairHash, tokenIds } = params;
  new Validator('setStoragePairHash-pairHash', pairHash).required().string();
  new Validator('setStoragePairHash-tokenIds', tokenIds).required().array();
  const key = this.getKeyStoragePairHash();
  const storageData = (await this.getStoragePairHash()) || [];
  storageData.push(params);
  const uniqPairHashs = uniqBy(storageData, item => item.pairHash)
  await this.setStorage(key, uniqPairHashs);
}

export default {
  createPairId,
  getKeyStoragePairId,
  getAllStoragePairIds,
  setStoragePairId,
  getKeyWithdrawLPWithPool,

  getKeyStoragePairHash,
  getStoragePairHash,
  setStoragePairHash,

  getKeyStorageHistoriesRemoveLP,
  getStorageHistoriesRemoveLP,
  setStorageHistoriesWithdrawLP,
};
