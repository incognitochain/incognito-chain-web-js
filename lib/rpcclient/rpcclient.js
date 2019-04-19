import { RPCHttpService } from './rpchttpservice';
import * as base58 from "../base58";
import * as constants from 'privacy-js-lib/lib/constants';
import json from 'circular-json';
import { KeyWallet as keyWallet } from "../wallet/hdwallet";
import * as constantsWallet from '../wallet/constants';
import * as constantsTx from '../tx/constants';
import { knapsack, greedy } from '../knapsack';
import BN from "bn.js"
import * as coin from '../coin';
import * as ec from "privacy-js-lib/lib/ec";
import * as privacyUtils from 'privacy-js-lib/lib/privacy_utils';
import * as zkp from 'privacy-js-lib/lib/zkps/utils'
import { TxTokenVin, TxTokenVout } from "../tx/txcustomtokendata";
import * as common from "../common";
import * as key from "../key";
import { CustomTokenPrivacyParamTx, Wallet } from "../wallet/wallet";
import { CustomTokenParamTx } from '../tx/txcustomtokendata'
import { PaymentInfo } from "../key";

let bn = require('bn.js');
const P256 = ec.P256;

class RpcClient {
  constructor(url, user, password) {
    this.rpcHttpService = new RPCHttpService(url, user, password)
  }

  getOutputCoin = async (paymentAdrr, viewingKey, tokenID = null) => {
    let data = {
      "jsonrpc": "1.0",
      "method": "listoutputcoins",
      "params": [
        0,
        999999,
        [{
          "PaymentAddress": paymentAdrr,
          "ReadonlyKey": viewingKey,
        }],
      ],
      "id": 1
    };
    if (tokenID != null) {
      data["params"][3] = tokenID;
    }
    const response = await this.rpcHttpService.postRequest(data);

    if (response.status !== 200) {
      return {
        outCoins: [],
        err: new Error("Can't request API get all output coins")
      }
    } else {
      return {
        outCoins: response.data.Result.Outputs[viewingKey],
        err: null
      }
    }
  };

  // hasSerialNumber return true if serial number existed in database
  hasSerialNumber = async (paymentAddr, serialNumberStrs, tokenID = null) => {
    console.time("Has serila number " + tokenID);
    const data = {
      "jsonrpc": "1.0",
      "method": "hasserialnumbers",
      "params": [
        paymentAddr,
        serialNumberStrs,
      ],
      "id": 1
    };
    if (tokenID != null) {
      data["params"][2] = tokenID;
    }

    const response = await this.rpcHttpService.postRequest(data);

    if (response.status !== 200) {
      console.timeEnd("Has serial number " + tokenID);
      return {
        existed: [],
        err: new Error("Can't request API check has serial number")
      }
    } else {
      console.timeEnd("Has serial number " + tokenID);
      return {
        existed: response.data.Result,
        err: null
      }
    }
  };

  // hasSNDerivator return true if snd existed in database
  hasSNDerivator = async (paymentAddr, snds, tokenID = null) => {
    const data = {
      "jsonrpc": "1.0",
      "method": "hassnderivators",
      "params": [
        paymentAddr,
        snds,
      ],
      "id": 1
    };
    if (tokenID != null) {
      data["params"][2] = tokenID;
    }

    const response = await this.rpcHttpService.postRequest(data);

    if (response.status !== 200) {
      return {
        existed: [],
        err: new Error("Can't request API check has serial number derivator")
      }
    } else {
      return {
        existed: response.data.Result,
        err: null
      }
    }
  };

  // randomCommitmentsProcess randoms list commitment for proving
  randomCommitmentsProcess = async (paymentAddr, inputCoinStrs, tokenID = null) => {
    const data = {
      "jsonrpc": "1.0",
      "method": "randomcommitments",
      "params": [
        paymentAddr,
        inputCoinStrs,
      ],
      "id": 1
    };
    if (tokenID != null) {
      data["params"][2] = tokenID;
    }

    const response = await this.rpcHttpService.postRequest(data);

    if (response.status !== 200) {
      return {
        commitmentIndices: [],
        commitments: [],
        myCommitmentIndices: [],
        err: new Error("Can't request API random commitments")
      }
    } else {

      let commitmentStrs = response.data.Result.Commitments;

      // deserialize commitments
      let commitments = new Array(commitmentStrs.length);
      for (let i = 0; i < commitments.length; i++) {
        let res = base58.checkDecode(commitmentStrs[i]);

        if (res.version !== constants.PRIVACY_VERSION) {
          return {
            commitmentIndices: [],
            commitments: [],
            myCommitmentIndices: [],
            err: new Error("Base58 check decode wrong version")
          }
        }

        commitments[i] = P256.decompress(res.bytesDecoded);
      }

      return {
        commitmentIndices: response.data.Result.CommitmentIndices,
        commitments: commitments,
        myCommitmentIndices: response.data.Result.MyCommitmentIndexs,
        err: null
      }
    }
  };

