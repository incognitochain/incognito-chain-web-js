import { PRVIDSTR } from "@lib/core";
import Validator from "@lib/utils/validator";
import { uniq } from "lodash";

function getKeyFollowTokens() {
  const otaKey = this.getOTAKey();
  return `FOLLOWING-TOKENS-${otaKey}`;
}

function getKeyFollowedDefaultTokens() {
  const otaKey = this.getOTAKey();
  return `FOLLOWED-DEFAULT-TOKENS-${otaKey}`;
}

async function getListFollowingTokens() {
  try {
    const key = this.getKeyFollowTokens();
    let list = (await this.getAccountStorage(key)) || [];
    return list;
  } catch (error) {
    throw error;
  }
}

async function isFollowedDefaultTokens() {
  try {
    const key = this.getKeyFollowedDefaultTokens();
    const isFollowed = (await this.getAccountStorage(key)) || false;
    return isFollowed;
  } catch (error) {
    console.log("isFollowedDefaultTokens error", error);
    throw error;
  }
}

async function followingDefaultTokens(params) {
  try {
    const { tokenIDs } = params;
    new Validator("followingDefaultTokens-tokenIDs", tokenIDs)
      .required()
      .array();
    const key = this.getKeyFollowedDefaultTokens();
    const isFollowed = await this.isFollowedDefaultTokens();
    if (!isFollowed) {
      await Promise.all([
        this.addListFollowingToken({ tokenIDs }),
        this.setAccountStorage(key, true),
      ]);
    }
  } catch (error) {
    console.log("followingDefaultTokens error", error);
    throw error;
  }
}

async function setListFollowingTokens({ list }) {
  try {
    new Validator("setListFollowingTokens-list", list).required().array();
    const key = this.getKeyFollowTokens();
    const value = list.filter((tokenID) => tokenID && tokenID !== PRVIDSTR);
    await this.setAccountStorage(key, value);
    return true;
  } catch (error) {
    console.log("setListFollowingTokens error", error);
    throw error;
  }
}

async function addFollowingToken(params) {
  try {
    const { tokenID } = params;
    new Validator("addFollowingToken-tokenID", tokenID).required().string();
    const oldList = await this.getListFollowingTokens();
    new Validator("addFollowingToken-oldList", oldList).required().array();
    const isExist = oldList.includes(tokenID);
    if (!isExist) {
      await this.setListFollowingTokens({ list: [tokenID, ...oldList] });
    }
  } catch (error) {
    console.log("addFollowingToken error", error);
    throw error;
  }
}

async function addListFollowingToken(params) {
  try {
    const { tokenIDs } = params;
    new Validator("addFollowingToken-tokenIDs", tokenIDs).required().array();
    const oldList = await this.getListFollowingTokens();
    new Validator("addFollowingToken-oldList", oldList).required().array();
    const list = uniq([...tokenIDs, ...oldList]);
    await this.setListFollowingTokens({ list });
  } catch (error) {
    console.log("addListFollowingToken error", error);
    throw error;
  }
}

async function removeFollowingToken(params) {
  try {
    const { tokenID } = params;
    new Validator("removeFollowingToken-tokenID", tokenID).required().string();
    const oldList = await this.getListFollowingTokens();
    new Validator("removeFollowingToken-oldList", oldList).required().array();
    const isExist = oldList.includes(tokenID);
    if (isExist) {
      await this.setListFollowingTokens({
        list: oldList.filter((_tokenID) => _tokenID !== tokenID),
      });
    }
  } catch (error) {
    console.log("removeFollowingToken error", error);
    throw error;
  }
}

export default {
  addFollowingToken,
  removeFollowingToken,
  setListFollowingTokens,
  getListFollowingTokens,
  getKeyFollowTokens,
  addListFollowingToken,
  followingDefaultTokens,
  getKeyFollowedDefaultTokens,
  isFollowedDefaultTokens,
};
