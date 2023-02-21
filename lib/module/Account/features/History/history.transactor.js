import bn from "bn.js";
import Validator from "@lib/utils/validator";
import intersectionBy from "lodash/intersectionBy";
import differenceBy from "lodash/differenceBy";
import difference from "lodash/difference";
import {
  TX_STATUS,
  TX_STATUS_STR,
  TX_TYPE,
  TX_TYPE_STR,
} from "@lib/module/Account/account.constants";
import { CustomError, ErrorObject } from "@lib/common/errorhandler";
import { PRVIDSTR } from "@lib/core";
import isEqual from "lodash/isEqual";
import uniq from "lodash/uniq";
import { PrivacyVersion } from "@lib/core/constants";

const SET_KEY_IMAGES = "SET_KEY_IMAGES";

function mappingTxsTransactorFromStorage({ tokenID, tx, version }) {
  new Validator("mappingTxsTransactorFromStorage-tokenID", tokenID)
    .required()
    .string();
  new Validator("mappingTxsTransactorFromStorage-tx", tx).required().object();

  console.log("[SDK] mappingTxsTransactorFromStorage 111 ", tx)
  try {
    const {
      txId,
      amount,
      status,
      txType,
      tx: txDetail,
      fee,
      receivers,
      tokenReceivers,
      memo,
      tokenAmount,
      tokenID: txTokenID,
      senderSeal,
      metadata,
      versionTx, // AccessID, NFT -> support PDEX3
    } = tx || {};
    const isMainCrypto = tokenID === PRVIDSTR;
    const _tx = isMainCrypto ? txDetail : txDetail?.Tx;
    const statusStr = TX_STATUS_STR[status];
    const txTypeStr = TX_TYPE_STR[txType];
    const time = _tx?.LockTime * 1000;
    const receiverAddress = isMainCrypto ? receivers[0] : tokenReceivers[0];
    const receiverAddressList = isMainCrypto ? receivers : tokenReceivers;
    const _amount = isMainCrypto ? amount : tokenAmount;
    const result = {
      txId,
      amount: _amount,
      status,
      statusStr,
      txType,
      txTypeStr,
      time,
      fee,
      receiverAddress,
      receiverAddressList,
      memo,
      tokenID: txTokenID || tokenID,
      senderSeal,
      metadata,
      versionTx,
    };
    console.log("[SDK] mappingTxsTransactorFromStorage 222 ", result)
    return result;
  } catch (error) {
    throw error;
  }
}

function getKeySetKeysImageStorage(params) {
  try {
    const { tokenID, version } = params;
    new Validator("getKeySetKeysImageStorage-tokenID", tokenID)
      .required()
      .string();
    new Validator("getKeySetKeysImageStorage-version", version)
      .required()
      .number();
    return this.getKeySetKeysStorageByTokenId({
      tokenID,
      prefixName: SET_KEY_IMAGES,
      version,
    });
  } catch (error) {
    throw error;
  }
}

async function getSetKeyImages(params) {
  let key;
  try {
    const { tokenID, version } = params;
    new Validator("getSetKeyImages-tokenID", tokenID).required().string();
    new Validator("getSetKeyImages-version", version).required().number();
    key = this.getKeySetKeysImageStorage(params); //
    const oldSetKeyImages = await this.getSetKeysStorage({ key }); //
    const spentCoins = await this.getListSpentCoinsStorage(params);
    if (spentCoins.length === 0) {
      return oldSetKeyImages;
    }
    const oldKeyImages = oldSetKeyImages.map((i) => i?.KeyImage);
    const spentCoinsKeyImages = spentCoins.map((coin) => coin?.KeyImage);
    const keyImages = difference(spentCoinsKeyImages, oldKeyImages);
    if (keyImages.length === 0) {
      return oldSetKeyImages;
    }
    const shardID = this.getShardID();
    let txs = await this.rpcCoinService.apiGetTxsBySender({
      shardID,
      keyImages,
    }); //
    if (txs.length !== keyImages.length) {
      throw new CustomError(
        ErrorObject.GetTxsByKeyImagesFail,
        ErrorObject.GetTxsByKeyImagesFail.description
      );
    }
    if (txs.length === 0) {
      return oldSetKeyImages;
    }
    const setKeyImages = txs
      .map((tx) => tx?.TxDetail)
      .map((tx, index) => {
        const KeyImage = keyImages[index];
        const foundCoin = spentCoins.find((coin) => coin.KeyImage === KeyImage);
        const Value = foundCoin?.Value || 0;
        return {
          ...this.mappingTxDetail({ tx, tokenID }),
          KeyImage,
          Value,
        };
      });
    console.log("setKeyImages", setKeyImages.length);
    await this.setSetKeysStorage({ tokenID, setKeys: setKeyImages, key });
  } catch (error) {
    console.log("getSetKeyImages error", error);
    throw error;
  }
  return await this.getSetKeysStorage({ key });
} //