  // prepareInputForTx prepare inputs for constant tx
  prepareInputForTx = async (spendingKeyStr, paymentInfos, fee, account) => {
    // deserialize spending key string to key wallet
    let myKeyWallet = keyWallet.base58CheckDeserialize(spendingKeyStr);
    // import key set
    myKeyWallet.KeySet.importFromPrivateKey(myKeyWallet.KeySet.PrivateKey);

    // serialize payment address, readonlyKey
    let paymentAddrSerialize = myKeyWallet.base58CheckSerialize(constantsWallet.PaymentAddressType);
    let readOnlyKeySerialize = myKeyWallet.base58CheckSerialize(constantsWallet.ReadonlyKeyType);

    // get all output coins of spendingKey
    let resp = await this.getOutputCoin(paymentAddrSerialize, readOnlyKeySerialize);
    let allOutputCoinStrs;
    if (resp.err === null) {
      allOutputCoinStrs = resp.outCoins
    } else {
      throw resp.err;
    }

    if (allOutputCoinStrs.length == 0) {
      throw new Error('Balance is zero');
    }

    // console.log("list out put coin: ", allOutputCoinStrs);

    // parse input coin from string
    // leftOutputCoinStrs: is not cached
    const { leftOutputCoinStrs, cachedOutputCoinStrs, cachedInputCoins } = account.analyzeOutputCoinFromCached(allOutputCoinStrs);
    let inputCoins = cachedInputCoins

    // console.log("Input coin cached: analyzeOutputCoinFromCached : ", inputCoins);

    // cache leftOutputCoinStrs
    if (leftOutputCoinStrs.length > 0) {
      let leftInputCoins = Wallet.RpcClient.parseInputCoinFromEncodedObject(leftOutputCoinStrs, account.key, account.derivatorPointCached);
      account.mergeDerivatorCached();
      account.mergeInputCoinJsonCached(leftOutputCoinStrs, leftInputCoins);
      inputCoins = inputCoins.concat(leftInputCoins);
      allOutputCoinStrs = cachedOutputCoinStrs.concat(leftOutputCoinStrs);
    }

    // analyze from cache
    // get unspent coin from cache
    let { inputCoinsRet, allOutputCoinStrsRet } = account.analyzeSpentCoinFromCached(inputCoins, allOutputCoinStrs);

    // check whether unspent coin from cache is spent or not
    let resGetUnspentCoin = await Wallet.RpcClient.getUnspentCoin(inputCoinsRet, paymentAddrSerialize, allOutputCoinStrsRet);
    let unspentCoins = resGetUnspentCoin.unspentCoin;
    console.log("unspentCoins after getUnspentCoin: ", unspentCoins)

    // get list of spending coins, which in tx in membool

    let unspentCoinExceptSpeningCoin = Wallet.RpcClient.getUnspentCoinExceptSpendingCoin(unspentCoins, account);

    console.log("unspentCoinExceptSpeningCoin: ", unspentCoinExceptSpeningCoin);

    // calculate amount which need to be spent
    let amount = new BN(0);
    for (let i = 0; i < paymentInfos.length; i++) {
      amount = amount.add(paymentInfos[i].Amount);
    }
    amount = amount.add(fee);

    let inputCoinsToSpent;
    let respChooseBestCoin;
    try {
      respChooseBestCoin = this.chooseBestCoinToSpent(unspentCoinExceptSpeningCoin, amount);
      inputCoinsToSpent = respChooseBestCoin.resultOutputCoins;
    } catch (e) {
      console.log("Error when chooseBestCoinToSpent", e)
      throw e;
    }

    if (inputCoinsToSpent.length == 0 && amount.cmp(new BN(0)) != 0) {
      throw new Error("Not enough coin")
    }

    // parse inputCoinsToSpent to encoded objects 
    let inputCoinsToSpentStr = this.parseInputCoinToEncodedObject(inputCoinsToSpent);

    return {
      senderKeySet: myKeyWallet.KeySet,
      paymentAddrSerialize: paymentAddrSerialize,
      inputCoins: inputCoinsToSpent,
      inputCoinStrs: inputCoinsToSpentStr
    };
  };

  getUnspentCoinExceptSpendingCoin(unspentCoins, account) {
    // console.log("unspentCoinExceptSpeningCoin getUnspentCoinExceptSpendingCoin before: ", unspentCoinExceptSpeningCoin);
    // console.log(" AAAA account.spendingCoins: ", account.spendingCoins);

    if (account.spendingCoins){
      let unspentCoinExceptSpeningCoin = this.cloneInputCoinArray(unspentCoins);
      for (let i = 0; i < account.spendingCoins.length; i++) {
        for (let j = 0; j < account.spendingCoins[i].spendingSNs.length; j++) {
          // console.log("Spending coin : ", account.spendingCoins)
          for (let k = 0; k < unspentCoinExceptSpeningCoin.length; k++) {
            // console.log("FFF account.spendingCoins[i].spendingCoins[j].toString(): ", account.spendingCoins[i].spendingSNs[j].toString());
            // console.log("FFF unspentCoinExceptSpeningCoin[k].coinDetails.serialNumber.compress().toString(): ", unspentCoinExceptSpeningCoin[k].coinDetails.serialNumber.compress().toString());
            if (account.spendingCoins[i].spendingSNs[j].toString() === unspentCoinExceptSpeningCoin[k].coinDetails.serialNumber.compress().toString()) {
              unspentCoinExceptSpeningCoin.splice(k, 1);
            }
          }
        }
      }
      console.log("unspentCoinExceptSpeningCoin getUnspentCoinExceptSpendingCoin after : ", unspentCoinExceptSpeningCoin);
      return unspentCoinExceptSpeningCoin;
    } else{
      return unspentCoins;
    }
  }

  getUTXOsExceptSpendingCoin(unspentCoins, unspentCoinStrs, account) {
    if (account.spendingCoins){
      let UTXOExceptSpeningCoin = this.cloneInputCoinArray(unspentCoins);
      let UTXOExceptSpeningCoinStrs = unspentCoinStrs;
      for (let i = 0; i < account.spendingCoins.length; i++) {
        for (let j = 0; j < account.spendingCoins[i].spendingSNs.length; j++) {
          // console.log("Spending coin : ", account.spendingCoins)
          for (let k = 0; k < UTXOExceptSpeningCoin.length; k++) {
            if (account.spendingCoins[i].spendingSNs[j].toString() === UTXOExceptSpeningCoin[k].coinDetails.serialNumber.compress().toString()) {
              UTXOExceptSpeningCoin.splice(k, 1);
              UTXOExceptSpeningCoinStrs.splice(k, 1);
            }
          }
        }
      }
      console.log("UTXOExceptSpeningCoin getUnspentCoinExceptSpendingCoin after : ", UTXOExceptSpeningCoin);
      return {
        UTXOExceptSpeningCoin: UTXOExceptSpeningCoin,
        UTXOExceptSpeningCoinStrs: UTXOExceptSpeningCoinStrs
      }
    } else{
      return {
        UTXOExceptSpeningCoin: unspentCoins,
        UTXOExceptSpeningCoinStrs: unspentCoinStrs
      }
    }
  }

  // cloneInputCoinArray clone array of input coins to new array
  cloneInputCoinArray = (inputCoins) => {
    let inputCoinsClone = new Array(inputCoins.length);

    for (let i = 0; i < inputCoinsClone.length; i++) {
      inputCoinsClone[i] = new coin.InputCoin()
      inputCoinsClone[i].coinDetails.set(inputCoins[i].coinDetails.publicKey, inputCoins[i].coinDetails.coinCommitment,
        inputCoins[i].coinDetails.snderivator, inputCoins[i].coinDetails.serialNumber, inputCoins[i].coinDetails.randomness,
        inputCoins[i].coinDetails.value, inputCoins[i].coinDetails.info);
    }
    return inputCoinsClone;
  }

