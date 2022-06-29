import { pdexv3 } from "@lib/core/constants";
import { getBurningAddress, PRVIDSTR } from "@lib/core";
import bn from "bn.js";
import { Validator } from "@lib/wallet";
import { TX_TYPE } from "@lib/module/Account";

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
    await this.account?.updateProgressTx(10, "Generating Metadata");
    let burningAddress = await getBurningAddress(this.rpc);
    let isToken = tokenIDToSell !== PRVIDSTR;
    let receivingTokens = [tokenIDToSell, tokenIDToBuy];
    const isTradingFeeInPRV = feetoken === PRVIDSTR;
    if (isToken && isTradingFeeInPRV && tokenIDToBuy !== PRVIDSTR) {
      receivingTokens.push(PRVIDSTR);
    }
    let otaReceivers = await Promise.all(
      receivingTokens.map(() => this.getOTAReceive())
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
        extra: { metadata, version, txType: TX_TYPE.SWAP },
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
        extra: { metadata, version, txType: TX_TYPE.SWAP },
      });
    }
    try {
      const tokenIDs = [tokenIDToBuy, tokenIDToSell];
      await this?.setStorageSwapTokenIDs({ version, tokenIDs });
    } catch (error) {
      console.log(error);
    }
    await this.account?.updateProgressTx(100, "Completed");
    return result;
  } catch (e) {
    throw e;
  }
}

export default {
  createAndSendSwapRequestTx,
};
