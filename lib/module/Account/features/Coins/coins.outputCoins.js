import { PDEX_ACCESS_ID, PrivacyVersion } from "@lib/core/constants";
import Validator from "@lib/utils/validator";
import { getShardIDFromLastByte } from '@lib/common/common';
import { PriKeyType } from "@lib/core";
import { checkEncode } from "@lib/common/base58";
import { base64Decode } from "@lib/privacy/utils";

async function getListOutputsCoins(params) {
  //
  try {
    const { tokenID, total, version } = params;
    new Validator(`getListOutputsCoins-total`, total).required().number();
    new Validator(`getListOutputsCoins-tokenID`, tokenID).required().string();
    new Validator(`getListOutputsCoins-version`, version).required().number();
    switch (version) {
      case PrivacyVersion.ver1:
        return this.getListOutputCoinsV1(params);
      case PrivacyVersion.ver2:
        return this.getListOutputCoinsV2(params); //
      default:
        break;
    }
  } catch (error) {
    throw error;
  }
}

async function getListOutputCoinsStorage(params) {
  try {
    const { tokenID, version } = params;
    new Validator("getListOutputCoinsStorage-tokenID", tokenID)
      .required()
      .string();
    new Validator("getListOutputCoinsStorage-version", version)
      .required()
      .number();
    let task = [
      this.getListSpentCoinsStorage(params),
      this.getListUnspentCoinsStorage(params),
    ];
    const [spentCoins, unspentCoins] = await Promise.all(task);
    return [...spentCoins, ...unspentCoins];
  } catch (error) {
    throw error;
  }
}

async function getOutputCoins(params) {
  let spentCoins = [];
  let unspentCoins = [];
  try {
    const { tokenID, version } = params;
    // Fix can't load COINS ACCESS OTA
    // if (tokenID === PDEX_ACCESS_ID) {
    //   params = {
    //     ...params,
    //     isNFT: true,
    //   }
    // }
    console.log(params)
    new Validator("getOutputCoins-tokenID", tokenID).required().string();
    new Validator("getOutputCoins-version", version).required().number();
    await Promise.all([
      await this.submitOTAKey(),
      await this.requestAirdropNFT(),
    ])
    switch (version) {
      case PrivacyVersion.ver1: {
        unspentCoins = (await this.getUnspentCoinsByTokenIdV1({ ...params })?.unspentCoins) || [];
        spentCoins = await this.getListSpentCoinsStorage(params);
        break;
      }
      case PrivacyVersion.ver2: {
        try {
          unspentCoins = await this.getUnspentCoinsV2(params);
          spentCoins = await this.getListSpentCoinsStorage(params);
        } catch (error) {
          await this.clearCacheStorage(params);
          throw error;
        }
        break;
      }
      default:
        break;
    }
    const result = {
      spentCoins,
      unspentCoins,
      outputCoins: [...unspentCoins, ...spentCoins],
    };
    return result;
  } catch (error) {
    throw error;
  }
}

// use fullnode RPC
async function activeScanCoins(start = 0, batchSize = 5000, poolSize = 20) {
  const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
  const lengths = await this.rpc.getCoinCount();
  const privkey = this.key.base58CheckSerialize(PriKeyType);
  const tokenIDs = Object.keys(lengths);
  let result = {};
  for (const tokenID of tokenIDs) {
    let resultForToken = [];
    const coinlen = lengths[tokenID][shardID];
    for (let i = start; i < coinlen; i += batchSize * poolSize) {
      let tasks = [];
      for (let taskInd = 0; taskInd < poolSize; taskInd++) {
        let indexes = [];
        let currentCoinIndex = i + batchSize * taskInd;
        for (let j = 0; j < batchSize; j++) {
          if (currentCoinIndex >= coinlen) break;
          indexes.push(currentCoinIndex);
          currentCoinIndex++;
        }
        if (indexes.length > 0) {
          tasks.push(this.rpc.getOutputCoinByIndex(indexes, shardID, tokenID).then(async coinMap => {
            try {
              const indexes = Object.keys(coinMap);
              // decrypt coins, pass on the indexes
              const coinList = JSON.parse(await wasm.decryptCoinList(JSON.stringify({
                CoinList: Object.values(coinMap),
                KeySet: privkey
              })));
              if (Boolean(coinList?.length)) resultForToken = resultForToken.concat(coinList);
            } catch (e) {
              console.error(e)
              // not this account's coin -> do nothing
            }
          }));
        }
      }
      console.log(`scan coins - index #${i} - shard ${shardID} - token ${tokenID.slice(58)}`);
      await Promise.all(tasks);
    }
    result[tokenID] = await this.groupSpentCoins(resultForToken, tokenID);
  }
  return result;
}

async function groupSpentCoins(coins, tokenID){
  const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
  let unspentCoins = [], spentCoins = [];
  let keyImages = coins.map(c => checkEncode(base64Decode(c.KeyImage)));

  let response;
  try {
    response = await this.rpc.hasSerialNumber(shardID, keyImages, tokenID);
  } catch (e) {
    throw e;
  }
  const spent = response.existed;
  if (spent.length != coins.length) {
    throw new Error("Wrong response when check has serial number");
  }

  for (let i = 0; i < spent.length; i++) {
    if (!spent[i]) {
      unspentCoins.push(coins[i]);
    } else {
      spentCoins.push(coins[i])
    }
  }
  return {unspentCoins, spentCoins};
}

export default {
  getListOutputCoinsStorage,
  getListOutputsCoins,
  getOutputCoins,
  activeScanCoins,
  groupSpentCoins,
};