import { base64Encode, stringToBytes } from "@lib/privacy/utils";
import { MaxInputNumberForDefragment } from "@lib/tx/constants";
import Validator from "@lib/utils/validator";
import {
  MAX_FEE_PER_TX,
  NUMB_OF_OTHER_PKS,
  TX_STATUS,
  TX_TYPE,
} from "@lib/module/Account/account.constants";
import { coinConsolidator } from "@lib/services/coinChooser";
import { CustomError, ErrorObject } from "@lib/common/errorhandler";
import { wasm } from "@lib/wasm";
import { checkDecode } from "@lib/common/base58";
import { PRVIDSTR } from "@lib/core";
import {
  newParamTxV2,
  newTokenParamV2,
  prepareInputForTxV2,
} from "@lib/module/Account/account.utils";
import bn from "bn.js";

async function finalizeConsolidate({
  txParams,
  isToken,
  version,
  tokenID,
  fee,
}) {
  new Validator("finalizeConsolidate-txParams", txParams).required().object();
  new Validator("finalizeConsolidate-isToken", isToken).required().boolean();
  new Validator("finalizeConsolidate-version", version).required().number();
  new Validator("finalizeConsolidate-tokenID", tokenID).required().string();
  new Validator("finalizeConsolidate-fee", fee).required().amount();
  try {
    let txParamsJson = JSON.stringify(txParams);
    let theirTime = await this.rpc.getNodeTime();
    let wasmResult = await wasm.createTransaction(txParamsJson, theirTime);
    let { b58EncodedTx, hash, outputs, senderSeal } = JSON.parse(wasmResult);
    console.log(`TX Hash : ${hash} - Seal : ${senderSeal}`);
    if (b58EncodedTx === null || b58EncodedTx === "") {
      throw new CustomError(
        ErrorObject.InitNormalTxErr,
        ErrorObject.InitNormalTxErr.description
      );
    }
    let tempBuf = checkDecode(b58EncodedTx).bytesDecoded;
    let theString = String.fromCharCode.apply(null, tempBuf);
    let txObj = JSON.parse(theString);
    txObj.Encoded = b58EncodedTx;
    let tx = {
      txId: hash,
      tx: txObj,
      hash,
      outputs,
      amount: "",
      inputs: [],
      receivers: "",
      tokenID,
      tokenAmount: "",
      tokenInputs: [],
      tokenReceivers: [],
      isPrivacy: true,
      metadata: null,
      txType: TX_TYPE.CONSOLIDATE,
      status: TX_STATUS.PROCESSING,
      fee,
      senderSeal,
    };
    await this.saveTxHistory({
      tx,
      version,
      tokenID,
    });
    let response;
    try {
      response = await this.rpcTxService.apiPushTx({
        rawTx: b58EncodedTx,
      });
      if (!response) {
        throw new CustomError(
          ErrorObject.FailPushRawTxToPubsub,
          ErrorObject.FailPushRawTxToPubsub.description
        );
      }
    } catch (error) {
      throw error;
    }

    // if (isToken) {
    //   await this.waitTx(hash, 3);
    // }
    let taskSpendingCoins = [];
    if (!!txParams?.InputCoins) {
      taskSpendingCoins.push(
        this.setSpendingCoinsStorage({
          coins: txParams?.InputCoins,
          tokenID: PRVIDSTR,
          txId: hash,
          version,
        })
      );
    }
    if (
      tokenID !== PRVIDSTR &&
      !!txParams?.TokenParams &&
      !!txParams?.TokenParams?.InputCoins
    ) {
      taskSpendingCoins.push(
        this.setSpendingCoinsStorage({
          coins: txParams?.TokenParams?.InputCoins,
          tokenID: tokenID,
          txId: hash,
          version,
        })
      );
    }
    await Promise.all(taskSpendingCoins);
    return tx;
  } catch (error) {
    console.log("finalizeConsolidate ERROR", error);
    throw error;
  }
}

