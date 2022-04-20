import { PrivacyVersion, Validator } from '@lib/wallet';
import { getBurningAddress, PRVIDSTR, PDEX_ACCESS_ID } from '@lib/core';
import bn from 'bn.js';
import { pdexv3 } from '@lib/core/constants';
import { TX_TYPE } from '@lib/module/Account';
import { createPairHash } from '@lib/module/Account/features/Liquidity/liquidity.utils';
import { AccessTicketChooser } from "@lib/services/coinChooser";

async function createAndSendContributeRequestTx(params) {
  try {
    const {
      transfer: { fee, info = "", tokenID },
      extra: {
        poolPairID = "",
        pairHash,
        contributedAmount,
        nftID = "",
        amplifier,
        version = PrivacyVersion.ver2,
        txHandler
      },
    } = params;
    new Validator("createAndSendContributeRequestTx-tokenID", tokenID).required().string();
    new Validator("createAndSendContributeRequestTx-fee", fee).required().amount();
    new Validator("createAndSendContributeRequestTx-info", info).string();
    new Validator("createAndSendContributeRequestTx-poolPairID", poolPairID).string();
    new Validator("createAndSendContributeRequestTx-pairHash", pairHash).required().string();
    new Validator("createAndSendContributeRequestTx-contributedAmount", contributedAmount).required().amount();
    new Validator("createAndSendContributeRequestTx-nftID", nftID).required().string();
    new Validator("createAndSendContributeRequestTx-amplifier", amplifier).required().number();
    new Validator("createAndSendContributeRequestTx-version", version).required().number();
    await this.account?.updateProgressTx(10, "Generating Metadata");
    let burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(contributedAmount).toString(),
      Message: info
    }];
    let isToken = tokenID !== PRVIDSTR;
    const otaReceiver = await this.getOTAReceive();
    let metadata = {
      PoolPairID: poolPairID,
      PairHash: pairHash,
      TokenAmount: contributedAmount,
      TokenID: tokenID,
      NftID: nftID,
      Amplifier: amplifier,
      OtaReceiver: otaReceiver,
      Type: pdexv3.AddLiquidityRequestMeta,
    };
    let result;
    if (isToken) {
      result = await this.account?.transact({
        transfer: {
          fee,
          info,
          tokenID,
          prvPayments: [],
          tokenPayments:
          burningPayments
        }, extra: { metadata, version, txType: TX_TYPE.CONTRIBUTE, txHandler }
      });
    } else {
      result = await this.account?.transact({
        transfer: {
          fee,
          info,
          tokenID,
          prvPayments: burningPayments
        }, extra: { metadata, version, txType: TX_TYPE.CONTRIBUTE, txHandler }
      });
    }
    await this.account?.updateProgressTx(100, "Completed");
    return result;
  } catch (e) {
    throw e;
  }
}
async function createAndSendWithdrawContributeRequestTx(params) {
  try {
    const {
      fee,
      info = "",
      poolTokenIDs,
      poolPairID,
      shareAmount,
      version = PrivacyVersion.ver2,
      nftID,
      amount1,
      amount2,
    } = params;
    new Validator("createAndSendWithdrawContributeRequestTx-info", info).required().string();
    new Validator("createAndSendWithdrawContributeRequestTx-fee", fee).required().amount();
    new Validator("createAndSendWithdrawContributeRequestTx-poolTokenIDs", poolTokenIDs).required().array();
    new Validator("createAndSendWithdrawContributeRequestTx-poolPairID", poolPairID).required().string();
    new Validator("createAndSendWithdrawContributeRequestTx-shareAmount", shareAmount).required().amount();
    new Validator("createAndSendWithdrawContributeRequestTx-nftID", nftID).required().string();
    new Validator("createAndSendWithdrawContributeRequestTx-version", version).required().number();
    new Validator("createAndSendWithdrawContributeRequestTx-amount1", amount1).required().amount();
    new Validator("createAndSendWithdrawContributeRequestTx-amount2", amount2).required().amount();

    await this.account?.updateProgressTx(10, "Generating Metadata");
    let burningAddress = await getBurningAddress(this.rpc);
    const burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(1).toString(), // burn 1 of NFTID
      Message: info
    }];
    let receivingTokens = [nftID].concat(poolTokenIDs);
    let receiver = {};
    // create new OTAs
    for (const t of receivingTokens) {
      receiver[t] = await this.getOTAReceive();
    }
    // prepare meta data for tx
    let metadata = {
      PoolPairID: poolPairID,
      ShareAmount: shareAmount,
      NftID: nftID,
      OtaReceivers: receiver,
      Type: pdexv3.WithdrawLiquidityRequestMeta,
    };
    let result = await this.account?.transact({
      transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: nftID },
      extra: { metadata, version, txType: TX_TYPE.WITHDRAW_CONTRIBUTE }
    });
    if (result && poolTokenIDs.length === 2) {
      const { status, txId, tx } = result;
      const params = {
        amount1,
        amount2,
        requestTx: txId,
        status,
        tokenId1: poolTokenIDs[0],
        tokenId2: poolTokenIDs[1],
        lockTime: tx?.Tx?.LockTime,
        type: TX_TYPE.WITHDRAW_CONTRIBUTE,
        poolId: poolPairID,
        nftId: nftID,
      }
      console.log('setStorageWithdrawLP: params', params)
      await this.setStorageWithdrawLP(params)
    }
    await this.account?.updateProgressTx(100, "Completed");
    return result;
  } catch (e) {
    throw e;
  }
}
async function createAndSendWithdrawLPFeeRequestTx(params) {
  try {
    const {
      fee,
      withdrawTokenIDs,
      poolPairID,
      version = PrivacyVersion.ver2,
      info = '',
      nftID,
      amount1,
      amount2,
    } = params;
    new Validator("createAndSendWithdrawLPFeeRequestTx-fee", fee).required().amount();
    new Validator("createAndSendWithdrawLPFeeRequestTx-info", info).required().string();
    new Validator("createAndSendWithdrawLPFeeRequestTx-withdrawTokenIDs", withdrawTokenIDs).required().array();
    new Validator("createAndSendWithdrawLPFeeRequestTx-poolPairID", poolPairID).required().string();
    new Validator("createAndSendWithdrawLPFeeRequestTx-nftID", nftID).required().string();
    new Validator("createAndSendWithdrawLPFeeRequestTx-version", version).required().number();
    new Validator("createAndSendWithdrawLPFeeRequestTx-amount1", amount1).required().amount();
    new Validator("createAndSendWithdrawLPFeeRequestTx-amount2", amount2).required().amount();
    await this.account?.updateProgressTx(10, "Generating Metadata");
    const burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(1).toString(), // burn 1 of NFTID
      Message: info
    }];
    let receivingTokens = [nftID].concat(withdrawTokenIDs);
    let receiver = {};
    // create new OTAs
    for (const t of receivingTokens) {
      receiver[t] = await this.getOTAReceive();
    }
    // prepare meta data for tx
    let metadata = {
      PoolPairID: poolPairID,
      NftID: nftID,
      Receivers: receiver,
      Type: pdexv3.WithdrawLPFeeRequestMeta,
    };
    let result = await this.account?.transact({
      transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: nftID },
      extra: { metadata, version, txType: TX_TYPE.WITHDRAW_CONTRIBUTE_REWARD }
    });

    if (result) {
      const { status, txId, tx } = result;
      const params = {
        amount1,
        amount2,
        requestTx: txId,
        status,
        tokenId1: withdrawTokenIDs[0],
        tokenId2: withdrawTokenIDs[1],
        lockTime: tx?.Tx?.LockTime,
        type: TX_TYPE.WITHDRAW_CONTRIBUTE_REWARD,
        poolId: poolPairID,
        nftId: nftID,
      }
      console.log('setStorageWithdrawLP: params', params)
      await Promise.all([
        await this.setStorageWithdrawLP(params),
      ])
    }
    await this.account?.updateProgressTx(100, "Completed");
    return result;
  } catch (e) {
    throw e;
  }
}

