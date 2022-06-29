import { ACCOUNT_CONSTANT } from "@lib/wallet";
import Validator from "@lib/utils/validator";
import flatten from "lodash/flatten";
import isArray from "lodash/isArray";
import { camelCaseKeys } from "@lib/utils/camelCaseKeys";
import camelCase from "lodash/camelCase";

function getKeyStorageWithdrawOrderTxs(params) {
  const { poolid } = params;
  new Validator("getWithdrawOrderTxs-poolid", poolid).required().string();
  const otakey = this.getOTAKey();
  return `WITHDRAW-ORDER-${otakey}-${poolid}`;
}

async function clearWithdrawOrderTxs(params) {
  const { poolid } = params;
  new Validator("getWithdrawOrderTxs-poolid", poolid).required().string();
  const key = this.getKeyStorageWithdrawOrderTxs(params);
  await this.clearStorage(key);
}

async function setWithdrawOrderTx(params) {
  try {
    const { poolid, txWithdraw } = params;
    const { withdrawTxId, requestTx, status = -1 } = txWithdraw || {};
    new Validator("setWithdrawOrderTx-poolid", poolid).required().string();
    new Validator("setWithdrawOrderTx-withdrawTxId", withdrawTxId)
      .required()
      .string();
    new Validator("setWithdrawOrderTx-requestTx", requestTx)
      .required()
      .string();
    new Validator("setWithdrawOrderTx-status", status).required().number();
    const key = this.getKeyStorageWithdrawOrderTxs({ poolid });
    const oldList =
      (await this.getWithdrawOrderTxs({ poolIds: [poolid] })) || [];
    const isExisted =
      oldList.findIndex((tx) => tx?.requestTx === requestTx) > -1;
    if (!isExisted) {
      let newList = [txWithdraw, ...oldList];
      await this.setStorage(key, newList);
    }
  } catch (error) {
    console.log("setWithdrawOrderTx-error", error);
    throw error;
  }
}

async function setWithdrawOrderTxs(params) {
  try {
    const { poolid, withdrawTxs } = params;
    new Validator("setWithdrawOrderTxs-poolid", poolid).required().string();
    new Validator("setWithdrawOrderTxs-withdrawTxs", withdrawTxs)
      .required()
      .array();
    const key = this.getKeyStorageWithdrawOrderTxs({ poolid });
    await this.setStorage(key, withdrawTxs);
  } catch (error) {
    throw error;
  }
}

async function getWithdrawOrderTxs(params) {
  let result = [];
  try {
    const { poolIds } = params;
    new Validator("getWithdrawOrderTxs-poolIds", poolIds).required().array();
    let bigTasks = poolIds.map(async (poolid) => {
      let withdrawTxs = [];
      try {
        const key = this.getKeyStorageWithdrawOrderTxs({ poolid });
        withdrawTxs = (await this.getStorage(key)) || [];
        const task = withdrawTxs.map((tx) => {
          const { withdrawTxId: txId, status } = tx;
          return [
            ACCOUNT_CONSTANT.TX_STATUS.PROCESSING,
            ACCOUNT_CONSTANT.TX_STATUS.TXSTATUS_PENDING,
          ].includes(status)
            ? this.rpcTxService.apiGetTxStatus({ txId })
            : status;
        });
        const implTask = await Promise.all(task);
        withdrawTxs = withdrawTxs
          .map((tx, index) => ({
            ...tx,
            status: implTask[index],
          }))
          .filter((tx) => {
            const { status } = tx;
            return ![
              ACCOUNT_CONSTANT.TX_STATUS.TXSTATUS_FAILED,
              ACCOUNT_CONSTANT.TX_STATUS.TXSTATUS_CANCELED,
            ].includes(status);
          });
        const taskRejected = await Promise.all(
          withdrawTxs.map(async (withdrawTx) => {
            let isRejected = false;
            let isCompleted = false;
            try {
              const { requestTx, withdrawTxId } = withdrawTx;
              let result = await this.rpcTradeService.apiGetTradeDetail({
                txhash: requestTx,
              });
              if (isArray(result)) {
                result = result[0];
                result = camelCaseKeys(result);
                const { withdrawTxs } = result;
                let data = withdrawTxs[camelCase(withdrawTxId)] || {};
                isRejected = !!data?.isRejected;
                isCompleted = !!result?.isCompleted;
              }
            } catch (error) {
              console.log("check rejected tx error", error);
            }
            return {
              ...withdrawTx,
              isRejected,
              isCompleted,
            };
          })
        );
        withdrawTxs = flatten(taskRejected);
        withdrawTxs = withdrawTxs.filter(
          (withdrawTx) =>
            !!withdrawTx?.withdrawTxId &&
            !withdrawTx?.isRejected &&
            !withdrawTx?.isCompleted
        );
        await this.setWithdrawOrderTxs({
          poolid,
          withdrawTxs,
        });
      } catch (error) {
        console.log("withdrawTxs-error", poolid, error);
      }
      return withdrawTxs;
    });
    bigTasks = await Promise.all(bigTasks);
    result = flatten(bigTasks);
    result = result.filter((result) => !!result);
  } catch (error) {
    console.log("getWithdrawOrderTxs-error", error);
    throw error;
  }
  return result;
}

export default {
  getKeyStorageWithdrawOrderTxs,
  setWithdrawOrderTx,
  setWithdrawOrderTxs,
  getWithdrawOrderTxs,
  clearWithdrawOrderTxs,
};
