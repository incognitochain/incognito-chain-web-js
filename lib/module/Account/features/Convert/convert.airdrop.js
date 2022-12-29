import { AIRDROP_STATUS } from '@lib/module/Account/account.constants';
import { CustomError, ErrorObject } from '@lib/common/errorhandler';
import { CACHE_KEYS, cachePromise } from '@lib/utils/cache';

function getKeyFlagRequestAirdrop() {
  return this.getOTAKey() + "_REQUEST_AIRDROP_VER2";
}

async function getFlagRequestAirdrop() {
  let requested = false;
  try {
    const key = this.getKeyFlagRequestAirdrop();
    requested = await this.getAccountStorage(key);
  } catch (error) {
    console.log("error", error);
  }
  return !!requested;
}

async function setFlagRequestAirdrop() {
  let requested = false;
  try {
    const key = this.getKeyFlagRequestAirdrop();
    requested = await this.setAccountStorage(key, true);
  } catch (error) {
    console.log("error", error);
  }
  return !!requested;
}

async function requestAirdropNoCached() {
  // const paymentAddress = this.getPaymentAddress();
  // return this.rpcRequestService.apiRequestAirdrop({ paymentAddress });
  return AIRDROP_STATUS.SUCCESS;
}

async function requestAirdrop() {
  let submited = false;
  let status = undefined;
  try {
    submited = await this.getFlagRequestAirdrop();
  } catch (e) {
    console.log('getFlagRequestAirdrop error: ', e)
  }
  try {
    if (!submited) {
      const OTAKEY = this.getOTAKey();
      const key = CACHE_KEYS.REQUEST_AIRDROP + OTAKEY;
      // status = await cachePromise(key, this.requestAirdropNoCached.bind(this), 10000);
      status = AIRDROP_STATUS.SUCCESS
    }
  } catch (e) {
    throw new CustomError(
      ErrorObject.RequestAirdropErr,
      e.message || ErrorObject.RequestAirdropErr.description,
      e);
  }
  try {
    if (status !== undefined && (AIRDROP_STATUS.SUCCESS === status)) {
      await this.setFlagRequestAirdrop();
    }
  } catch (e) {
    console.log('setFlagRequestAirdrop error: ', e)
  }
}

export default {
  getKeyFlagRequestAirdrop,
  getFlagRequestAirdrop,
  setFlagRequestAirdrop,
  requestAirdropNoCached,
  requestAirdrop,
};