async function createAndSendContributeRequestTxWithAccessToken(params) {
  try {
    const {
      transfer: { fee, info = "", tokenID },
      extra: {
        poolPairID = "",
        accessID,
        pairHash,
        contributedAmount,
        sharedAccessReceiver,
        isFirstContribution = true,
        amplifier,
        version = PrivacyVersion.ver2,
        txHandler
      },
    } = params;
    new Validator("createAndSendContributeRequestTx-tokenID", tokenID).required().string();
    new Validator("createAndSendContributeRequestTx-fee", fee).required().amount();
    new Validator("createAndSendContributeRequestTx-info", info).string();
    new Validator("createAndSendContributeRequestTx-poolPairID", poolPairID).string();
    new Validator("createAndSendContributeRequestTx-pairHash", pairHash).required().string();
    new Validator("createAndSendContributeRequestTx-sharedAccessReceiver", sharedAccessReceiver).string();
    new Validator("createAndSendContributeRequestTx-isFirstContribution", isFirstContribution).required().boolean();
    new Validator("createAndSendContributeRequestTx-contributedAmount", contributedAmount).required().amount();
    new Validator("createAndSendContributeRequestTx-amplifier", amplifier).required().number();
    new Validator("createAndSendContributeRequestTx-version", version).required().number();
    let addToExistingPool = Boolean(accessID);
    if (addToExistingPool) {
      new Validator("createAndSendContributeRequestTx-accessID", accessID).required().string();
    }
    await this.account?.updateProgressTx(10, "Generating Metadata");
    let burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(contributedAmount).toString(),
      Message: info
    }];
    let isToken = tokenID !== PRVIDSTR;
    let otaReceivers = {};
    let receivingTokens = [tokenID];
    for (const id of receivingTokens) otaReceivers[id] = await this.getOTAReceive();
    if (isFirstContribution && !addToExistingPool) otaReceivers[PDEX_ACCESS_ID] = sharedAccessReceiver;
    let metadata = {
      PoolPairID: poolPairID,
      PairHash: pairHash,
      TokenAmount: contributedAmount,
      TokenID: tokenID,
      Amplifier: amplifier,
      OtaReceivers: otaReceivers,
      Type: pdexv3.AddLiquidityRequestMeta,
    };
    if (addToExistingPool) { metadata.AccessID = accessID }
    else { metadata.OtaReceiver = sharedAccessReceiver }

    let result;
    if (isToken) {
      result = await this.account?.transact({
        transfer: {
          fee,
          info,
          tokenID,
          prvPayments: [],
          tokenPayments:
          burningPayments
        }, extra: { metadata, version, txType: TX_TYPE.CONTRIBUTE, txHandler }
      });
    } else {
      result = await this.account?.transact({
        transfer: {
          fee,
          info,
          tokenID,
          prvPayments: burningPayments
        }, extra: { metadata, version, txType: TX_TYPE.CONTRIBUTE, txHandler }
      });
    }
    await this.account?.updateProgressTx(100, "Completed");
    return result;
  } catch (e) {
    throw e;
  }
}
async function createAndSendWithdrawContributeRequestTxWithAccessToken(params) {
  try {
    const {
      fee,
      info = "",
      poolTokenIDs,
      poolPairID,
      shareAmount,
      version = PrivacyVersion.ver2,
      amount1,
      amount2,
      burnOTA,
      accessID,
    } = params;
    new Validator("createAndSendWithdrawContributeRequestTx-info", info).required().string();
    new Validator("createAndSendWithdrawContributeRequestTx-fee", fee).required().amount();
    new Validator("createAndSendWithdrawContributeRequestTx-poolTokenIDs", poolTokenIDs).required().array();
    new Validator("createAndSendWithdrawContributeRequestTx-poolPairID", poolPairID).required().string();
    new Validator("createAndSendWithdrawContributeRequestTx-shareAmount", shareAmount).required().amount();
    new Validator("createAndSendWithdrawContributeRequestTx-version", version).required().number();
    new Validator("createAndSendWithdrawContributeRequestTx-amount1", amount1).required().amount();
    new Validator("createAndSendWithdrawContributeRequestTx-amount2", amount2).required().amount();
    new Validator("createAndSendWithdrawContributeRequestTx-burnOTA", burnOTA).required().string();
    new Validator("createAndSendWithdrawContributeRequestTx-accessID", accessID).required().string();

    await this.account?.updateProgressTx(10, "Generating Metadata");
    let burningAddress = await getBurningAddress(this.rpc);
    const burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(1).toString(), // burn 1 access token
      Message: info
    }];
    let receivingTokens = [PDEX_ACCESS_ID].concat(poolTokenIDs);
    let receiver = {};
    // create new OTAs
    for (const t of receivingTokens) {
      receiver[t] = await this.getOTAReceive();
    }
    // prepare meta data for tx
    let metadata = {
      PoolPairID: poolPairID,
      ShareAmount: shareAmount,
      BurntOTA: burnOTA,
      AccessID: accessID,
      OtaReceivers: receiver,
      Type: pdexv3.WithdrawLiquidityRequestMeta,
    };
    let result = await this.account?.transact({
      transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: PDEX_ACCESS_ID, tokenCoinChooser: new AccessTicketChooser(burnOTA), tokenCoinForRingCount: 0 },
      extra: { metadata, version, txType: TX_TYPE.WITHDRAW_CONTRIBUTE }
    });
    if (result && poolTokenIDs.length === 2) {
      const { status, txId, tx } = result;
      const params = {
        amount1,
        amount2,
        shareAmount,
        requestTx: txId,
        status,
        tokenId1: poolTokenIDs[0],
        tokenId2: poolTokenIDs[1],
        lockTime: tx?.Tx?.LockTime,
        type: TX_TYPE.WITHDRAW_CONTRIBUTE,
        poolId: poolPairID,
        burnOTA,
        accessID,
        nftId: accessID
      }
      console.log('setStorageWithdrawLP: params', params)
      await Promise.all([
        await this.setStorageWithdrawLP(params),
        await this.setStorageBurningTx({
          accessID,
          pubkey: burnOTA,
          txID: txId
        }),
      ])
    }
    await this.account?.updateProgressTx(100, "Completed");
    return result;
  } catch (e) {
    throw e;
  }
}
async function createAndSendWithdrawLPFeeRequestTxWithAccessToken(params) {
  try {
    const {
      fee,
      withdrawTokenIDs,
      poolPairID,
      version = PrivacyVersion.ver2,
      info = '',
      amount1,
      amount2,
      burnOTA,
      accessID,
    } = params;
    new Validator("createAndSendWithdrawLPFeeRequestTx-fee", fee).required().amount();
    new Validator("createAndSendWithdrawLPFeeRequestTx-info", info).required().string();
    new Validator("createAndSendWithdrawLPFeeRequestTx-withdrawTokenIDs", withdrawTokenIDs).required().array();
    new Validator("createAndSendWithdrawLPFeeRequestTx-poolPairID", poolPairID).required().string();
    new Validator("createAndSendWithdrawLPFeeRequestTx-version", version).required().number();
    new Validator("createAndSendWithdrawLPFeeRequestTx-amount1", amount1).required().amount();
    new Validator("createAndSendWithdrawLPFeeRequestTx-amount2", amount2).required().amount();
    new Validator("createAndSendWithdrawContributeRequestTx-burnOTA", burnOTA).required().string();
    new Validator("createAndSendWithdrawContributeRequestTx-accessID", accessID).required().string();
    await this.account?.updateProgressTx(10, "Generating Metadata");
    const burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(1).toString(), // burn 1 access token
      Message: info
    }];
    let receivingTokens = [PDEX_ACCESS_ID].concat(withdrawTokenIDs);
    let receiver = {};
    // create new OTAs
    for (const t of receivingTokens) {
      receiver[t] = await this.getOTAReceive();
    }
    // prepare meta data for tx
    let metadata = {
      PoolPairID: poolPairID,
      BurntOTA: burnOTA,
      AccessID: accessID,
      Receivers: receiver,
      Type: pdexv3.WithdrawLPFeeRequestMeta,
    };
    let result = await this.account?.transact({
      transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: PDEX_ACCESS_ID, tokenCoinChooser: new AccessTicketChooser(burnOTA), tokenCoinForRingCount: 0 },
      extra: { metadata, version, txType: TX_TYPE.WITHDRAW_CONTRIBUTE_REWARD }
    });

    if (result) {
      const { status, txId, tx } = result;
      const params = {
        amount1,
        amount2,
        requestTx: txId,
        status,
        tokenId1: withdrawTokenIDs[0],
        tokenId2: withdrawTokenIDs[1],
        lockTime: tx?.Tx?.LockTime,
        type: TX_TYPE.WITHDRAW_CONTRIBUTE_REWARD,
        poolId: poolPairID,
        burnOTA,
        accessID,
        nftId: accessID
      }
      console.log('setStorageWithdrawLP: params', params)
      await Promise.all([
        await this.setStorageWithdrawLP(params),
        await this.setStorageBurningTx({
          accessID,
          pubkey: burnOTA,
          txID: txId
        }),
      ])
    }
    await this.account?.updateProgressTx(100, "Completed");
    return result;
  } catch (e) {
    throw e;
  }
}

