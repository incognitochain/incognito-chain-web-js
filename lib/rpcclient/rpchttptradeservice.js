import Validator from "@lib/utils/validator";
import createAxiosInstance from "@lib/http/axios";
import { camelCaseKeys } from "@lib/utils/camelCaseKeys";
import { PRVIDSTR } from "@lib/core";

class RpcHTTPTradeServiceClient {
  constructor(url) {
    this.http = createAxiosInstance({ baseURL: url });
  }

  apiGetTradingVolume24h(poolId) {
    new Validator("apiGetTradingVolume24h-poolId", poolId).required().string();
    return this.http.get(`pdex/v3/tradevolume?poolid=${poolId}`);
  }

  apiGetListPools(pairId) {
    new Validator("apiGetListPools-pairId", pairId).required().string();
    return this.http.get(`pdex/v3/listpools?pair=${pairId}`);
  }

  apiGetListPoolsDetail(poolIDs) {
    new Validator("apiGetListPoolsDetail-poolIDs", poolIDs).required().array();
    return this.http.post(`pdex/v3/poolsdetail`, { PoolIDs: poolIDs });
  }

  apiGetListShare({ nftId }) {
    new Validator("apiGetListShare-nftId", nftId).required().string();
    return this.http.get(`pdex/v3/poolshare?nftid=${nftId}`);
  }

  apiGetListPair() {
    return this.http.get(`pdex/v3/listpairs`);
  }

  apiEstimateTrade(params) {
    const { selltoken, buytoken, buyamount, sellamount, ismax } = params;
    new Validator("apiEstimateTrade-selltoken", selltoken).required().string();
    new Validator("apiEstimateTrade-buytoken", buytoken).required().string();
    new Validator("getEstimateTrade-buyamount", buyamount).amount();
    new Validator("getEstimateTrade-sellamount", sellamount).amount();
    new Validator("getEstimateTrade-ismax", ismax).boolean();
    let url = `/pdex/v3/estimatetrade?selltoken=${selltoken}&buytoken=${buytoken}&ismax=${ismax}`;
    if (sellamount) {
      url = `${url}&sellamount=${sellamount}`;
    } else if (buyamount) {
      url = `${url}&buyamount=${buyamount}`;
    }
    return this.http.get(url);
  }

  apiGetPendingOrder(params) {
    const { poolid } = params;
    new Validator("apiGetPendingOrder-poolid", poolid).string();
    return this.http.get(`pdex/v3/pendingorder?poolid=${poolid}`);
  }

  apiGetHistory(params) {
    const { queryStr, limit = 20, offset = 0 } = params;
    new Validator("apiGetHistory-queryStr", queryStr).required().string();
    return this.http.get(
      `pdex/v3/tradehistory?${queryStr}&limit=${limit}&offset=${offset}`
    );
  }

  apiGetOrderBook(params) {
    const { poolid, decimal } = params;
    new Validator("poolid-poolid", poolid).required().string();
    new Validator("poolid-decimal", decimal).required().amount();
    return this.http.get(
      `pdex/v3/orderbook?poolid=${poolid}&decimal=${decimal}`
    );
  }

  apiGetPriceHistory(params) {
    const { poolid, period, intervals } = params;
    new Validator("apiGetPriceHistory-poolid", poolid).required().string();
    new Validator("apiGetPriceHistory-period", period).required().string();
    new Validator("apiGetPriceHistory-intervals", intervals)
      .required()
      .string();
    return this.http.get(
      `pdex/v3/pricehistory?poolid=${poolid}&period=${period}&intervals=${intervals}`
    );
  }

  apiGetStakingInfo(params) {
    const { nftID } = params;
    new Validator("apiGetStakingInfo-nftID", nftID).required().string();
    return this.http.get(`pdex/v3/stakeinfo?nftid=${nftID}`);
  }

  apiGetStakingHistories(params) {
    const { tokenID, nftID, limit = 1e3, offset = 0 } = params;
    new Validator("apiGetStakingInfo-tokenID", tokenID).required().string();
    new Validator("apiGetStakingInfo-nftID", nftID).required().string();
    return this.http.get(
      `pdex/v3/stakinghistory?tokenid=${tokenID}&nftid=${nftID}&limit=${limit}&offset=${offset}`
    );
  }

  async apiGetStakingRewardHistories(params) {
    const { tokenID, nftID, limit = 1e9, offset = 0 } = params;
    new Validator("apiGetStakingInfo-tokenID", tokenID).required().string();
    new Validator("apiGetStakingInfo-nftID", nftID).required().string();
    return this.http.get(
      `pdex/v3/stakerewardhistory?tokenid=${tokenID}&nftid=${nftID}&limit=${limit}&offset=${offset}`
    );
  }

  apiGetStakingPool() {
    return this.http.get(`pdex/v3/stakingpools`);
  }

  async apiGetTradeDetail({ txhash }) {
    new Validator("getOrderLimitDetail-txhash", txhash).required().string();
    return this.http.get(`pdex/v3/tradedetail?txhash=${txhash}`);
  }

  async apiGetContributeHistories(params) {
    const { nftId, limit = 1e9, offset = 0 } = params;
    new Validator("apiGetContributeHistories-nftID", nftId).required().string();
    return this.http.get(
      `pdex/v3/contributehistory?nftid=${nftId}&limit=${limit}&offset=${offset}`
    );
  }

  async apiGetWithdrawContributeHistories(params) {
    const { nftId, limit = 1e9, offset = 0 } = params;
    new Validator("apiGetWithdrawContributeHistories-nftID", nftId)
      .required()
      .string();
    return this.http.get(
      `pdex/v3/withdrawhistory?nftid=${nftId}&limit=${limit}&offset=${offset}`
    );
  }

  async apiGetWithdrawFeeContributeHistories(params) {
    const { nftId, limit = 1e9, offset = 0 } = params;
    new Validator("apiGetContributeHistories-nftID", nftId).required().string();
    return this.http.get(
      `pdex/v3/withdrawfeehistory?nftid=${nftId}&limit=${limit}&offset=${offset}`
    );
  }

  apiCheckRate({ token1, token2, amount1, amount2 }) {
    new Validator("apiCheckRate-token1", token1).required().string();
    new Validator("apiCheckRate-token1", token1).required().string();
    new Validator("apiCheckRate-amount1", amount1).required().number();
    new Validator("apiCheckRate-amount2", amount2).required().number();
    const url = `/pdex/v3/assistance/checkrate?token1=${token1}&token2=${token2}&amount1=${amount1}&amount2=${amount2}&amp=${1}`;
    return this.http.get(url).then((res) => camelCaseKeys(res));
  }

  async apiGetOpenOrder(params) {
    const { ID } = params;
    new Validator("apiGetOpenOrder-nftID", ID).required().array();
    return this.http.post(`pdex/v3/pendinglimit`, { ID });
  }
}

export { RpcHTTPTradeServiceClient };
