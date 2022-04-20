import { PRVIDSTR } from "@lib/core";
import Validator from "@lib/utils/validator";
import bn from "bn.js";
import { isJsonString } from "@lib/utils/json";
import endsWith from "lodash/endsWith";
import {
  META_TYPE,
  TX_STATUS,
  TX_STATUS_STR,
} from "@lib/module/Account/account.constants";
import { PrivacyVersion } from "@lib/core/constants";
import cloneDeep from "lodash/cloneDeep";

const TX_HISTORY = "TX_HISTORY";

function getNormalTxHistory() {
  return this.txHistory.NormalTx;
}

function getPrivacyTokenTxHistory() {
  return this.txHistory.PrivacyTokenTx;
}

function getPrivacyTokenTxHistoryByTokenID(id) {
  const queryResult = new Array();
  for (let i = 0; i < this.txHistory.PrivacyTokenTx.length; i++) {
    if (this.txHistory.PrivacyTokenTx[i].tokenID === id) {
      queryResult.push(this.txHistory.PrivacyTokenTx[i]);
    }
  }
  return queryResult;
}

function getKeyTxHistoryByTokenId(params) {
  try {
    const { tokenID, version } = params;
    new Validator("getKeyTxHistoryByTokenId-tokenID", tokenID)
      .required()
      .string();
    new Validator("getKeyTxHistoryByTokenId-version", version)
      .required()
      .number();
    const keyByTokenId = this.getKeyStorageByTokenId(params);
    const key = `${TX_HISTORY}-${keyByTokenId}`;
    return key;
  } catch (error) {
    console.log("getKeyTxHistoryByTokenId FAILED", error);
    throw error;
  }
}

function deleteUnnecessaryStorageTxKey({ tx, tokenID }) {
  new Validator("deleteUnnecessaryStorageTxKey-tokenID", tokenID)
    .required()
    .string();
  new Validator("deleteUnnecessaryStorageTxKey-tx", tx).required().object();
  const keysDelete = ["Proof", "Sig"];
  const isToken = tokenID !== PRVIDSTR;
  delete tx?.tx["Encoded"];
  if (isToken) {
    keysDelete.forEach((key) => {
      const _tx = tx?.tx;
      if (_tx?.TxTokenPrivacyData) {
        delete _tx?.TxTokenPrivacyData[key];
      }
      delete _tx?.Tx[key];
    });
  } else {
    keysDelete.forEach((key) => {
      delete tx?.tx[key];
    });
  }
  return tx;
}

async function saveTxHistory(params) {
  try {
    const { tx: _tx, version, tokenID: _tokenID } = params || {};
    let tokenID = _tx?.tokenID || _tokenID;
    new Validator("saveTxHistory-tx", _tx).required().object();
    new Validator("saveTxHistory-tokenID", tokenID).required().string();
    new Validator("saveTxHistory-version", version).required().number();
    const key = this.getKeyTxHistoryByTokenId({ tokenID, version });
    const txs = (await this.getAccountStorage(key)) || [];
    const txIndex = txs.findIndex((i) => i?.txId === _tx?.txId);
    let newTxs = [];
    if (txIndex >= 0) {
      // tx existed
      let tx = txs[txIndex];
      tx = this.deleteUnnecessaryStorageTxKey({ tokenID, tx });
      newTxs = [...txs].map((i) =>
        i.txId === tx.txId
          ? { ...tx, status: _tx?.status, updatedAt: new Date().getTime() }
          : i
      );
    } else {
      const tx = this.deleteUnnecessaryStorageTxKey({ tokenID, tx: _tx });
      newTxs = [{ ...tx, createdAt: new Date().getTime() }, ...txs];
    }
    await this.setAccountStorage(key, cloneDeep(newTxs));
  } catch (error) {
    console.log("saveTxHistory FAILED", error);
    throw error;
  }
}

