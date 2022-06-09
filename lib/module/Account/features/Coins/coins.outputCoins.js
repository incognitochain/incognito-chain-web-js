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
        return this.getListOutputCoinsV2(params);
      case PrivacyVersion.ver3:
        return this.getListOutputCoinsV3(params);
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
    console.log(params)
    new Validator("getOutputCoins-tokenID", tokenID).required().string();
    new Validator("getOutputCoins-version", version).required().number();
    if (PrivacyVersion.ver3 !== version) {
      await Promise.all([
        await this.submitOTAKey({ version }),
        await this.requestAirdropNFT(),
      ])
    }
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
      case PrivacyVersion.ver3: {
        try {
          unspentCoins = await this.getUnspentCoinsV3(params);
          // No need spent coins
          // spentCoins = await this.getListSpentCoinsStorage(params);
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