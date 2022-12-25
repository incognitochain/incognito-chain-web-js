import { PrivacyVersion, PRVIDSTR, Validator } from '@lib/wallet';
import { getBurningAddress, PDEX_ACCESS_ID } from '@lib/core';
import bn from 'bn.js';
import { pdexv3 } from '@lib/core/constants';
import { TX_TYPE } from '@lib/module/Account';
import uniq from 'lodash/uniq';
import { AccessTicketChooser } from "@lib/services/coinChooser";

async function stakeCreateRequestTx({
  fee,
  info = "",
  tokenID,
  tokenAmount,
  nftID,
  version = PrivacyVersion.ver2,
}) {
  try {
    new Validator("createAndSendStakeRequestTx-fee", fee).required().amount();
    new Validator("createAndSendStakeRequestTx-info", info).required().string();
    new Validator("createAndSendStakeRequestTx-tokenID", tokenID).required().string();
    new Validator("createAndSendStakeRequestTx-tokenAmount", tokenAmount).required().amount();
    new Validator("createAndSendStakeRequestTx-nftID", nftID).required().string();
    new Validator("createAndSendStakeRequestTx-version", version).required().number();
    await this.account.updateProgressTx(10, 'Generating Metadata');
    const burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(tokenAmount).toString(),
      Message: info
    }];
    let isToken = tokenID !== PRVIDSTR;
    // prepare meta data for tx
    const otaReceiver = await this.getOTAReceive();
    let metadata = {
      TokenID: tokenID,
      TokenAmount: tokenAmount,
      NftID: nftID,
      OtaReceiver: otaReceiver,
      Type: pdexv3.StakingRequestMeta,
    };
    let result;
    if (isToken) {
      result = await this.account.transact({
        transfer: { fee, info, tokenID, tokenPayments: burningPayments, prvPayments: [] },
        extra: { metadata, version, txType: TX_TYPE.STAKING_INVEST }
      });
    } else {
      result = await this.account.transact({
        transfer: { prvPayments: burningPayments, fee, info, tokenID },
        extra: { metadata, version, txType: TX_TYPE.STAKING_INVEST }
      });
    }
    if (result) {
      const { status, txId, tx } = result;
      const params = {
        isStaking: true,
        requestTx: txId,
        status,
        tokenId: tokenID,
        nftId: nftID,
        amount: tokenAmount,
        requestTime: isToken ? tx?.Tx.LockTime : tx?.LockTime
      }
      console.log('setStorageStakingTxs: ', params)
      await this.setStorageStakingTxs(params)
    }
    await this.account.updateProgressTx(100, 'Completed');
    return result;
  } catch (e) {
    throw e;
  }
}

async function stakeWithdrawRequestTx({
  fee,
  info = "",
  unstakingAmount,
  nftID,
  stakingPoolID,
  version = PrivacyVersion.ver2,
}) {
  try {
    new Validator("createAndSendStakeWithdrawRequestTx-fee", fee).required().amount();
    new Validator("createAndSendStakeWithdrawRequestTx-info", info).required().string();
    new Validator("createAndSendStakeWithdrawRequestTx-unstakingAmount", unstakingAmount).required().amount();
    new Validator("createAndSendStakeWithdrawRequestTx-stakingPoolID", stakingPoolID).required().string();
    new Validator("createAndSendStakeWithdrawRequestTx-nftID", nftID).required().string();
    new Validator("createAndSendStakeWithdrawRequestTx-version", version).required().number();
    await this.account.updateProgressTx(10, 'Generating Metadata');
    const burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(1).toString(), // burn 1 of NFTID
      Message: info
    }];
    let receivingTokens = [stakingPoolID, nftID];
    let receiver = {};
    // create new OTAs
    for (const t of receivingTokens) {
      receiver[t] = await this.getOTAReceive();
    }
    // prepare meta data for tx
    let metadata = {
      StakingPoolID: stakingPoolID,
      UnstakingAmount: unstakingAmount,
      NftID: nftID,
      OtaReceivers: receiver,
      Type: pdexv3.UnstakingRequestMeta,
    };
    let result = await this.account.transact({
      transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: nftID },
      extra: { metadata, version, txType: TX_TYPE.STAKING_WITHDRAW }
    });
    if (result) {
      const { status, txId, tx } = result;
      const params = {
        isStaking: false,
        requestTx: txId,
        status,
        tokenId: stakingPoolID,
        nftId: nftID,
        amount: unstakingAmount,
        requestTime: tx?.LockTime ? tx?.LockTime : tx?.Tx.LockTime,
      }
      console.log('setStorageStakingTxs: ', params)
      await this.setStorageStakingTxs(params)
    }
    await this.account.updateProgressTx(100, 'Completed');
    return result;
  } catch (e) {
    throw e;
  }
}

