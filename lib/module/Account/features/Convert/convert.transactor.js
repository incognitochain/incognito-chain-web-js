import { PRVIDSTR } from '@lib/core';
import { TX_STATUS, TX_TYPE } from '@lib/module/Account/account.constants';
import Validator from '@lib/utils/validator';
import { isEmpty } from 'lodash';
import { base64Encode, stringToBytes } from '@lib/privacy/utils';
import bn from 'bn.js';
import { CustomError, ErrorObject } from '@lib/common/errorhandler';
import { prepareInputForConvertTxV2 } from '@lib/module/Account/features/CoinsV1/coins.utils';
import { newParamTxV2, newTokenParamV2 } from '@lib/module/Account/account.utils';
import { wasm } from '@lib/wasm';
import { checkDecode } from '@lib/common/base58';
import { PrivacyVersion } from '@lib/core/constants';
import { MAX_FEE_PER_TX } from '@lib/module/Account/account.constants';

async function transactConvert({
  transfer: {
    fee = MAX_FEE_PER_TX,
    info = "",
    tokenID = PRVIDSTR,
    prvPayments = [],
    tokenPayments,
  } = {},
  extra: { txType = TX_TYPE.CONVERT, version = PrivacyVersion.ver1 } = {},
}) {
  tokenID = tokenID || PRVIDSTR;
  new Validator("fee", fee).required().number();

  if (!isEmpty(info)) {
    info = base64Encode(stringToBytes(info)); /** encode base64 info */
  }

  const account = this;
  const isTokenConvert = tokenID !== PRVIDSTR;
  const metadata = null;

  /** prepare input for tx */
  try {
    const paramConvert = { fee, tokenID, account, version };
    await this.updateProgressTx(10, "Selecting Coins");
    const inputForTx = await prepareInputForConvertTxV2(paramConvert);
    const inputCoins = isTokenConvert
      ? inputForTx?.inputCoinsForFee
      : inputForTx?.inputCoinsToSpent;
    let inputTokenCoins = [];
    let totalPRVConvert = new bn(0);
    let totalTokenConvert = new bn(0);
    if (isTokenConvert) {
      inputTokenCoins = inputForTx?.inputCoinsToSpent;
      inputTokenCoins.forEach(coin => {
        totalTokenConvert = totalTokenConvert.add(new bn(coin.Value));
      })
    } else {
      inputCoins.forEach(coin => {
        totalPRVConvert = totalPRVConvert.add(new bn(coin.Value));
      })
      totalPRVConvert.sub(new bn(fee));
    }
    if (inputCoins.length === 0) {
      throw new CustomError(
        ErrorObject.EmptyUTXO,
        "Error: Dont have UTXO PRV v1"
      );
    }
    await this.updateProgressTx(30, "Packing Parameters");
    let txParams = newParamTxV2(
      this.key,
      prvPayments,
      inputCoins,
      fee,
      null,
      null,
      info,
      inputForTx.coinsForRing
    );
    if (isTokenConvert) {
      if (inputTokenCoins.length === 0) {
        throw new CustomError(
          ErrorObject.EmptyUTXO,
          "Error: Dont have UTXO pToken v1"
        );
      }
      txParams.TokenParams = newTokenParamV2(
        tokenPayments,
        inputTokenCoins,
        tokenID,
        null
      );
    }
    await this.updateProgressTx(40, "Getting LockTime");
    const theirTime = await this.rpc.getNodeTime();
    let txParamsJson = JSON.stringify(txParams);
    console.debug('txParams: ', txParamsJson)
    await this.updateProgressTx(60, "Signing Transaction");
    const wasmResult = await wasm.createConvertTx(txParamsJson, theirTime);
    /** create raw tx success */
    let { b58EncodedTx, hash, outputs } = JSON.parse(wasmResult);

    console.log('hash: ', hash);
    console.log('b58EncodedTx: ', b58EncodedTx);

    if (b58EncodedTx === null || b58EncodedTx === "") {
      throw new CustomError(
        ErrorObject.InitNormalTxErr,
        "Can not init transaction transferring PRV"
      );
    }
    let tempBuf = checkDecode(b58EncodedTx).bytesDecoded;
    let theString = String.fromCharCode.apply(null, tempBuf);
    let txObj = JSON.parse(theString);
    txObj.Encoded = b58EncodedTx;
    const paymentAddress = this.getPaymentAddress();
    let tx = {
      txId: hash,
      tx: txObj,
      hash,
      outputs,
      amount: totalPRVConvert.toString(),
      inputs: inputCoins,
      receivers: [paymentAddress],
      tokenID,
      tokenAmount: totalTokenConvert.toString(),
      tokenInputs: inputTokenCoins,
      tokenReceivers: [paymentAddress],
      isPrivacy: true,
      metadata,
      txType,
      status: TX_STATUS.PROCESSING,
      info,
      remainInputCoins: inputForTx.remainInputCoins
    };

    await this.updateProgressTx(70, "Storage Coins");
    this.saveTxHistory({
      tx,
      version: PrivacyVersion.ver2,
      tokenID,
    }).then();
    // set pending tx
    const inputV1 = isTokenConvert
      ? txParams?.TokenParams?.InputCoins
      : txParams?.InputCoins;

    const tasks = [
      await this.setSpendingCoinsStorage({
        tokenID: tokenID,
        coins: inputV1 || [],
        version: PrivacyVersion.ver1,
        txId: hash,
      }),
    ]

    console.log('Convert: InputV1 ', inputV1)
    if (isTokenConvert) {
      const inputV2 = txParams?.InputCoins;
      console.log('Convert: InputV2 ', inputV2)
      tasks.push(
        await this.setSpendingCoinsStorage({
          tokenID: PRVIDSTR,
          coins: inputV2,
          txId: hash,
          version: PrivacyVersion.ver2
        }),
      )
    }
    await Promise.all(tasks);
    await this.updateProgressTx(80, "Submit Rawdata Pubsub");
    // pubsub
    try {
      const pushRawTxToPubsub = await this.rpcTxService.apiPushTx({
        rawTx: b58EncodedTx,
      });
      console.log("pushRawTxToPubsub: ", pushRawTxToPubsub);
      if (!pushRawTxToPubsub) {
        throw new CustomError(
          ErrorObject.FailPushRawTxToPubsub,
          "Can not send transaction"
        );
      }
    } catch (error) {
      throw error;
    }
    await this.updateProgressTx(100, "Completed");
    return tx;
  } catch (e) {
    throw e;
  }
}

export default {
  transactConvert,
}
