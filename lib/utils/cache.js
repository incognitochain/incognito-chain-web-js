export const caches = {};

const CACHE_KEYS = {
  P_TOKEN: "P_TOKEN",
  CUSTOM_TOKEN: "CUSTOM_TOKEN",
  PDE_STATE: "PDE_STATE",
  COIN_MEMPOOL_CACHE: "COIN_MEMPOOL_CACHE",
  REQUEST_AIRDROP: "REQUEST_AIRDROP",
  REQUEST_AIRDROP_NFT: "REQUEST_AIRDROP_NFT",
};

/**
 * Cache data
 * @param key
 * @param data
 * @param expiredTime
 */
const cache = (key, data, expiredTime) => {
  if (!!data) {
    caches[key] = {
      data: data,
      expiredTime: new Date().getTime() + expiredTime,
    };
  }
};

/**
 *
 * @param {string} key should be a key of KEYS dictionary above
 * @param {function} promiseFunc
 * @param {number} expiredTime in ms
 * @returns {Promise<*>}
 */
const cachePromise = async (key, promiseFunc, expiredTime = 40000) => {
  const cachedData = getCache(key);
  if (cachedData !== null) {
    return cachedData;
  }
  const data = await promiseFunc();
  cache(key, data, expiredTime);
  return data;
};

/**
 * Get cache data
 * @param key
 * @returns {null|*}
 */
const getCache = (key) => {
  const cacheData = caches[key];

  if (cacheData && cacheData.expiredTime > new Date().getTime()) {
    return cacheData.data;
  }

  return null;
};

/**
 * @param key
 */
const clearCache = async (key) => {
  if (!caches[key]) {
    return;
  }
  return delete caches[key];
};

const clearAllCaches = () => {
  Object.keys(caches).forEach((key) => delete caches[key]);
};

export { CACHE_KEYS, cachePromise, clearCache, clearAllCaches, getCache };
