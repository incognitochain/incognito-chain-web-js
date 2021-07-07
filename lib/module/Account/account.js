import bn from "bn.js";
import { RpcHTTPRequestServiceClient } from "@lib/rpcclient/rpchttprequestservice";
import _ from "lodash";
import { KeyWallet } from "@lib/core/hdwallet";
import StorageServices from "@lib/services/storage";
import { getShardIDFromLastByte } from "@lib/common/common";
import Validator from "@lib/utils/validator";

import { RpcHTTPCoinServiceClient } from "@lib/rpcclient/rpchttpcoinservice";
import { RpcHTTPTxServiceClient } from "@lib/rpcclient/rpchttptxservice";
import { RpcHTTPApiServiceClient } from "@lib/rpcclient/rpchttpapiservice";
import { RpcClient } from "@lib/rpcclient/rpcclient";

import transactor from "@lib/module/Account/features/Transactor";
import history from "@lib/module/Account/features/History";
import convert from "@lib/module/Account/features/Convert";
import trade from "@lib/module/Account/features/Trade";
import node from "@lib/module/Account/features/Node";
import initToken from "@lib/module/Account/features/InitToken";
import configs from "@lib/module/Account/features/Configs";
import unshield from "@lib/module/Account/features/Unshield";
import send from "@lib/module/Account/features/Send";
import provide from "@lib/module/Account/features/Provide";
import liquidity from "@lib/module/Account/features/Liquidity";
import keySet from "@lib/module/Account/features/KeySet";
import coinsV1 from "@lib/module/Account/features/CoinsV1";
import coinsV2 from "@lib/module/Account/features/CoinsV2";
import coins from "@lib/module/Account/features/Coins";
import storage from "@lib/module/Account/features/Storage";
import consolidate from "@lib/module/Account/features/Consolidate";
import followToken from "@lib/module/Account/features/FollowToken/followToken";

import { getBurningAddress } from "@lib/core";

global.timers = {};

class Account {
  constructor(w = null) {
    this.name = "";
    this.key = new KeyWallet();
    this.child = [];
    this.isImport = false;
    this.txHistory = { NormalTx: [], CustomTokenTx: [], PrivacyTokenTx: [] };
    this.txReceivedHistory = {
      NormalTx: [],
      CustomTokenTx: [],
      PrivacyTokenTx: [],
    };
    this.storage = w.Storage ? w.Storage : new StorageServices();
    this.coinUTXOs = {};
    this.rpc = w.RpcClient ? new RpcClient(w.RpcClient) : null;
    this.rpcCoinService = w.RpcCoinService
      ? new RpcHTTPCoinServiceClient(w.RpcCoinService)
      : null;
    this.rpcTxService = w.RpcTxService
      ? new RpcHTTPTxServiceClient(w.RpcTxService)
      : null;
    this.rpcRequestService = w.RpcRequestService
      ? new RpcHTTPRequestServiceClient(w.RpcRequestService)
      : null;
    this.authToken = w.AuthToken ? w.AuthToken : null;
    this.rpcApiService = w.RpcApiService
      ? new RpcHTTPApiServiceClient(w.RpcApiService, this.authToken)
      : null;
    this.keyInfo = {};
    this.allKeyInfoV1 = {};
    this.coinsStorage = null;
    this.progressTx = 0;
    this.debug = "";
    this.coinsV1Storage = null;
  }

  getShardID() {
    const shardId =
      getShardIDFromLastByte(
        this.key.KeySet.PaymentAddress.Pk[
          this.key.KeySet.PaymentAddress.Pk.length - 1
        ]
      ) || 0;
    return shardId;
  }

  // getPrivacyTokenTxHistoryByTokenID returns privacy token tx history with specific tokenID
  /**
   *
   * @param {string} id
   */

  /**
   *
   */
  // stakerStatus return status of staker
  // return object {{Role: int, ShardID: int}}
  // Role: -1: is not staked, 0: candidate, 1: validator
  // ShardID: beacon: -1, shardID: 0->MaxShardNumber
  async stakerStatus() {
    const blsPubKeyB58CheckEncode =
      await this.key.getBLSPublicKeyB58CheckEncode();

    let reps;
    try {
      reps = await this.rpc.getPublicKeyRole("bls:" + blsPubKeyB58CheckEncode);
    } catch (e) {
      throw e;
    }

    return reps.status;
  }

  getKeyCacheBalance(params) {
    try {
      const { tokenID, version } = params;
      new Validator("getKeyCacheBalance-tokenID", tokenID).required().string();
      new Validator("getKeyCacheBalance-version", version).required().number();
      const otaKey = this.getOTAKey();
      const key = `CACHE-BALANCE-${otaKey}-${tokenID}-${version}`;
      return key;
    } catch (error) {
      throw error;
    }
  }

  async handleMeasureGetBalance(params) {
    let accountBalance = "0";
    try {
      const { tokenID, version } = params;
      new Validator("getBalance-tokenID", tokenID).required().string();
      new Validator("getBalance-version", version).required().number();
      const { unspentCoins } = await this.measureAsyncFn(
        this.getOutputCoins,
        "totalTimeGetUnspentCoins",
        params
      );
      accountBalance =
        unspentCoins?.reduce(
          (totalAmount, coin) => totalAmount.add(new bn(coin.Value)),
          new bn(0)
        ) || new bn(0);
      accountBalance = accountBalance.toString();
      throw error;
    } catch (error) {}
    return accountBalance;
  }

  async getBalance(params) {
    try {
      const balance = await this.measureAsyncFn(
        this.handleMeasureGetBalance,
        "totalTimeGetBalance",
        params
      );
      return balance;
    } catch (error) {
      throw error;
    }
  }

  async getBurnerAddress() {
    return getBurningAddress(this.rpc);
  }

  getAccountName() {
    return this.name;
  }
}

Object.assign(
  Account.prototype,
  transactor,
  history,
  trade,
  node,
  initToken,
  configs,
  unshield,
  send,
  provide,
  liquidity,
  keySet,
  convert,
  coins,
  coinsV1,
  coinsV2,
  storage,
  consolidate,
  followToken
);
export default Account;
