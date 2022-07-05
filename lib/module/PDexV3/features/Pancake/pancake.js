import { BurningPBSCForDepositToSCRequestMeta } from "@lib/core";
import { MAX_FEE_PER_TX } from "@lib/module/Account";
import { camelCaseKeys } from "@lib/utils/camelCaseKeys";
import { PrivacyVersion, Validator } from "@lib/wallet";
import pancakeHistory from "./pancake.history";

async function getPancakeTokens() {
  let tokens = [];
  try {
    tokens = await this.rpcApiService.apiGetPancakeTokens();
    tokens = tokens.map((t) => {
      const token = camelCaseKeys(t);
      return {
        ...token,
        tokenID: t?.ID,
      };
    });
  } catch (error) {
    throw error;
  }
  return tokens;
}

async function estimatePancakeTradingFee(data) {
  let result = {};
  try {
    const walletAddress = this.getPaymentKey();
    let res = await this.rpcApiService.apiEstimatePancakeTradingFee({
      ...data,
      walletAddress,
    });
    if (!res) {
      return result;
    }
    result = camelCaseKeys(res);
    const { privacyFees, tokenFees, estUnifiedFee, id } = result;
    result = {
      ...result,
      tradeID: id,
      isUseTokenFee: tokenFees && tokenFees?.level1 ? true : false,
      originalTradeFee:
        privacyFees?.level1 ||
        parseFloat(tokenFees?.level1) + parseFloat(estUnifiedFee?.fee),
    };
  } catch (error) {
    throw error;
  }
  return result;
}

async function createAndSendTradeRequestPancakeTx({
  burningPayload,
  tradePayload,
}) {
  let tx;
  try {
    const {
      originalBurnAmount,
      tokenID,
      signKey,
      feeAddress,
      tradeFee,
      feeToken,
      info,
    } = burningPayload;
    const {
      tradeID,
      srcTokenID,
      destTokenID,
      paths,
      srcQties,
      expectedDestAmt,
      isNative,
      userFeeSelection,
    } = tradePayload;
    new Validator("createAndSendBurningRequestPancakeTx-feeToken", feeToken)
      .required()
      .string();
    new Validator("createAndSendBurningRequestPancakeTx-isNative", isNative)
      .required()
      .boolean();
    new Validator("createAndSendBurningRequestPancakeTx-tradeID", tradeID)
      .required()
      .number();
    new Validator("createAndSendBurningRequestPancakeTx-srcTokenID", srcTokenID)
      .required()
      .string();
    new Validator(
      "createAndSendBurningRequestPancakeTx-destTokenID",
      destTokenID
    )
      .required()
      .string();
    new Validator("createAndSendBurningRequestPancakeTx-paths", paths)
      .required()
      .string();
    new Validator("createAndSendBurningRequestPancakeTx-srcQties", srcQties)
      .required()
      .string();
    new Validator(
      "createAndSendBurningRequestPancakeTx-expectedDestAmt",
      expectedDestAmt
    )
      .required()
      .string();
    new Validator(
      "createAndSendBurningRequestPancakeTx-originalBurnAmount",
      originalBurnAmount
    )
      .required()
      .amount();
    new Validator("createAndSendBurningRequestPancakeTx-tokenID", tokenID)
      .required()
      .string();
    new Validator("createAndSendBurningRequestPancakeTx-signKey", signKey)
      .required()
      .string();
    new Validator("createAndSendBurningRequestPancakeTx-feeAddress", feeAddress)
      .required()
      .string();
    new Validator("createAndSendBurningRequestPancakeTx-tradeFee", tradeFee)
      .required()
      .amount();
    new Validator(
      "createAndSendBurningRequestPancakeTx-userFeeSelection",
      userFeeSelection
    )
      .required()
      .number();
    new Validator("createAndSendBurningRequestPancakeTx-info", info).string();
    console.log("burningPayload", burningPayload);
    console.log("tradePayload", tradePayload);
    const version = PrivacyVersion.ver2;
    const dataSubmit = {
      tradeID,
      paymentAddress: this.getPaymentKey(),
      srcTokenID,
      destTokenID,
      isNative,
      paths,
      srcQties,
      expectedDestAmt,
      tradingFee: tradeFee,
      feeToken,
      userFeeSelection,
    };
    await this.account.createAndSendBurningRequestTx({
      transfer: {
        fee: MAX_FEE_PER_TX,
        tokenID,
        prvPayments: [
          {
            paymentAddress: feeAddress,
            amount: tradeFee,
          },
        ],
        info,
      },
      extra: {
        remoteAddress: signKey,
        burnAmount: originalBurnAmount,
        burningType: BurningPBSCForDepositToSCRequestMeta,
        burningMetadata: {
          ...dataSubmit,
        },
        version,
        burningCallback: async (burningTx) => {
          const { txId } = burningTx;
          console.log("burningTx", txId);
          const response = await this.rpcApiService.apiSubmitPancakeTradingTx({
            burnTxID: txId,
            ...dataSubmit,
          });
          tx = {
            burningTx,
            response,
          };
          try {
            const tokenIDs = [srcTokenID, destTokenID];
            await this?.setStorageSwapTokenIDs({ version, tokenIDs });
          } catch (error) {
            console.log(error);
          }
        },
      },
    });
  } catch (error) {
    throw error;
  }
  return tx;
}

