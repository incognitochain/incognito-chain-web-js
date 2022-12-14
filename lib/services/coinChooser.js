import { Interface } from "./interface";
import bn from "bn.js";
import Validator from "@lib/utils/validator";
import BinarySortedArray from "binary-sorted-array";
import { NUMB_OF_OTHER_PKS } from "@lib/module/Account/account.constants";
import { ErrorMessage, PRVIDSTR } from '@lib/core/constants';

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

  coinsToSpend(inputCoins, threshold, maxlen) {
    try {
      new Validator("inputCoins", inputCoins).required().array();
      new Validator("threshold", threshold).number();
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
        if (total.lt(new bn(threshold))) {
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

export { CoinChooser, defaultCoinChooser, coinConsolidator };