async function getTxsTransactorFromStorage(params) {
  let txsTransactor = [];
  const { tokenID, version } = params || {};
  const key = this.getKeyTxHistoryByTokenId(params);
  console.log("getTxsTransactorFromStorage 4444 ", key)

  try {
    new Validator("getTxsTransactorFromStorage-tokenID", tokenID)
      .required()
      .string();
    new Validator("getTxsTransactorFromStorage-version", version)
      .required()
      .number();
    if (version === PrivacyVersion.ver1) {
      return [];
    }
    let txs = (await this.getAccountStorage(key)) || [];

    console.log("getTxsTransactorFromStorage 555 ", txs)


    txs = txs
      .filter((tx) => isEqual(tx?.tokenID, tokenID))
      .map((tx) => ({
        ...this.mappingTxsTransactorFromStorage({ tokenID, tx, version }),
      }));
    if (!txs) {
      return [];
    }
    console.log("getTxsTransactorFromStorage 666 ", txs)
    try {
      let task = [];
      task = txs.filter((tx) => {
        const shouldReGetTxStatus = ![
          TX_STATUS.TXSTATUS_SUCCESS,
          TX_STATUS.TXSTATUS_CANCELED,
          TX_STATUS.TXSTATUS_FAILED,
        ].includes(tx?.status);
        return shouldReGetTxStatus;
      });
      for (let index = 0; index < task.length; index++) {
        const tx = task[index];
        await this.getTxHistoryByTxID({ tokenID, txId: tx?.txId, version });
      }
      await Promise.all(task);
    } catch (error) {
      console.log("ERROR update status getTxHistoryByTxID", error);
    }
  } catch (error) {
    console.log("getTxsTransactorFromStorage ERROR", error);
    throw new CustomError(
      ErrorObject.GetTxsTransactorFromStorage,
      ErrorObject.GetTxsTransactorFromStorage.description,
      error
    );
  }
  console.log("getTxsTransactorFromStorage 77 ", 
  { tokenID, tx, version })
  txsTransactor = (await this.getAccountStorage(key)) || [];
  console.log("getTxsTransactorFromStorage 888 ", txsTransactor)
  txsTransactor = txsTransactor.map((tx) => ({
    ...this.mappingTxsTransactorFromStorage({ tokenID, tx, version }),
  }));
  console.log("getTxsTransactorFromStorage 999 ", txsTransactor)
  return txsTransactor;
}

async function getTxsTransactor(params) {
  let txsTransactor = [];
  let differenceTxs = [];
  try {
    const { keyImages, publicKeys, tokenID, version } = params;
    new Validator("getTxsTransactor-tokenID", tokenID).required().string();
    new Validator("getTxsTransactor-keyImages", keyImages).required().array();
    new Validator("getTxsTransactor-publicKeys", publicKeys).required().array();
    new Validator("getTxsTransactor-version", version).required().number();
    let intersectHash = intersectionBy(keyImages, publicKeys, "TxHash");
    let diffrentHash = differenceBy(keyImages, publicKeys, "TxHash");
    let combineHashs = [...intersectHash, ...diffrentHash];
    let txsTransactorStorage = [];
    try {
      txsTransactorStorage = await this.getTxsTransactorFromStorage({
        tokenID,
        version,
      });
    } catch (error) {
      console.log("ERROR WHEN GET TXS TRANSACTOR FROM STORAGE", error);
    }
    txsTransactor = combineHashs.map((tx) => {
      const {
        Fee,
        TxHash,
        Amount: AmountTxKeyImg = 0,
        Type,
        ProofDetail,
        Metatype,
      } = tx || {};
      const { OutputCoins = [], InputCoins = [] } = ProofDetail || {};
      const txPubKey = publicKeys.find((tx) => tx.TxHash === TxHash);
      const { Amount: AmountTxPubKey = "0" } = txPubKey || {};
      const amountInputs = new bn(AmountTxKeyImg)
        .sub(new bn(Type === "n" ? Fee : "0"))
        .toString();
      let amount = new bn(amountInputs).sub(new bn(AmountTxPubKey));
      let ReceiverAddress = "";
      let SenderSeal = "";
      const foundIndex = txsTransactorStorage.findIndex(
        (txs) => txs?.txId === TxHash
      );
      //tx send max
      if (foundIndex > -1) {
        const foundTx = txsTransactorStorage[foundIndex];
        if (!txPubKey) {
          if (OutputCoins.length > 1) {
            amount = foundTx.amount;
          }
        }
        ReceiverAddress = foundTx.receiverAddress;
        SenderSeal = foundTx?.senderSeal;
      }
      let Amount = amount.toString();
      let txResult = {
        ...tx,
        Amount,
        TxType: TX_TYPE.SEND,
        TxTypeStr: TX_TYPE_STR[TX_TYPE.SEND],
        ReceiverAddress,
        SenderSeal,
      };
      //tx consolidate
      if (isEqual(Amount, "0") && !Metatype) {
        if (InputCoins.length > OutputCoins.length) {
          txResult.TxType = TX_TYPE.CONSOLIDATE;
          txResult.TxTypeStr = TX_TYPE_STR[TX_TYPE.CONSOLIDATE];
        }
        txResult.Amount = amountInputs || AmountTxPubKey;
      }
      return txResult;
    });
    txsTransactor = this.mappingTxs({ txs: txsTransactor });
    differenceTxs = differenceBy(txsTransactorStorage, txsTransactor, "txId");
  } catch (error) {
    throw new CustomError(
      ErrorObject.GetTxsTransactorFail,
      ErrorObject.GetTxsTransactorFail.description,
      error
    );
  }
  txsTransactor = [...txsTransactor, ...differenceTxs];
  return txsTransactor;
}