async function stakeWithdrawRewardRequestTx({
  fee,
  info = "",
  stakingTokenID,
  nftID,
  version = PrivacyVersion.ver2,
  receiveTokenIDs = []
}) {
  try {
    new Validator("createAndSendStakeWithdrawRewardRequestTx-fee", fee).required().amount();
    new Validator("createAndSendStakeWithdrawRewardRequestTx-info", info).required().string();
    new Validator("createAndSendStakeWithdrawRewardRequestTx-stakingTokenID", stakingTokenID).required().string();
    new Validator("createAndSendStakeWithdrawRewardRequestTx-nftID", nftID).required().string();
    new Validator("createAndSendStakeWithdrawRewardRequestTx-version", version).required().number();
    await this.account.updateProgressTx(10, 'Generating Metadata');
    let burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(1).toString(), // burn 1 of NFTID
      Message: info
    }];
    let receivingTokens = uniq(receiveTokenIDs.concat([stakingTokenID, nftID]));
    let receiver = {};
    for (const t of receivingTokens) {
      receiver[t] = await this.getOTAReceive();
    }
    let metadata = {
      StakingPoolID: stakingTokenID,
      NftID: nftID,
      Receivers: receiver,
      Type: pdexv3.WithdrawStakingRewardRequestMeta,
    };
    let result = await this.account.transact({
      transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: nftID },
      extra: { metadata, version, txType: TX_TYPE.STAKING_WITHDRAW_REWARD }
    });

    if (result) {
      const { status, txId, tx } = result;
      const params = {
        isStaking: undefined,
        requestTx: txId,
        status,
        tokenId: stakingTokenID,
        nftId: nftID,
        amount: 0,
        requestTime: tx?.LockTime ? tx?.LockTime : tx?.Tx.LockTime,
      }
      console.log('setStorageStakingTxs: ', params)
      await this.setStorageStakingTxs(params)
    }

    await this.account.updateProgressTx(100, 'Completed');
    return result;
  } catch (e) {
    throw e;
  }
}

async function stakeCreateRequestTxWithAccessToken({
  fee,
  info = "",
  tokenID,
  tokenAmount,
  version = PrivacyVersion.ver2,
}) {
  try {
    new Validator("createAndSendStakeRequestTx-fee", fee).required().amount();
    new Validator("createAndSendStakeRequestTx-info", info).required().string();
    new Validator("createAndSendStakeRequestTx-tokenID", tokenID).required().string();
    new Validator("createAndSendStakeRequestTx-tokenAmount", tokenAmount).required().amount();
    new Validator("createAndSendStakeRequestTx-version", version).required().number();
    await this.account.updateProgressTx(10, 'Generating Metadata');
    const burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(tokenAmount).toString(),
      Message: info
    }];
    let isToken = tokenID !== PRVIDSTR;
    // prepare meta data for tx
    let otaReceivers = {};
    for (const id of [tokenID, PDEX_ACCESS_ID]) otaReceivers[id] = await this.getOTAReceive();
    let metadata = {
      TokenID: tokenID,
      TokenAmount: tokenAmount,
      OtaReceivers: otaReceivers,
      Type: pdexv3.StakingRequestMeta,
    };
    let result;
    if (isToken) {
      result = await this.account.transact({
        transfer: { fee, info, tokenID, tokenPayments: burningPayments, prvPayments: [] },
        extra: { metadata, version, txType: TX_TYPE.STAKING_INVEST }
      });
    } else {
      result = await this.account.transact({
        transfer: { prvPayments: burningPayments, fee, info, tokenID },
        extra: { metadata, version, txType: TX_TYPE.STAKING_INVEST }
      });
    }
    if (result) {
      const { status, txId, tx } = result;
      const params = {
        isStaking: true,
        requestTx: txId,
        status,
        tokenId: tokenID,
        amount: tokenAmount,
        requestTime: isToken ? tx?.Tx.LockTime : tx?.LockTime
      }
      console.log('setStorageStakingTxs: ', params)
      await this.setStorageStakingTxs(params)
    }
    await this.account.updateProgressTx(100, 'Completed');
    return result;
  } catch (e) {
    throw e;
  }
}

