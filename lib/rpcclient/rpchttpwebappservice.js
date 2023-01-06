import Validator from "@lib/utils/validator";
import { ACCOUNT_CONSTANT } from "@lib/wallet";
import createAxiosInstance from "../http/axios";

class RpcHTTPWebAppServiceClient {
  constructor(url) {
    this.http = createAxiosInstance({ baseURL: url });
  }
  submitPAppsRawTx = ({ rawTx, refundFeeOTA } = {}) => {
    new Validator("submitPAppsRawTx-rawTx", rawTx).required().string();
    new Validator("submitPAppsRawTx-refundFeeOTA", refundFeeOTA).required().string();
    return this.http
        .post('papps/submitswaptx', {
          TxRaw: rawTx,
          FeeRefundOTA: refundFeeOTA
        })
  };
  submitInterSwapTx = ({
      txRaw,
      txHash,
      sellTokenID,
      midTokenID,
      buyTokenID,
      amountOutRaw,
      slippage,
      pAppName,
      pAppNetwork,
      refundFeeOTA,
      refundOTA,
      sellTokenOTA,
      buyTokenOTA,
      inputAddress,
      shardID,
  }) => {
    return this.http.post('papps/submitinterswaptx', {
        TxHash: txHash,
        TxRaw: txRaw,
        FromToken: sellTokenID,
        MidToken: midTokenID,
        ToToken: buyTokenID,
        FinalMinExpectedAmt: amountOutRaw,
        Slippage: slippage,
        PAppName: pAppName,
        PAppNetwork: pAppNetwork,
        OTARefundFee: refundFeeOTA,
        OTARefund: refundOTA,
        OTAFromToken: sellTokenOTA,
        OTAToToken: buyTokenOTA,
        WithdrawAddress: inputAddress,
        ShardID: `${shardID}`,
    });
    }

  getSwapTxStatus = async ({ txIDs = [] } = {}) => {
    new Validator("getSwapTxStatus-rawTx", txIDs).required().array();
    let apiTxs = []
    try {
        apiTxs = await this.http
            .post('papps/swapstatus', {
                TxList: txIDs,
            }) || {};
    } catch (e) {
        apiTxs = {}
    }
    return apiTxs;
  };

  getInterSwapTxStatus = async ({ txIDs = [] } = {}) => {
        new Validator("getInterSwapTxStatus-rawTx", txIDs).required().array();
        let apiTxs = []
        try {
            apiTxs = await this.http
                .post('papps/interswapstatus', {
                    TxList: txIDs,
                }) || {};
        } catch (e) {
            apiTxs = {}
        }
        return apiTxs;
  };

  getUnshieldEVMTxListStatus = async ({ txIDs = [] } = {}) => {
    new Validator("getUnshieldEVMTxListStatus-txIDs", txIDs).required().array();
    let apiTxs = [];
    try {
      apiTxs =
        (await this.http.post("unshield/status", {
          TxList: txIDs,
        })) || {};
    } catch (e) {
      console.log("getUnshieldEVMTxListStatus ERROR : ", e);
      apiTxs = {};
    }
    return apiTxs;
  };
}

export { RpcHTTPWebAppServiceClient };
