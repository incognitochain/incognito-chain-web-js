import bn from "bn.js";
import { CustomTokenParamTx } from "@lib/tx/txcustomtokendata";
import { PaymentInfo } from "@lib/common/key";
import { MaxTxSize } from "@lib/core";
import { MAX_INPUT_PER_TX } from "@lib/tx/constants";
import { CustomError, ErrorObject } from "@lib/common/errorhandler";
import { base64Decode, base64Encode } from "@lib/privacy/utils";
import { defaultCoinChooser as coinChooser } from "@lib/services/coinChooser";
import { wasm } from "@lib/wasm";
import Validator from "@lib/utils/validator";
import { checkEncode } from "@lib/common/base58";
import camelCase from "lodash/camelCase";
import { LIMIT } from "./account.constants";

export const camelCaseKeys = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((v) => camelCaseKeys(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [camelCase(key)]: camelCaseKeys(obj[key]),
      }),
      {}
    );
  }
  return obj;
};

const getEstimateFee = async (from, to, amount, tokenObject, account) => {
  let amountBN = new bn(amount);
  let paymentInfos = [new PaymentInfo(to, amountBN.toString())];

  let tokenID = null,
    tokenParams = null;
  if (tokenObject) {
    tokenID = tokenObject.TokenID;
  }
  // prepare input for native token tx
  let inputForTx;
  try {
    inputForTx = await prepareInputForTxV2({
      amountTransfer: amountBN,
      fee: 0,
      tokenID,
      account,
    });
  } catch (e) {
    throw e;
  }
  try {
    let fee;
    if (!tokenID) {
      fee = await estimateFee(
        "",
        inputForTx.inputCoinStrs.length,
        paymentInfos.length,
        null,
        account.rpc,
        null
      );
    } else {
      tokenParams = {
        PaymentInfo: paymentInfos,
        InputCoins: inputForTx.inputCoinStrs,
        TokenID: tokenID,
        TokenName: tokenObject.TokenName,
        TokenSymbol: tokenObject.TokenSymbol,
      };
      fee = await estimateFee("", 1, 1, null, account.rpc, tokenParams);
    }
    return fee;
  } catch (e) {
    throw e;
  }
};

const prepareInputForTxV2 = async ({
  amountTransfer,
  fee,
  tokenID,
  account,
  numOfOtherPks = 7,
  version,
} = {}) => {
  new Validator("prepareInputForTxV2-tokenID", tokenID).required().string();
  new Validator("prepareInputForTxV2-fee", fee).required().amount();
  new Validator("prepareInputForTxV2-amountTransfer", amountTransfer)
    .required()
    .amount();
  new Validator("prepareInputForTxV2-numOfOtherPks", numOfOtherPks).number();
  new Validator("prepareInputForTxV2-account", account).required();
  new Validator("prepareInputForTxV2-version", version).required().number();
  const params = { version, tokenID };
  const unspentCoinExceptSpendingCoin = await account.getSpendingCoins(params);
  // total amount transfer and fee
  let feeBN = new bn(fee);
  let inputCoinsToSpent;
  if (amountTransfer < 0) {
    // negative means use all inputs
    let arrayEnd = MAX_INPUT_PER_TX;
    if (unspentCoinExceptSpendingCoin.length < arrayEnd) {
      arrayEnd = unspentCoinExceptSpendingCoin.length;
    }
    inputCoinsToSpent = unspentCoinExceptSpendingCoin.slice(0, arrayEnd);
    amountTransfer = feeBN;
  } else {
    amountTransfer = amountTransfer.add(feeBN);
    const respChooseBestCoin = coinChooser.coinsToSpend(
      unspentCoinExceptSpendingCoin,
      amountTransfer
    );
    inputCoinsToSpent = respChooseBestCoin.resultInputCoins;
    if (inputCoinsToSpent.length === 0 && amountTransfer.cmp(new bn(0)) !== 0) {
      throw new CustomError(
        ErrorObject.NotEnoughCoinError,
        "Not enough coin to spend"
      );
    }
  }
  let totalValueInput = new bn(0);
  for (let i = 0; i < inputCoinsToSpent.length; i++) {
    totalValueInput = totalValueInput.add(new bn(inputCoinsToSpent[i].Value));
    inputCoinsToSpent[i].Info = "";
  }
  const shardID = account.getShardID();
  let cc = null;
  try {
    if (numOfOtherPks > 0) {
      let limit = inputCoinsToSpent.length * numOfOtherPks;
      if (limit === 0) {
        limit = numOfOtherPks;
      }
      cc = await account.rpcCoinService.apiGetRandomCommitments({
        tokenID,
        shardID,
        version,
        limit,
      });
      cc.Indexes = cc.CommitmentIndices;
      cc.AssetTags = cc.AssetTags || [];
    }
  } catch (e) {
    throw new CustomError(
      ErrorObject.GetFailRandomCommitments,
      ErrorObject.GetFailRandomCommitments.description,
      e
    );
  }
  let res = {
    inputCoinStrs: inputCoinsToSpent,
    totalValueInput: totalValueInput,
    coinsForRing: cc,
  };
  return res;
};

