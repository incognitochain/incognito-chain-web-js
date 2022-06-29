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

export default {
  getPancakeTokens,
  estimatePancakeTradingFee,
  createAndSendTradeRequestPancakeTx,
  ...pancakeHistory,
};
