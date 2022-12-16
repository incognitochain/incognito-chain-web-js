import bn from "bn.js";
import Validator from "@lib/utils/validator";
import { base64Encode, randBytes, stringToBytes } from "@lib/privacy/utils";
import { CustomError, ErrorObject } from "@lib/common/errorhandler";
import { PRVIDSTR } from "@lib/core";
import { wasm } from "@lib/wasm";
import { checkDecode, checkEncode } from "@lib/common/base58";
import {
  MAX_FEE_PER_TX,
  MAX_INPUT_PER_TX,
  NUMB_OF_OTHER_PKS,
} from "@lib/module/Account/account.constants";
import {
  newParamTxV2,
  prepareInputForTxV2,
  newTokenParamV2,
} from "@lib/module/Account/account.utils";
import { TX_STATUS } from "@lib/module/Account/account.constants";
import { defaultCoinChooser } from "@lib/services/coinChooser";
import { PrivacyVersion } from "@lib/core/constants";
import { hwBeforeCreate, hwAfterCreate } from '@lib/module/Account/features/HardwareWallet';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sleepCapped(ms, maxSeconds) {
  // console.debug("Wait up to", maxSeconds);
  if (maxSeconds <= 0) {
    throw new CustomError(ErrorObject.UnexpectedErr, "wait time depleted");
  }
  maxSeconds -= ms / 1000;
  return this.sleep(ms).then((_) => maxSeconds);
}

async function waitTx(txId, confirmations = 5) {
  new Validator("waitTx-txId", txId).required().string();
  new Validator("waitTx-confirmations", confirmations).required().number();
  console.debug(txId, " => wait for", confirmations, "confirmations");
  let maxWaitTime = this.timeout;
  let blockHash = null;
  let response;
  while (!blockHash) {
    try {
      response = await this.rpc.getTransactionByHash(txId);
      if (response.blockHash && response.blockHash.length == 64) {
        blockHash = response.blockHash;
      } else {
        maxWaitTime = await this.sleepCapped(1000, maxWaitTime);
      }
    } catch (e) {
      throw new CustomError(
        ErrorObject.GetTxByHashErr,
        ErrorObject.GetTxByHashErr.description,
        e
      );
    }
  }
  maxWaitTime = 200;
  let currentConfs = 0;
  while (currentConfs < confirmations) {
    try {
      response = await this.rpc.getBlockByHash(blockHash);
      let c = response.Confirmations;
      if (c) {
        currentConfs = c;
      }
      maxWaitTime = await this.sleepCapped(1000, maxWaitTime);
    } catch (e) {
      throw new CustomError(
        ErrorObject.GetTxByHashErr,
        ErrorObject.GetTxByHashErr.description,
        e
      );
    }
  }
  console.debug("Confirmed !");
}