  // chooseBestCoinToSpent return list of coins to spent using Knapsack and Greedy algorithm
  chooseBestCoinToSpent = (inputCoins, amount) => {
    console.time("chooseBestCoinToSpent")
    // console.log("chooseBestCoinToSpent - inputCoins", inputCoins)
    // console.log("inputCoins[i].coinDetails.value: ", inputCoins[0].coinDetails.value);

    // console.log("chooseBestCoinToSpent - amount", amount)
    if (amount.cmp(new BN(0)) === 0) {
      return {
        resultOutputCoins: [],
        remainOutputCoins: inputCoins,
        totalResultOutputCoinAmount: 0
      }
    }
    let incoinUnknapsack = [];
    let incoinKnapsack = [];
    let valueKnapsack = [];
    let resultOutputCoins = [];
    let remainOutputCoins = [];
    let sumvalueKnapsack = new BN(0);

    for (let i = 0; i < inputCoins.length; i++) {
      // console.log("inputCoins[i].coinDetails.value: ", inputCoins[i].coinDetails.value);
      if (inputCoins[i].coinDetails.value.cmp(amount) == 1) {
        incoinUnknapsack.push(inputCoins[i]);
      } else {
        sumvalueKnapsack = sumvalueKnapsack.add(inputCoins[i].coinDetails.value);
        valueKnapsack.push(inputCoins[i].coinDetails.value.toNumber());
        incoinKnapsack.push(inputCoins[i]);
      }
    }

    let target = sumvalueKnapsack.clone().sub(amount);
    let totalResultOutputCoinAmount = new BN(0);

    // console.log("sumvalueKnapsack", sumvalueKnapsack)
    // console.log("target", target)

    if (target.cmpn(1000) > 0) {
      console.log("target.cmpn(1000) > 0")
      inputCoins.sort(function (a, b) {
        return a.coinDetails.value.cmp(b.coinDetails.value)
      });
      let choice = greedy(inputCoins, amount);
      for (let i = 0; i <= choice; i++) {
        totalResultOutputCoinAmount = totalResultOutputCoinAmount.add(inputCoins[i].coinDetails.value);
        resultOutputCoins.push(inputCoins[i]);
      }
      for (let i = choice + 1; i < inputCoins.length; i++) {
        remainOutputCoins.push(inputCoins[i]);
      }
    } else if (target.cmpn(0) > 0) {
      console.log("target.cmpn(0) > 0")
      let choices = knapsack(valueKnapsack, target.toNumber());

      for (let i = 0; i < valueKnapsack.length; i++) {
        if (!choices[i]) {
          totalResultOutputCoinAmount = totalResultOutputCoinAmount.addn(valueKnapsack[i]);
          resultOutputCoins.push(inputCoins[i]);
        } else {
          remainOutputCoins.push(inputCoins[i]);
        }
      }
    } else if (target === 0) {
      console.log("target === 0")
      totalResultOutputCoinAmount = sumvalueKnapsack;
      resultOutputCoins = incoinKnapsack;
      remainOutputCoins = incoinUnknapsack;
    } else {
      console.log("target else")
      // console.log("incoinUnknapsack", incoinUnknapsack)
      if (incoinUnknapsack.length === 0) {
        console.timeEnd("chooseBestCoinToSpent")
        throw new Error("Not enough constant");
      } else {
        let iMin = 0;
        for (let i = 1; i < incoinUnknapsack.length; i++) {
          iMin = (incoinUnknapsack[i].coinDetails.value.cmp(incoinUnknapsack[iMin].coinDetails.value) < 0) ? (i) : (iMin);
        }
        resultOutputCoins.push(incoinUnknapsack[iMin]);
        totalResultOutputCoinAmount = incoinUnknapsack[iMin].coinDetails.value.clone();
        for (let i = 0; i < incoinUnknapsack.length; i++) {
          if (i !== iMin) {
            remainOutputCoins.push(incoinUnknapsack[i]);
          }
        }
      }
    }

    console.timeEnd("chooseBestCoinToSpent")
    return {
      resultOutputCoins: this.cloneInputCoinArray(resultOutputCoins),
      remainOutputCoins: this.cloneInputCoinArray(remainOutputCoins),
      totalResultOutputCoinAmount: totalResultOutputCoinAmount
    };
  };

  // parseInputCoinFromEncodedObject convert encoded input coins object to struct
  parseInputCoinFromEncodedObject = (serializedObjects, keyWallet, derivatorCached = {}, tokenID = 'constant') => {
    console.time("parseInputCoinFromEncodedObject: ")
    let inputCoins = new Array(serializedObjects.length);

    // console.log("Spending key when parseInputCoinFromSerializedObject: ", keyWallet.KeySet.PrivateKey);

    const spendingKeyBN = new BN(keyWallet.KeySet.PrivateKey);

    for (let i = 0; i < serializedObjects.length; i++) {
      let publicKeyDecode = base58.checkDecode(serializedObjects[i].PublicKey).bytesDecoded;
      let commitmentDecode = base58.checkDecode(serializedObjects[i].CoinCommitment).bytesDecoded;
      let sndDecode = base58.checkDecode(serializedObjects[i].SNDerivator).bytesDecoded;
      let randDecode = base58.checkDecode(serializedObjects[i].Randomness).bytesDecoded;

      inputCoins[i] = new coin.InputCoin();

      inputCoins[i].coinDetails.publicKey = P256.decompress(publicKeyDecode);
      inputCoins[i].coinDetails.coinCommitment = P256.decompress(commitmentDecode);
      inputCoins[i].coinDetails.snderivator = new BN(sndDecode);
      inputCoins[i].coinDetails.randomness = new BN(randDecode);
      inputCoins[i].coinDetails.value = new BN(serializedObjects[i].Value);
      inputCoins[i].coinDetails.info = base58.checkDecode(serializedObjects[i].Info).bytesDecoded;

      // calculate serial number for all of output coins
      // console.time("Derive: " + i);
      const sndStr = `${tokenID}_${inputCoins[i].coinDetails.snderivator}`;
      let serialNumber = {}
      if (derivatorCached[sndStr] != undefined) {
        serialNumber = derivatorCached[sndStr];
      } else {
        serialNumber = P256.g.derive(spendingKeyBN, inputCoins[i].coinDetails.snderivator);
        derivatorCached[sndStr] = serialNumber;
      }
      inputCoins[i].coinDetails.serialNumber = serialNumber;
      // console.timeEnd("Derive: " + i);
    }
    console.timeEnd("parseInputCoinFromEncodedObject: ")
    return inputCoins;
  };

  // parseInputCoinToEncodedObject convert input coin to encoded object
  parseInputCoinToEncodedObject = (coins) => {
    let coinStrs = new Array(coins.length);

    for (let i = 0; i < coinStrs.length; i++) {
      coinStrs[i] = new Object();
      coinStrs[i].PublicKey = base58.checkEncode(coins[i].coinDetails.publicKey.compress(), constants.PRIVACY_VERSION);
      coinStrs[i].CoinCommitment = base58.checkEncode(coins[i].coinDetails.coinCommitment.compress(), constants.PRIVACY_VERSION);
      coinStrs[i].SNDerivator = base58.checkEncode(coins[i].coinDetails.snderivator.toArray(), constants.PRIVACY_VERSION);
      coinStrs[i].Randomness = base58.checkEncode(coins[i].coinDetails.randomness.toArray(), constants.PRIVACY_VERSION);
      coinStrs[i].SerialNumber = null;
      coinStrs[i].Value = coins[i].coinDetails.value;
      coinStrs[i].Info = base58.checkEncode(coins[i].coinDetails.info, constants.PRIVACY_VERSION);
    }

    return coinStrs;
  };

