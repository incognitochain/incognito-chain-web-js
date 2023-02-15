import bn from 'bn.js';
import {
    PaymentAddressType,
    ReadonlyKeyType,
    PriKeyType,
    OTAKeyType,
    BurningRequestMeta,
    BurnForCallEthRequestMeta,
    IssuingETHRequestMeta,
    PRVID,
    PRVIDSTR,
    BurnAddress,
    bridgeaggMeta,
} from "../core";
import { checkEncode, checkDecode } from "../common/base58";
import { base64Decode, base64Encode } from "../privacy/utils";
import { KeySet, addressAsObject } from '../common/keySet';
import { RpcClient} from "../rpcclient/rpcclient";
import { wasm } from '@lib/wasm';

function burningRequest(amount, remoteAddress, burningType = BurningRequestMeta) {
    let burningTokenID = this.params.transfer.tokenID;
    this.withTokenID(burningTokenID);
    this.burn(amount);
    if (remoteAddress.startsWith("0x")) remoteAddress = remoteAddress.slice(2);
    this.params.extra.metadata = async () => {
        let emptyKeySet = await new KeySet().importFromPrivateKey(new Uint8Array(32));
        return {
            BurnerAddress: addressAsObject(emptyKeySet.PaymentAddress),
            BurningAmount: amount,
            TokenID: burningTokenID,
            RemoteAddress: remoteAddress,
            Type: burningType,
        };
    };
    return this;
}

function burnForContractCallRequest(amount, callAddr, calldata, receiveToken, recvAddrStr, recvType = bridgeaggMeta.RecvTypeRedeposit, burningType = bridgeaggMeta.BurnForCallEthRequestMeta) {
    let burningTokenID = this.params.transfer.tokenID;
    this.params.extra.metadata = async () => {
        return {
            BurningAmount: amount,
            TokenID: burningTokenID,
            ExternalCalldata: trimHexPrefix(calldata),
            ExternalCallAddress: trimHexPrefix(callAddr),
            ReceiveToken: trimHexPrefix(receiveToken),
            ReceiveAddress: recvAddrStr,
            ReceiveType: recvType,
            Type: burningType,
        };
    };
    return this;
}

function shield(shieldTokenID, ethBlockHash, ethDepositProof, txIndex) {
    this.withTokenID(PRVIDSTR);
    if (!ethBlockHash.startsWith("0x")) ethBlockHash = "0x" + ethBlockHash;
    this.params.extra.metadata = async () => {
        return {
            BlockHash: ethBlockHash,
            TxIndex: txIndex,
            ProofStrs: ethDepositProof,
            IncTokenID: shieldTokenID,
            Type: IssuingETHRequestMeta,
        };
    };
    return this;
}

function unified_shield(shieldTokenID, ethBlockHash, ethDepositProof, txIndex, net, uid) {
    this.withTokenID(PRVIDSTR);
    if (!ethBlockHash.startsWith("0x")) ethBlockHash = "0x" + ethBlockHash;
    this.params.extra.metadata = async () => {
        return {
            Data: [{
                NetworkID: net,
                IncTokenID: shieldTokenID,
                Proof: base64Encode(Buffer.from(JSON.stringify({
                    BlockHash: ethBlockHash,
                    TxIndex: txIndex,
                    Proof: ethDepositProof,
                }))),
            }],
            UnifiedTokenID: uid,
            Type: bridgeaggMeta.IssuingUnifiedTokenRequestMeta,
        };
    };
    return this;
}

function unified_unshield(data = [], toContract = false) { // data: [{IncTokenID, BurningAmount, MinExpectedAmount, RemoteAddress}]
    const totalBurnAmount = data.reduce((total, e) => total.add(new bn(e.BurningAmount)), new bn(0));
    let burningTokenID = this.params.transfer.tokenID;
    this.withTokenID(burningTokenID);
    this.burn(totalBurnAmount.toString());
    for (const d of data) {
        if (d.RemoteAddress.startsWith("0x")) d.RemoteAddress = d.RemoteAddress.slice(2);
    }
    this.params.extra.metadata = async () => {
        return {
            UnifiedTokenID: burningTokenID,
            Receiver: await await wasm.createOTAReceiver(this.transactor.key.base58CheckSerialize(PaymentAddressType)),
            Data: data,
            IsDepositToSC: toContract,
            Type: bridgeaggMeta.BurningUnifiedTokenRequestMeta,
        };
    };
    return this;
}

function burnForCall(burnAmount, incTokenID, extNetworkID = 1, to, cdata = "", rtoken, waddr = '0x0000000000000000000000000000000000000000') {
    let burningTokenID = this.params.transfer.tokenID;
    this.withTokenID(burningTokenID);
    this.burn(new bn(burnAmount).toString());
    if (cdata.startsWith("0x")) cdata = cdata.slice(2);
    if (rtoken.startsWith("0x")) rtoken = rtoken.slice(2);
    if (waddr.startsWith("0x")) waddr = waddr.slice(2);
    if (to.startsWith("0x")) to = to.slice(2);

    this.params.extra.metadata = async () => {
        return {
            Data: [{
                IncTokenID: incTokenID,
                RedepositReceiver: await wasm.createOTAReceiver(this.transactor.key.base58CheckSerialize(PaymentAddressType)),
                BurningAmount: burnAmount,
                ExternalNetworkID: extNetworkID,
                ExternalCalldata: cdata,
                ExternalCallAddress: to,
                ReceiveToken: rtoken,
                WithdrawAddress: waddr,
            }],
            BurnTokenID: burningTokenID,
            Type: bridgeaggMeta.BurnForCallRequestMeta,
        };
    };
    return this;
}

export default {
    burningRequest,
    burnForContractCallRequest,
    shield,
    unified_shield,
    unified_unshield,
    burnForCall
}