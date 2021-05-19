import Validator from "@lib/utils/validator";
import createAxiosInstance from "../http/axios";

class RpcHTTPTxServiceClient {
  constructor(url) {
    this.http = createAxiosInstance({ baseURL: url });
  }
  apiPushTx = ({ rawTx }) => {
    new Validator("rawTx", rawTx).required();
    return this.http.post("pushtx", { TxRaw: rawTx });
  };

  apiGetTxStatus = ({ txId }) => {
    new Validator("txId", txId).required().string();
    return this.http.get(`gettxstatus?txhash=${txId}`);
  };
}

export { RpcHTTPTxServiceClient };