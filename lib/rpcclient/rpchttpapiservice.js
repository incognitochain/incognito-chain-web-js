import { camelCaseKeys } from "@lib/utils/camelCaseKeys";
import createAxiosInstance from "@lib/http/axios";
import Validator from "@lib/utils/validator";

class RpcHTTPApiServiceClient {
  constructor(url, token) {
    this.http = createAxiosInstance({ baseURL: url, token });
  }

  apiGetMinAmountToShield = async ({ tokenID }) => {
    let min = "";
    try {
      new Validator("apiGetMinMaxAmountToShield-tokenID", tokenID)
        .required()
        .string();
      const result = await this.http.get("service/min-max-amount");
      const foundToken = result.find((t) => t.TokenID === tokenID);
      if (foundToken) {
        min = foundToken?.MinAmount || "";
      }
    } catch (error) {
      console.log("apiGetMinAmountToShield", error);
    }
    return min;
  };

  apiGetPTokenHistory = async ({
    tokenID,
    paymentAddress,
    signPublicKeyEncode,
  }) => {
    new Validator("apiGetPTokenHistory-tokenID", tokenID).required().string();
    new Validator("apiGetPTokenHistory-paymentAddress", paymentAddress)
      .required()
      .string();
    new Validator(
      "apiGetPTokenHistory-signPublicKeyEncode",
      signPublicKeyEncode
    )
      .required()
      .string();
    const data = {
      WalletAddress: paymentAddress,
      PrivacyTokenAddress: tokenID,
      SignPublicKeyEncode: signPublicKeyEncode,
    };
    return this.http
      .post("eta/history", data)
      .then((res) => res || [])
      .catch((err) =>
        console.log("ERROR apiGetPTokenHistory", JSON.stringify(err))
      );
  };

  apiGetPTokens = () => {
    const url = "ptoken/list";
    return this.http
      .get(url)
      .then((res) => res.map((ptoken) => camelCaseKeys(ptoken)));
  };

  apiGetTokenInfoById = ({ tokenId }) => {
    new Validator("tokenId", tokenId).required().string();
    const endpoint = "pcustomtoken/get";
    return this.http
      .get(endpoint, { params: { TokenID: tokenId } })
      .then((token) => camelCaseKeys(token));
  };

  apiGetCustomTokens = () => {
    const endpoint = "pcustomtoken/list";
    return this.http.get(endpoint).then((tokens) => {
      return tokens.map((token) => camelCaseKeys(token));
    });
  };

  apiRetryExpiredShield = async ({
    id,
    decentralized,
    walletAddress,
    addressType,
    currencyType,
    userPaymentAddress,
    privacyTokenAddress,
    signPublicKeyEncode,
  }) => {
    new Validator("apiRetryExpiredShield-id", id).required().number();
    new Validator("apiRetryExpiredShield-decentralized", decentralized)
      .required()
      .number();
    new Validator("apiRetryExpiredShield-walletAddress", walletAddress)
      .required()
      .string();
    new Validator("apiRetryExpiredShield-addressType", addressType)
      .required()
      .number();
    new Validator("apiRetryExpiredShield-currencyType", currencyType)
      .required()
      .number();
    new Validator(
      "apiRetryExpiredShield-userPaymentAddress",
      userPaymentAddress
    )
      .required()
      .string();
    new Validator(
      "apiRetryExpiredShield-privacyTokenAddress",
      privacyTokenAddress
    )
      .required()
      .string();
    new Validator(
      "apiRetryExpiredShield-signPublicKeyEncode",
      signPublicKeyEncode
    )
      .required()
      .string();
    const payload = {
      ID: id,
      Decentralized: decentralized,
      WalletAddress: walletAddress,
      AddressType: addressType,
      CurrencyType: currencyType,
      PaymentAddress: userPaymentAddress,
      PrivacyTokenAddress: privacyTokenAddress,
      SignPublicKeyEncode: signPublicKeyEncode,
    };
    return this.http.post("eta/retry", payload);
  };

