import { CustomError, ErrorObject } from "@lib/common/errorhandler";
import { isJsonString } from "@lib/utils/json";
import Validator from "@lib/utils/validator";
import difference from "lodash/difference";
import differenceBy from "lodash/differenceBy";
import {
  LIMIT,
  TX_TYPE,
  TX_TYPE_STR,
} from "@lib/module/Account/account.constants";
import uniqBy from "lodash/uniqBy";
import isEqual from "lodash/isEqual";
import isArray from "lodash/isArray";
import bn from "bn.js";

const SET_PUBLIC_KEY = "SET_PUBLIC_KEY";
const SET_SND_KEY = "SET_SND_KEY";

function getKeySetPublickKeysStorage(params) {
  try {
    const { tokenID, version } = params;
    new Validator("getKeySetPublickKeysStorage-tokenID", tokenID)
      .required()
      .string();
    new Validator("getKeySetPublickKeysStorage-version", version)
      .required()
      .number();
    return this.getKeySetKeysStorageByTokenId({
      tokenID,
      prefixName: SET_PUBLIC_KEY,
      version,
    });
  } catch (error) {
    throw error;
  }
}

function getKeySetSNDsStorage(params) {
  try {
    const { tokenID, version } = params;
    new Validator("getKeySetSNDsStorage-tokenID", tokenID).required().string();
    new Validator("getKeySetSNDsStorage-version", version).required().number();
    return this.getKeySetKeysStorageByTokenId({
      tokenID,
      prefixName: SET_SND_KEY,
      version,
    });
  } catch (error) {
    throw error;
  }
}

async function getKeyTxsReceiverStorageBySCV(params) {
  try {
    const { tokenID, version } = params;
    new Validator("getKeyTxsReceiverStorageBySCV-tokenID", tokenID)
      .required()
      .string();
    new Validator("getKeyTxsReceiverStorageBySCV-version", version)
      .required()
      .number();
    const key = this.getTxsByReceiverByCSV(params);
    return key;
  } catch (error) {
    throw error;
  }
}

async function getTxsByReceiverByCSV(params) {
  let txsReceiver = [];
  try {
    const { tokenID, version } = params;
    new Validator("getTxsByReceiverByCSV-tokenID", tokenID).required().string();
    new Validator("getTxsByReceiverByCSV-version", version).required().number();
    let limit = LIMIT;
    let index = 0;
    while (true) {
      let offset = limit * index;
      const txs =
        (await this.rpcCoinService.apiGetTxsByReceiver({
          tokenID,
          version,
          limit,
          offset,
          paymentkey: this.getPaymentAddress(),
        })) || [];
      index++;
      txsReceiver = txsReceiver.concat(txs);
      if (txs?.length < limit) {
        break;
      }
    }
    txsReceiver = uniqBy(txsReceiver, (item) => item?.TxDetail?.Hash);
  } catch (error) {
    throw error;
  }
  return txsReceiver;
}

async function getSetKeySNDs(params) {
  let key,
    setSNDs = [];
  try {
    const { tokenID, version } = params;
    new Validator("getSetKeySNDs-tokenID", tokenID).required().string();
    new Validator("getSetKeySNDs-version", version).required().number();
    key = this.getKeySetSNDsStorage(params); //
    const outputCoins = await this.getListOutputCoinsStorage(params);
    const oldSetSNDs = (await this.getSetKeysStorage({ key })) || [];
    if (outputCoins.length === 0) {
      return oldSetSNDs;
    }
    const oldSNDs = oldSetSNDs.map((i) => i?.SNDerivator);
    const outputCoinsSNDs = outputCoins.map((coin) => coin?.SNDerivator);
    const sdnds = difference(outputCoinsSNDs, oldSNDs);
    if (sdnds.length === 0) {
      return oldSetSNDs;
    }
    const accountPubkey = this.getPublicKeyBase64();
    let txsByReceiver = await this.getTxsByReceiverByCSV(params);
    setSNDs = txsByReceiver
      .map((tx) => tx?.TxDetail)
      .map((tx) => {
        try {
          const {
            OutputCoinPubKey = [],
            OutputCoinSND = [],
            TokenOutputCoinPubKey = [],
            TokenOutputCoinSND = [],
            Type,
          } = tx || {};
          let SNDerivator;
          let Value = new bn("0");
          let outputCoinSND = isArray(OutputCoinSND) ? [...OutputCoinSND] : [];
          let outputCoinPubkey = isArray(OutputCoinPubKey)
            ? [...OutputCoinPubKey]
            : [];
          if (["tp", "tcv"].includes(Type)) {
            outputCoinPubkey = isArray(TokenOutputCoinPubKey)
              ? [...TokenOutputCoinPubKey]
              : [];
            outputCoinSND = isArray(TokenOutputCoinSND)
              ? [...TokenOutputCoinSND]
              : [];
          }
          outputCoinPubkey.forEach((pubkey, index) => {
            if (isEqual(pubkey, accountPubkey)) {
              const SNDerivator = outputCoinSND[index];
              const foundCoin = outputCoins.find((coin) =>
                isEqual(coin?.SNDerivator, SNDerivator)
              );
              Value = Value.add(new bn(foundCoin?.Value || "0"));
            }
          });
          return {
            ...this.mappingTxDetail({ tx, tokenID }),
            SNDerivator,
            Value: Value.toString(),
          };
        } catch (error) {
          console.log("MAPPING SET SNDS FAILED", error);
          return tx;
        }
      });
  } catch (error) {
    console.log("getSetKeySNDs error", error);
    throw error;
  }
  return setSNDs;
}

