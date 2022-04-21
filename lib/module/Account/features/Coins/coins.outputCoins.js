import { PDEX_ACCESS_ID, PrivacyVersion } from "@lib/core/constants";
import Validator from "@lib/utils/validator";

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

export default {
  getListOutputCoinsStorage,
  getListOutputsCoins,
  getOutputCoins,
};