/*** Create contribute transactions */
async function createContributeTxs({
  fee,
  tokenId1,
  tokenId2,
  amount1,
  amount2,
  poolPairID = '',
  amp = 0,
  nftID
}) {
  let rawTx1 = '';
  let rawTx2 = '';
  let txID1 = '';
  let txID2 = '';
  const version = PrivacyVersion.ver2;
  try {
    if (!nftID) {
      const { nftToken } = await this.getNFTTokenData({
        version: PrivacyVersion.ver2,
      });
      nftID = nftToken;
    }
    new Validator("createContributeTxs-fee", fee).required().amount();
    new Validator("createContributeTxs-tokenId1", tokenId1).required().string();
    new Validator("createContributeTxs-tokenId2", tokenId2).required().string();
    new Validator("createContributeTxs-amount1", amount1).required().amount();
    new Validator("createContributeTxs-amount2", amount2).required().amount();
    new Validator("createContributeTxs-amp", amp).number();
    new Validator("createContributeTxs-poolPairID", poolPairID).string();
    new Validator("createContributeTxs-nftID", nftID).required().string();
    const pairHash = createPairHash({ tokenId1, tokenId2 });
    await this.setStoragePairHash({ pairHash, tokenIds: [tokenId1, tokenId2] })
    const txHandler1 = ({ rawTx, txId: txID }) => {
      txID1 = txID;
      rawTx1 = rawTx;
    };
    const txHandler2 = ({ rawTx, txId: txID }) => {
      txID2 = txID;
      rawTx2 = rawTx;
    };
    await this.createAndSendContributeRequestTx({
      transfer: { fee, tokenID: tokenId1 },
      extra: {
        poolPairID,
        pairHash,
        contributedAmount: amount1,
        nftID,
        amplifier: amp,
        version,
        txHandler: txHandler1
      },
    });
    await this.createAndSendContributeRequestTx({
      transfer: { fee, tokenID: tokenId2 },
      extra: {
        poolPairID,
        pairHash,
        contributedAmount: amount2,
        nftID,
        amplifier: amp,
        version,
        txHandler: txHandler2
      },
    });
  } catch (error) {
    const params = {
      tokenIDs: [tokenId1, tokenId2],
      txIDs: [txID1, txID2],
      version
    }
    const tasks = [
      await this.account.removeTxHistoryByTxIDs(params),
      await this.account.removeSpendingCoinsByTxIDs(params),
    ]
    await Promise.all(tasks)
    throw error;
  }
  try {
    const pubsub = await Promise.all([
      await this.account.rpcTxService.apiPushTx({ rawTx: rawTx1 }),
      await this.account.rpcTxService.apiPushTx({ rawTx: rawTx2 }),
    ]);
    return pubsub;
  } catch (error) {
    throw error;
  }
}