async function getTxHistoryByTxID(params) {
  let tx;
  try {
    const { tokenID, txId, version } = params;
    new Validator("getTxHistoryByTxID-tokenID", tokenID).required().string();
    new Validator("getTxHistoryByTxID-txId", txId).required().string();
    new Validator("getTxHistoryByTxID-version", version).required().number();
    const key = this.getKeyTxHistoryByTokenId(params);
    const txs = (await this.getAccountStorage(key)) || [];
    tx = txs.find((t) => t?.txId === txId);
    if (tx) {
      try {
        const status = await this.rpcTxService.apiGetTxStatus({ txId });
        if (Number.isFinite(status) && status >= 0) {
          tx = { ...tx, status };
          const params = {
            tx,
            version,
            tokenID,
          };
          await this.saveTxHistory(params);
        }
      } catch {
        console.log("GET TX HISTORY BY TXID FAILED", tx?.txId);
      }
      const result = this.mappingTxsTransactorFromStorage({ tokenID, tx });
      return result;
    }
  } catch (error) {
    console.log("getTxHistoryByTxID FAILED", error);
    throw error;
  }
}

async function getTransactorHistoriesByTokenID(params) {
  let txs = [];
  try {
    const { version, tokenID } = params;
    new Validator("getTransactorHistoriesByTokenID-tokenID", tokenID)
      .required()
      .string();
    new Validator("getTransactorHistoriesByTokenID-version", version)
      .required()
      .number();
    const key = this.getKeyTxHistoryByTokenId(params);
    txs = ((await this.getAccountStorage(key)) || []).map((history) => {
      const { tokenID, tokenId, tx } = history;
      const _tokenID = tokenId || tokenID;
      let lockTime;
      if (_tokenID === PRVIDSTR) {
        lockTime = tx?.LockTime;
      } else {
        lockTime = tx?.Tx.LockTime;
      }
      return {
        ...history,
        tokenID: _tokenID,
        tokenId: _tokenID,
        lockTime,
      };
    });
  } catch (error) {
    throw error;
  }
  return txs;
}

/** ==================================================
 * Get txs history include transactor + receiver
 */

function mappingTxDetail({ tx, tokenID } = {}) {
  try {
    new Validator("tx", tx).object();
    new Validator("tokenID", tokenID).required().string();
    if (!tx) {
      return {};
    }
    const isPRV = tokenID === PRVIDSTR;
    const { LockTime, Fee, Metadata, Hash, Info, Type, ...rest } = tx || {};
    const metadata = isJsonString(Metadata) ? JSON.parse(Metadata) : {};
    const metaType = metadata?.Type;
    let TypeStr = "";
    if (isPRV) {
      switch (Type) {
        case "cv":
          TypeStr = "Convert PRV";
          break;
        case "n":
        case "s":
        case "rs":
          TypeStr = META_TYPE[metaType] || "";
          break;
        default:
          TypeStr = "Skip";
          break;
      }
    } else {
      switch (Type) {
        case "tcv":
          TypeStr = "Convert Token";
          break;
        case "tp":
          TypeStr = META_TYPE[metaType] || "";
          break;
        default:
          TypeStr = "Skip";
          break;
      }
    }
    const result = {
      ...rest,
      LockTime,
      Fee,
      Metadata,
      Info,
      TxHash: Hash,
      Type, // n: prv , tp: token, tcv: convert token, cv: convert prv
      TypeStr,
      Metatype: metaType,
    };
    return result;
  } catch (error) {
    throw error;
  }
}

