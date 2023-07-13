import {
    BurningRequestMeta,
    BurningRequestToSCMeta,
    ConfirmedTx,
    FailedTx,
    InscribeRequestMeta,
    InscribeResponseMeta,
    IssuingETHRequestMeta,
    KeyWallet,
    MetaStakingBeacon,
    MetaStakingShard,
    OTAKeyType,
    PDEContributionMeta,
    PDECrossPoolTradeRequestMeta,
    PDEPRVRequiredContributionRequestMeta,
    PDETradeRequestMeta,
    PDEWithdrawalRequestMeta,
    PRVIDSTR,
    PaymentAddressType,
    PortalV4ShieldingRequestMeta,
    PortalV4ShieldingResponseMeta,
    PortalV4UnshieldRequestMeta,
    PortalV4UnshieldingResponseMeta,
    PriKeyType,
    ReadonlyKeyType,
    SuccessTx,
    TxHistoryInfo,
    WithDrawRewardRequestMeta,
    createNewCoins,
    decryptMessageOutCoin,
    encryptMessageOutCoin,
    toNanoPRV,
    toPRV
} from "@lib/core";
import {
    CustomTokenInit,
    CustomTokenTransfer,
    MAX_INPUT_PER_TX,
} from "@lib/tx/constants";
import { DefaultStorage, Wallet, setShardNumber } from "@lib/wallet";
import { ENCODE_VERSION, setShardNumber as setShardNumberSub } from "@lib/common/constants";
import { StatelessTransactor, TxBuilder, wasm } from "@lib/tx/stateless";
import {
    checkDecode as base58CheckDecode,
    checkEncode as base58CheckEncode,
} from "@lib/common/base58";
import {
    base64Decode,
    base64Encode,
    bytesToString,
    hashSha3BytesToBytes,
    stringToBytes,
} from "@lib/privacy/utils";
import {
    byteToHexString,
    convertHashToStr,
    getShardIDFromLastByte,
    hexStringToByte,
} from "@lib/common/common";
import {
    generateBLSPubKeyB58CheckEncodeFromSeed,
    generateCommitteeKeyFromHashPrivateKey,
} from "@lib/common/committeekey";
import { hybridDecryption, hybridEncryption } from "@lib/privacy/hybridEncryption";
import { isOldPaymentAddress, isPaymentAddress } from "@lib/utils/paymentAddress";

import { Account } from "@lib/module/Account";
import { BSC_CONSTANT } from "@lib/module/BinanceSmartChain";
import { CURVE_CONSTANTS } from "@lib/module/Curve";
import { PANCAKE_CONSTANTS } from "@lib/module/Pancake";
import PDexV3 from "@lib/module/PDexV3";
import { PaymentInfo } from "@lib/common/key";
import { RpcClient } from "@lib/rpcclient/rpcclient";
import StorageServices from "@lib/services/storage";
import { UNI_CONSTANTS } from "@lib/module/Uni";
import VerifierTx from "@lib/module/VerifierTx";
import { WEB3_CONSTANT } from "@lib/module/Web3";
import axios from "axios";
import coinsV3 from "@lib/module/Account/features/CoinsV3";
import { generateBLSKeyPair } from "@lib/privacy/bls";
import { generateECDSAKeyPair } from "@lib/privacy/ecdsa";
import { getMaxWithdrawAmount } from "@lib/tx/utils";
import { newMnemonic } from "@lib/core/mnemonic";

Object.assign(
    Account.prototype,
    coinsV3
);

export const constants = {
    PaymentAddressType,
    PriKeyType,
    ReadonlyKeyType,
    OTAKeyType,
    CustomTokenTransfer,
    CustomTokenInit,
    PRVIDSTR,
    ENCODE_VERSION,
    FailedTx,
    SuccessTx,
    ConfirmedTx,
    MetaStakingBeacon,
    MetaStakingShard,
    BurningRequestMeta,
    BurningRequestToSCMeta,
    IssuingETHRequestMeta,
    WithDrawRewardRequestMeta,
    PDEContributionMeta,
    PDEPRVRequiredContributionRequestMeta,
    PDETradeRequestMeta,
    PDECrossPoolTradeRequestMeta,
    PDEWithdrawalRequestMeta,
    PortalV4ShieldingRequestMeta,
    PortalV4ShieldingResponseMeta,
    PortalV4UnshieldRequestMeta,
    PortalV4UnshieldingResponseMeta,
    InscribeRequestMeta,
    InscribeResponseMeta,
    CustomTokenTransfer,
    MAX_INPUT_PER_TX,
    Pancake: PANCAKE_CONSTANTS,
    Uni: UNI_CONSTANTS,
    Web3: WEB3_CONSTANT,
    Bsc: BSC_CONSTANT,
    Curve: CURVE_CONSTANTS,
};