// cloneInputCoinArray clone array of input coins to new array
const cloneInputCoinJsonArray = (_coins) =>
  _coins.map((c) => JSON.parse(JSON.stringify(c)));

const estimateFee = async (
  paymentAddrSerialize,
  numInputCoins,
  numOutputs,
  metadata,
  rpcClient,
  tokenParams = null
) => {
  let tokenIDStr = null;
  if (tokenParams != null) {
    tokenIDStr = tokenParams.TokenID;
  }

  let resp;
  try {
    resp = await rpcClient.getEstimateFeePerKB(
      paymentAddrSerialize,
      tokenIDStr
    );
  } catch (e) {
    throw new CustomError(
      ErrorObject.GetUnitFeeErr,
      "Can not get unit fee when estimate"
    );
  }

  let txSize = await estimateTxSize(
    numInputCoins,
    numOutputs,
    metadata,
    tokenParams
  );
  // check tx size
  if (txSize > MaxTxSize) {
    throw new CustomError(
      ErrorObject.TxSizeExceedErr,
      "tx size is exceed error"
    );
  }
  return (txSize + 1) * resp.unitFee;
};

/**
 *
 * @param {number} numInputCoins
 * @param {number} numOutputCoins
 * @param {bool} hasPrivacyForNativeToken
 * @param {bool} hasPrivacyForPToken
 * @param {*} metadata
 * @param {CustomTokenParamTx} customTokenParams
 * @param {PrivacyTokenParamTxObject} privacyCustomTokenParams
//  */
const estimateTxSize = async (
  numInputCoins,
  numOutputCoins,
  metadata,
  tokenParams
) => {
  const params = {
    NumInputs: numInputCoins,
    NumPayments: numOutputCoins,
    Metadata: metadata,
    TokenParams: tokenParams,
  };
  const sz = await wasm.estimateTxSize(JSON.stringify(params));
  return sz;
};

// getUnspentCoin returns unspent coins
const getUnspentCoin = async (
  paymentAddrSerialize,
  inCoinStrs,
  tokenID,
  rpcClient
) => {
  let unspentCoinStrs = new Array();
  let serialNumberStrs = new Array();

  for (let i = 0; i < inCoinStrs.length; i++) {
    serialNumberStrs.push(inCoinStrs[i].KeyImage);
  }

  // check whether each input coin is spent or not
  let response;
  try {
    response = await rpcClient.hasSerialNumber(
      paymentAddrSerialize,
      serialNumberStrs,
      tokenID
    );
  } catch (e) {
    throw e;
  }

  let existed = response.existed;
  if (existed.length != inCoinStrs.length) {
    throw new Error("Wrong response when check has serial number");
  }

  for (let i = 0; i < existed.length; i++) {
    if (!existed[i]) {
      unspentCoinStrs.push(inCoinStrs[i]);
    }
  }

  return {
    unspentCoinStrs: unspentCoinStrs,
  };
};

function newParamTxV2(
  senderKeyWalletObj,
  paymentInfos,
  inputCoins,
  fee,
  tokenID,
  metadata,
  info,
  otherCoinsForRing
) {
  let sk = base64Encode(senderKeyWalletObj.KeySet.PrivateKey);
  let param = {
    SenderSK: sk,
    PaymentInfo: paymentInfos,
    InputCoins: inputCoins,
    Fee: fee,
    HasPrivacy: true,
    TokenID: tokenID,
    Metadata: metadata,
    Info: info,
    CoinCache: otherCoinsForRing,
  };

  return param;
}

function newTokenParamV2(
  paymentInfos,
  inputCoins,
  tokenID,
  otherCoinsForRing,
  obj = {}
) {
  obj.PaymentInfo = paymentInfos;
  obj.InputCoins = inputCoins;
  obj.TokenID = tokenID;
  obj.CoinCache = otherCoinsForRing;
  return obj;
}

const sleep = async (sleepTime) => {
  return new Promise((resolve) => setTimeout(resolve, sleepTime));
};

const getEstimateFeeForPToken = getEstimateFee;

export async function createCoin({ paymentInfo, tokenID = null } = {}) {
  new Validator("paymentInfo", paymentInfo).paymentInfo();
  let coin;
  try {
    // since we only use the PublicKey and TxRandom fields, the tokenID is irrelevant
    let temp = await wasm.createCoin(
      JSON.stringify({ PaymentInfo: paymentInfo, TokenID: tokenID })
    );
    coin = JSON.parse(temp);
    ["PublicKey", "TxRandom"].forEach((key) => {
      coin[key] = checkEncode(base64Decode(coin[key]));
    });
  } catch (e) {
    throw e;
  }
  return coin;
}

function pagination(size, limited) {
  new Validator("size", size).required().number();
  new Validator("limited", limited).number();
  let limit = limited || LIMIT;
  const times = Math.floor(size / limit);
  const remainder = size % limit;
  return {
    times,
    remainder,
  };
}

export {
  prepareInputForTxV2,
  cloneInputCoinJsonArray,
  estimateFee,
  getEstimateFee,
  getEstimateFeeForPToken,
  estimateTxSize,
  getUnspentCoin,
  newParamTxV2,
  newTokenParamV2,
  sleep,
  pagination,
};
