import Validator from "@lib/utils/validator";
import { PRVIDSTR } from "../core";
import createAxiosInstance from "../http/axios";
import {
  formatContributeHistory,
  formatWithdrawFeeHistory,
  formatWithdrawHistory,
} from "@lib/module/Account/features/Liquidity/liquidity.utils";
import { PrivacyVersion } from "@lib/core/constants";

class RpcHTTPCoinServiceClient {
  constructor(url) {
    this.http = createAxiosInstance({ baseURL: url });
  }

  apiGetListOutputCoins = (payload) => {
    const { key, offset, limit, tokenID = PRVIDSTR, version } = payload;
    new Validator("key", key).required().string();
    new Validator("offset", offset).number();
    new Validator("limit", limit).number();
    new Validator("tokenID", tokenID).required().string();
    new Validator("version", version).required().number();
    const params = `getcoins?${key}&limit=${limit}&offset=${offset}&tokenid=${tokenID}&version=${version}`;
    return this.http.get(params).then((response) => {
      const outputs = response?.Outputs || {};
      let allOutputCoinStrs;
      if (outputs) {
        allOutputCoinStrs = outputs[Object.keys(outputs)[0]];
      }
      return allOutputCoinStrs || [];
    });
  };

  apiGetKeyInfo = ({ key, version }) => {
    new Validator("key", key).required().string();
    new Validator("version", version).required().number();
    return this.http.get(`getkeyinfo?key=${key}&version=${version}`);
  };

  apiCheckKeyImages = ({ keyImages, shardId }) => {
    new Validator("keyImages", keyImages).required().array();
    new Validator("shardID", shardId).required().number();
    const payload = {
      KeyImages: keyImages,
      ShardID: shardId,
    };
    return this.http.post("checkkeyimages", payload);
  };

  apiGetSpendingCoinInMemPool = () => {
    return this.http.get("getcoinspending").then((res) => res || []);
  };

  apiSubmitOTAKey = ({ otaKey, shardID, beaconHeight = 0 } = {}) => {
    new Validator("otaKey", otaKey).required().string();
    new Validator("shardID", shardID).required().number();
    new Validator("beaconHeight", beaconHeight).number();
    const payload = {
      OTAKey: otaKey,
      ShardID: shardID,
      BeaconHeight: beaconHeight,
    };
    return this.http.post("submitotakey", payload);
  };

  apiGetRandomCommitments = ({ version, shardID, tokenID, limit }) => {
    new Validator("version", version).required().number();
    new Validator("shardID", shardID).required().number();
    new Validator("tokenID", tokenID).required().string();
    new Validator("limit", limit).required().number();
    const payload = {
      TokenID: tokenID,
      ShardID: shardID,
      Version: version,
      Limit: limit,
    };
    console.log("payload", payload);
    return this.http.post("getrandomcommitments", payload);
  };

  apiGetPDeState = () => {
    return this.http.get("/pdex/v3/getpdestate");
  };

  apiGetPDexHistories = ({ otakey, offset, limit } = {}) => {
    new Validator("otakey", otakey).required().string();
    new Validator("offset", offset).required().number();
    new Validator("limit", limit).required().number();
    const params = [
      "gettradehistory",
      `?offset=${offset}`,
      `&limit=${limit}`,
      `&otakey=${otakey}`,
    ];
    return this.http.get(params.join(""));
  };

  apiGetTxsByReceiver = ({
    tokenID,
    otaKey = "",
    paymentkey = "",
    limit = 100,
    offset = 0,
    version,
  } = {}) => {
    new Validator("apiGetTxsByReceiver-tokenID", tokenID).required().string();
    new Validator("apiGetTxsByReceiver-limit", limit).required().number();
    new Validator("apiGetTxsByReceiver-offset", offset).required().number();
    new Validator("apiGetTxsByReceiver-version", version).required().number();
    let url = `gettxsbyreceiver?tokenid=${tokenID}&limit=${limit}&offset=${offset}`;
    switch (version) {
      case PrivacyVersion.ver1: {
        new Validator("apiGetTxsByReceiver-paymentkey", paymentkey)
          .string()
          .required();
        url = `${url}&paymentkey=${paymentkey}`;
        break;
      }
      case PrivacyVersion.ver2: {
        new Validator("apiGetTxsByReceiver-otaKey", otaKey).string().required();
        url = `${url}&otakey=${otakey}`;
        break;
      }
      default:
        break;
    }
    console.log(`URL`, url);
    return this.http.get(url);
  };

  apiGetTxsBySender = ({ shardID, keyImages } = {}) => {
    new Validator("shardID", shardID).required().number();
    new Validator("keyImages", keyImages).required().array();
    const data = {
      ShardID: shardID,
      Keyimages: keyImages,
      Base58: false,
    };
    return this.http.post(`gettxsbysender`, data);
  };

  apiGetTxsByPublicKey = ({ base58 = false, pubKeys } = {}) => {
    new Validator("pubKeys", pubKeys).required().array();
    new Validator("base58", base58).boolean();
    const data = {
      Pubkeys: pubKeys,
      Base58: base58,
    };
    return this.http.post(`gettxsbypubkey`, data);
  };

  apiGetContributeHistories = ({
    offset = 0,
    limit = 50,
    paymentAddress,
  } = {}) => {
    new Validator("apiGetContributeHistories-offset", offset)
      .required()
      .number();
    new Validator("apiGetContributeHistories-limit", limit).number();
    new Validator("apiGetContributeHistories-paymentAddress", paymentAddress)
      .required()
      .string();
    const url = `getcontributehistory?offset=${offset}&limit=${limit}&paymentkey=${paymentAddress}`;
    return this.http
      .get(url)
      .then((res) =>
        (res || []).map((contribute) => formatContributeHistory(contribute))
      );
  };
  apiGetLiquidityRemoveHistories = ({
    offset = 0,
    limit = 50,
    paymentAddress,
  } = {}) => {
    new Validator("apiGetLiquidityRemoveHistories-offset", offset)
      .required()
      .number();
    new Validator("apiGetLiquidityRemoveHistories-limit", limit).number();
    new Validator(
      "apiGetLiquidityRemoveHistories-paymentAddress",
      paymentAddress
    )
      .required()
      .string();
    const url = `getwithdrawhistory?offset=${offset}&limit=${limit}&paymentkey=${paymentAddress}`;
    return this.http
      .get(url)
      .then((histories) =>
        (histories || []).map((history) => formatWithdrawHistory(history))
      );
  };

  apiGetLiquidityWithdrawFeeHistories = ({
    offset = 0,
    limit = 50,
    paymentAddress,
  } = {}) => {
    new Validator("apiGetLiquidityWithdrawFeeHistories-offset", offset)
      .required()
      .number();
    new Validator("apiGetLiquidityWithdrawFeeHistories-limit", limit).number();
    new Validator(
      "apiGetLiquidityWithdrawFeeHistories-paymentAddress",
      paymentAddress
    )
      .required()
      .string();
    const url = `getwithdrawfeehistory?offset=${offset}&limit=${limit}&paymentkey=${paymentAddress}`;
    return this.http
      .get(url)
      .then((histories) =>
        (histories || []).map((history) => formatWithdrawFeeHistory(history))
      );
  };
}

export { RpcHTTPCoinServiceClient };