export const utils = {
    base58CheckEncode,
    base58CheckDecode,
    base58CheckDeserialize: KeyWallet.base58CheckDeserialize,
    base64Encode,
    base64Decode,
    getMaxWithdrawAmount,
    toNanoPRV,
    toPRV,
    getShardIDFromLastByte,
    generateECDSAKeyPair,
    generateBLSKeyPair,
    encryptMessageOutCoin,
    decryptMessageOutCoin,
    byteToHexString,
    hexStringToByte,
    generateBLSPubKeyB58CheckEncodeFromSeed,
    generateCommitteeKeyFromHashPrivateKey,
    hashSha3BytesToBytes,
    convertHashToStr,
    hybridEncryption,
    hybridDecryption,
    bytesToString,
    stringToBytes,
    setShardNumber: setShardNumberSub,
    isPaymentAddress,
    isOldPaymentAddress,
    newMnemonic,
    createNewCoins
};



let rpc = new RpcClient();
let services = null;

/**
 * @async
 * @returns {Object} an account-like object that can create and send transactions to Incognito network
 * @param {string} privateKey - the (encoded) private key to sign transactions with
 * @param {Object | null} services - coin/API/... service endpoints to connect to.
 * If not provided, transact with a fullnode connection only.
 * Fullnode RPC & endpoint is defined by "rpc"
 */
export const NewTransactor = async (privateKey, services = null) => {
    if (Boolean(services)) {
        let { coinSvc, apiSvc, txSvc, reqSvc, deviceID } = services;
        if (!txSvc) txSvc = `${coinSvc}/txservice`;
        if (!reqSvc) reqSvc = `${coinSvc}/airdrop-service`;
        let t = new Account({ rpc });
        await t.setKey(privateKey);
        t.setRPCCoinServices(coinSvc);
        t.setRPCClient(rpc.rpcHttpService.url);
        t.setRPCTxServices(txSvc);
        t.setRPCRequestServices(reqSvc);
        const authTokenDt = await axios.post(`${apiSvc}/auth/new-token`, { DeviceID: deviceID });
        const authToken = authTokenDt.data.Result.Token;
        t.setAuthToken(authToken);
        t.setRPCApiServices(apiSvc, authToken);
        return t;
    } else if (privateKey?.create) {
        let w = new Wallet();
        let t = new StatelessTransactor({ rpc });
        t.init(rpc.rpcHttpService.url);
        t.hwTransport = await privateKey.create();
        await w.initAccountWithHardwareWallet("__hw", t);
        return t;
    } else {
        let t = new StatelessTransactor({ rpc });
        t.init(rpc.rpcHttpService.url);
        await t.setKey(privateKey);
        return t;
    }
}

/**
 * @returns a TxBuilder
 * @param {Object} t - an Account-like
 */
export const Tx = (t) => new TxBuilder(t)

export const setProvider = (rpcURL, svcs) => {
    rpc = new RpcClient(rpcURL);
    services = svcs;
}

/**
 * @async perform initialization (load WASM binary etc.)
 * @param {string} wasmFile - (optional) binary file name
 * @param {string} providerURL - fullnode endpoint
 * @param {Number} shardCount - number of shards in the network, default to 8 (mainnet)
 * @param {Object | null} specify services to use
 */
export const init = async (wasmFile, providerURL, shardCount = 8, svcs = null) => {
    await import("@lib/wasm/wasm_exec.js");
    setProvider(providerURL, svcs);
};

export {
    wasm,
    rpc,
    services,
    // types
    Wallet,
    Account,
    TxBuilder,
    StorageServices,
    VerifierTx,
    PDexV3,
    TxHistoryInfo,
    RpcClient,
    PaymentInfo,
    KeyWallet,
    DefaultStorage,
    setShardNumber,
    createNewCoins
};