async function addMoreStakeCreateRequestTxWithAccessToken({
  fee,
  info = "",
  tokenID,
  tokenAmount,
  accessID,
  version = PrivacyVersion.ver2,
}) {
  try {
    new Validator("createAndSendAddMoreStakeRequestTx-fee", fee).required().amount();
    new Validator("createAndSendAddMoreStakeRequestTx-info", info).required().string();
    new Validator("createAndSendAddMoreStakeRequestTx-tokenID", tokenID).required().string();
    new Validator("createAndSendAddMoreStakeRequestTx-tokenAmount", tokenAmount).required().amount();
    new Validator("createAndSendAddMoreStakeRequestTx-version", version).required().number();
    new Validator("createAndSendAddMoreStakeRequestTx-accessID", accessID).required().string();
    await this.account.updateProgressTx(10, 'Generating Metadata');
    const burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(tokenAmount).toString(),
      Message: info
    }];
    let isToken = tokenID !== PRVIDSTR;
    // prepare meta data for tx
    let otaReceivers = {};
    for (const id of [tokenID]) otaReceivers[id] = await this.getOTAReceive();
    let metadata = {
      TokenID: tokenID,
      TokenAmount: tokenAmount,
      AccessID: accessID,
      OtaReceivers: otaReceivers,
      Type: pdexv3.StakingRequestMeta,
    };
    let result;
    if (isToken) {
      result = await this.account.transact({
        transfer: { fee, info, tokenID, tokenPayments: burningPayments, prvPayments: [] },
        extra: { metadata, version, txType: TX_TYPE.STAKING_INVEST }
      });
    } else {
      result = await this.account.transact({
        transfer: { prvPayments: burningPayments, fee, info, tokenID },
        extra: { metadata, version, txType: TX_TYPE.STAKING_INVEST }
      });
    }
    if (result) {
      const { status, txId, tx } = result;
      const params = {
        isStaking: true,
        requestTx: txId,
        status,
        tokenId: tokenID,
        accessID,
        amount: tokenAmount,
        requestTime: isToken ? tx?.Tx.LockTime : tx?.LockTime
      }
      console.log('setStorageStakingTxs: ', params)
      await this.setStorageStakingTxs(params)
    }
    await this.account.updateProgressTx(100, 'Completed');
    return result;
  } catch (e) {
    throw e;
  }
}

async function stakeWithdrawRequestTxWithAccessToken({
  fee,
  info = "",
  unstakingAmount,
  burnOTA,
  accessID,
  stakingPoolID,
  version = PrivacyVersion.ver2,
}) {
  try {
    new Validator("createAndSendStakeWithdrawRequestTx-fee", fee).required().amount();
    new Validator("createAndSendStakeWithdrawRequestTx-info", info).required().string();
    new Validator("createAndSendStakeWithdrawRequestTx-unstakingAmount", unstakingAmount).required().amount();
    new Validator("createAndSendStakeWithdrawRequestTx-stakingPoolID", stakingPoolID).required().string();
    new Validator("createAndSendStakeWithdrawRequestTx-version", version).required().number();
    new Validator("createAndSendStakeWithdrawRequestTx-burnOTA", burnOTA).required().string();
    new Validator("createAndSendStakeWithdrawRequestTx-accessID", accessID).required().string();
    await this.account.updateProgressTx(10, 'Generating Metadata');
    const burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(1).toString(), // burn 1 access token
      Message: info
    }];
    let receivingTokens = [PDEX_ACCESS_ID, stakingPoolID];
    let receiver = {};
    // create new OTAs
    for (const t of receivingTokens) {
      receiver[t] = await this.getOTAReceive();
    }
    // prepare meta data for tx
    let metadata = {
      StakingPoolID: stakingPoolID,
      UnstakingAmount: unstakingAmount,
      BurntOTA: burnOTA,
      AccessID: accessID,
      OtaReceivers: receiver,
      Type: pdexv3.UnstakingRequestMeta,
    };
    let result = await this.account.transact({
      transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: PDEX_ACCESS_ID, tokenCoinChooser: new AccessTicketChooser(burnOTA), tokenCoinForRingCount: 0 },
      extra: { metadata, version, txType: TX_TYPE.STAKING_WITHDRAW }
    });
    if (result) {
      const { status, txId, tx } = result;
      const params = {
        isStaking: false,
        requestTx: txId,
        status,
        tokenId: stakingPoolID,
        burnOTA,
        accessID,
        amount: unstakingAmount,
        requestTime: tx?.LockTime ? tx?.LockTime : tx?.Tx.LockTime,
      }
      console.log('setStorageStakingTxs: ', params)
      await this.setStorageStakingTxs(params)
    }
    await this.account.updateProgressTx(100, 'Completed');
    return result;
  } catch (e) {
    throw e;
  }
}

