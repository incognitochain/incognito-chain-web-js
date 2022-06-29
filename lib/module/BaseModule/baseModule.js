import StorageServices from "@lib/services/storage";
import { RpcHTTPCoinServiceClient } from "@lib/rpcclient/rpchttpcoinservice";
import { RpcHTTPTxServiceClient } from "@lib/rpcclient/rpchttptxservice";
import Validator from "@lib/utils/validator";
import { RpcClient } from "@lib/rpcclient/rpcclient";
import { RpcHTTPRequestServiceClient } from "@lib/rpcclient/rpchttprequestservice";
import { RpcHTTPApiServiceClient } from "@lib/rpcclient/rpchttpapiservice";
import set from "lodash/set";
import { performance } from "@lib/utils/performance";
import { RpcHTTPTradeServiceClient } from "@lib/rpcclient/rpchttptradeservice";
import { isJsonString } from "@lib/utils/json";

class BaseModule {
  constructor() {
    this.storage = {};
    this.rpc = {};
    this.rpcCoinService = {};
    this.rpcTxService = {};
    this.rpcRequestService = {};
    this.authToken = "";
    this.rpcApiService = {};
    this.rpcTradeService = {};
    this.storageValue = {};
    this.account = {};
    this.server = {};
  }

  setServer(server) {
    new Validator("setServer-server", server).required().object();
    this.server = Object.assign({}, server);
  }

  setRPCTradeService(url) {
    new Validator("setRPCTradeService", url).required().string();
    this.rpcTradeService = new RpcHTTPTradeServiceClient(url);
  }

  setRPCCoinServices(url) {
    new Validator("rpcCoinService", url).required().string();
    this.rpcCoinService = new RpcHTTPCoinServiceClient(url);
  }

  setRPCTxServices(url) {
    new Validator("rpcTxService", url).required().string();
    this.rpcTxService = new RpcHTTPTxServiceClient(url);
  }

  setRPCClient(url) {
    new Validator("rpc client url", url).required().string();
    this.rpc = new RpcClient(url);
  }

  setStorageServices(storage) {
    new Validator("Storage services", storage).required();
    this.storage = storage || new StorageServices();
  }

  setRPCRequestServices(url) {
    new Validator("rpc request url", url).required().string();
    this.rpcRequestService = new RpcHTTPRequestServiceClient(url);
  }
  setAuthToken(token) {
    new Validator("setAuthToken-token", token).required().string();
    this.authToken = token;
  }

  setRPCApiServices(url, token) {
    new Validator("setRPCApiServices-api services url", url)
      .required()
      .string();
    const authToken = token || this.authToken;
    new Validator("setRPCApiServices-authToken", authToken).required().string();
    this.rpcApiService = new RpcHTTPApiServiceClient(url, authToken);
  }

  getAccount() {
    return this.account;
  }

  setAccount(account) {
    new Validator("setAccount-account", account).required().object();
    this.account = account;
  }

  getOTAKey() {
    return this.account?.getOTAKey() || "";
  }

  getPaymentKey() {
    return this.account?.getPaymentAddress() || "";
  }

  async getOTAReceive() {
    return (await this.account?.getOTAReceive()) || "";
  }

  setPaymentAddress(paymentAddress) {
    new Validator("setPaymentAddress-paymentAddress", paymentAddress)
      .required()
      .string();
    this.paymentAddress = paymentAddress;
  }

  async getStorage(key) {
    let result;
    try {
      new Validator("key", key).required().string();
      if (this.storage) {
        const data = await this.storage.getItem(key);
        result = data;
        if (isJsonString(data)) {
          result = JSON.parse(data);
        }
      }
    } catch (error) {
      console.debug("ERROR GET STORAGE", error?.message);
    }
    return result;
  }

  async setStorage(key, value) {
    try {
      new Validator("key", key).required().string();
      new Validator("value", value).required();
      new Validator("storage", this.storage).required().object();
      if (this.storage) {
        await this.storage.setItem(
          key,
          typeof value !== "string" ? JSON.stringify(value) : value
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async clearStorage(key) {
    try {
      new Validator("key", key).required().string();
      if (this.storage) {
        return this.storage.removeItem(key);
      }
    } catch (error) {
      throw error;
    }
  }

  async measureAsyncFn(fn, key, args) {
    try {
      const t = performance.now();
      const { version } = args || {};
      new Validator("measureAsyncFn-version", version).number().required();
      let result;
      if (typeof fn === "function") {
        result = await fn.call(this, args);
      }
      const e = performance.now() - t;
      const value = this.storageValue;
      set(value, key, `${e / 1000}s`);
      return result;
    } catch (error) {
      console.log("measureAsyncFn FAILED", error);
      console.log("FN NAME", fn, key, args);
    }
  }
}

export default BaseModule;