async function getSetPublicKeys(params) {
  let key;
  try {
    const { tokenID } = params;
    new Validator("getSetPublicKeys-tokenID", tokenID).required().string();
    key = this.getKeySetPublickKeysStorage(params); //
    const outputCoins = await this.getListOutputCoinsStorage(params);
    const oldSetPublicKeys = await this.getSetKeysStorage({ key });
    if (outputCoins.length === 0) {
      return oldSetPublicKeys;
    }
    const oldPublicKeys = oldSetPublicKeys.map((i) => i?.PublicKey);
    const outputCoinsPublicKeys = outputCoins.map((coin) => coin?.PublicKey);
    const pubKeys = difference(outputCoinsPublicKeys, oldPublicKeys);
    if (pubKeys.length === 0) {
      return oldSetPublicKeys;
    }
    const txs = await this.rpcCoinService.apiGetTxsByPublicKey({
      pubKeys,
    });
    if (txs.length !== pubKeys.length) {
      throw new Error(ErrorObject.GetTxsByPubKeysFail.description);
    }
    if (txs.length === 0) {
      return oldSetPublicKeys;
    }
    const setPublicKeys = txs
      .map((tx) => tx?.TxDetail)
      .map((tx, index) => {
        const PublicKey = pubKeys[index];
        const foundCoin = outputCoins.find(
          (coin) => coin.PublicKey === PublicKey
        );
        const Value = foundCoin?.Value || 0;
        return {
          ...this.mappingTxDetail({ tx, tokenID }),
          PublicKey,
          Value,
        };
      });
    await this.setSetKeysStorage({ tokenID, setKeys: setPublicKeys, key });
  } catch (error) {
    throw error;
  }
  return await this.getSetKeysStorage({ key });
}

function getTxsReceiver({ keyImages, publicKeys, tokenID }) {
  new Validator("tokenID", tokenID).required().string();
  new Validator("keyImages", keyImages).required().array();
  new Validator("publicKeys", publicKeys).required().array();
  let txsReceiver = [];
  try {
    txsReceiver = differenceBy(publicKeys, keyImages, "TxHash").map((tx) => ({
      ...tx,
      TxType: TX_TYPE.RECEIVE,
      TxTypeStr: TX_TYPE_STR[TX_TYPE.RECEIVE],
    }));
    txsReceiver = this.mappingTxs({ txs: txsReceiver });
  } catch (error) {
    throw new CustomError(
      ErrorObject.GetTxsReceiverFail,
      ErrorObject.GetTxsReceiverFail.description,
      error
    );
  }
  return txsReceiver;
}

function handleFilterTxsReceiverByTxsPToken({ txsReceiver, txsPToken }) {
  try {
    new Validator("txsReceiver", txsReceiver).required().array();
    new Validator("txsPToken", txsPToken).required().array();
    let _txsReceiver = [...txsReceiver];
    _txsReceiver = _txsReceiver.filter((txr) => {
      const { metaData } = txr;
      if (isJsonString(metaData)) {
        const parse = JSON.parse(metaData);
        const requestTxId = parse?.RequestedTxID;
        const type = parse?.Type;
        switch (type) {
          case 25:
          case 81:
          case 251:
          case 328:
          case 332:
          case 336: {
            const foundIndex = txsPToken.findIndex(
              (txp) => txp.incognitoTx === requestTxId
            );
            if (foundIndex > -1) {
              return false;
            }
          }
          default:
            break;
        }
      }
      return true;
    });
    return _txsReceiver;
  } catch (error) {
    console.log("FILTER TXS RECEIVER BY TXS PTOKEN FAILED", error);
  }
  return txsReceiver;
}

export default {
  //v2
  getKeySetPublickKeysStorage,
  getSetPublicKeys,
  getTxsReceiver,
  handleFilterTxsReceiverByTxsPToken,

  //v1
  getSetKeySNDs,
  getTxsByReceiverByCSV,
  getKeyTxsReceiverStorageBySCV,
  getKeySetSNDsStorage,
};