function handleFilterTxsTransactorByTxsPToken({ txsPToken, txsTransactor }) {
  let _txsTransactor = [...txsTransactor];
  try {
    new Validator("txsPToken", txsPToken).required().array();
    new Validator("txsTransactor", txsTransactor).required().array();
    _txsTransactor = _txsTransactor.filter((txt) => {
      let foundIndex = txsPToken.findIndex(
        (txp) =>
          txp.incognitoTx === txt.txId ||
          txp.incognitoTxToPayOutsideChainFee === txt.txId
      );
      if (foundIndex > -1) {
        return false;
      }
      return true;
    });
  } catch (error) {
    console.log("ERROR WHEN FILTER TXS TRANSACTOR BY TXS PTOKEN", error);
  }
  return _txsTransactor;
}

async function removeTxHistoryByTxIDs({ txIDs, tokenIDs, version }) {
  try {
    new Validator("removeTxHistoryByTxIDs-txIDs", txIDs).required().array();
    new Validator("removeTxHistoryByTxIDs-tokenIDs", tokenIDs)
      .required()
      .array();
    new Validator("removeTxHistoryByTxIDs-version", version)
      .required()
      .number();
    tokenIDs = uniq(tokenIDs).filter((tokenID) => !!tokenID);
    txIDs = uniq(txIDs).filter((txID) => !!txID);

    const tasks = uniq(tokenIDs).map(async (tokenID) => {
      const oldHistories =
        (await this.getTransactorHistoriesByTokenID({
          tokenID,
          version,
        })) || [];
      const newHistories = oldHistories.filter(
        (history) => !txIDs.includes(history?.txId)
      );
      const key = this.getKeyTxHistoryByTokenId({
        tokenID,
        version,
      });
      await this.setAccountStorage(key, newHistories);
    });
    await Promise.all(tasks);
  } catch (e) {
    throw e;
  }
}

function handleFilterTxsTransactorByTxsReceiver({
  txsTransactor,
  txsReceiver,
}) {
  let _txsTransactor = [];
  try {
    new Validator(
      "handleFilterTxsTransactorByTxsReceiver-txsReceiver",
      txsReceiver
    )
      .required()
      .array();
    new Validator(
      "handleFilterTxsTransactorByTxsReceiver-txsTransactor",
      txsTransactor
    )
      .required()
      .array();
    _txsTransactor = (txsTransactor || []).filter(({ txId }) => {
      return !(txsReceiver || []).some(
        (txsReceiver) => txsReceiver.txId === txId
      );
    });
  } catch (e) {
    throw e;
  }
  return _txsTransactor;
}

export default {
  getSetKeyImages,
  getTxsTransactor,
  getKeySetKeysImageStorage,
  getTxsTransactorFromStorage,
  mappingTxsTransactorFromStorage,
  handleFilterTxsTransactorByTxsPToken,
  removeTxHistoryByTxIDs,
  handleFilterTxsTransactorByTxsReceiver,
};
