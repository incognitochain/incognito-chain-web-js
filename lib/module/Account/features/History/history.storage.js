import uniqBy from "lodash/uniqBy";
import flatten from "lodash/flatten";
import orderBy from "lodash/orderBy";
import Validator from "@lib/utils/validator";
import { TX_TYPE, TX_TYPE_STR } from "@lib/module/Account/account.constants";

const UNSHIELD_EVM_KEY = "NEW_UNSHIELD_EVM_HISTORY_FLOW";
const UNSHIELD_TXS_NUMBER_MAX = 20;

function getUnShieldEVMHistoryStorageKey() {
  const otaKey = this.getOTAKey();
  return `${UNSHIELD_EVM_KEY}-${otaKey}`;
}

async function getUnShieldEVMHistoryTxList() {
  const key = this.getUnShieldEVMHistoryStorageKey();
  const txListJSON = await this.storage.getItem(key);
  const txList = JSON.parse(txListJSON)
  if (!txList) return [];
  return uniqBy(txList, "txHash") || [];
}

async function saveTxUnShieldEVMToStorage(newTx) {
  new Validator("setUnShieldEVMHistory-newTx", newTx).required();
  const key = this.getUnShieldEVMHistoryStorageKey();
  let txList = (await this.getUnShieldEVMHistoryTxList()) || [];

  txList = txList.filter((tx) => tx.txHash !== newTx.txHash);
  txList.push({
    ...newTx,
    time: new Date().getTime(),
    txType: TX_TYPE.UNSHIELD,
    txTypeStr: TX_TYPE_STR[TX_TYPE.UNSHIELD],
  });
  txList = uniqBy(txList, "txHash");
  await this.storage.setItem(key, JSON.stringify(txList) || []);
}

async function getUnshiledEVMHistoryFromStorage() {
  let txList = (await this.getUnShieldEVMHistoryTxList()) || [];
  try {
    txList = orderBy(flatten(txList) || [], "time", "desc").slice(0, UNSHIELD_TXS_NUMBER_MAX);
  } catch (e) {
    throw e;
  }
  const txsApi =
    (await this.webAppService.getUnshieldEVMTxListStatus({
      txIDs: txList.map(({ txHash }) => txHash),
    })) || {};

  const history = this.combineUnshieldTxs({ txsStorage: txList, txsApi }) || [];

  return uniqBy(history, "txHash");
}

export default {
  getUnShieldEVMHistoryStorageKey,
  getUnshiledEVMHistoryFromStorage,
  getUnShieldEVMHistoryTxList,
  saveTxUnShieldEVMToStorage
};