async function transact({
  transfer: {
    prvPayments = null,
    tokenPayments = null,
    fee = MAX_FEE_PER_TX,
    info = "",
    tokenID = PRVIDSTR,
    tokenParams = null,
    tokenCoinChooser = defaultCoinChooser,
    tokenCoinForRingCount = NUMB_OF_OTHER_PKS,
  } = {},
  extra: {
    metadata = null,
    txHandler = null,
    txType,
    txHashHandler = null,
    version,
    transactCallback,
    versionTx = null,
    firstC = null,
    useHw = false,
  } = {},
}) {
  new Validator("transact-prvPayments", prvPayments).paymentInfoList();
  new Validator("transact-tokenPayments", tokenPayments).paymentInfoList();
  new Validator("transact-fee", fee).required().number();
  new Validator("transact-info", info).string();
  new Validator("transact-tokenID", tokenID).string();
  new Validator("transact-metadata", metadata).object();
  new Validator("transact-tokenParams", tokenParams).object();
  new Validator("transact-txType", txType).required().number();
  new Validator("transact-version", version).required().number();
  const params = { version, tokenID };
  console.log(20);
  await this.updateProgressTx(20, "Preparing Your Payments");
  const memo = info;
  console.log("memo", memo);
  info = base64Encode(stringToBytes(info));
  console.log("info", info);
  let receiverPaymentAddrStr = new Array(prvPayments.length);
  let totalAmountTransfer = new bn(0);
  for (let i = 0; i < prvPayments.length; i++) {
    receiverPaymentAddrStr[i] = prvPayments[i].PaymentAddress;
    totalAmountTransfer = totalAmountTransfer.add(
      new bn(prvPayments[i].Amount)
    );
    prvPayments[i].Amount = new bn(prvPayments[i].Amount).toString();
  }
  console.log(30);
  await this.updateProgressTx(30, "Selecting Coins");
  let inputForTx;
  try {
    inputForTx = await prepareInputForTxV2({
      amountTransfer: totalAmountTransfer,
      fee,
      account: this,
      tokenID: PRVIDSTR,
      version,
    });
  } catch (e) {
    throw new CustomError(
      ErrorObject.InitNormalTxErr,
      "Error while preparing inputs",
      e
    );
  }
  if (inputForTx.inputCoinStrs.length > MAX_INPUT_PER_TX) {
    throw new CustomError(ErrorObject.TxSizeExceedErr);
  }
  console.log(40);
  await this.updateProgressTx(40, "Packing Parameters");
  let txParams = newParamTxV2(
    this.key,
    prvPayments,
    inputForTx.inputCoinStrs,
    fee,
    null,
    metadata,
    info,
    inputForTx.coinsForRing
  );
  if (useHw) {
    const temp = await randBytes(1);
    const cseed = await hwBeforeCreate(this.hwTransport, inputForTx.inputCoinStrs, firstC);
    txParams.Kvargs = { cseed, pi: temp[0] % 8 };
  }
  // handle token transfer
  let tokenReceiverPaymentAddrStr = [];
  let totalAmountTokenTransfer = new bn(0);
  let inputForToken = {
    inputCoinStrs: [],
    coinsForRing: {},
  };
  console.log(50);
  await this.updateProgressTx(50, "Adding Token Info");
  // tokenID is non-null when transferring token; tokenParams is non-null when creating new token
  if (!!tokenPayments) {
    let isInit = Boolean(tokenParams);
    let isTransfer = Boolean(tokenID);
    if (!(isInit || isTransfer)) {
      throw new CustomError(
        ErrorObject.InitNormalTxErr,
        "Invalid Token parameters"
      );
    }
    tokenReceiverPaymentAddrStr = new Array(tokenPayments.length);
    for (let i = 0; i < tokenPayments.length; i++) {
      tokenReceiverPaymentAddrStr[i] = tokenPayments[i].PaymentAddress;
      totalAmountTokenTransfer = totalAmountTokenTransfer.add(
        new bn(tokenPayments[i].Amount)
      );
      tokenPayments[i].Amount = new bn(tokenPayments[i].Amount).toString();
    }
    console.log(60);
    await this.updateProgressTx(60, "Selecting Token Coins");
    if (isTransfer) {
      try {
        inputForToken = await prepareInputForTxV2({
          amountTransfer: totalAmountTokenTransfer,
          fee: 0,
          tokenID,
          account: this,
          version,
          coinChooser: tokenCoinChooser,
          numOfOtherPks: tokenCoinForRingCount,
        });
      } catch (e) {
        throw new CustomError(
          ErrorObject.InitNormalTxErr,
          `Error while preparing inputs ${e}`
        );
      }
    }
    console.log(70);
    await this.updateProgressTx(70, "Decorating Parameters");
    tokenParams = newTokenParamV2(
      tokenPayments,
      inputForToken.inputCoinStrs,
      tokenID,
      inputForToken.coinsForRing,
      tokenParams || {}
    );
    txParams.TokenParams = tokenParams;
  }
  let txParamsJson = JSON.stringify(txParams);
  console.log(80);
  await this.updateProgressTx(80, "Signing Transaction");
  console.log("txParamsJson", txParamsJson);
  let theirTime = await this.rpc.getNodeTime();
  console.log("theirTime: ", theirTime);
  let wasmResult = await wasm.createTransaction(txParamsJson, theirTime);
  let { b58EncodedTx, hash, outputs, senderSeal } = JSON.parse(wasmResult);
  console.log("b58EncodedTx: ", b58EncodedTx, "senderSeal: ", senderSeal, "hash: ", hash);
  if (typeof txHashHandler === "function") {
    await txHashHandler({ txId: hash, rawTx: b58EncodedTx });
  }
  if (!b58EncodedTx || !hash) {
    throw new CustomError(
      ErrorObject.InitNormalTxErr,
      "Can not init transaction transfering"
    );
  }
  let tempBuf = checkDecode(b58EncodedTx).bytesDecoded;
  let theString = String.fromCharCode.apply(null, tempBuf);
  let txObj = JSON.parse(theString);
  if (useHw) {
    txObj = await hwAfterCreate(this.hwTransport, txObj, inputForTx.inputCoinStrs, txParams.Kvargs.pi);
    b58EncodedTx = checkEncode(Buffer.from(JSON.stringify(txObj)));
  }
  txObj.Encoded = b58EncodedTx;
  console.log(90);
  
  await this.updateProgressTx(90, "Submitting Transaction");
  let tx = {
    txId: hash,
    tx: txObj,
    hash,
    outputs,
    amount: totalAmountTransfer.toString(),
    inputs: inputForTx.inputCoinStrs,
    receivers: receiverPaymentAddrStr,
    tokenID,
    tokenAmount: totalAmountTokenTransfer.toString(),
    tokenInputs: inputForToken.inputCoinStrs,
    tokenReceivers: tokenReceiverPaymentAddrStr,
    isPrivacy: true,
    metadata,
    txType,
    status: TX_STATUS.PROCESSING,
    memo,
    fee,
    senderSeal,
    versionTx, // AccessID, NFT -> support PDEX3
  };
  await this.saveTxHistory({
    tx,
    version,
    tokenID,
  });
  if (typeof txHandler === "function") {
    await txHandler({
      txId: hash,
      rawTx: b58EncodedTx,
    });
  } else {
    let response;
    try {
      if (version === PrivacyVersion.ver3) {
        if (tokenID === PRVIDSTR) {
          response = await this.rpc.sendRawTx(b58EncodedTx)
        } else {
          response = await this.rpc.sendRawTxCustomTokenPrivacy(b58EncodedTx)
        }
      } else {
        response = await this.rpcTxService.apiPushTx({
          rawTx: b58EncodedTx,
        });
      }
      if (!response) {
        throw new CustomError(
            ErrorObject.FailPushRawTxToPubsub,
            ErrorObject.FailPushRawTxToPubsub.description
        );
      }
    } catch (error) {
      throw error;
    }
  }
  await this.updateProgressTx(95, "Saving Records");
  let taskSpendingCoins = [];
  if (!!inputForTx.inputCoinStrs) {
    taskSpendingCoins.push(
      this.setSpendingCoinsStorage({
        coins: inputForTx.inputCoinStrs,
        tokenID: PRVIDSTR,
        txId: hash,
        version,
      })
    );
  }
  if (!!inputForToken.inputCoinStrs && tokenID !== PRVIDSTR) {
    taskSpendingCoins.push(
      this.setSpendingCoinsStorage({
        coins: inputForToken.inputCoinStrs,
        tokenID: tokenID,
        txId: hash,
        version,
      })
    );
  }
  await Promise.all(taskSpendingCoins);
  if (typeof transactCallback === "function") {
    await transactCallback(tx);
  }
  return tx;
}

async function send(encodedTx, isToken) {
  new Validator("isToken", isToken).boolean();
  new Validator("encodedTx", encodedTx).required();
  if (this.offlineMode) {
    return { offline: true };
  }
  let response;
  if (isToken) {
    console.log("isToken", isToken);
    response = await this.rpc.sendRawTxCustomTokenPrivacy(encodedTx);
  } else {
    response = await this.rpc.sendRawTx(encodedTx);
  }
  return response;
}

export default {
  send,
  transact,
  waitTx,
  sleep,
  sleepCapped,
};