/**
 * @param params Information contribute liquidity params.
 * @param {string} params.tokenId1 Token 1 contributed.
 * @param {string} params.tokenId2 Token 2 contributed.
 * @param {string} params.amount1 Amount Token 1 contribute.
 * @param {string} params.amount2 Amount Token 2 contribute.
 * @param {string | undefined} params.poolPairID Pool pair contribute ID.
 * @param {number} params.amp Amplifier.
 * @param {string | undefined} params.accessID AccessID identify .
 */
async function createContributeTxsWithAccessToken({
  fee,
  tokenId1,
  tokenId2,
  amount1,
  amount2,
  poolPairID = '',
  amp = 0,
  accessID,
}) {
  let rawTx1 = '';
  let rawTx2 = '';
  let txID1 = '';
  let txID2 = '';
  const version = PrivacyVersion.ver2;
  try {
    new Validator("createContributeTxs-fee", fee).required().amount();
    new Validator("createContributeTxs-tokenId1", tokenId1).required().string();
    new Validator("createContributeTxs-tokenId2", tokenId2).required().string();
    new Validator("createContributeTxs-amount1", amount1).required().amount();
    new Validator("createContributeTxs-amount2", amount2).required().amount();
    new Validator("createContributeTxs-amp", amp).number();
    new Validator("createContributeTxs-poolPairID", poolPairID).string();
    new Validator("createContributeTxs-accessID", accessID).string();
    // // no pool ID => add to new pool
    // if (poolPairID.length > 0) accessID = null;

    const pairHash = createPairHash({ tokenId1, tokenId2 });
    await this.setStoragePairHash({ pairHash, tokenIds: [tokenId1, tokenId2] })
    const txHandler1 = ({ rawTx, txId: txID }) => {
      txID1 = txID;
      rawTx1 = rawTx;
    };
    const txHandler2 = ({ rawTx, txId: txID }) => {
      txID2 = txID;
      rawTx2 = rawTx;
    };
    let sharedAccessReceiver = await this.getOTAReceive();
    await this.createAndSendContributeRequestTxWithAccessToken({
      transfer: { fee, tokenID: tokenId1 },
      extra: {
        poolPairID,
        accessID,
        pairHash,
        contributedAmount: amount1,
        sharedAccessReceiver,
        isFirstContribution: true,
        amplifier: amp,
        version,
        txHandler: txHandler1
      },
    });
    await this.createAndSendContributeRequestTxWithAccessToken({
      transfer: { fee, tokenID: tokenId2 },
      extra: {
        poolPairID,
        accessID,
        pairHash,
        contributedAmount: amount2,
        sharedAccessReceiver,
        isFirstContribution: false,
        amplifier: amp,
        version,
        txHandler: txHandler2
      },
    });
  } catch (error) {
    const params = {
      tokenIDs: [tokenId1, tokenId2],
      txIDs: [txID1, txID2],
      version
    }
    const tasks = [
      await this.account.removeTxHistoryByTxIDs(params),
      await this.account.removeSpendingCoinsByTxIDs(params),
    ]
    await Promise.all(tasks)
    throw error;
  }
  try {
    const pubsub = await Promise.all([
      await this.account.rpcTxService.apiPushTx({ rawTx: rawTx1 }),
      // await this.account.rpcTxService.apiPushTx({ rawTx: rawTx2 }),
    ]);
    return pubsub;
  } catch (error) {
    throw error;
  }
}

export default ({
  createAndSendContributeRequestTx,
  createAndSendWithdrawContributeRequestTx,
  createAndSendWithdrawLPFeeRequestTx,

  createAndSendContributeRequestTxWithAccessToken,
  createAndSendWithdrawContributeRequestTxWithAccessToken,
  createAndSendWithdrawLPFeeRequestTxWithAccessToken,

  createContributeTxs,
  createContributeTxsWithAccessToken,
})