async function createAndSendTradeRequestPancakeTxForUnifiedToken({
  burningPayload,
  tradePayload,
}) {
  let tx;
  try {
    const {
      originalBurnAmount,
      tokenID,
      incTokenID,
      signKey,
      feeAddress,
      tradeFee,
      feeToken,
      info,
      expectedAmt,
    } = burningPayload;
    const {
      tradeID,
      srcTokenID,
      destTokenID,
      paths,
      srcQties,
      expectedDestAmt,
      isNative,
      userFeeSelection,
    } = tradePayload;
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-feeToken",
      feeToken
    )
      .required()
      .string();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-expectedAmt",
      expectedAmt
    ).required();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-isNative",
      isNative
    )
      .required()
      .boolean();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-tradeID",
      tradeID
    )
      .required()
      .number();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-srcTokenID",
      srcTokenID
    )
      .required()
      .string();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-destTokenID",
      destTokenID
    )
      .required()
      .string();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-paths",
      paths
    )
      .required()
      .string();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-srcQties",
      srcQties
    )
      .required()
      .string();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-expectedDestAmt",
      expectedDestAmt
    )
      .required()
      .string();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-originalBurnAmount",
      originalBurnAmount
    )
      .required()
      .amount();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-tokenID",
      tokenID
    )
      .required()
      .string();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-signKey",
      signKey
    )
      .required()
      .string();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-feeAddress",
      feeAddress
    )
      .required()
      .string();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-tradeFee",
      tradeFee
    )
      .required()
      .amount();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-info",
      info
    ).string();
    new Validator(
      "createAndSendTradeRequestPancakeTxForUnifiedToken-incTokenID",
      incTokenID
    ).required();
    new Validator(
      "createAndSendBurningRequestPancakeTx-userFeeSelection",
      userFeeSelection
    )
      .required()
      .number();
    console.log("burningPayload", burningPayload);
    console.log("tradePayload", tradePayload);
    const version = PrivacyVersion.ver2;
    const dataSubmit = {
      tradeID,
      paymentAddress: this.getPaymentKey(),
      srcTokenID,
      destTokenID,
      isNative,
      paths,
      srcQties,
      expectedDestAmt,
      tradingFee: tradeFee,
      feeToken,
      userFeeSelection,
    };
    await this.account.createAndSendBurnUnifiedTokenRequestTx({
      transfer: {
        fee: MAX_FEE_PER_TX,
        tokenID,
        prvPayments: [
          {
            paymentAddress: feeAddress,
            amount: MAX_FEE_PER_TX,
          },
        ],
        tokenPayments: [
          {
            paymentAddress: feeAddress,
            amount: tradeFee,
          },
        ],
        info,
      },
      extra: {
        burningInfos: [
          {
            incTokenID: incTokenID,
            burningAmount: originalBurnAmount,
            expectedAmount: expectedAmt,
            remoteAddress: signKey,
          },
        ],
        isDepositToSC: true,
        version,
        burningCallback: async (burningTx) => {
          const { txId } = burningTx;
          console.log("burningTx", txId);
          const response = await this.rpcApiService.apiSubmitPancakeTradingTx({
            burnTxID: txId,
            ...dataSubmit,
          });
          tx = {
            burningTx,
            response,
          };
          try {
            const tokenIDs = [srcTokenID, destTokenID];
            await this?.setStorageSwapTokenIDs({ version, tokenIDs });
          } catch (error) {
            console.log(error);
          }
        },
      },
    });
  } catch (error) {
    throw error;
  }
  return tx;
}

export default {
  getPancakeTokens,
  estimatePancakeTradingFee,
  createAndSendTradeRequestPancakeTx,
  createAndSendTradeRequestPancakeTxForUnifiedToken,
  ...pancakeHistory,
};
