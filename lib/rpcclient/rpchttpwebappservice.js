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

}

export { RpcHTTPWebAppServiceClient };