  // getUnspentCoin returns unspent coins
  getUnspentCoin = async (inputCoins, paymentAddrSerialize, inCoinStrs, tokenID) => {
    console.time("Getunspent coin:")
    let unspentCoin = new Array();
    let unspentCoinStrs = new Array();

    let serialNumberStrs = new Array(inputCoins.length);

    for (let i = 0; i < inputCoins.length; i++) {
      serialNumberStrs[i] = base58.checkEncode(inputCoins[i].coinDetails.serialNumber.compress(), 0x00);
    }

    // check whether each input coin is spent or not
    let res = await this.hasSerialNumber(paymentAddrSerialize, serialNumberStrs, tokenID);
    let existed = [];
    if (res.err !== null) {
      throw new Error('ERR when call API has serial number: ', res.err);
    } else {
      existed = res.existed;
    }

    if (existed.length != inputCoins.length) {
      throw new Error("Wrong response when check has serial number");
    }

    for (let i = 0; i < existed.length; i++) {
      if (!existed[i]) {
        unspentCoin.push(inputCoins[i]);
        unspentCoinStrs.push(inCoinStrs[i]);
      }
    }
    // console.log("unspent input coin: ", unspentCoin);
    // console.log("unspent input coin len : ", unspentCoin.length);
    console.timeEnd("Getunspent coin:")
    return {
      unspentCoin: unspentCoin,
      unspentCoinStrs: unspentCoinStrs
    };
  };

  // getUnspentPrivacyCustomToken returns unspent privacy custom token
  getUnspentPrivacyCustomToken = async (inputCoins, paymentAddrSerialize, inCoinStrs, tokenID = null) => {
    let unspentCoin = new Array();
    let unspentCoinStrs = new Array();

    let serialNumberStrs = new Array(inputCoins.length);

    for (let i = 0; i < inputCoins.length; i++) {
      serialNumberStrs[i] = base58.checkEncode(inputCoins[i].coinDetails.serialNumber.compress(), 0x00);
    }

    // check whether each input coin is spent or not
    let res = await this.hasSerialNumber(paymentAddrSerialize, serialNumberStrs, tokenID);
    let existed = [];
    if (res.err !== null) {
      console.log('ERR when call API has serial number: ', res.err);
      throw new Error('ERR when call API has serial number: ', res.err);
    } else {
      existed = res.existed;
    }

    for (let i = 0; i < existed.length; i++) {
      if (!existed[i]) {
        unspentCoin.push(inputCoins[i]);
        unspentCoinStrs.push(inCoinStrs[i]);
      }
    }
    // console.log("unspent input coin: ", unspentCoin);
    // console.log("unspent input coin len : ", unspentCoin.length);
    return {
      unspentCoin: unspentCoin,
      unspentCoinStrs: unspentCoinStrs
    };
  };

  sendRawTx = async (tx) => {
    console.log("SENDING TX ........");
    // hide private key for signing
    delete tx.sigPrivKey;

    // convert tx to json
    let txJson = json.stringify(tx.convertTxToByte());
    // console.log("txJson: ", txJson);

    // base58 check encode tx json
    console.log("base58 check encode tx json .....");
    let serializedTxJson = base58.checkEncode(privacyUtils.stringToBytes(txJson), constants.PRIVACY_VERSION);
    // console.log("tx json serialize: ", serializedTxJson);

    const data = {
      "jsonrpc": "1.0",
      "method": "sendtransaction",
      "params": [
        serializedTxJson,
      ],
      "id": 1
    };

    // call API to send tx
    console.log("calling api to send tx .....");
    const response = await this.rpcHttpService.postRequest(data);
    console.log("response send tx: ", response);

    if (response.status !== 200 || response.data.Result === null) {
      return {
        txId: null,
        err: response.data.Error,
        id: null,
      }
    } else {
      console.log("**** SENDING TX SUCCESS****");
      return {
        txId: response.data.Result.TxID,
        err: response.data.Error,
        id: response.data.Id,
      }
    }
  };

  // for tx custom token
  sendRawTxCustomToken = async (tx) => {
    // hide private key for signing
    delete tx.sigPrivKey;

    // convert tx to json
    let txJson = JSON.stringify(tx.convertTxCustomTokenToByte());
    console.log("txJson: ", txJson);

    let txBytes = privacyUtils.stringToBytes(txJson);
    console.log('TxBytes: ', txBytes.join(', '));
    console.log('TxBytes len : ', txBytes.length);

    // base58 check encode tx json
    let serializedTxJson = base58.checkEncode(txBytes, constants.PRIVACY_VERSION);
    // console.log("tx json serialize: ", serializedTxJson);

    const data = {
      "jsonrpc": "1.0",
      "method": "sendrawcustomtokentransaction",
      "params": [
        serializedTxJson,
      ],
      "id": 1
    };

    // call API to send tx
    const response = await this.rpcHttpService.postRequest(data);
    console.log("response when send custom token tx: ", response);

    if (response.status !== 200 || response.data.Result === null) {
      console.log("Err when send custom token: ", response.data.Error);
      return {
        txId: null,
        err: response.data.Error,
        id: null,
      }
    } else {
      console.log("**** SENDING TX CUSTOM TOKEN SUCCESS****");
      return {
        txId: response.data.Result,
        err: response.data.Error,
        id: response.data.Id,
      }
    }
  };

  // for tx custom token
  sendRawTxCustomTokenPrivacy = async (tx) => {
    // hide private key for signing
    delete tx.sigPrivKey;
    delete tx.txTokenPrivacyData.txNormal.sigPrivKey;

    // convert tx to json
    let txJson = JSON.stringify(tx.convertTxCustomTokenPrivacyToByte());
    console.log("txJson: ", txJson);

    let txBytes = privacyUtils.stringToBytes(txJson);
    console.log('TxBytes: ', txBytes.join(', '));
    console.log('TxBytes len : ', txBytes.length);

    // base58 check encode tx json
    let serializedTxJson = base58.checkEncode(txBytes, constants.PRIVACY_VERSION);
    // console.log("tx json serialize: ", serializedTxJson);

    const data = {
      "jsonrpc": "1.0",
      "method": "sendrawprivacycustomtokentransaction",
      "params": [
        serializedTxJson,
      ],
      "id": 1
    };

    // call API to send tx
    const response = await this.rpcHttpService.postRequest(data);
    // console.log("response send tx: ", response);

    if (response.status !== 200 || response.data.Result === null) {
      return {
        txId: null,
        err: new Error("Can't send tx"),
        id: null,
      }
    } else {
      console.log("**** SENDING TX CUSTOM TOKEN SUCCESS****");
      return {
        txId: response.data.Result,
        err: response.data.Error,
        id: response.data.Id,
      }
    }
  };

