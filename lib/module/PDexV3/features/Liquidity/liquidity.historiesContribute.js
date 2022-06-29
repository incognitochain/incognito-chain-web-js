import Validator from '@lib/utils/validator';
import { LIMIT_DEFAULT } from '@lib/module/PDexV3/features/Liquidity/liquidity.constant';
import flatten from 'lodash/flatten';
import uniq from 'lodash/uniq';
import difference from 'lodash/difference';
import { PrivacyVersion, TX_STATUS } from '@lib/wallet';
import {
  CONTRIBUTE_HISTORIES_TX_STR,
  CONTRIBUTE_STATUS_TYPE,
  PDEX_TRANSACTION_TYPE,
  TX_TYPE
} from '@lib/module/Account';
import maxBy from 'lodash/maxBy';
import orderBy from 'lodash/orderBy'

async function getPairHashContribute() {
  const storageHashs = (await this.getStoragePairHash()) || [];
  return storageHashs.reduce((prev, curr) => {
    const { pairHashs: hashs, tokenIds: prevTokensIds } = prev;
    const { pairHash, tokenIds: currTokenIds } = curr;
    hashs.push(pairHash)
    const diff = difference(currTokenIds, prevTokensIds);
    return {
      pairHashs: uniq(hashs),
      tokenIds: prevTokensIds.concat(diff)
    }
  }, { pairHashs: [], tokenIds: [] });
}
async function getTxsContributeStorage({ csvTxIds, tokenIds }) {
  new Validator("getTxsContributeStorage-csvTxIds", csvTxIds).required().array();
  new Validator("getTxsContributeStorage-tokenIds", tokenIds).required().array();
  const txsHistories = flatten(await Promise.all(tokenIds.map(async (tokenID) => {
    let histories = (await this.account.getTransactorHistoriesByTokenID({ version: PrivacyVersion.ver2, tokenID })) || [];
    histories = histories.filter(history => (
      history.txType === TX_TYPE.CONTRIBUTE && !csvTxIds.includes(history.txId)
    ));
    return await Promise.all(
      histories.map(async (history) => {
        const metaData = history?.metadata || {};
        const { createdAt, txId, lockTime } = history;
        let status;
        if (history.createdAt && (Date.now() - createdAt) < (2 * 60 * 1000)) {
          status = TX_STATUS.TXSTATUS_PENDING;
        } else {
          status = await this.account?.rpcTxService.apiGetTxStatus({ txId });
        }

        let versionTx = PDEX_TRANSACTION_TYPE.ACCESS_ID;
        if (metaData?.NftID) {
          versionTx = PDEX_TRANSACTION_TYPE.ACCESS_ID;
        }
        return {
          requestTx: txId,
          requestTime: lockTime,
          tokenId: tokenID,
          poolId: metaData?.PoolPairID,
          pairHash: metaData?.PairHash,
          nftId: metaData?.AccessID || metaData?.NftID,
          amp: metaData?.Amplifier,
          contributeAmount: metaData.TokenAmount,
          status,
          versionTx
        }
      })
    );
  })));
  return txsHistories;
}
async function getCSVHistories() {
  const csvHistories = flatten((await this.getContributeHistoriesApi()) || []).filter(item => !!item);
  const csvTxIds = uniq(flatten(csvHistories.map(history => history.requestTxs)))
  const csvPairHashs = uniq(flatten(csvHistories.map(history => history.pairHash)))
  return {
    csvTxIds,
    csvPairHashs,
    csvHistories,
  }
}

function filterStorageHistories({ pairHashs, csvPairHashs, storageHistories }) {
  const diffPairHashs = difference(pairHashs, csvPairHashs) || [];
  const histories = diffPairHashs.map(pairHash => {
    const histories = storageHistories.filter(({ pairHash: _pairHash }) => pairHash === _pairHash);
    if (histories.length === 0) return null;
    const contributeAmount = histories.map(history => history.contributeAmount);
    const contributeTokens = histories.map(history => history.tokenId);
    const requestTxs = histories.map(history => history.requestTx);
    const allStatus = histories.map(history => history.status);
    let status;
    if (allStatus.includes(TX_STATUS.TXSTATUS_PENDING) || allStatus.includes(TX_STATUS.PROCESSING)) {
      status = CONTRIBUTE_STATUS_TYPE.WAITING;
    } else if (allStatus.includes(TX_STATUS.TXSTATUS_SUCCESS)) {
      status = CONTRIBUTE_STATUS_TYPE.COMPLETED;
    } else {
      status = CONTRIBUTE_STATUS_TYPE.FAIL;
    }
    return {
      contributeAmount,
      contributeTokens,
      pairId: '',
      nftId: histories[0].nftId,
      poolId: histories[0].poolId,
      pairHash,
      requestTime: maxBy(histories, 'requestTime').requestTime,
      status,
      statusStr: CONTRIBUTE_HISTORIES_TX_STR[status],
      requestTxs,
      isStorage: true
    }
  });
  return histories.filter(item => !!item);
}

function mapHistories(histories) {
  return histories.map(history => {
    let { isStorage, storageContribute, requestTxs } = history;
    storageContribute = storageContribute || []
    const allStatus = storageContribute.map(history => history.status);
    const isWaiting =
      allStatus.includes(TX_STATUS.TXSTATUS_PENDING) ||
      allStatus.includes(TX_STATUS.PROCESSING) ||
      allStatus.includes(TX_STATUS.TXSTATUS_SUCCESS);
    if (isStorage || requestTxs.length === 2 || isWaiting) return history;
    let retry = {};
    let refund = {};
    refund = {
      tokenId: history.contributeTokens[0],
      amount: history.contributeAmount[0],
    }
    if (storageContribute && storageContribute.length > 0) {
      const retryData = storageContribute.find(item => item.tokenId !== refund.tokenId)
      if (retryData) {
        refund = {
          ...refund,
          amp: retryData.amp
        }
        retry = {
          tokenId: retryData.tokenId,
          amount: retryData.contributeAmount,
          amp: retryData.amp
        }
      }
    }
    return {
      ...history,
      retry,
      refund,
    }
  })
}

async function getContributeHistories({ offset = 0, limit = LIMIT_DEFAULT } = {}) {
  new Validator("getContributeHistories-offset", offset).required().number();
  new Validator("getContributeHistories-limit", limit).required().number();
  const { pairHashs, tokenIds } = await this.getPairHashContribute();
  let {
    csvTxIds,
    csvPairHashs,
    csvHistories,
  } = await this.getCSVHistories()
  const storageHistories = (await this.getTxsContributeStorage({ tokenIds, csvTxIds })) || [];
  csvHistories = csvHistories.map(history => {
    const { pairHash, requestTxs, status } = history;
    const storageContribute = storageHistories.filter(({pairHash: _pairHash, requestTx: _requestTx}) => {
      return (pairHash === _pairHash && !requestTxs.includes(_requestTx))
    })
    return {
      ...history,
      storageContribute,
      statusStr: CONTRIBUTE_HISTORIES_TX_STR[status],
    }
  });
  const diffHistories = this.filterStorageHistories({
    pairHashs,
    csvPairHashs,
    storageHistories,
  })
  console.log('getContributeHistories: ', {
    csvHistories,
    diffHistories,
    storageHistories
  });
  const histories = orderBy(csvHistories.concat(diffHistories), 'requestTime', ['desc']);
  return this.mapHistories(histories);
}

export default ({
  getPairHashContribute,
  getTxsContributeStorage,
  getCSVHistories,
  filterStorageHistories,
  mapHistories,
  getContributeHistories,
})