function mappingTxs({ txs }) {
  try {
    if (!txs || txs.length === 0) {
      return [];
    }
    new Validator("txs", txs).required().array();
    const result = txs
      .filter((tx) => tx?.TypeStr !== "Skip")
      .map((tx) =>
        tx?.TypeStr !== "" ? { ...tx, TxTypeStr: tx?.TypeStr } : tx
      )
      .map(
        ({
          Fee,
          LockTime,
          Amount,
          TxHash,
          TxType,
          TxTypeStr,
          Info,
          ReceiverAddress = "",
          Metadata,
          SenderSeal = "",
        }) => ({
          time: new Date(
            !endsWith(LockTime, "Z") ? `${LockTime}Z` : LockTime
          ).getTime(),
          fee: Fee,
          amount: Amount,
          txId: TxHash,
          txType: TxType,
          txTypeStr: TxTypeStr,
          memo: Info,
          status: TX_STATUS.TXSTATUS_SUCCESS,
          statusStr: TX_STATUS_STR[TX_STATUS.TXSTATUS_SUCCESS],
          receiverAddress: ReceiverAddress,
          metaData: Metadata,
          senderSeal: SenderSeal,
        })
      );
    return result;
  } catch (error) {
    throw error;
  }
}

function mappingSetKeys(setKeys) {
  new Validator("setKeys", setKeys).required().array();
  let keys = [];
  try {
    if (setKeys.length === 0) {
      return keys;
    }
    setKeys
      .filter((tx) => !!tx?.TxHash)
      .forEach((tx) => {
        const { TxHash, Value } = tx || {};
        const indexTx = keys.findIndex((tx) => tx?.TxHash === TxHash);
        if (indexTx === -1) {
          keys.push({ ...tx, Amount: new bn(Value).toString() });
        } else {
          const foundTx = keys[indexTx];
          keys[indexTx].Amount = new bn(foundTx.Amount)
            .add(new bn(Value))
            .toString();
        }
      });
  } catch (error) {
    throw error;
  }
  return keys;
}

async function getSetKeysStorage({ key }) {
  try {
    new Validator("key", key).required().string();
    return (await this.getAccountStorage(key)) || [];
  } catch (error) {
    throw error;
  }
}

async function setSetKeysStorage({ tokenID, setKeys, key }) {
  try {
    new Validator("tokenID", tokenID).required().string();
    new Validator("key", key).required().string();
    new Validator("setKeys", setKeys).required().array();
    const oldSetKeys = await this.getSetKeysStorage({ tokenID, key });
    const value =
      oldSetKeys.length === 0 ? setKeys : [...setKeys, ...oldSetKeys];
    return this.setAccountStorage(key, value);
  } catch (error) {
    throw error;
  }
}