  listCustomTokens = async () => {

    const data = {
      "jsonrpc": "1.0",
      "method": "listcustomtoken",
      "params": [],
      "id": 1
    };

    // call API 
    const response = await this.rpcHttpService.postRequest(data);
    // console.log("response send tx: ", response);

    if (response.status !== 200) {
      return {
        err: new Error("Can't get list of custom tokens")
      }
    } else {
      return {
        listCustomToken: response.data.Result.ListCustomToken,
        err: response.data.Error,
        id: response.data.Id,
      }
    }
  };

  listPrivacyCustomTokens = async () => {
    const data = {
      "jsonrpc": "1.0",
      "method": "listprivacycustomtoken",
      "params": [],
      "id": 1
    };

    // call API
    const response = await this.rpcHttpService.postRequest(data);
    if (response.status !== 200) {
      return {
        err: new Error("Can't get list of privacy custom tokens")
      }
    } else {
      return {
        listCustomToken: response.data.Result.ListCustomToken,
        err: response.data.Error,
        id: response.data.Id,
      }
    }
  };

  getUnspentCustomToken = async (paymentAddrSerialize, tokenIDStr) => {
    const data = {
      "jsonrpc": "1.0",
      "method": "listunspentcustomtoken",
      "params": [paymentAddrSerialize, tokenIDStr],
      "id": 1
    };

    // call API 
    const response = await this.rpcHttpService.postRequest(data);

    if (response.status !== 200 || response.data.Result === null) {
      return {
        listUnspentCustomToken: null,
        err: new Error("Can't get list of unspent custom tokens"),
        id: null
      }
    } else {
      return {
        listUnspentCustomToken: response.data.Result,
        err: response.data.Error,
        id: response.data.Id,
      }
    }
  };

  prepareInputForCustomTokenTx = async (spendingKeyStr, tokenParams) => {
    let senderKeyWallet = keyWallet.base58CheckDeserialize(spendingKeyStr);
    senderKeyWallet.KeySet.importFromPrivateKey(senderKeyWallet.KeySet.PrivateKey);

    switch (tokenParams.tokenTxType) {
      case constantsTx.CustomTokenInit: {
        let response;
        try {
          response = await this.listCustomTokens();
        } catch (e) {
          throw e;
        }

        let listCustomToken = response.listCustomToken;
        return {
          listCustomToken: listCustomToken,
          tokenVins: null,
        }
      }
      case constantsTx.CustomTokenTransfer: {
        let response = await this.listCustomTokens();
        let listCustomToken = response.listCustomToken;

        // sum of custom tokens' value in tokenParams.receivers
        let vOutAmount = 0;
        for (let i = 0; i < tokenParams.receivers.length; i++) {
          vOutAmount += tokenParams.receivers[i].value;
        }

        let response2 = await this.getUnspentCustomToken(senderKeyWallet.base58CheckSerialize(constantsWallet.PaymentAddressType),
          tokenParams.propertyID);

        let listUnspentCustomToken = response2.listUnspentCustomToken;

        // console.log("List : ", listUnspentCustomToken);

        if (listUnspentCustomToken.length === 0) {
          throw new Error("Balance of token is zero");
        }

        let tokenVins = new Array(0);
        let vinAmount = 0;

        for (let i = 0; i < listUnspentCustomToken.length; i++) {
          vinAmount += listUnspentCustomToken[i].Value;

          let tokenVoutsTmp = new TxTokenVout();
          tokenVoutsTmp.set(senderKeyWallet.KeySet.PaymentAddress, listUnspentCustomToken[i].Value);

          let tokenVinTmp = new TxTokenVin();
          tokenVinTmp.txCustomTokenID = common.newHashFromStr(listUnspentCustomToken[i].TxCustomTokenID);
          tokenVinTmp.voutIndex = listUnspentCustomToken[i].Index;
          tokenVinTmp.paymentAddress = senderKeyWallet.KeySet.PaymentAddress;
          // console.log(":senderKeyWallet1.KeySet.PaymentAddress: ", senderKeyWallet.KeySet.PaymentAddress);

          let signature = senderKeyWallet.KeySet.sign(tokenVoutsTmp.hash());
          tokenVinTmp.signature = base58.checkEncode(signature, constants.PRIVACY_VERSION);

          tokenVins.push(tokenVinTmp);

          vOutAmount -= listUnspentCustomToken[i].Value;
          if (vOutAmount <= 0) {
            break;
          }
        }

        return {
          listCustomToken: listCustomToken,
          tokenVins: tokenVins,
          vinsAmount: vinAmount,
        }
      }
    }
  };
  prepareInputForTxCustomTokenPrivacy = async (spendingKeyStr, tokenParams, account) => {
    console.log("Token param when preparing: ", tokenParams);
    // paymentInfo for tx normal
    // tokenParams for tx custom token privacy data, but haven't tokenParam's tokenInputs
    switch (tokenParams.tokenTxType) {
      case constantsTx.CustomTokenInit: {
        let listUnspentToken = await this.listPrivacyCustomTokens();
        return {
          tokenInputs: null,
          listCustomToken: listUnspentToken.listCustomToken,
        }
      }
      case constantsTx.CustomTokenTransfer: {

        // deserialize spending key string to key wallet
        let myKeyWallet = keyWallet.base58CheckDeserialize(spendingKeyStr);

        // import key set
        myKeyWallet.KeySet.importFromPrivateKey(myKeyWallet.KeySet.PrivateKey);

        // console.log("Private key: ", myKeyWallet.KeySet.PrivateKey.join(', '));

        // serialize payment address, readonlyKey
        let paymentAddrSerialize = myKeyWallet.base58CheckSerialize(constantsWallet.PaymentAddressType);
        let readOnlyKeySerialize = myKeyWallet.base58CheckSerialize(constantsWallet.ReadonlyKeyType);

        // prepare tokenParams' tokenInputs for tx custom token privacy

        let amountTokenPrivacyOutput = new BN(0);
        for (let i = 0; i < tokenParams.receivers.length; i++) {
          amountTokenPrivacyOutput = amountTokenPrivacyOutput.add(tokenParams.receivers[i].Amount);
        }

        let res = await this.getOutputCoin(paymentAddrSerialize, readOnlyKeySerialize, tokenParams.propertyID.toLowerCase());
        let allOutputCoinStrs;

        if (res.err === null) {
          allOutputCoinStrs = res.outCoins
        } else {
          console.log('ERR when call API get output: ', res.err);
          throw new Error('ERR when call API get output: ', res.err);
        }

        // parse input coin from string
        // leftOutputCoinStrs: is not cached
        const { leftOutputCoinStrs, cachedOutputCoinStrs, cachedInputCoins } = account.analyzeOutputCoinFromCached(allOutputCoinStrs, tokenParams.propertyID.toLowerCase());
        let inputCoins = cachedInputCoins

        // console.log("Input coin cached: analyzeOutputCoinFromCached : ", inputCoins);

        // cache leftOutputCoinStrs
        if (leftOutputCoinStrs.length > 0) {
          let leftInputCoins = Wallet.RpcClient.parseInputCoinFromEncodedObject(leftOutputCoinStrs, account.key, account.derivatorPointCached);
          account.mergeDerivatorCached();
          account.mergeInputCoinJsonCached(leftOutputCoinStrs, leftInputCoins);
          inputCoins = inputCoins.concat(leftInputCoins);
          allOutputCoinStrs = cachedOutputCoinStrs.concat(leftOutputCoinStrs);
        }
        // analyze from cache

        // get unspent coin from cache
        let { inputCoinsRet, allOutputCoinStrsRet } = account.analyzeSpentCoinFromCached(inputCoins, allOutputCoinStrs, tokenParams.propertyID.toLowerCase());

        // // parse input coin from encoded object
        // let inputCoins = this.parseInputCoinFromEncodedObject(allOutputCoinStrs, myKeyWallet);

        // get list unspent coins from all of output coins
        let unspentOutputCoins;
        try {
          unspentOutputCoins = await this.getUnspentPrivacyCustomToken(inputCoinsRet, paymentAddrSerialize, allOutputCoinStrsRet, tokenParams.propertyID.toLowerCase());
        } catch (e) {
          throw e;
        }

        // get coin to spent using Knapsack
        let tokenInputs;
        try {
          tokenInputs = this.chooseBestCoinToSpent(unspentOutputCoins.unspentCoin, amountTokenPrivacyOutput).resultOutputCoins;
        } catch (e) {
          throw e;
        }

        let listUnspentToken = await this.listPrivacyCustomTokens();

        return {
          tokenInputs: tokenInputs,
          listCustomToken: listUnspentToken.listCustomToken,
        };
      }
    }

  };
  // paymentAddrSerialize, inputCoins, payments, hasPrivacy, metadata, customTokenParams, privacyCustomTokenParams
  estimateFee = async (paymentAddrSerialize, inputCoins, payments, hasPrivacy, metadata, customTokenParams, privacyCustomTokenParams) => {
    const data = {
      "jsonrpc": "1.0",
      "method": "estimatefeewithestimator",
      "params": [-1, paymentAddrSerialize, 8],
      "id": 1
    };
    let unitFee = null;
    // call API to send tx
    const response = await this.rpcHttpService.postRequest(data);
    if (response.status !== 200) {
      return {
        err: new Error("Can't estimate fee")
      }
    } else {
      unitFee = parseInt(response.data.Result.EstimateFeeCoinPerKb);
    }
    let txSize = this.estimateTxSize(inputCoins, payments, hasPrivacy, metadata, customTokenParams, privacyCustomTokenParams);
    console.log("TX size when estimate fee: ", txSize);

    // check tx size
    if (txSize > constantsWallet.MaxTxSize) {
      throw new Error("Tx size is too large!")
    }

    console.log("++++++++++++++++++++++ Estimate Fee +++++++++++++++++++++")
    console.log("--------- inputCoins:", inputCoins)
    console.log("--------- payments:", payments)
    console.log("--------- hasPrivacy:", hasPrivacy)
    console.log("--------- customTokenParams:", customTokenParams)
    console.log("--------- privacyCustomTokenParams:", privacyCustomTokenParams)
    console.log("--------- txSize in Kb:", txSize)
    console.log("--------- unitFee:", unitFee)
    console.log("++++++++++++++++++++++ End Estimate Fee +++++++++++++++++++++")

    return txSize * unitFee; // mili constant
  };