async function stakeWithdrawRewardRequestTxWithAccessToken({
  fee,
  info = "",
  stakingTokenID,
  burnOTA,
  accessID,
  version = PrivacyVersion.ver2,
  receiveTokenIDs = []
}) {
  try {
    new Validator("createAndSendStakeWithdrawRewardRequestTx-fee", fee).required().amount();
    new Validator("createAndSendStakeWithdrawRewardRequestTx-info", info).required().string();
    new Validator("createAndSendStakeWithdrawRewardRequestTx-stakingTokenID", stakingTokenID).required().string();
    new Validator("createAndSendStakeWithdrawRewardRequestTx-version", version).required().number();
    new Validator("createAndSendStakeWithdrawRewardRequestTx-burnOTA", burnOTA).required().string();
    new Validator("createAndSendStakeWithdrawRewardRequestTx-accessID", accessID).required().string();
    await this.account.updateProgressTx(10, 'Generating Metadata');
    let burningAddress = await getBurningAddress(this.rpc);
    let burningPayments = [{
      PaymentAddress: burningAddress,
      Amount: new bn(1).toString(), // burn 1 access token
      Message: info
    }];
    let receivingTokens = uniq(receiveTokenIDs.concat([stakingTokenID, PDEX_ACCESS_ID]));
    let receiver = {};
    for (const t of receivingTokens) {
      receiver[t] = await this.getOTAReceive();
    }
    let metadata = {
      StakingPoolID: stakingTokenID,
      BurntOTA: burnOTA,
      AccessID: accessID,
      Receivers: receiver,
      Type: pdexv3.WithdrawStakingRewardRequestMeta,
    };
    let result = await this.account.transact({
      transfer: { prvPayments: [], tokenPayments: burningPayments, fee, info, tokenID: PDEX_ACCESS_ID, tokenCoinChooser: new AccessTicketChooser(burnOTA), tokenCoinForRingCount: 0 },
      extra: { metadata, version, txType: TX_TYPE.STAKING_WITHDRAW_REWARD }
    });

    if (result) {
      const { status, txId, tx } = result;
      const params = {
        isStaking: undefined,
        requestTx: txId,
        status,
        tokenId: stakingTokenID,
        burnOTA,
        accessID,
        amount: 0,
        requestTime: tx?.LockTime ? tx?.LockTime : tx?.Tx.LockTime,
      }
      console.log('setStorageStakingTxs: ', params)
      await this.setStorageStakingTxs(params)
    }

    await this.account.updateProgressTx(100, 'Completed');
    return result;
  } catch (e) {
    throw e;
  }
}

export default ({
  stakeCreateRequestTx,
  stakeWithdrawRequestTx,
  stakeWithdrawRewardRequestTx,
  stakeCreateRequestTxWithAccessToken,
  stakeWithdrawRequestTxWithAccessToken,
  stakeWithdrawRewardRequestTxWithAccessToken,
  addMoreStakeCreateRequestTxWithAccessToken,
})
