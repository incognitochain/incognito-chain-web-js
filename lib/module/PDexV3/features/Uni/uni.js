import { BurningPLGForDepositToSCRequestMeta } from "@lib/core";
import { MAX_FEE_PER_TX } from "@lib/module/Account";
import { camelCaseKeys } from "@lib/utils/camelCaseKeys";
import { PrivacyVersion, Validator } from "@lib/wallet";
import uniHistory from "./uni.history";

async function getUniTokens() {
  let tokens = [];
  try {
    tokens = await this.rpcApiService.apiGetUniTokens();
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

async function getQuote(data) {
  let result = {};
  try {
    let res = await this.rpcApiService.apiGetQuote({
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

async function estimateUniTradingFee(data) {
  let result = {};
  try {
    const walletAddress = this.getPaymentKey();
    let res = await this.rpcApiService.apiEstimateUniTradingFee({
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

async function createAndSendTradeRequestUniTx({
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
      fees,
      tradeID,
      srcTokenID,
      destTokenID,
      paths,
      srcQties,
      expectedDestAmt,
      percents,
      isMulti,
    } = tradePayload;
    new Validator("createAndSendBurningRequestUniTx-feeToken", feeToken)
      .required()
      .string();
    new Validator("createAndSendBurningRequestUniTx-tradeID", tradeID)
      .required()
      .number();
    new Validator("createAndSendBurningRequestUniTx-srcTokenID", srcTokenID)
      .required()
      .string();
    new Validator("createAndSendBurningRequestUniTx-destTokenID", destTokenID)
      .required()
      .string();
    new Validator("createAndSendBurningRequestUniTx-paths", paths)
      .required()
      .string();
    new Validator("createAndSendBurningRequestUniTx-srcQties", srcQties)
      .required()
      .string();
    new Validator(
      "createAndSendBurningRequestUniTx-expectedDestAmt",
      expectedDestAmt
    )
      .required()
      .string();
    new Validator("createAndSendBurningRequestUniTx-percents", percents)
      .required()
      .string();
    new Validator("createAndSendBurningRequestUniTx-isMulti", isMulti)
      .required()
      .boolean();
    new Validator(
      "createAndSendBurningRequestUniTx-originalBurnAmount",
      originalBurnAmount
    )
      .required()
      .amount();
    new Validator("createAndSendBurningRequestUniTx-tokenID", tokenID)
      .required()
      .string();
    new Validator("createAndSendBurningRequestUniTx-signKey", signKey)
      .required()
      .string();
    new Validator("createAndSendBurningRequestUniTx-feeAddress", feeAddress)
      .required()
      .string();
    new Validator("createAndSendBurningRequestUniTx-tradeFee", tradeFee)
      .required()
      .amount();
    new Validator("createAndSendBurningRequestUniTx-info", info).string();
    console.log("burningPayload", burningPayload);
    console.log("tradePayload", tradePayload);
    const version = PrivacyVersion.ver2;
    const dataSubmit = {
      tradeID,
      paymentAddress: this.getPaymentKey(),
      srcTokenID,
      destTokenID,
      paths,
      fees,
      percents,
      isMulti,
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
          const response = await this.rpcApiService.apiSubmitUniTradingTx({
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
  estimateUniTradingFee,
  createAndSendTradeRequestUniTx,
  getUniTokens,
  getQuote,
  ...uniHistory,
};