  getEstimateFee = async (from, to, amount, privatekeyStr, customTokenParams = null, privacyCustomTokenParams = null, account, isPrivacy) => {
    let receiverKeyWallet = keyWallet.base58CheckDeserialize(to);
    let paymentInfos = [];
    if (customTokenParams == null && privacyCustomTokenParams == null) {
      paymentInfos = new Array(1);
      paymentInfos[0] = new key.PaymentInfo(receiverKeyWallet.KeySet.PaymentAddress, new bn(amount));
    }
    // console.log("Amount when getEstimateFee: ", amount);
    // console.log("Amount BigInt when getEstimateFee: ", new bn(amount));
    // console.log("Payment info when getEstimateFee: ", paymentInfos);

    let inputForTx;
    try {
      inputForTx = await Wallet.RpcClient.prepareInputForTx(privatekeyStr, paymentInfos, new bn(0), account);
    } catch (e) {
      throw e;
    }

    let fee;
    try {
      fee = await this.estimateFee(from, inputForTx.inputCoins, paymentInfos, isPrivacy, null, customTokenParams, privacyCustomTokenParams);
    } catch (e) {
      throw e;
    }

    return fee;
  };

  /**
   *
   * @param {string} from
   * @param {string} to
   * @param {number} amount
   * @param {{Privacy: boolean, TokenID: string, TokenName: string, TokenSymbol: string, TokenTxType: number TokenAmount: number, TokenReceivers: {[string]: number}}} tokenObject
   * @param {string} privateKeyStr
   */
  getEstimateFeeForSendingToken = async (from, to, amount, tokenObject, privatekeyStr, account) => {
    let id = "";
    let name = "";
    let symbol = "";
    if (tokenObject.TokenID !== null) {
      id = tokenObject.TokenID;
    }
    if (tokenObject.TokenName !== null) {
      name = tokenObject.TokenName;
    }
    if (tokenObject.TokenSymbol !== null) {
      symbol = tokenObject.TokenSymbol;
    }

    if (tokenObject.Privacy === false) {
      let receivers = new TxTokenVout();
      receivers.set(keyWallet.base58CheckDeserialize(tokenObject.TokenReceivers.PaymentAddress).KeySet.PaymentAddress, tokenObject.TokenReceivers.Amount);
      let customTokenParams = new CustomTokenParamTx();
      customTokenParams.set(id, name, symbol,
        amount, tokenObject.TokenTxType, [receivers],
        [], tokenObject.TokenAmount);

      let inputForCustomTx;
      try {
        inputForCustomTx = await Wallet.RpcClient.prepareInputForCustomTokenTx(privatekeyStr, customTokenParams);
        customTokenParams.vins = inputForCustomTx.tokenVins;
      } catch (e) {
        throw e;
      }

      let fee;
      try {
        fee = await this.getEstimateFee(from, to, amount, privatekeyStr, customTokenParams, null, account);
      } catch (e) {
        throw e;
      }
      return fee;
    } else if (tokenObject.Privacy === true) {
      let receivers = new PaymentInfo(keyWallet.base58CheckDeserialize(tokenObject.TokenReceivers.PaymentAddress).KeySet.PaymentAddress, new bn(tokenObject.TokenReceivers.Amount));

      let privacyCustomTokenParams = new CustomTokenPrivacyParamTx();
      privacyCustomTokenParams.set(id, name, symbol, amount, tokenObject.TokenTxType, [receivers], []);

      let inputForPrivacyCustomToken;
      try {
        inputForPrivacyCustomToken = await Wallet.RpcClient.prepareInputForTxCustomTokenPrivacy(privatekeyStr, privacyCustomTokenParams, account);
        privacyCustomTokenParams.tokenInputs = inputForPrivacyCustomToken.tokenInputs;
      } catch (e) {
        throw e;
      }

      let fee;
      try {
        fee = await this.getEstimateFee(from, to, amount, privatekeyStr, null, privacyCustomTokenParams, account);
      } catch (e) {
        throw e;
      }
      return fee;
    }
  }

