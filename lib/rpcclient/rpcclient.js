import { RPCHttpService } from "./rpchttpservice";
import { checkDecode, checkEncode } from "../common/base58";
import { stringToBytes, bytesToString, base64Decode, base64Encode, intToByteArr } from "../privacy/utils";
import { ENCODE_VERSION } from "../common/constants";
import { CustomError, ErrorObject, RPCError } from "../common/errorhandler";
import { PRVIDSTR, PDEPOOLKEY } from "../core/constants";
import * as bn from 'bn.js';
import {TX_STATUS} from "@lib/module/Account";

const parseResponse = async (rpcService, method, params = []) => {
  const data = {
    jsonrpc: "1.0",
    method: method,
    params: params,
    id: 1,
  };
  let response;
  try {
    response = await rpcService.postRequest(data);
  } catch (e) {
    throw e;
  }

  if (response.status !== 200) {
    throw new Error("Can't request API " + data.method);
  } else if (response.data.Error) {
    throw new RPCError(method, response.data.Error);
  }

  return response.data.Result;
};

class RpcClient {
  constructor(url, user, password) {
    this.rpcHttpService = new RPCHttpService(url, user, password);
    // function aliases
    this.listTokens = this.listPrivacyCustomTokens;
    // this.oldSyntax = true;
  }

  getOutputCoin = async (
    paymentAdrr,
    viewingKey = "",
    otaKey,
    tokenID = null,
    toHeight = 0,
    submitted = true
  ) => {
    let data = {
      jsonrpc: "1.0",
      method: submitted ? "listoutputcoinsfromcache" : "listoutputcoins",
      params: [
        0,
        toHeight,
        [
          {
            PaymentAddress: paymentAdrr,
            ReadonlyKey: viewingKey,
            OTASecretKey: otaKey,
          },
        ],
      ],
      id: 1,
    };

    if (tokenID != null) {
      data["params"][3] = tokenID;
    }
    // console.debug("Coin Request: ", JSON.stringify(data));
    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }
    // console.log("response is", response)
    if (response.status !== 200) {
      throw new Error("Can't request API get all output coins");
    } else if (response.data.Error) {
      throw response.data.Error;
    }
    // console.log(response.data.Result.Outputs)
    let outCoinsMap = response.data.Result.Outputs;
    let outCoins = [];
    for (let key in outCoinsMap) {
      if (key == paymentAdrr || (viewingKey !== "" && key == viewingKey)) {
        outCoins = outCoinsMap[key];
        break;
      }
    }