  apiGetPTokenHistoryById = ({
    id,
    currencyType,
    signPublicKeyEncode,
    decentralized,
    newShieldDecentralized,
  }) => {
    const payload = {
      ID: id,
      CurrencyType: currencyType,
      SignPublicKeyEncode: signPublicKeyEncode,
      Decentralized: decentralized,
      NewShieldDecentralized: newShieldDecentralized,
    };
    new Validator("apiGetPTokenHistoryById-id", id).required().number();
    new Validator("apiGetPTokenHistoryById-currencyType", currencyType)
      .required()
      .number();
    new Validator("apiGetPTokenHistoryById-decentralized", decentralized)
      .required()
      .number();
    new Validator(
      "apiGetPTokenHistoryById-signPublicKeyEncode",
      signPublicKeyEncode
    )
      .required()
      .string();
    new Validator(
      "apiGetPTokenHistoryById-newShieldDecentralized",
      newShieldDecentralized
    ).number();
    return this.http.post(`eta/history/detail`, payload);
  };

  apiGetProfile = () => this.http.get("auth/profile");

  apiGetPancakeTokens = () => {
    return this.http.get(`trade/tokens`);
  };

  apiEstimatePancakeTradingFee = async (data) => {
    const { walletAddress, srcTokens, destTokens, srcQties } = data;
    new Validator("apiEstimateTradingFee-walletAddress", walletAddress)
      .required()
      .string();
    new Validator("apiEstimateTradingFee-srcTokens", srcTokens)
      .required()
      .string();
    new Validator("apiEstimateTradingFee-destTokens", destTokens)
      .required()
      .string();
    new Validator("apiEstimateTradingFee-srcQties", srcQties)
      .required()
      .string();
    const payload = {
      WalletAddress: walletAddress,
      SrcTokens: srcTokens,
      DestTokens: destTokens,
      SrcQties: srcQties,
    };
    console.log(JSON.stringify(payload));
    return this.http.post("trade/estimate-fees", payload);
  };

  apiSubmitPancakeTradingTx = (payload) => {
    const {
      tradeID,
      burnTxID,
      paymentAddress,
      srcTokenID,
      destTokenID,
      isNative,
      paths,
      srcQties,
      expectedDestAmt,
    } = payload;
    new Validator("apiSubmitPancakeTradingTx-tradeID", tradeID)
      .required()
      .number();
    new Validator("apiSubmitPancakeTradingTx-burnTxID", burnTxID)
      .required()
      .string();
    new Validator("apiSubmitPancakeTradingTx-paymentAddress", paymentAddress)
      .required()
      .string();
    new Validator("apiSubmitPancakeTradingTx-destTokenID", destTokenID)
      .required()
      .string();
    new Validator("apiSubmitPancakeTradingTx-isNative", isNative)
      .required()
      .boolean();
    new Validator("apiSubmitPancakeTradingTx-paths", paths).required().string();
    new Validator("apiSubmitPancakeTradingTx-srcQties", srcQties)
      .required()
      .string();
    new Validator("apiSubmitPancakeTradingTx-expectedDestAmt", expectedDestAmt)
      .required()
      .string();
    let data = {
      ID: tradeID,
      BurnTx: burnTxID,
      WalletAddress: paymentAddress,
      SrcTokens: srcTokenID,
      DestTokens: destTokenID,
      IsNative: isNative,
      Path: paths,
      UserFeeSelection: 2,
      UserFeeLevel: 1,
      SrcQties: srcQties,
      ExpectedOutputAmount: expectedDestAmt,
    };
    console.log("data", data);
    return this.http.post("/trade/submit-trading-tx", data);
  };

  apiGePancakeHistory = (payload) => {
    const { walletAddress } = payload;
    new Validator("apiSubmitPancakeTradingTx-walletAddress", walletAddress)
      .required()
      .string();
    return this.http.get(
      `/trade/history?filter[wallet_address]=${walletAddress}`
    );
  };

  apiGePancakeHistoryDetail = (payload) => {
    const { tradeID } = payload;
    new Validator("apiSubmitPancakeTradingTx-tradeID", tradeID)
      .required()
      .number();
    return this.http.get(`/trade/history/${tradeID}`);
  };