  getEstimateFeeToDefragment = async (from, amount, privatekeyStr, account, isPrivacy) => {
    amount = new bn(amount);

    let senderPaymentAddress = keyWallet.base58CheckDeserialize(from);

    // totalAmount was paid for fee
    let defragmentUTXO, totalAmount;
    console.time("getUTXOsToDefragment")
    try {
      let result = await Wallet.RpcClient.getUTXOsToDefragment(privatekeyStr, new bn(0), account, amount);
      console.log("getUTXOsToDefragment Done");
      defragmentUTXO = result.defragmentUTXO;
      totalAmount = result.totalAmount;
    } catch (e) {
      console.log(e);
      throw e;
    }
    console.timeEnd("getUTXOsToDefragment")

    console.log("defragmentUTXO len: ", defragmentUTXO.length);

    // create paymentInfos
    let paymentInfos = new Array(1);
    paymentInfos[0] = new PaymentInfo(
      senderPaymentAddress,
      totalAmount
    );

    let fee;
    try {
      fee = await this.estimateFee(from, defragmentUTXO, paymentInfos, isPrivacy, null, null, null);
    } catch (e) {
      throw e;
    }
    return fee;
  };

  estimateTxSize = (inputCoins, payments, hasPrivacy, metadata, customTokenParams, privacyCustomTokenParams) => {
    let sizeVersion = 1; // int8
    let sizeType = 5;    // string, max : 5
    let sizeLockTime = 8; // int64
    let sizeFee = 8;      // uint64

    let sizeInfo = 0;
    if (hasPrivacy) {
      sizeInfo = 64;
    }
    let sizeSigPubKey = constants.SIG_PUB_KEY_SIZE;
    let sizeSig = constants.SIG_NO_PRIVACY_SIZE;
    if (hasPrivacy) {
      sizeSig = constants.SIG_PRIVACY_SIZE;
    }

    let sizeProof = zkp.estimateProofSize(inputCoins.length, payments.length, hasPrivacy);

    let sizePubKeyLastByte = 1;


    let sizeMetadata = 0;
    // if (metadata != null || typeof metadata !== "undefined"){
    //   sizeMetadata += metadata.CalculateSize()
    // }
    let sizeTx = sizeVersion + sizeType + sizeLockTime + sizeFee + sizeInfo + sizeSigPubKey + sizeSig + sizeProof + sizePubKeyLastByte + sizeMetadata;
    if (customTokenParams !== null && typeof customTokenParams !== "undefined") {
      let customTokenDataSize = 0;
      customTokenDataSize += customTokenParams.propertyID.length;
      customTokenDataSize += customTokenParams.propertySymbol.length;
      customTokenDataSize += customTokenParams.propertyName.length;
      customTokenDataSize += 8;
      customTokenDataSize += 4;
      console.log("************* customTokenParams.receivers: ", customTokenParams.receivers);
      console.log("************* customTokenParams.vins: ", customTokenParams.vins);
      for (let i = 0; i < customTokenParams.receivers.length; i++) {

        customTokenDataSize += customTokenParams.receivers[i].paymentAddress.toBytes().length;
        customTokenDataSize += 8;
      }

      if (customTokenParams.vins !== null) {
        for (let i = 0; i < customTokenParams.vins.length; i++) {
          customTokenDataSize += customTokenParams.vins[i].paymentAddress.toBytes().length;
          customTokenDataSize += customTokenParams.vins[i].txCustomTokenID.slice(0).length;
          customTokenDataSize += customTokenParams.vins[i].signature.length;
          customTokenDataSize += 4;
        }
        sizeTx += customTokenDataSize;
      }
    }
    if (privacyCustomTokenParams !== null && typeof privacyCustomTokenParams !== "undefined") {
      let customTokenDataSize = 0;

      customTokenDataSize += privacyCustomTokenParams.propertyID.length;
      customTokenDataSize += privacyCustomTokenParams.propertySymbol.length;
      customTokenDataSize += privacyCustomTokenParams.propertyName.length;

      customTokenDataSize += 8; // for amount
      customTokenDataSize += 4; // for TokenTxType
      customTokenDataSize += 1; // int8 version
      customTokenDataSize += 5; // string, max : 5 type
      customTokenDataSize += 8; // int64 locktime
      customTokenDataSize += 8; // uint64 fee

      customTokenDataSize += 64; // info

      customTokenDataSize += constants.SIG_PUB_KEY_SIZE; // sig pubkey
      customTokenDataSize += constants.SIG_PRIVACY_SIZE; // sig

      // Proof
      if (privacyCustomTokenParams.tokenInputs !== null) {
        customTokenDataSize += zkp.estimateProofSize(privacyCustomTokenParams.tokenInputs.length, privacyCustomTokenParams.receivers.length, true);
      }
      customTokenDataSize += 1; //PubKeyLastByte
      sizeTx += customTokenDataSize

    }
    return Math.ceil(sizeTx / 1024.0) + 2; // buffer more 2 kb on tx size
  };

  getTransactionByHash = async (txHashStr) => {
    const data = {
      "jsonrpc": "1.0",
      "method": "gettransactionbyhash",
      "params": [
        txHashStr,
      ],
      "id": 1
    };

    // call API 
    const response = await this.rpcHttpService.postRequest(data).then(_ => { console.log('AAAAA', _); return _;});
    console.log("Response getTransactionByHash: ", JSON.parse(JSON.stringify(response)));
    console.log("txHashStr: ", txHashStr);

    if (response.data.Result === null && response.data.Error === null){
      console.log("Response getTransactionByHash is empty");
      return {
        err: new Error("Response getTransactionByHash is empty")
      }
    }

    if (response.status !== 200 || (response.data.Result === null && response.data.Error !== null)) {
      return {
        isInBlock: false,
        isInMempool: false,
        err: new Error(response.data.Error.Message),
      }
    } else {
      console.log("**** GET TX BY HASH DONE****");
      return {
        isInBlock: response.data.Result.IsInBlock,
        isInMempool: response.data.Result.IsInMempool,
        err: null,
      }
    }
  }

