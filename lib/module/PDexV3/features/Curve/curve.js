import { BurningPLGForDepositToSCRequestMeta } from "@lib/core";
import { MAX_FEE_PER_TX } from "@lib/module/Account";
import { camelCaseKeys } from "@lib/utils/camelCaseKeys";
import { PrivacyVersion, Validator } from "@lib/wallet";
import curveHistory from "./curve.history";

async function getCurveTokens() {
  let tokens = [];
  try {
    tokens = await this.rpcApiService.apiGetCurveTokens();
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

async function getQuoteCurve(data) {
  let result = {};
  try {
    let res = await this.rpcApiService.apiGetQuoteCurve({
      ...data,
    });
    if (!res) {
      return result;
    }
    result = camelCaseKeys(res);
  } catch (error) {
    throw error;
  }
  return result;
}

async function estimateCurveTradingFee(data) {
  let result = {};
  try {
    const walletAddress = this.getPaymentKey();
    let res = await this.rpcApiService.apiEstimateCurveTradingFee({
      ...data,
      walletAddress,
    });
    if (!res) {
      return result;
    }
    result = camelCaseKeys(res);
    const { privacyFees, id } = result;
    result = {
      ...result,
      tradeID: id,
      originalTradeFee: privacyFees?.level1,
    };
  } catch (error) {
    throw error;
  }
  return result;
}

async function createAndSendTradeRequestCurveTx({
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
      srcQties,
      expectedDestAmt,
    } = tradePayload;
    new Validator("createAndSendBurningRequestCurveTx-feeToken", feeToken)
      .required()
      .string();
    new Validator("createAndSendBurningRequestCurveTx-tradeID", tradeID)
      .required()
      .number();
    new Validator("createAndSendBurningRequestCurveTx-srcTokenID", srcTokenID)
      .required()
      .string();
    new Validator("createAndSendBurningRequestCurveTx-destTokenID", destTokenID)
      .required()
      .string();
    new Validator("createAndSendBurningRequestCurveTx-srcQties", srcQties)
      .required()
      .string();
    new Validator(
      "createAndSendBurningRequestCurveTx-expectedDestAmt",
      expectedDestAmt
    )
      .required()
      .string();
    new Validator(
      "createAndSendBurningRequestCurveTx-originalBurnAmount",
      originalBurnAmount
    )
      .required()
      .amount();
    new Validator("createAndSendBurningRequestCurveTx-tokenID", tokenID)
      .required()
      .string();
    new Validator("createAndSendBurningRequestCurveTx-signKey", signKey)
      .required()
      .string();
    new Validator("createAndSendBurningRequestCurveTx-feeAddress", feeAddress)
      .required()
      .string();
    new Validator("createAndSendBurningRequestCurveTx-tradeFee", tradeFee)
      .required()
      .amount();
    new Validator("createAndSendBurningRequestCurveTx-info", info).string();
    console.log("burningPayload", burningPayload);
    console.log("tradePayload", tradePayload);
    const version = PrivacyVersion.ver2;
    const dataSubmit = {
      tradeID,
      paymentAddress: this.getPaymentKey(),
      srcTokenID,
      destTokenID,
      expectedDestAmt,
      srcQties,
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
        burningType: BurningPLGForDepositToSCRequestMeta,
        version,
        burningCallback: async (burningTx) => {
          const { txId } = burningTx;
          console.log("burningTx", txId);
          const response = await this.rpcApiService.apiSubmitCurveTradingTx({
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
  estimateCurveTradingFee,
  createAndSendTradeRequestCurveTx,
  getCurveTokens,
  getQuoteCurve,
  ...curveHistory,
};