  apiGetPancakeRewardHistory = (payload) => {
    const { walletAddress, page, limit } = payload;
    new Validator("apiGetPancakeRewardHistory-walletAddress", walletAddress)
      .required()
      .string();
    return this.http.get(
      `trade/reward-history?filter[status]=2&filter[wallet_address]=${walletAddress}&limit=${limit}&page=${page}`
    );
  };

  // uniSwap

  apiGetUniTokens = () => this.http.get(`uniswap/tokens`);

  apiEstimateUniTradingFee = async (data) => {
    const { walletAddress, srcTokens, destTokens, srcQties } = data;
    new Validator("apiEstimateUniTradingFee-walletAddress", walletAddress)
      .required()
      .string();
    new Validator("apiEstimateUniTradingFee-srcTokens", srcTokens)
      .required()
      .string();
    new Validator("apiEstimateUniTradingFee-destTokens", destTokens)
      .required()
      .string();
    new Validator("apiEstimateUniTradingFee-srcQties", srcQties)
      .required()
      .string();
    const payload = {
      WalletAddress: walletAddress,
      SrcTokens: srcTokens,
      DestTokens: destTokens,
      SrcQties: srcQties,
    };
    console.log(payload);
    return this.http.post("uniswap/estimate-fees", payload);
  };

  apiGetQuote = async (data) => {
    const { tokenInContractId, tokenOutContractId, amount, exactIn, chainId } =
      data;
    return this.http.get(
      `uniswap/quote?tokenIn=${tokenInContractId}&tokenOut=${tokenOutContractId}&amount=${amount}&exactIn=${exactIn}&chainId=${chainId}`
    );
  };

  apiSubmitUniTradingTx = (payload) => {
    const {
      tradeID,
      burnTxID,
      paymentAddress,
      srcTokenID,
      destTokenID,
      paths,
      fees,
      percents,
      isMulti,
      expectedDestAmt,
      srcQties,
    } = payload;
    new Validator("apiSubmitUniTradingTx-tradeID", tradeID).required().number();
    new Validator("apiSubmitUniTradingTx-burnTxID", burnTxID)
      .required()
      .string();
    new Validator("apiSubmitUniTradingTx-paymentAddress", paymentAddress)
      .required()
      .string();
    new Validator("apiSubmitUniTradingTx-srcTokenID", srcTokenID)
      .required()
      .string();
    new Validator("apiSubmitUniTradingTx-destTokenID", destTokenID)
      .required()
      .string();
    new Validator("apiSubmitUniTradingTx-paths", paths).required().string();
    new Validator("apiSubmitUniTradingTx-fees", fees).required().string();
    new Validator("apiSubmitUniTradingTx-percents", percents)
      .required()
      .string();
    new Validator("apiSubmitUniTradingTx-isMulti", isMulti)
      .required()
      .boolean();
    new Validator("apiSubmitUniTradingTx-expectedDestAmt", expectedDestAmt)
      .required()
      .string();
    new Validator("apiSubmitUniTradingTx-srcQties", srcQties)
      .required()
      .string();
    let data = {
      ID: tradeID,
      BurnTx: burnTxID,
      WalletAddress: paymentAddress,
      SrcTokens: srcTokenID,
      DestTokens: destTokenID,
      Path: paths,
      Fee: fees,
      Percents: percents,
      IsMulti: isMulti,
      UserFeeSelection: 2,
      UserFeeLevel: 1,
      ExpectedOutputAmount: expectedDestAmt,
      SrcQties: srcQties,
    };
    console.log("data", data);
    return this.http.post("uniswap/submit-trading-tx", data);
  };

  // get list swap history for uniSwap
  apiGetUniHistory = (payload) => {
    const { walletAddress } = payload;
    new Validator("apiGetUniHistory-walletAddress", walletAddress)
      .required()
      .string();
    return this.http.get(
      `uniswap/history?filter[wallet_address]=${walletAddress}`
    );
  };

  apiGetUniHistoryDetail = (payload) => {
    const { tradeID } = payload;
    new Validator("apiGetUniHistoryDetail-tradeID", tradeID)
      .required()
      .number();
    return this.http.get(`trade/history/${tradeID}`);
  };

