import { Interface } from "./interface";
import bn from "bn.js";
import Validator from "@lib/utils/validator";
import BinarySortedArray from "binary-sorted-array";
import { NUMB_OF_OTHER_PKS } from "@lib/module/Account/account.constants";
import { ErrorMessage, PRVIDSTR } from '@lib/core/constants';
import { checkEncode as base58CheckEncode, checkDecode as base58CheckDecode } from "../common/base58";
import { byteToHexString, hexStringToByte } from "../common/common";
import { base64Encode, base64Decode } from "../privacy/utils";

let CoinChooser = new Interface("CoinChooser", [
  "coinsForRing",
  "coinsToSpend",
]);

class DefaultCoinChooser {
  constructor(sz = 20, dc = 2) {
    Interface.ensureImplements(this, CoinChooser);
    this.idealUtxoSize = sz;
    this.maxDustCoins = dc;
  }

  coinsForRing(rpcClient, shardID, numOfOtherPks, tokenID) {
    return rpcClient.getOtherCoinsForRing(shardID, numOfOtherPks, tokenID);
  }

  coinsToSpend(inputCoins, amount, maxlen = 30, tokenID) {
    try {
      new Validator("inputCoins", inputCoins).required().array();
      new Validator("amount", amount).amount();
      new Validator("maxlen", maxlen).number();
      if (amount.eqn(0)) return { resultInputCoins: [] };
      const coinCompare = (c1, c2) => {
        try {
          const a = new bn(c1.Value);
          const b = new bn(c2.Value);
          return a.cmp(b);
        } catch (e) {
          console.error(
            `Unstable comparison: ${JSON.stringify(c1)} vs ${JSON.stringify(
              c2
            )}`
          );
          throw e;
        }
      };
      const needReduce = inputCoins.length > this.idealUtxoSize;
      let total = new bn(0);
      let sortedCoins = new BinarySortedArray(inputCoins, coinCompare);
      let itemForFinding = { Value: amount };
      let bigCoinIndex = sortedCoins.indexOf(itemForFinding, true);
      sortedCoins = sortedCoins.getArray();
      let chosenCoins;
      if (bigCoinIndex >= sortedCoins.length) {
        // biggest coin does not reach amount
        let currentIndex = sortedCoins.length;
        while (total.lt(amount)) {
          currentIndex--;
          if (currentIndex < 0) {
            if (tokenID === PRVIDSTR) {
              throw ErrorMessage.NOT_ENOUGH_COIN;
            } else {
              throw `Not enough coin to spend ${amount.toString()}`
            }
          }
          total = total.add(new bn(sortedCoins[currentIndex].Value));
        }
        chosenCoins = sortedCoins.splice(currentIndex, sortedCoins.length);
      } else {
        chosenCoins = sortedCoins.splice(bigCoinIndex, 1);
      }
      if (chosenCoins.length > maxlen)
        throw "Error: maximum UTXO inclusion exceeded";
      if (needReduce) {
        console.log("adding dust to keep UTXO size down");
        // we assume output-coin length is 2 and make sure input count is larger by adding `dust` UTXOs
        // spending & dust coins must not exceed maxlen
        let dustCount = maxlen - chosenCoins.length;
        if (dustCount > this.maxDustCoins) dustCount = this.maxDustCoins;
        let dustArr = sortedCoins.splice(0, dustCount);
        chosenCoins = chosenCoins.concat(dustArr);
      }
      return {
        resultInputCoins: chosenCoins,
      };
    } catch (error) {
      throw error;
    }
  }
}
let defaultCoinChooser = new DefaultCoinChooser();

class CoinConsolidator {
  constructor() {
    Interface.ensureImplements(this, CoinChooser);
  }

  coinsForRing(rpcClient, shardID, numOfOtherPks = NUMB_OF_OTHER_PKS, tokenID) {
    return rpcClient.getOtherCoinsForRing(shardID, numOfOtherPks, tokenID);
  }

  coinsToSpend(inputCoins, fee, maxlen) {
    try {
      new Validator("inputCoins", inputCoins).required().array();
      new Validator("fee", fee).number();
      new Validator("maxlen", maxlen).number();
      const coinCompare = (c1, c2) => {
        try {
          const a = new bn(c1.Value);
          const b = new bn(c2.Value);
          return a.cmp(b);
        } catch (e) {
          console.error(
            `Unstable comparison: ${JSON.stringify(c1)} vs ${JSON.stringify(
              c2
            )}`
          );
          throw e;
        }
      };
      let sortedCoins = new BinarySortedArray(inputCoins, coinCompare);
      sortedCoins = sortedCoins.getArray();
      let results = [];
      for (
        let batch = sortedCoins.splice(0, maxlen);
        batch.length > 0;
        batch = sortedCoins.splice(0, maxlen)
      ) {
        let total = batch.reduce(
          (total, v) => total.add(new bn(v.Value)),
          new bn(0)
        );
        if (total.ltn(fee)) {
          console.log(
            "WARNING: Consolidate ending early - UTXOs too small to pay fee"
          );
          break;
        }
        results.push(batch);
      }
      return results;
    } catch (error) {
      throw error;
    }
  }
}
let coinConsolidator = new CoinConsolidator();

class AccessTicketChooser {
  constructor(tic, enc = false) {
    Interface.ensureImplements(this, CoinChooser);
    this.accessTicket = tic;
    this.useBase58Encoding = enc;
  }

  coinsForRing() {
    return {
      Indexes: [],
      Commitments: [],
      PublicKeys: [],
      AssetTags: [],
    };
  }

  coinsToSpend(inputCoins, minAmount) {
    try {
      new Validator("inputCoins", inputCoins).required().array();
      new Validator("minAmount", minAmount).required().amount();
      let rawTic = base64Decode(this.accessTicket);
      const encode = this.useBase58Encoding ? (m => base58CheckEncode(m, 0, true)) : base64Encode;
      const pubkey = encode(rawTic);
      let chosenCoins = inputCoins.filter(c => c.PublicKey == pubkey);
      if (chosenCoins.length == 0) throw `cannot find coin for pdex-v3 access ${this.accessTicket}`;
      chosenCoins = chosenCoins.filter(c => new bn(c.Value).gte(minAmount));
      if (chosenCoins.length == 0) throw `pdex-v3 access ${this.accessTicket} coin value insufficient`;
      return { resultInputCoins : chosenCoins };
    } catch (error) {
      throw error;
    }
  }

  getAccessTicket(coin) {
    const decode = this.useBase58Encoding ? (m => base58CheckDecode(m).bytesDecoded) : base64Decode;
    let rawTic = decode(coin.PublicKey);
    return base64Encode(rawTic);
  }
}

export { CoinChooser, defaultCoinChooser, coinConsolidator, AccessTicketChooser };
