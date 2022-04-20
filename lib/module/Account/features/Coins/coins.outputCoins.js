import { PDEX_ACCESS_ID, PrivacyVersion } from "@lib/core/constants";
import Validator from "@lib/utils/validator";
import { getShardIDFromLastByte } from '@lib/common/common';
import { PriKeyType } from "@lib/core";
import { checkEncode } from "@lib/common/base58";
import { base64Decode } from "@lib/privacy/utils";
import { wasm } from "@lib/wasm";
import { sleep } from "@lib/module/Account/account.utils";

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

const WASM_DECRYPT_COIN_CHUNK_LENGTH = 1000

// use fullnode RPC
async function activeScanCoins(cfg = {}, batchSize = 5000, limit = 10000, poolSize = 2) {
  const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
  const lengths = await this.rpc.getCoinCount();
  const privkey = this.key.base58CheckSerialize(PriKeyType);

  // tokenIDs: token list specified in cfg, or default to fullnode's token grouping
  let tokenIDs = Object.keys(cfg);
  if (tokenIDs.length < 2) tokenIDs = Object.keys(lengths);
  let result = { progress: 100 };
  for (const tokenID of tokenIDs) {
    let resultForToken = [];
    const start = cfg[tokenID]?.latest || 0;
    let coinlen = lengths[tokenID][shardID];
    
    console.log('all chain coin count:', coinlen)
    if (coinlen > start + limit) {
      result.progress = Math.min(result.progress, Math.floor(limit * 100 / (coinlen - start)));
      coinlen = start + limit;
      console.log(`limit scanning range to ${start} - ${start + limit}`)
    }

    for (let i = start; i < coinlen; i += batchSize * poolSize) {
      let tasks = [];
      for (let batchStart = i; batchStart < coinlen; batchStart += batchSize) {
        let batchEnd = batchStart + batchSize - 1;
        if (batchEnd > coinlen - 1) batchEnd = coinlen - 1;
        tasks.push(this.rpc.getOutputCoinByIndex(batchStart, batchEnd, shardID, tokenID).then(async coinMap => {
          try {
            let coinList = Object.values(coinMap);
            while (coinList.length > 0){
              // DEBUG
              const startTime = performance.now();
              // decrypt coins, pass on the indexes
              const decryptedCoinList = JSON.parse(await wasm.decryptCoinList(JSON.stringify({
                CoinList: coinList.splice(0, WASM_DECRYPT_COIN_CHUNK_LENGTH),
                KeySet: privkey
              })));
              const elapsed = performance.now() - startTime;
              console.log(`decrypted ${WASM_DECRYPT_COIN_CHUNK_LENGTH} coins in ${elapsed} ms from ${startTime}`);
              await sleep(50); // yield to other tasks in JS env
              if (Boolean(decryptedCoinList?.length)) resultForToken = resultForToken.concat(decryptedCoinList);
            }
          } catch (e) {
            throw e;
          }
        }));
      }
      console.log(`scan coins from index #${i} - shard ${shardID} - token ${tokenID.slice(58)}`);
      await Promise.all(tasks);
    }
    result[tokenID] = Object.assign(await this.groupSpentCoins(resultForToken, tokenID), { latest: coinlen });
  }
  return result;
}

async function groupSpentCoins(coins, tokenID){
  const shardID = getShardIDFromLastByte(this.key.KeySet.PaymentAddress.Pk[(this.key.KeySet.PaymentAddress.Pk.length - 1)]);
  let unspentCoins = [], spentCoins = [];
  let keyImages = coins.map(c => c.KeyImage);

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