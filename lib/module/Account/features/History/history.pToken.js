import bn from "bn.js";
import Validator from "@lib/utils/validator";
import { TX_TYPE, TX_TYPE_STR } from "@lib/module/Account/account.constants";
import { camelCaseKeys } from "@lib/utils/camelCaseKeys";
import {
  ADDRESS_TYPE,
  STATUS_CODE_SHIELD_CENTRALIZED,
  STATUS_CODE_SHIELD_DECENTRALIZED,
} from "./history.constant";

function mappingShieldHistory(history) {
  try {
    new Validator("history", history).required().object();
    const { decentralized, status, isShieldTx, currencyType } = history;
    const isExpiredShieldCentralized =
      isShieldTx && STATUS_CODE_SHIELD_CENTRALIZED.TIMED_OUT.includes(status);
    const canResumeExpiredShield =
      decentralized === 0 && isExpiredShieldCentralized;
    const canRetryInvalidAmountShield =
      isShieldTx &&
      decentralized === 0 &&
      STATUS_CODE_SHIELD_CENTRALIZED.INVALID_AMOUNT.includes(status) &&
      currencyType === 2;
    const isShielding =
      status === STATUS_CODE_SHIELD_DECENTRALIZED.PENDING ||
      status === STATUS_CODE_SHIELD_CENTRALIZED.PENDING;
    return {
      ...history,
      isExpiredShieldCentralized,
      canResumeExpiredShield,
      canRetryInvalidAmountShield,
      txType: TX_TYPE.SHIELD,
      txTypeStr: TX_TYPE_STR[TX_TYPE.SHIELD],
      isShielding,
    };
  } catch (error) {
    console.log("ERROR MAPPING SHIELD TX", error);
  }
  return history;
}

function mappingUnshieldHistory(history) {
  try {
    new Validator("history", history).required().object();
    const { decentralized, burnPrivacyFee, outChainPrivacyFee, outChainTokenFee } = history;
    let inchainFee = "";
    const isUnShieldByPToken = !!outChainTokenFee;
    let outchainFee = isUnShieldByPToken ? outChainTokenFee : outChainPrivacyFee;
    switch (decentralized) {
      case 0: {
        // centralized
        inchainFee = new bn(burnPrivacyFee).mul(new bn("2")).toString();
        break;
      }
      case 1: {
        // decentralized
        inchainFee = burnPrivacyFee;
        break;
      }
      default:
        break;
    }
    return {
      ...history,
      inchainFee,
      outchainFee,
      txType: TX_TYPE.UNSHIELD,
      isUnShieldByPToken,
      txTypeStr: TX_TYPE_STR[TX_TYPE.UNSHIELD],
    };
  } catch (error) {
    console.log("ERROR MAPPING UNSHIELD TX", error);
  }
  return history;
}

function mappingPTokenHistory({ history }) {
  try {
    new Validator("history", history).required().object();
    let h = camelCaseKeys(history);
    const { createdAt, address, addressType } = h;
    const time = new Date(createdAt).getTime();
    const depositTmpAddress = addressType === ADDRESS_TYPE.SHIELD && !!address;
    const isShieldTx = !!depositTmpAddress;
    const isUnshieldTx = !isShieldTx;
    h = {
      ...h,
      isShieldTx,
      isUnshieldTx,
      time,
    };
    if (isShieldTx) {
      return this.mappingShieldHistory(h);
    } else if (isUnshieldTx) {
      return this.mappingUnshieldHistory(h);
    }
  } catch (error) {
    console.log("MAPPING PTOKEN HISTORY FAIL", error);
  }
}

function mappingPTokenHistories(params) {
  let data = [];
  const { histories, minShield, signPublicKeyEncode } = params;
  try {
    new Validator("mappingPTokenHistories-histories", histories)
      .required()
      .array();
    new Validator("mappingPTokenHistories-minShield", minShield).amount();
    new Validator(
      "mappingPTokenHistories-signPublicKeyEncode",
      signPublicKeyEncode
    )
      .required()
      .string();
    data = [...histories]
      .map((h) => ({ ...h, minShield, signPublicKeyEncode }))
      .map((h) =>
        this.mappingPTokenHistory({
          history: h,
        })
      );
    return data;
  } catch (error) {
    console.log("ERROR MAPPING PTOKEN HISTOIRES", error);
  }
  return data;
}

async function getPTokenHistoryByTokenID({ tokenID }) {
  let histories = [];
  try {
    new Validator("getPTokenHistory-tokenID", tokenID).required().string();
    const paymentAddress = this.getPaymentAddress();
    const signPublicKeyEncode = await this.getSignPublicKeyEncode();
    let task = [
      this.rpcApiService.apiGetPTokenHistory({
        tokenID,
        paymentAddress,
        signPublicKeyEncode,
      }),
      this.rpcApiService.apiGetMinAmountToShield({ tokenID }),
    ];
    let [_histories, minShield] = await Promise.all(task);
    if (_histories.length > 0) {
      histories = this.mappingPTokenHistories({
        histories: _histories,
        minShield,
        signPublicKeyEncode,
      });
    }
  } catch (error) {
    console.log("getPTokenHistoryByTokenID", error);
  }
  return histories;
}

function handleMappingTxsPTokenByTxsTransactor({ txsPToken, txsTransactor }) {
  let _txsPToken = [...txsPToken];
  try {
    txsTransactor.forEach((txt) => {
      const foundTxpIndex = _txsPToken.findIndex(
        (txp) =>
          txp.incognitoTx === txt.txId ||
          txp.incognitoTxToPayOutsideChainFee === txt.txId
      );
      if (foundTxpIndex > -1) {
        const { amount, fee, txId } = txt;
        const foundTxp = _txsPToken[foundTxpIndex];
        const { incognitoAmount, inchainFee, decentralized } = foundTxp;
        if (!incognitoAmount) {
          _txsPToken[foundTxpIndex].incognitoAmount = amount;
        }
        if (!inchainFee) {
          switch (decentralized) {
            case 0: {
              // centralized
              _txsPToken[foundTxpIndex].inchainFee = new bn(fee)
                .mul("2")
                .toString();
              break;
            }
            case 1: {
              // decentralized
              _txsPToken[foundTxpIndex].inchainFee = fee;
              break;
            }
            default:
              break;
          }
        }
      }
    });
  } catch (error) {
    console.log("MAPPING TXS PTOKEN BY TXS TRANSACTOR FAIL", error);
  }
  return _txsPToken;
}

async function handleRetryExpiredShield({ history }) {
  try {
    new Validator("handleRetryExpiredShield-history", history)
      .required()
      .object();
    return this.rpcApiService.apiRetryExpiredShield(history);
  } catch (error) {
    console.log("HANDLE RETRY EXPIRED SHIELD FAILED", error);
  }
}

async function handleGetPTokenHistoryById({ history }) {
  try {
    new Validator("history", history).required().object();
    let result = await this.rpcApiService.apiGetPTokenHistoryById(history);
    if (!!result) {
      result = this.mappingPTokenHistory({ history: result });
      return {
        ...history,
        ...result,
      };
    }
  } catch (error) {
    console.log("HANDLE GET PTOKEN HISTORY BY ID FAILED", error);
  }
  return history;
}

export default {
  handleMappingTxsPTokenByTxsTransactor,
  getPTokenHistoryByTokenID,
  mappingPTokenHistories,
  mappingShieldHistory,
  mappingUnshieldHistory,
  handleRetryExpiredShield,
  mappingPTokenHistory,
  handleGetPTokenHistoryById,
};