async function clearTxsHistory(params) {
  try {
    const { tokenID, version } = params;
    new Validator("clearTxsHistory-tokenID", tokenID).required().string();
    new Validator("clearTxsHistory-version", version).required().number();
    switch (version) {
      case PrivacyVersion.ver1: {
        break;
      }
      case PrivacyVersion.ver2: {
        const keySetKeysImage = this.getKeySetKeysImageStorage(params);
        const keySetKeysPublic = this.getKeySetPublickKeysStorage(params);
        let task = [
          this.clearAccountStorage(keySetKeysImage),
          this.clearAccountStorage(keySetKeysPublic),
        ];
        await Promise.all(task);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    throw error;
  }
}

async function handleMeasureGetTxsHistory(params) {
  let result = {
    txsTransactor: [],
    txsReceiver: [],
    txsPToken: [],
    txsPortal: [],
  };
  try {
    const { tokenID, isPToken = false, version } = params;
    new Validator("getTxsHistory-tokenID", tokenID).required().string();
    new Validator("getTxsHistory-isPToken", isPToken).boolean().required();
    new Validator("getTxsHistory-version", version).required().number();
    switch (version) {
      case PrivacyVersion.ver1: {
        try {
          await this.getUnspentCoinsByTokenIdV1(params);
          let task = [
            this.measureAsyncFn(
              this.getSetKeyImages,
              "txsHistory.setKeyImages",
              params
            ), //
            this.measureAsyncFn(
              this.getSetKeySNDs,
              "txsHistory.setKeySNDs",
              params
            ), //
          ];
          if (isPToken) {
            // task.push(
            //   this.measureAsyncFn(
            //     this.getPTokenHistoryByTokenID,
            //     "txsHistory.txsPToken",
            //     params
            //   )
            // );
          }
          let [setKeyImages, setSNDs, txsPToken = []] = await Promise.all(task);
          // console.log("setKeyImages", setKeyImages);
          // console.log("setSNDs", setSNDs);
          let keyImages = this.mappingSetKeys(setKeyImages);
          let publicKeys = this.mappingSetKeys(setSNDs);
          let txsTransactor = await this.measureAsyncFn(
            this.getTxsTransactor,
            "txsHistory.txsTransactor",
            {
              keyImages,
              publicKeys,
              tokenID,
              version,
            }
          );
          let txsReceiver = this.getTxsReceiver({
            keyImages,
            publicKeys,
            tokenID,
          });
          console.log("txsPToken", txsPToken.length);
          if (txsPToken.length > 0) {
            txsPToken =
              this.handleMappingTxsPTokenByTxsTransactorAndTxsReceiver({
                txsPToken,
                txsTransactor,
                txsReceiver,
              });
            console.log(
              "txsPToken after mapping by txsTransactor",
              txsPToken.length
            );
          }
          console.log("txsReceiver", txsReceiver.length);
          if (txsReceiver.length > 0) {
            txsReceiver = this.handleFilterTxsReceiverByTxsPToken({
              txsReceiver,
              txsPToken,
            });
            console.log(
              "txsReceiver after filter by txsPToken",
              txsReceiver.length
            );
          }
          console.log("txsTransactor", txsTransactor.length);
          if (txsTransactor.length > 0) {
            txsTransactor = this.handleFilterTxsTransactorByTxsPToken({
              txsPToken,
              txsTransactor,
            });
            console.log(
              "txsTransactor after filter by txsPToken",
              txsTransactor.length
            );
          }
          if (txsReceiver.length > 0 && txsTransactor.length > 0) {
            txsTransactor = this.handleFilterTxsTransactorByTxsReceiver({
              txsTransactor,
              txsReceiver,
            });
          }
          result.txsTransactor = txsTransactor || [];
          result.txsReceiver = txsReceiver || [];
          result.txsPToken = txsPToken || [];
        } catch (error) {
          console.log("ERROR getTxsHistory", error);
          await this.clearTxsHistory(params);
        }
        return result;
      }
      case PrivacyVersion.ver2: {
        try {
          await this.getOutputCoins(params);
          let task = [
            this.measureAsyncFn(
              this.getSetKeyImages,
              "txsHistory.setKeyImages",
              params
            ), //
            this.measureAsyncFn(
              this.getSetPublicKeys,
              "txsHistory.setPublicKeys",
              params
            ), //
          ];
          if (isPToken) {
            task.push(
              this.measureAsyncFn(
                this.getPTokenHistoryByTokenID,
                "txsHistory.txsPToken",
                params
              ),
              this.handleCheckIsPortalToken({ tokenID })
            );
          }
          let [
            setKeyImages,
            setPublicKeys,
            txsPToken = [],
            isPortalToken = false,
          ] = await Promise.all(task);
          console.log("setKeyImages", setKeyImages.length);
          console.log("setPublicKeys", setPublicKeys.length);
          let keyImages = this.mappingSetKeys(setKeyImages);
          let publicKeys = this.mappingSetKeys(setPublicKeys);
          let txsTransactor = await this.measureAsyncFn(
            this.getTxsTransactor,
            "txsHistory.txsTransactor",
            {
              keyImages,
              publicKeys,
              tokenID,
              version,
            }
          );
          let txsReceiver = this.getTxsReceiver({
            keyImages,
            publicKeys,
            tokenID,
          });
          console.log("txsPToken", txsPToken.length);
          if (txsPToken.length > 0) {
            txsPToken =
              this.handleMappingTxsPTokenByTxsTransactorAndTxsReceiver({
                txsPToken,
                txsTransactor,
                txsReceiver,
              });
            console.log(
              "txsPToken after mapping by txsTransactor",
              txsPToken.length
            );
          }
          console.log("txsReceiver", txsReceiver.length);
          if (txsReceiver.length > 0) {
            txsReceiver = this.handleFilterTxsReceiverByTxsPToken({
              txsReceiver,
              txsPToken,
            });
            console.log(
              "txsReceiver after filter by txsPToken",
              txsReceiver.length
            );
          }
          console.log("txsTransactor", txsTransactor.length);
          if (txsTransactor.length > 0) {
            txsTransactor = this.handleFilterTxsTransactorByTxsPToken({
              txsPToken,
              txsTransactor,
            });
            console.log(
              "txsTransactor after filter by txsPToken",
              txsTransactor.length
            );
          }
          if (txsReceiver.length > 0 && txsTransactor.length > 0) {
            txsTransactor = this.handleFilterTxsTransactorByTxsReceiver({
              txsTransactor,
              txsReceiver,
            });
          }

          // filter portal txs
          let txsPortal = [];
          if (isPortalToken) {
            const portalFilters = await this.getTxsPortal(
              params,
              txsReceiver,
              txsTransactor
            );

            txsPortal = portalFilters.txsPortal;
            txsReceiver = portalFilters.txsReceiver;
            txsTransactor = portalFilters.txsTransactor;
          }

          console.log("========== Get history after mapping ==========");
          console.log("txsTransactor: ", txsTransactor.length);
          console.log("txsReceiver: ", txsReceiver.length);
          console.log("txsPToken: ", txsPToken.length);
          console.log("txsPortal: ", txsPortal.length);
          // console.log("txsPortal: ", txsPortal);
          // console.log("txsReceiver: ", txsReceiver);

          result.txsTransactor = txsTransactor || [];
          result.txsReceiver = txsReceiver || [];
          result.txsPToken = txsPToken || [];
          result.txsPortal = txsPortal || [];
        } catch (error) {
          console.log("ERROR getTxsHistory", error);
          await this.clearTxsHistory(params);
        }
        return result;
      }
      default:
        break;
    }
  } catch (error) {
    throw error;
  }
  return result;
}

async function getTxsHistory(params) {
  try {
    const result = await this.measureAsyncFn(
      this.handleMeasureGetTxsHistory,
      "txsHistory.totalTime",
      params
    );
    await this.setCoinsStorage({ value: this.coinsStorage, ...params });
    return result;
  } catch (error) {
    throw error;
  }
}

function getKeySetKeysStorageByTokenId(params) {
  try {
    const { tokenID, prefixName, version } = params;
    new Validator("getKeySetKeysStorageByTokenId-tokenID", tokenID)
      .required()
      .string();
    new Validator("getKeySetKeysStorageByTokenId-prefixName", prefixName)
      .required()
      .string();
    new Validator("getKeySetKeysStorageByTokenId-version", version)
      .required()
      .number();
    const keyByTokenId = this.getKeyStorageByTokenId(params);
    const key = `${prefixName}-${keyByTokenId}`;
    return key;
  } catch (error) {
    console.log("getKeySetKeysStorageByTokenId FAILED", error);
    throw error;
  }
}

export default {
  getNormalTxHistory,
  getPrivacyTokenTxHistory,
  saveTxHistory,
  getTxsHistory,
  getKeyTxHistoryByTokenId,
  getTxHistoryByTxID,
  getTransactorHistoriesByTokenID,
  mappingTxs,
  mappingTxDetail,
  setSetKeysStorage,
  getSetKeysStorage,
  mappingSetKeys,
  clearTxsHistory,
  getPrivacyTokenTxHistoryByTokenID,
  handleMeasureGetTxsHistory,
  getKeySetKeysStorageByTokenId,
  deleteUnnecessaryStorageTxKey,
};