    return {
      outCoins: outCoins,
      next: response.data.Result.FromHeight,
    };
  };

  getCoinCount = async () => {
    let data = {
      jsonrpc: "1.0",
      method: "getotacoinlength",
      params: [],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }
    if (response.status !== 200) {
      throw new Error("Can't request API get all output coins");
    } else if (response.data.Error) {
      throw response.data.Error;
    }
    return response.data.Result;
  };

  getOutputCoinByIndex = async (fromind, toind, shardID = 0, tokenID = PRVIDSTR) => {
    let data = {
      jsonrpc: "1.0",
      method: "getotacoinsbyindices",
      params: [
        {
          ShardID: shardID,
          TokenID: tokenID,
          FromIndex: fromind,
          ToIndex: toind,
          Indices: [],
        }
      ],
      id: 1,
    };

    let response;
    if (this.oldSyntax) {
      for (let i = fromind; i <= toind; i++) data.params[0].Indices.push(i);
    }
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }
    if (response.status !== 200) {
      throw new Error("Can't request API get all output coins");
    } else if (response.data.Error) {
      throw response.data.Error;
    }
    let outCoinsMap = response.data.Result;
    if (this.oldSyntax) {
      let cLst = Object.keys(outCoinsMap);
      cLst.forEach(k => {
        let num = new bn(k);
        outCoinsMap[k].Index = base64Encode(num.toArray("be"));
      });
    }
    return outCoinsMap;
  };

  // hasSerialNumber return true if serial number existed in database
  hasSerialNumber = async (paymentAddr, serialNumberStrs, tokenID = null) => {
    const data = {
      jsonrpc: "1.0",
      method: "hasserialnumbers",
      params: [paymentAddr, serialNumberStrs],
      id: 1,
    };

    if (tokenID != null) {
      data["params"][2] = tokenID;
    }

    let response;
    if (this.oldSyntax) {
      data.params[1] = serialNumberStrs.map(s => {
        try {
          return checkEncode(base64Decode(s));
        } catch (e) {
          return s;
        }
      })
    }
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API check has serial number");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return {
      existed: response.data.Result,
    };
  };

  // hasSNDerivator return true if snd existed in database
  hasSNDerivator = async (paymentAddr, snds, tokenID = null) => {
    const data = {
      jsonrpc: "1.0",
      method: "hassnderivators",
      params: [paymentAddr, snds],
      id: 1,
    };

    if (tokenID != null) {
      data["params"][2] = tokenID;
    }

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API check has serial number derivator");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return {
      existed: response.data.Result,
    };
  };

  // randomCommitmentsProcess randoms list commitment for proving
  randomCommitmentsProcess = async (
    paymentAddr,
    inputCoinStrs,
    tokenID = null
  ) => {
    const data = {
      jsonrpc: "1.0",
      method: "randomcommitments",
      params: [paymentAddr, inputCoinStrs],
      id: 1,
    };

    if (tokenID != null) {
      data["params"][2] = tokenID;
    }

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API random commitments");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    let commitmentStrs = response.data.Result.Commitments;

    // // deserialize commitments
    // let commitments = new Array(commitmentStrs.length);
    // for (let i = 0; i < commitments.length; i++) {
    //   let res = checkDecode(commitmentStrs[i]);

    //   if (res.version !== ENCODE_VERSION) {
    //     throw new Error("Base58 check decode wrong version");
    //   }

    //   commitments[i] = P256.decompress(res.bytesDecoded);
    // }

    return {
      commitmentIndices: response.data.Result.CommitmentIndices,
      commitmentStrs: commitmentStrs,
      myCommitmentIndices: response.data.Result.MyCommitmentIndexs,
    };
  };

  sendRawTx = async (serializedTxJson) => {
    const data = {
      jsonrpc: "1.0",
      method: "sendtransaction",
      params: [serializedTxJson],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API send transaction");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return {
      txId: response.data.Result.TxID,
    };
  };

  sendRawTxCustomTokenPrivacy = async (serializedTxJson) => {
    const data = {
      jsonrpc: "1.0",
      method: "sendrawprivacycustomtokentransaction",
      params: [serializedTxJson],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error(
        "Can't request API send privacy custom token transaction"
      );
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return {
      txId: response.data.Result.TxID,
    };
  };

  listCustomTokens = async () => {
    const data = {
      jsonrpc: "1.0",
      method: "listcustomtoken",
      params: [],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw new CustomError(
        ErrorObject.GetListCustomTokenErr,
        "Can't request API get custom token list"
      );
    }

    if (response.status !== 200) {
      throw new CustomError(
        ErrorObject.GetListCustomTokenErr,
        "Can't request API get custom token list"
      );
    } else if (response.data.Error) {
      throw new CustomError(
        ErrorObject.GetListCustomTokenErr,
        response.data.Error.Message
      );
    }

    return {
      listCustomToken: response.data.Result.ListCustomToken,
    };
  };

  listPrivacyCustomTokens = async () => {
    const data = {
      jsonrpc: "1.0",
      method: "listprivacycustomtoken",
      params: [],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw new CustomError(
        ErrorObject.GetListPrivacyTokenErr,
        "Can't request API get privacy token list"
      );
    }

    if (response.status !== 200) {
      throw new CustomError(
        ErrorObject.GetListPrivacyTokenErr,
        "Can't request API get privacy token list"
      );
    } else if (response.data.Error) {
      throw new CustomError(
        ErrorObject.GetListPrivacyTokenErr,
        response.data.Error.Message
      );
    }

    let pTokens = response.data.Result.ListCustomToken;
    // decode txinfo for each ptoken
    for (let i = 0; i < pTokens.length; i++) {
      if (pTokens[i].TxInfo !== undefined && pTokens[i].TxInfo !== "") {
        let infoDecode = checkDecode(pTokens[i].TxInfo).bytesDecoded;
        let infoDecodeStr = bytesToString(infoDecode);
        pTokens[i].TxInfo = infoDecodeStr;
      }
    }

    return {
      listPrivacyToken: pTokens,
    };
  };

  getUnspentCustomToken = async (paymentAddrSerialize, tokenIDStr) => {
    const data = {
      jsonrpc: "1.0",
      method: "listunspentcustomtoken",
      params: [paymentAddrSerialize, tokenIDStr],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }
    if (response.data.Result) {
      return {
        listUnspentCustomToken: response.data.Result,
      };
    }
  };

  getEstimateFeePerKB = async (paymentAddrSerialize, tokenIDStr = null) => {
    return {
      unitFee: 10,
    };
  };

  getTransactionByHash = async (txHashStr, formatedData = false) => {
    const data = {
      method: "gettransactionbyhash",
      params: [txHashStr],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get transaction by hash");
    } else if (response.data.Result === null && response.data.Error) {
      if (formatedData) {
        return TX_STATUS.TXSTATUS_FAILED;
      }
      return {
        isInBlock: false,
        isInMempool: false,
        err: response.data.Error,
      };
    }

    if (formatedData) {
      return response.data.Result.IsInBlock ? TX_STATUS.TXSTATUS_SUCCESS : TX_STATUS.TXSTATUS_PENDING;
    }

    return Object.assign({
      blockHash: response.data.Result.BlockHash,
      err: null,
      isInBlock: response.data.Result.IsInBlock,
      isInMempool: response.data.Result.IsInMempool,
    }, response.data.Result);
  };

  getStakingAmount = async (type) => {
    const data = {
      jsonrpc: "1.0",
      method: "getstakingamount",
      params: [type],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw new CustomError(
        ErrorObject.GetStakingAmountErr,
        "Can't request API get staking amount"
      );
    }

    if (response.status !== 200) {
      throw new CustomError(
        ErrorObject.GetStakingAmountErr,
        "Can't request API get staking amount"
      );
    } else if (response.data.Error) {
      throw new CustomError(
        ErrorObject.GetStakingAmountErr,
        response.data.Error.Message || "Can't request API get staking amount"
      );
    }

    return {
      res: Number(response.data.Result),
    };
  };

  getActiveShard = async () => {
    const data = {
      jsonrpc: "1.0",
      method: "getactiveshards",
      params: [],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw new CustomError(
        ErrorObject.GetActiveShardErr,
        "Can't request API get active shard nunber"
      );
    }

    if (response.status !== 200) {
      throw new CustomError(
        ErrorObject.GetActiveShardErr,
        "Can't request API get active shard nunber"
      );
    } else if (response.data.Error) {
      throw new CustomError(
        ErrorObject.GetActiveShardErr,
        response.data.Error.Message ||
          "Can't request API get active shard nunber"
      );
    }

    return {
      shardNumber: parseInt(response.data.Result),
    };
  };

  getMaxShardNumber = async () => {
    const data = {
      jsonrpc: "1.0",
      method: "getmaxshardsnumber",
      params: [],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw new CustomError(
        ErrorObject.GetMaxShardNumberErr,
        "Can't request API get max shard number"
      );
    }

    if (response.status !== 200) {
      throw new CustomError(
        ErrorObject.GetMaxShardNumberErr,
        "Can't request API get max shard number"
      );
    } else if (response.data.Error) {
      throw new CustomError(
        ErrorObject.GetMaxShardNumberErr,
        response.data.Error.Message
      );
    }

    return {
      shardNumber: parseInt(response.data.Result),
    };
  };

  hashToIdenticon = async (hashStrs) => {
    const data = {
      jsonrpc: "1.0",
      method: "hashtoidenticon",
      params: hashStrs,
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw new CustomError(
        ErrorObject.HashToIdenticonErr,
        "Can't request API get image from hash string"
      );
    }

    if (response.status !== 200) {
      throw new CustomError(
        ErrorObject.HashToIdenticonErr,
        "Can't request API get image from hash string"
      );
    } else if (response.data.Error) {
      throw new CustomError(
        ErrorObject.HashToIdenticonErr,
        response.data.Error.Message
      );
    }

    return {
      images: response.data.Result,
    };
  };

  getRewardAmount = async (paymentAddrStr) => {
    const data = {
      jsonrpc: "1.0",
      method: "getrewardamount",
      params: [paymentAddrStr],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get image from hash string");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return {
      rewards: response.data.Result,
    };
  };

  getBeaconBestState = async () => {
    const data = {
      jsonrpc: "1.0",
      method: "getbeaconbeststate",
      params: [],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get beacon best state");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return {
      bestState: response.data.Result,
    };
  };

  getPublicKeyRole = async (publicKey) => {
    const data = {
      jsonrpc: "1.0",
      method: "getpublickeyrole",
      params: [publicKey],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get public key role");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return {
      status: response.data.Result,
    };
  };

  getPdexv3State = async (key = 'All', id = '', beaconHeight = 0) => {
    const data = {
      jsonrpc: "1.0",
      method: "pdexv3_getState",
      params: [{
          BeaconHeight: beaconHeight,
          Filter: {
            Key: key,
            Verbosity: 2,
            ID: id,
          },
        }
      ],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get PDE state");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return response.data.Result;
  };

  getPdexv3Status = async (action = "Trade", txId, ...extra) => {
    const data = {
      id: 1,
      jsonrpc: "1.0",
      method: `pdexv3_get${action}Status`,
      params: [txId, ...extra],
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error(`Can't request API get Pdexv3 status ${action}, ${txId}`);
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return response.data.Result;
  };

  getPDETradeStatus = async (txId) => {
    const data = {
      id: 1,
      jsonrpc: "1.0",
      method: "pdexv3_getTradeStatus",
      params: [txId],
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get PDE state");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return {
      state: response.data.Result,
    };
  };

  getPDEContributionStatus = async (pairId) => {
    const data = {
      id: 1,
      jsonrpc: "1.0",
      method: "pdexv3_getContributionStatus",
      params: [txId],
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API getPDEContributionStatus");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return {
      state: response.data.Result,
    };
  };

  getPDEWithdrawalStatus = async (txId) => {
    const data = {
      id: 1,
      jsonrpc: "1.0",
      method: "pdexv3_getWithdrawLiquidityStatus",
      params: [txId],
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API getPDEWithdrawalStatus");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return {
      state: response.data.Result,
    };
  };

  getBlockChainInfo = async () => {
    return parseResponse(this.rpcHttpService, "getblockchaininfo");
  };

  listRewardAmount = async () => {
    return parseResponse(this.rpcHttpService, "listrewardamount");
  };

  getBeaconBestStateDetail = async () => {
    return parseResponse(this.rpcHttpService, "getbeaconbeststatedetail");
  };

  getBeaconHeight = async () => {
    const data = await this.getBlockChainInfo();
    return data.BestBlocks["-1"].Height;
  };

  /**
   *
   * @param {string} tokenIDStr1
   * @param {string} tokenIDStr2, default is PRV
   */
  isExchangeRatePToken = async (tokenIDStr1, tokenIDStr2 = "") => {
    if (tokenIDStr2 === "") {
      tokenIDStr2 = PRVIDSTR;
    }

    const beaconHeight = await this.getBeaconHeight();
    const pdeStateRes = await this.getPDEState(beaconHeight);

    let tokenIDArray = [tokenIDStr1, tokenIDStr2];
    tokenIDArray.sort();

    let keyValue =
      PDEPOOLKEY +
      "-" +
      beaconHeight +
      "-" +
      tokenIDArray[0] +
      "-" +
      tokenIDArray[1];

    if (
      pdeStateRes.state.PDEPoolPairs[keyValue] !== null &&
      pdeStateRes.state.PDEPoolPairs[keyValue] !== undefined
    ) {
      if (
        tokenIDArray[0] == PRVIDSTR &&
        pdeStateRes.state.PDEPoolPairs[keyValue].Token1PoolValue < 10000 * 1e9
      ) {
        return false;
      }

      if (
        tokenIDArray[1] == PRVIDSTR &&
        pdeStateRes.state.PDEPoolPairs[keyValue].Token2PoolValue < 10000 * 1e9
      ) {
        return false;
      }

      return true;
    }
    return false;
  };

  getTransactionByReceiver = async (paymentAdrr, viewingKey) => {
    let data = {
      jsonrpc: "1.0",
      method: "gettransactionbyreceiver",
      params: [
        {
          PaymentAddress: paymentAdrr,
          ReadonlyKey: viewingKey,
        },
      ],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get all output coins");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    let result = response.data.Result;
    return {
      receivedTransactions: result.ReceivedTransactions,
    };
  };

  getListPrivacyCustomTokenBalance = async (privateKey) => {
    const data = {
      jsonrpc: "1.0",
      method: "getlistprivacycustomtokenbalance",
      params: [privateKey],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error(
        "Can't request API get list privacy custom token balance"
      );
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return (
      (response.data.Result && response.data.Result.ListCustomTokenBalance) ||
      []
    );
  };

  getBurningAddress = async (beaconHeight = 0) => {
    const data = {
      jsonrpc: "1.0",
      method: "getburningaddress",
      params: [beaconHeight],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get burning address");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return response.data.Result;
  };

  getNodeTime = async () => {
    const data = await parseResponse(this.rpcHttpService, "getnetworkinfo", "");
    return data.NodeTime;
  };

  // submit some info for a full node to create a burning transaction
  // alternatively, burning transactions can be made right in this client. See transactor.burn
  burnTokenToContract = async (
    privateKey,
    tokenID,
    amount,
    toEthAddress,
    isForContract = true
  ) => {
    let temp = await this.getBeaconBestState();
    const beaconHeight = temp.bestState.BeaconHeight;
    const burnAddr = await this.getBurningAddress(beaconHeight);
    let receivers = {};
    receivers[burnAddr] = amount;
    let method = "createandsendburningrequest";
    if (isForContract) {
      method = "createandsendburningfordeposittoscrequest";
    }
    const data = {
      jsonrpc: "1.0",
      method: method,
      params: [
        privateKey,
        null,
        5,
        -1,
        {
          TokenID: tokenID,
          TokenName: "",
          TokenSymbol: "",
          TokenTxType: 1,
          TokenAmount: amount,
          TokenReceivers: receivers,
          RemoteAddress:
            toEthAddress.length == 40 ? toEthAddress : toEthAddress.slice(2),
          Privacy: true,
          TokenFee: 0,
        },
        "",
        0,
      ],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get burning address");
    } else if (response.data.Error) {
      throw response.data.Error;
    }
    // console.log(response.data.Result);
    return response.data.Result;
  };

  getBurnProof = async (txId, isForContract = true) => {
    let method = "getburnproof";
    if (isForContract) {
      method = "getburnprooffordeposittosc";
    }

    const data = {
      jsonrpc: "1.0",
      method: method,
      params: [txId],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get burning address");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return response.data.Result;
  };

  unified_getBurnProof = async (txId, ind = 0) => {
    let method = "bridgeaggGetBurnProof";

    const data = {
      jsonrpc: "1.0",
      method: method,
      params: [{
        TxReqID: txId,
        DataIndex: ind,
      }],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get burning address");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return response.data.Result;
  };

  getOtherCoinsForRing = async (
    paymentAddr,
    numOfCoinsToGet,
    tokenID = null
  ) => {
    const data = {
      jsonrpc: "1.0",
      method: "randomcommitmentsandpublickeys",
      params: [paymentAddr, numOfCoinsToGet],
      id: 1,
    };
    if (tokenID != null) {
      data["params"][2] = tokenID;
    }
    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }
    if (response.status !== 200) {
      throw new Error("Can't request API random commitments");
    } else if (response.data.Error) {
      throw response.data.Error;
    }
    const result = {
      Indexes: response.data.Result.CommitmentIndices,
      Commitments: response.data.Result.Commitments,
      PublicKeys: response.data.Result.PublicKeys,
      AssetTags: response.data.Result.AssetTags,
    };
    return result;
  };

  // submit some info for a full node to create a ETH-bridged-issuing transaction
  // alternatively, issuing transactions can be made right in this client. See transactor.shield
  issueIncToken = async (
    privateKey,
    tokenID,
    ethBlockHash,
    ethDepositProof,
    txIndex
  ) => {
    const data = {
      jsonrpc: "1.0",
      method: "createandsendtxwithissuingethreq",
      params: [
        privateKey,
        null,
        5,
        -1,
        {
          IncTokenID: tokenID,
          BlockHash: ethBlockHash,
          ProofStrs: ethDepositProof,
          TxIndex: txIndex,
        },
      ],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get burning address");
    } else if (response.data.Error) {
      throw response.data.Error;
    }
    // console.log(response.data.Result);
    return response.data.Result;
  };

  submitKey = async (key, auth = null) => {
    const data = auth ? {
      jsonrpc: "1.0",
      method: "authorizedsubmitkey",
      params: [key, auth, 0, true],
      id: 1,
    } : {
      jsonrpc: "1.0",
      method: "submitkey",
      params: [key],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error(`Can't request API submit key ${response}`);
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return response.data.Result;
  };

  getBlockByHash = async (bh) => {
    const data = {
      method: "retrieveblock",
      params: [bh, "1"],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get block by hash");
    } else if (response.data.Result === null && response.data.Error) {
      return {};
    }

    return response.data.Result;
  };

  getPortalV4Params = async (beaconHeight = 0) => {
    const data = {
      jsonrpc: "1.0",
      method: "getportalv4params",
      params: [{
        "BeaconHeight": beaconHeight.toString()
      }],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get portal v4 params");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return response.data.Result;
  };

  getPortalShieldStatus = async (txID) => {
    const data = {
      jsonrpc: "1.0",
      method: "getportalshieldingrequeststatus",
      params: [{
        "ReqTxID": txID
      }],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get portal shield status");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return response.data.Result;
  };

  getPortalUnShieldStatus = async (txID) => {
    const data = {
      jsonrpc: "1.0",
      method: "getportalunshieldrequeststatus",
      params: [{
        "UnshieldID": txID
      }],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API get portal unshield status");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return response.data.Result;
  };

  generatePortalShieldingAddress = async (incAddressStr, tokenID) => {
    const data = {
      jsonrpc: "1.0",
      method: "generateportalshieldmultisigaddress",
      params: [{
        "IncAddressStr": incAddressStr,
        "TokenID": tokenID,
      }],
      id: 1,
    };

    let response;
    try {
      response = await this.rpcHttpService.postRequest(data);
    } catch (e) {
      throw e;
    }

    if (response.status !== 200) {
      throw new Error("Can't request API generate portal shielding address");
    } else if (response.data.Error) {
      throw response.data.Error;
    }

    return response.data.Result;
  };

  getURL = () => {
    return this.rpcHttpService.url;
  }
}

export { RpcClient };
