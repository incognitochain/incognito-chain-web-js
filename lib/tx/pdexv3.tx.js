import bn from 'bn.js';
import { PDEX_ACCESS_ID } from './constants';
import {
    PaymentAddressType,
    ReadonlyKeyType,
    PriKeyType,
    OTAKeyType,
    PRVID,
    PRVIDSTR,
    getBurningAddress,
    pdexv3,
    BurnAddress,
} from "../core";
import { checkEncode, checkDecode } from "../common/base58";
import {
    hashSha3BytesToBytes,
    base64Decode,
    base64Encode,
    stringToBytes,
    toHexString,
} from "../privacy/utils";
import { KeySet, addressAsObject } from '../common/keySet';
import { RpcClient } from "../rpcclient/rpcclient";
import { wasm } from '../wasm';
import { defaultCoinChooser, AccessTicketChooser } from '../services/coinChooser';

function mintNft() {
    this.withTokenID(PRVIDSTR);
    this.burn(pdexv3.MintNftAmount);
    this.params.extra.metadata = async () => {
        return {
            Amount: pdexv3.MintNftAmount,
            OtaReceiver: await wasm.createOTAReceiver(this.transactor.key.base58CheckSerialize(PaymentAddressType)),
            Type: pdexv3.UserMintNftRequestMeta,
        }
    };

    return this;
};

function withPool(id) {
    this.params.poolID = id;
    return this;
}

function withNft(id) {
    this.params.nftID = id;
    return this;
}

function withAccess(ota) {
    this.params.transfer.tokenCoinChooser = new AccessTicketChooser(ota);
    this.params.transfer.tokenCoinForRingCount = 0;
    return this;
}

function contribute(burnAmount, amplifier = 10000, poolID = null) {
    let tokenID = this.params.transfer.tokenID;
    poolID = poolID || this.params.poolID;
    let pairHash = toHexString(hashSha3BytesToBytes(stringToBytes(poolID + this.transactor.key.base58CheckSerialize(PaymentAddressType))));
    this.burn(burnAmount);
    let sharedAccessReceiver = (Boolean(this.params.extra.metadata) && this.params.extra.metadata.Type == pdexv3.AddLiquidityRequestMeta) ? this.params.extra.metadata.OtaReceiver : null;
    this.params.extra.metadata = async () => {
        let receiver = await this.willReceive(tokenID, PDEX_ACCESS_ID);
        if (Boolean(sharedAccessReceiver)) delete(receiver[PDEX_ACCESS_ID]); // 2nd contribution
        else sharedAccessReceiver = receiver[PDEX_ACCESS_ID]; // 1st contribution
        return {
            PoolPairID: '',
            PairHash: pairHash,
            TokenAmount: burnAmount,
            TokenID: tokenID,
            Amplifier: amplifier,
            OtaReceivers: receiver,
            OtaReceiver: sharedAccessReceiver,
            Type: pdexv3.AddLiquidityRequestMeta,
        };
    }
    return this;
}

function contributeMore(burnAmount, accessID, poolID = null) {
    const amplifier = 10000; // later overridden by pool's amplifier
    let tokenID = this.params.transfer.tokenID;
    poolID = poolID || this.params.poolID;
    let pairHash = toHexString(hashSha3BytesToBytes(stringToBytes(poolID + this.transactor.key.base58CheckSerialize(PaymentAddressType))));
    this.burn(burnAmount);
    this.params.extra.metadata = async () => {
        return {
            PoolPairID: poolID,
            PairHash: pairHash,
            TokenAmount: burnAmount,
            TokenID: tokenID,
            Amplifier: amplifier,
            OtaReceivers: await this.willReceive(tokenID, PDEX_ACCESS_ID),
            AccessID: accessID,
            Type: pdexv3.AddLiquidityRequestMeta,
        };
    }
    return this;
}

function trade(sellAmount, minBuyAmount = 0, tradingFee = 100, tradingFeeInPRV = false, tradePath = null) {
    let tokenIDSell = this.params.transfer.tokenID;
    tradePath = tradePath || [this.params.poolID];
    tradingFeeInPRV = tradingFeeInPRV || this.params.tradingFeeInPRV;
    let tokenIDBuy = deriveTokenBuy(tradePath, tokenIDSell); // infer tokenBuy

    if (tradingFeeInPRV && tokenIDSell != PRVIDSTR) {
        // pay fee with PRV
        Object.assign(this.params.transfer, {
            prvPayments: [{
                PaymentAddress: BurnAddress,
                Amount: new bn(tradingFee).toString(),
            }],
            tokenPayments: [{
                PaymentAddress: BurnAddress,
                Amount: new bn(sellAmount).toString(),
            }],
        });
    } else {
        this.to(BurnAddress, new bn(sellAmount).add(new bn(tradingFee)).toString());
    }

    this.params.extra.metadata = async () => {
        return {
            TradePath: tradePath,
            TokenToSell: tokenIDSell,
            SellAmount: sellAmount,
            MinAcceptableAmount: minBuyAmount,
            TradingFee: tradingFee,
            Receiver: await this.willReceive(tokenIDSell, tokenIDBuy, PRVIDSTR),
            Type: pdexv3.TradeRequestMeta,
        };
    }
    return this;
}

