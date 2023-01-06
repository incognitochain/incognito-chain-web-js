import { pdexv3 } from "@lib/core/constants";
import { getBurningAddress, PRVIDSTR } from "@lib/core";
import bn from "bn.js";
import { Validator } from "@lib/wallet";
import { TX_TYPE } from "@lib/module/Account";
import {FAKE_CALL_CONTRACT_PDEX} from "@lib/module/PDexV3/features/Swap/swap.storage";
import {TxStatus} from "@lib/module/PDexV3/features/Swap/swap.combine";

/**
 * @param {String} params.extra.tokenIDToBuy - case INTER-SWAP, tokenIDToBuy = midToken
 * @param {Object} params.extra.interSwapData {
 *     midOTA: string;
 *     sellTokenID: string;
 *     buyTokenID: string;
 *     midToken: string;
 *     amountOutRaw: string;
 *     slippage: string;
 *     pAppNetwork: string;
 *     pAppName: string;
 *     inputAddress: string;
 *     feeAddressShardID: number;
 *  }
 */
async function createAndSendSwapRequestTx(params) {
  try {
    const {
      transfer: { fee, info = "" },
      extra: {
        tokenIDToSell,
        sellAmount,
        tokenIDToBuy,
        tradingFee,
        tradePath,
        feetoken,
        version,
        minAcceptableAmount,
        sellAmountText,
        buyAmountText,
        interSwapData,
      },
    } = params;
    new Validator("createAndSendOrderRequestTx-fee", fee).required().amount();
    new Validator("createAndSendOrderRequestTx-info", info).string();
    new Validator("createAndSendOrderRequestTx-tokenIDToBuy", tokenIDToBuy)
      .required()
      .string();
    new Validator("createAndSendOrderRequestTx-sellAmount", sellAmount)
      .required()
      .amount();
    new Validator("createAndSendOrderRequestTx-tradingFee", tradingFee)
      .required()
      .amount();
    new Validator("createAndSendOrderRequestTx-tokenIDToSell", tokenIDToSell)
      .required()
      .string();
    new Validator("createAndSendOrderRequestTx-tradePath", tradePath)
      .required()
      .array();
    new Validator("createAndSendOrderRequestTx-feetoken", feetoken)
      .required()
      .string();
    new Validator("createAndSendOrderRequestTx-version", version)
      .required()
      .number();
    new Validator(
      "createAndSendOrderRequestTx-minAcceptableAmount",
      minAcceptableAmount
    )
      .required()
      .amount();
    new Validator("createAndSendOrderRequestTx-sellAmountText", sellAmountText)
        .required()
        .string();
    new Validator("createAndSendOrderRequestTx-buyAmountText", buyAmountText)
        .required()
        .string();
    await this.account?.updateProgressTx(10, "Generating Metadata");
    let burningAddress = await getBurningAddress(this.rpc);
    let isToken = tokenIDToSell !== PRVIDSTR;
    let receivingTokens = [tokenIDToSell, tokenIDToBuy];
    const isTradingFeeInPRV = feetoken === PRVIDSTR;
    if (isToken && isTradingFeeInPRV && tokenIDToBuy !== PRVIDSTR) {
      receivingTokens.push(PRVIDSTR);
    }

    const otaReceivers = await Promise.all(
        receivingTokens.map((tokenID, index) => {
          // case INTER_SWAP => buyTokenID = midToken, OTA for buyTokenID is midOTA
          if (interSwapData && index === 1) {
            return interSwapData.midOTA;
          }
          return this.getOTAReceive();
        })
    );

    let receiver = {};
    receivingTokens.forEach((t, index) => (receiver[t] = otaReceivers[index]));
    // prepare meta data for tx
    let metadata = {
      TradePath: tradePath,
      TokenToSell: tokenIDToSell,
      SellAmount: sellAmount,
      TradingFee: tradingFee,
      Receiver: receiver,
      Type: pdexv3.TradeRequestMeta,
      MinAcceptableAmount: minAcceptableAmount,
      FeeToken: feetoken,
      TokenToBuy: tokenIDToBuy,
    };
    let result, tokenPayments;
    let prvPayments = [];

    let txId, rawTx;
    const txHandler = interSwapData ? (tx) => {
      txId = tx.txId;
      rawTx = tx.rawTx;
    } : null;

    if (isToken) {
      if (isTradingFeeInPRV) {
        // pay fee with PRV
        prvPayments = [
          {
            PaymentAddress: burningAddress,
            Amount: new bn(tradingFee).toString(),
            Message: "",
          },
        ];
        tokenPayments = [
          {
            PaymentAddress: burningAddress,
            Amount: new bn(sellAmount).toString(),
            Message: info,
          },
        ];
      } else {
        tokenPayments = [
          {
            PaymentAddress: burningAddress,
            Amount: new bn(sellAmount).add(new bn(tradingFee)).toString(),
            Message: info,
          },
        ];
      }
      result = await this.account?.transact({
        transfer: {
          fee,
          info,
          tokenID: tokenIDToSell,
          prvPayments,
          tokenPayments,
        },
        extra: { metadata, version, txType: TX_TYPE.SWAP, txHandler },
      });
    } else {
      prvPayments = [
        {
          PaymentAddress: burningAddress,
          Amount: new bn(sellAmount).add(new bn(tradingFee)).toString(),
          Message: info,
        },
      ];
      result = await this.account?.transact({
        transfer: { prvPayments, fee, info },
        extra: { metadata, version, txType: TX_TYPE.SWAP, txHandler },
      });
    }

    console.log('CreateAndSendSwapRequestTx InterSwapData: ', interSwapData)

    const statusPayload = {
      callContract: FAKE_CALL_CONTRACT_PDEX,
      txHash: result.txId || result.txHash,
      sellTokenID: tokenIDToSell,
      buyTokenID: tokenIDToBuy,
      sellAmountText,
      buyAmountText,
      interPAppName: interSwapData?.pAppName || '',
      interPAppNetwork: interSwapData?.pAppNetwork || '',
    };

    await this.setStorageSwapHistoryByCallContract({ ...statusPayload });

    // trade PDEX, tx auto push coin-service
    // trade interswap submit tx to backend
    if (!!interSwapData) {
      try {
        await this.sendTxInterSwap({
          interSwapData,
          txID: txId,
          rawTx,
          statusPayload,
          version
        });
      } catch (e) {
        throw e;
      }
    }

    await this.account?.updateProgressTx(100, "Completed");
    return result;
  } catch (e) {
    throw e;
  }
}