  getStakingAmount = async (type) => {
    const data = {
      "jsonrpc": "1.0",
      "method": "getstackingamount",
      "params": [type],
      "id": 1
    };

    // call API to send tx
    const response = await this.rpcHttpService.postRequest(data);
    console.log("response getStakingAmount: ", response);

    if (response.status !== 200 || response.data.Result === null || response.data.Error !== null) {
      return {
        res: false,
        err: new Error("Can't request API get tx by hash, " + response.data.Error),
      }
    } else {
      console.log("**** GET TX BY HASH DONE****");
      return {
        res: Number(response.data.Result),
        err: null,
      }
    }
  }

  getUTXOsToDefragment = async (spendingKeyStr, fee, account, amount) => {
    // deserialize spending key string to key wallet
    let myKeyWallet = keyWallet.base58CheckDeserialize(spendingKeyStr);

    // import key set
    myKeyWallet.KeySet.importFromPrivateKey(myKeyWallet.KeySet.PrivateKey);

    // serialize payment address, readonlyKey
    let paymentAddrSerialize = myKeyWallet.base58CheckSerialize(constantsWallet.PaymentAddressType);
    let readOnlyKeySerialize = myKeyWallet.base58CheckSerialize(constantsWallet.ReadonlyKeyType);

    // get all output coins of spendingKey
    let res = await this.getOutputCoin(paymentAddrSerialize, readOnlyKeySerialize);
    let allOutputCoinStrs;
    // console.log("res :",res);
    if (res.err === null) {
      allOutputCoinStrs = res.outCoins
      // console.log("allOutputCoinStrs :", allOutputCoinStrs);
    } else {
      throw new Error('ERR when call API get output: ', res.err);
    }

    if (allOutputCoinStrs.length == 0) {
      throw new Error('Have no item in list output coins');
    }
    // console.log("list out put coin: ", allOutputCoinStrs);

    // parse input coin from string
    // leftOutputCoinStrs: is not cached
    const { leftOutputCoinStrs, cachedOutputCoinStrs, cachedInputCoins } = account.analyzeOutputCoinFromCached(allOutputCoinStrs);
    let inputCoins = cachedInputCoins

    // console.log("Input coin cached: analyzeOutputCoinFromCached : ", inputCoins);

    // cache leftOutputCoinStrs
    if (leftOutputCoinStrs.length > 0) {
      let leftInputCoins = Wallet.RpcClient.parseInputCoinFromEncodedObject(leftOutputCoinStrs, account.key, account.derivatorPointCached);
      account.mergeDerivatorCached();
      account.mergeInputCoinJsonCached(leftOutputCoinStrs, leftInputCoins);
      inputCoins = inputCoins.concat(leftInputCoins);
      allOutputCoinStrs = cachedOutputCoinStrs.concat(leftOutputCoinStrs);
    }
    // analyze from cache

    // get unspent coin from cache
    let { inputCoinsRet, allOutputCoinStrsRet } = account.analyzeSpentCoinFromCached(inputCoins, allOutputCoinStrs);

    let resGetUnspentCoin = await Wallet.RpcClient.getUnspentCoin(inputCoinsRet, paymentAddrSerialize, allOutputCoinStrsRet);
    let unspentCoins = resGetUnspentCoin.unspentCoin;
    let unspentCoinStrs = resGetUnspentCoin.unspentCoinStrs;

    // console.log("unspentCoins after getUnspentCoin: ", unspentCoins.length)
    // console.log("Get unspent input coin done!");

    // get list of spending coins, which in tx in membool
    let {UTXOExceptSpeningCoin, UTXOExceptSpeningCoinStrs} = Wallet.RpcClient.getUTXOsExceptSpendingCoin(unspentCoins, unspentCoinStrs, account);
    console.log("UTXOExceptSpeningCoin: ", UTXOExceptSpeningCoin);

    // get UTXO less than amount
    let defragmentUTXO = [];
    let defragmentUTXOStr = [];
    let totalAmount = new bn(0);
    let numUTXO = 0;

    for (let i = 0; i < UTXOExceptSpeningCoin.length; i++) {
      console.log("unspentCoins[i].coinDetails.value: ", UTXOExceptSpeningCoin[i].coinDetails.value);
      console.log("amount: ", amount);
      if (UTXOExceptSpeningCoin[i].coinDetails.value.cmp(amount) != 1) {
        defragmentUTXO.push(UTXOExceptSpeningCoin[i]);
        defragmentUTXOStr.push(UTXOExceptSpeningCoinStrs[i]);
        totalAmount = totalAmount.add(UTXOExceptSpeningCoin[i].coinDetails.value);
        numUTXO++;
        if (numUTXO >= constantsTx.MaxInputNumberForDefragment) {
          break;
        }
      }
    }
    console.log("defragmentUTXO: ", defragmentUTXO.length)
    console.log("Get unspent input coin less than amount done!");

    totalAmount = totalAmount.sub(fee);

    if (totalAmount.cmp(new bn(0)) == -1) {
      console.log("You shouldn't defragment wallet now beacause the number of UTXO need to be defragmented is so small!!! ")
      throw new Error("the number of UTXO need to be defragmented is so small");
    }

    console.log("Get UTXO done!");

    return {
      defragmentUTXO: defragmentUTXO,
      defragmentUTXOStr: defragmentUTXOStr,
      totalAmount: totalAmount,
    };
  };

  getActiveShard = async () => {
    const data = {
      "jsonrpc": "1.0",
      "method": "getactiveshards",
      "params": [],
      "id": 1
    };
    // call API 
    const response = await this.rpcHttpService.postRequest(data);
    if (response.status !== 200) {
      return {
        err: new Error("Can't get active shard nunber")
      }
    } else {
      return {
        shardNumber: parseInt(response.data.Result),
        err: null
      }
    }
  }

  getMaxShardNumber = async () => {
    const data = {
      "jsonrpc": "1.0",
      "method": "getmaxshardsnumber",
      "params": [],
      "id": 1
    };
    // call API 
    const response = await this.rpcHttpService.postRequest(data);
    if (response.status !== 200) {
      return {
        err: new Error("Can't get max shard nunberr")
      }
    } else {
      return {
        shardNumber: parseInt(response.data.Result),
        err: null
      }
    }
  }
}

export { RpcClient };
