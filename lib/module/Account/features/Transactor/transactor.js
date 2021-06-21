import bn from "bn.js";
import Validator from "@lib/utils/validator";
import { base64Encode, stringToBytes } from "@lib/privacy/utils";
import { CustomError, ErrorObject } from "@lib/common/errorhandler";
import { PRVIDSTR } from "@lib/core";
import { wasm } from "@lib/wasm";
import { checkDecode } from "@lib/common/base58";
import {
  MAX_FEE_PER_TX,
  MAX_INPUT_PER_TX,
} from "@lib/module/Account/account.constants";
import {
  newParamTxV2,
  prepareInputForTxV2,
  newTokenParamV2,
} from "@lib/module/Account/account.utils";
import { TX_STATUS } from "@lib/module/Account/account.constants";

async function transact({
  transfer: {
    prvPayments = null,
    tokenPayments = null,
    fee = MAX_FEE_PER_TX,
    info = "",
    tokenID = PRVIDSTR,
    tokenParams = null,
  } = {},
  extra: {
    metadata = null,
    txHandler = null,
    txType,
    txHashHandler = null,
    version,
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
  info = base64Encode(stringToBytes(info));
  console.log(info);
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
      receiverPaymentAddrStr[i] = tokenPayments[i].PaymentAddress;
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
  let { b58EncodedTx, hash, outputs } = JSON.parse(wasmResult);
  console.log("b58EncodedTx: ", b58EncodedTx);
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
  txObj.Encoded = b58EncodedTx;
  console.log(90);
  await this.updateProgressTx(90, "Submitting Transaction");
  console.log("txObj", txObj);
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
      response = await this.rpcTxService.apiPushTx({
        rawTx: b58EncodedTx,
      });
      if (!response) {
        throw new CustomError(
          ErrorObject.FailPushRawTxToPubsub,
          "Can not send transaction"
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
  console.log("tx", tx.txId);
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
};