async function sendTxInterSwap({ interSwapData, txID, rawTx, statusPayload, version }) {
  new Validator("sendTxInterSwap-interSwapData", interSwapData).required().object();
  new Validator("sendTxInterSwap-statusPayload", statusPayload).required().object();
  new Validator("sendTxInterSwap-version", version).required().number();

  const { midOTA, midToken, sellTokenID, buyTokenID } = interSwapData;

  new Validator("sendTxInterSwap-midOTA", midOTA).required().string();
  new Validator("sendTxInterSwap-midToken", midToken).required().string();
  new Validator("sendTxInterSwap-txID", txID).required().string();
  new Validator("sendTxInterSwap-rawTx", rawTx).required().string();

  const accountShardID = this.account.getShardID()
  try {
    const { feeAddressShardID } = interSwapData;
    const [refundFeeOTA, refundOTA, sellTokenOTA, buyTokenOTA] = await Promise.all([
      this.account.getOTAReceiveWithCfg({ senderShardID: feeAddressShardID }),
      this.account.getOTAReceiveWithCfg({ senderShardID: accountShardID }),
      this.getOTAReceive(),
      this.getOTAReceive(),
    ]);

    const payload = {
      txHash: txID,
      txRaw: rawTx,
      sellTokenID,
      midTokenID: midToken,
      buyTokenID,
      amountOutRaw: interSwapData.amountOutRaw,
      slippage: interSwapData.slippage || '0',
      pAppNetwork: interSwapData.pAppNetwork,
      pAppName: interSwapData.pAppName,
      refundOTA,
      refundFeeOTA,
      sellTokenOTA,
      buyTokenOTA,
      inputAddress: interSwapData.inputAddress,
      shardID: `${accountShardID}`,
    }
    console.log('SUBMIT INTER SWAP PAYLOAD: ', payload)
    await this.webAppService.submitInterSwapTx(payload)
  } catch (e) {
    console.log('SUBMIT INTER SWAP TX WITH ERROR', e);
    await this.swapRemoveFailedStorageTx({
      statusPayload,
      sellTokenID,
      buyTokenID,
      txID,
      version
    });
    throw e;
  }
}

async function swapRemoveFailedStorageTx({ statusPayload, sellTokenID, buyTokenID, txID, version }) {
  new Validator("swapRemoveFailedStorageTx-statusPayload", statusPayload)
      .required()
      .object();
  new Validator("swapRemoveFailedStorageTx-sellTokenID", sellTokenID)
      .required()
      .string();
  new Validator("swapRemoveFailedStorageTx-buyTokenID", buyTokenID)
      .required()
      .string();
  new Validator("swapRemoveFailedStorageTx-txID", txID)
      .required()
      .string();
  new Validator("swapRemoveFailedStorageTx-version", version)
      .required()
      .number();

  // update status
  await this.setStorageSwapHistoryByCallContract({
    ...statusPayload,
    defaultStatus: TxStatus.rejected,
  });

  // remove cache pending coins
  // remove history token detail
  const params = {
    tokenIDs: [sellTokenID, buyTokenID],
    txIDs: [txID],
    version
  }
  const tasks = [
    await this.account.removeTxHistoryByTxIDs(params),
    await this.account.removeSpendingCoinsByTxIDs(params),
  ];
  await Promise.all(tasks)
}

export default {
  createAndSendSwapRequestTx,
  sendTxInterSwap,
  swapRemoveFailedStorageTx
};