async function prepareInputConsolidate({
  fee,
  tokenID,
  numOfOtherPks = NUMB_OF_OTHER_PKS,
  maxInputs,
  version,
} = {}) {
  try {
    new Validator("prepareInputConsolidate-fee", fee).required().amount();
    new Validator("prepareInputConsolidate-tokenID", tokenID)
      .required()
      .string();
    new Validator("prepareInputConsolidate-numOfOtherPks", numOfOtherPks)
      .required()
      .number();
    new Validator("prepareInputConsolidate-maxInputs", maxInputs)
      .required()
      .number();
    new Validator("prepareInputConsolidate-version", version)
      .required()
      .number();
    const params = {
      tokenID,
      version,
    };
    const spendableCoins = await this.getUnspentCoinsExcludeSpendingCoins(params);
    const threshold = tokenID === PRVIDSTR ? fee : 100;
    const groupedCoins = coinConsolidator.coinsToSpend(
      spendableCoins,
      threshold,
      maxInputs
    );
    if (groupedCoins.length === 0 || groupedCoins[0].length === 0) {
      return {};
    }
    const shardID = this.getShardID();
    const paramsCC = {
      tokenID,
      shardID,
      version,
      limit: numOfOtherPks * spendableCoins.length,
    };
    let coinsForRing;
    try {
      coinsForRing = await this.rpcCoinService.apiGetRandomCommitments(
        paramsCC
      );
      coinsForRing.Indexes = coinsForRing.CommitmentIndices;
      coinsForRing.AssetTags = coinsForRing.AssetTags || [];
    } catch (error) {
      console.log("ERROR apiGetRandomCommitments", error);
      throw new CustomError(
        ErrorObject.GetFailRandomCommitments,
        ErrorObject.GetFailRandomCommitments.description,
        error
      );
    }

    return {
      groupedInputs: groupedCoins,
      coinsForRing,
    };
  } catch (error) {
    console.log("prepareInputConsolidate error", error);
    throw new CustomError(
      ErrorObject.PrepareInputConsolidateError,
      ErrorObject.PrepareInputConsolidateError.description,
      error
    );
  }
}

async function consolidate({
  transfer: { fee = MAX_FEE_PER_TX, tokenID } = {},
  extra: { inputsPerTx = MaxInputNumberForDefragment, version } = {},
}) {
  new Validator("consolidate-fee", fee).required().amount();
  new Validator("consolidate-tokenID", tokenID).required().string();
  new Validator("consolidate-inputsPerTx", inputsPerTx).required().number();
  new Validator("consolidate-version", version).required().number();
  await this.updateProgressTx(20, `Analyzing Coins`);
  const info = base64Encode(stringToBytes("consolidate"));
  const isToken = tokenID !== PRVIDSTR;
  let { groupedInputs, coinsForRing } = await this.prepareInputConsolidate({
    fee,
    tokenID,
    version,
    numOfOtherPks: NUMB_OF_OTHER_PKS,
    maxInputs: inputsPerTx,
  });
  if (!groupedInputs) {
    console.log("No coin below threshold. End consolidate");
    return [];
  }
  await this.updateProgressTx(50, "Signing & Sending Transaction");
  let results = [];
  if (isToken) {
    // consolidate token: send & wait for each tx to confirm
    for (const inputs of groupedInputs) {
      const { inputCoinStrs: prvInputs, coinsForRing: prvCoinsForRing } =
        await prepareInputForTxV2({
          amountTransfer: new bn(0),
          fee,
          tokenID: PRVIDSTR,
          account: this,
          version,
        }); // lua coin prv de tra fee
      let txParams = newParamTxV2(
        this.key,
        [],
        prvInputs,
        fee,
        PRVIDSTR,
        null,
        info,
        prvCoinsForRing
      ); // tao tx params
      let tokenParams = newTokenParamV2([], inputs, tokenID, coinsForRing, {});
      txParams.TokenParams = tokenParams;
      let tx = await this.finalizeConsolidate({
        txParams,
        version,
        tokenID,
        isToken,
        fee,
      });
      tx = {
        ...tx,
        tokenInputs: inputs,
        tokenAmount: inputs
          .reduce(
            (totalAmount, coin) => totalAmount.add(new bn(coin.Value)),
            new bn(0)
          )
          .toString(),
        inputs: prvInputs,
        amount: fee,
      };
      await this.saveTxHistory({
        tx,
        version,
        tokenID,
      });
      results.push(tx);
    }
  } else {
    for (const inputs of groupedInputs) {
      const txParams = newParamTxV2(
        this.key,
        [],
        inputs,
        fee,
        null,
        null,
        info,
        coinsForRing
      );
      let tx;
      try {
        tx = await this.finalizeConsolidate({
          txParams,
          version,
          tokenID,
          isToken,
          fee,
        });
      } catch (error) {
        console.log("ERROR", error);
      }
      tx = {
        ...tx,
        inputs,
        amount: inputs
          .reduce(
            (totalAmount, coin) => totalAmount.add(new bn(coin.Value)),
            new bn(-fee)
          )
          .toString(),
      };
      await this.saveTxHistory({
        tx,
        version,
        tokenID,
      });
      results.push(tx);
    }
  }
  await this.updateProgressTx(100, "Done");
  return results;
}

export default {
  consolidate,
  finalizeConsolidate,
  prepareInputConsolidate,
};