function order(sellAmount, buyAmount, poolID = null) {
    let tokenIDSell = this.params.transfer.tokenID;
    poolID = poolID || this.params.poolID;
    let tokenIDBuy = deriveTokenBuy([poolID], tokenIDSell);
    this.burn(sellAmount);
    this.params.extra.metadata = async () => {
        return {
            PoolPairID: poolID,
            SellAmount: sellAmount,
            TokenToSell: tokenIDSell,
            Receiver: await this.willReceive(tokenIDSell, tokenIDBuy, PDEX_ACCESS_ID),
            RewardReceiver: await this.willReceive(PRVIDSTR, tokenIDSell),
            MinAcceptableAmount: buyAmount,
            Type: pdexv3.AddOrderRequestMeta,
        };
    }
    return this;
}

function dexStake(amount) {
    let tokenID = this.params.transfer.tokenID; // staking pool ID is identical to the tokenID staked
    this.burn(amount);
    this.params.extra.metadata = async () => {
        return {
            TokenID: tokenID,
            TokenAmount: amount,
            OtaReceivers: await this.willReceive(tokenID, PDEX_ACCESS_ID),
            Type: pdexv3.StakingRequestMeta,
        };
    }
    return this;
}

function withdrawLiquidity(shareAmount, accessID, poolTokenIDs = null, poolID = null) {
    poolID = poolID || this.params.poolID;
    poolTokenIDs = poolTokenIDs || getTokensInPool(poolID);
    this.withTokenID(PDEX_ACCESS_ID);
    this.burn(1);
    this.params.extra.metadata = async () => {
        return {
            PoolPairID: poolID,
            ShareAmount: shareAmount,
            BurntOTA: this.params.transfer.tokenCoinChooser.accessTicket,
            AccessID: accessID,
            OtaReceivers: await this.willReceive(PDEX_ACCESS_ID, ...poolTokenIDs),
            Type: pdexv3.WithdrawLiquidityRequestMeta,
        };
    }
    return this;
}

function withdrawOrder(orderID, accessID, withdrawTokenIDs = null, poolID = null, amount = 0) {
    poolID = poolID || this.params.poolID;
    withdrawTokenIDs = withdrawTokenIDs || getTokensInPool(poolID);
    this.withTokenID(PDEX_ACCESS_ID);
    this.burn(1);
    this.params.extra.metadata = async () => {
        return {
            PoolPairID: poolID,
            OrderID: orderID,
            Amount: amount,
            BurntOTA: this.params.transfer.tokenCoinChooser.accessTicket,
            AccessID: accessID,
            Receiver: await this.willReceive(PDEX_ACCESS_ID, ...withdrawTokenIDs),
            Type: pdexv3.WithdrawOrderRequestMeta,
        };
    }
    return this;
}

function dexUnstake(amount, accessID) {
    let stakingPoolID = this.params.poolID;
    this.withTokenID(PDEX_ACCESS_ID);
    this.burn(1);
    this.params.extra.metadata = async () => {
        return {
            StakingPoolID: stakingPoolID,
            UnstakingAmount: amount,
            BurntOTA: this.params.transfer.tokenCoinChooser.accessTicket,
            AccessID: accessID,
            OtaReceivers: await this.willReceive(PDEX_ACCESS_ID, stakingPoolID),
            Type: pdexv3.UnstakingRequestMeta,
        };
    }
    return this;
}

function withdrawRewardLP(accessID, withdrawTokenIDs = null, poolID = null) {
    poolID = poolID || this.params.poolID;
    withdrawTokenIDs = withdrawTokenIDs || getTokensInPool(poolID);
    this.withTokenID(PDEX_ACCESS_ID);
    this.burn(1);
    this.params.extra.metadata = async () => {
        return {
            PoolPairID: poolID,
            BurntOTA: this.params.transfer.tokenCoinChooser.accessTicket,
            AccessID: accessID,
            Receivers: await this.willReceive(PDEX_ACCESS_ID, PRVIDSTR, ...withdrawTokenIDs),
            Type: pdexv3.WithdrawLPFeeRequestMeta,
        };
    }
    return this;
}

function withdrawRewardStaking(accessID, poolID = null) {
    let stakingPoolID = this.params.poolID;
    this.withTokenID(PDEX_ACCESS_ID);
    this.burn(1);
    this.params.extra.metadata = async () => {
        return {
            StakingPoolID: stakingPoolID,
            BurntOTA: this.params.transfer.tokenCoinChooser.accessTicket,
            AccessID: accessID,
            Receivers: await this.willReceive(PDEX_ACCESS_ID, stakingPoolID),
            Type: pdexv3.WithdrawStakingRewardRequestMeta,
        };
    }
    return this;
}

function inscribe(data) {
    this.withTokenID(PRVIDSTR);
    this.burn(100);
    this.params.extra.metadata = async () => {
        return {
            Data: data,
            Receiver: await wasm.createOTAReceiver(this.transactor.key.base58CheckSerialize(PaymentAddressType)),
            Type: pdexv3.InscribeRequestMeta,
        }
    };

    return this;
};

export default {
    mintNft,
    withPool,
    withNft,
    contribute,
    contributeMore,
    trade,
    order,
    dexStake,
    withdrawLiquidity,
    withdrawOrder,
    dexUnstake,
    withdrawRewardLP,
    withdrawRewardStaking,
    inscribe,
}