  apiGetUniRewardHistory = (payload) => {
    const { walletAddress, page, limit } = payload;
    new Validator("apiGetUniRewardHistory-walletAddress", walletAddress)
      .required()
      .string();
    return this.http.get(
      `uniswap/reward-history?filter[status]=2&filter[wallet_address]=${walletAddress}&limit=${limit}&page=${page}`
    );
  };

  // Curve

  apiGetCurveTokens = () => this.http.get(`curve/tokens`);

  apiEstimateCurveTradingFee = async (data) => {
    const { walletAddress, srcTokens, destTokens, srcQties } = data;
    new Validator("apiEstimateCurveTradingFee-walletAddress", walletAddress)
      .required()
      .string();
    new Validator("apiEstimateCurveTradingFee-srcTokens", srcTokens)
      .required()
      .string();
    new Validator("apiEstimateCurveTradingFee-destTokens", destTokens)
      .required()
      .string();
    new Validator("apiEstimateCurveTradingFee-srcQties", srcQties)
      .required()
      .string();
    const payload = {
      WalletAddress: walletAddress,
      SrcTokens: srcTokens,
      DestTokens: destTokens,
      SrcQties: srcQties,
    };
    console.log(payload);
    return this.http.post("curve/estimate-fees", payload);
  };

  apiGetQuoteCurve = async (data) => {
    const { tokenInContractId, tokenOutContractId, amount } = data;
    return this.http.get(
      `curve/quote?tokenIn=${tokenInContractId}&tokenOut=${tokenOutContractId}&amount=${amount}`
    );
  };

  apiSubmitCurveTradingTx = (payload) => {
    const {
      tradeID,
      burnTxID,
      paymentAddress,
      srcTokenID,
      destTokenID,
      expectedDestAmt,
      srcQties,
    } = payload;
    new Validator("apiSubmitCurveTradingTx-tradeID", tradeID)
      .required()
      .number();
    new Validator("apiSubmitCurveTradingTx-burnTxID", burnTxID)
      .required()
      .string();
    new Validator("apiSubmitCurveTradingTx-paymentAddress", paymentAddress)
      .required()
      .string();
    new Validator("apiSubmitCurveTradingTx-srcTokenID", srcTokenID)
      .required()
      .string();
    new Validator("apiSubmitCurveTradingTx-destTokenID", destTokenID)
      .required()
      .string();
    new Validator("apiSubmitCurveTradingTx-expectedDestAmt", expectedDestAmt)
      .required()
      .string();
    new Validator("apiSubmitCurveTradingTx-srcQties", srcQties)
      .required()
      .string();
    let data = {
      ID: tradeID,
      BurnTx: burnTxID,
      WalletAddress: paymentAddress,
      SrcTokens: srcTokenID,
      DestTokens: destTokenID,
      UserFeeSelection: 2,
      UserFeeLevel: 1,
      ExpectedOutputAmount: expectedDestAmt,
      SrcQties: srcQties,
    };
    console.log("data", data);
    return this.http.post("curve/submit-trading-tx", data);
  };

  // get list swap history for Curve
  apiGetCurveHistory = (payload) => {
    const { walletAddress } = payload;
    new Validator("apiGetCurveHistory-walletAddress", walletAddress)
      .required()
      .string();
    return this.http.get(
      `curve/history?filter[wallet_address]=${walletAddress}`
    );
  };

  apiGetCurveHistoryDetail = (payload) => {
    const { tradeID } = payload;
    new Validator("apiGetCurveHistoryDetail-tradeID", tradeID)
      .required()
      .number();
    return this.http.get(`curve/history/${tradeID}`);
  };

  apiGetCurveRewardHistory = (payload) => {
    const { walletAddress, page, limit } = payload;
    new Validator("apiGetCurveRewardHistory-walletAddress", walletAddress)
      .required()
      .string();
    return this.http.get(
      `curve/reward-history?filter[wallet_address]=${walletAddress}&page=${page}&limit=${limit}`
    );
  };
}

export { RpcHTTPApiServiceClient };
