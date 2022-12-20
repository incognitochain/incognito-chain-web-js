import PDexV3 from "@lib/module/PDexV3";
import { PANCAKE_CONSTANTS } from "@lib/module/Pancake";
import { UNI_CONSTANTS } from "@lib/module/Uni";
import { CURVE_CONSTANTS } from "@lib/module/Curve";
import { BSC_CONSTANT } from "@lib/module/BinanceSmartChain";
import { WEB3_CONSTANT } from "@lib/module/Web3";
import { PaymentInfo } from "@lib/common/key";
import { RpcClient } from "@lib/rpcclient/rpcclient";
import {
    hashSha3BytesToBytes,
    base64Decode,
    base64Encode,
    bytesToString,
    stringToBytes,
} from "@lib/privacy/utils";
import {
    FailedTx,
    SuccessTx,
    ConfirmedTx,
    MetaStakingBeacon,
    MetaStakingShard,
    PaymentAddressType,
    ReadonlyKeyType,
    PriKeyType,
    OTAKeyType,
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
    PRVIDSTR,
    KeyWallet,
    TxHistoryInfo,
    toNanoPRV,
    toPRV,
    encryptMessageOutCoin,
    decryptMessageOutCoin,
    createNewCoins
} from "@lib/core";
import {
    CustomTokenTransfer,
    CustomTokenInit,
    MAX_INPUT_PER_TX,
} from "@lib/tx/constants";
import {
    checkEncode as base58CheckEncode,
    checkDecode as base58CheckDecode,
} from "@lib/common/base58";
import {
    getShardIDFromLastByte,
    byteToHexString,
    hexStringToByte,
    convertHashToStr,
} from "@lib/common/common";
import { Wallet, DefaultStorage, setShardNumber } from "@lib/wallet";
import { getMaxWithdrawAmount } from "@lib/tx/utils";
import { generateECDSAKeyPair } from "@lib/privacy/ecdsa";
import { generateBLSKeyPair } from "@lib/privacy/bls";
import {
    generateBLSPubKeyB58CheckEncodeFromSeed,
    generateCommitteeKeyFromHashPrivateKey,
} from "@lib/common/committeekey";
import { hybridEncryption, hybridDecryption } from "@lib/privacy/hybridEncryption";
import { Account } from "@lib/module/Account";
import StorageServices from "@lib/services/storage";
import { StatelessTransactor, TxBuilder, wasm } from "@lib/tx/stateless";
import { newMnemonic } from "@lib/core/mnemonic";
import { ENCODE_VERSION, setShardNumber as setShardNumberSub  } from "@lib/common/constants";
import { isPaymentAddress, isOldPaymentAddress } from "@lib/utils/paymentAddress";
import VerifierTx from "@lib/module/VerifierTx";
import axios from "axios";
import coinsV3 from "@lib/module/Account/features/CoinsV3";

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
    } else if (Boolean(privateKey)) {
        let t = new StatelessTransactor({ rpc });
        t.init(rpc.rpcHttpService.url);
        await t.setKey(privateKey);
        return t;
    } else {
        let t = new StatelessTransactor({ rpc });
        t.init(rpc.rpcHttpService.url);
        await Wallet.initAccountWithHardwareWallet(t, true);

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
    // load Go symbols for NodeJS target. See Webpack config nodeCfg
    await import("@lib/wasm/wasm_exec_node.js");
    if (!globalThis.__gobridge__?.ready) {
        globalThis.__gobridge__ = {};
        const go = new Go();
        go.argv = process.argv;
        go.exit = process.exit;
        const { default: wasmFile } = await import('@privacy-wasm');
        const { instance } = await WebAssembly.instantiate(fs.readFileSync(wasmFile), go.importObject);
        go.run(instance);
        globalThis.__gobridge__.ready = true;
    }
    setProvider(providerURL, svcs);
    await setShardNumber(shardCount);
    const allowBase58 = !svcs; // accept base58 to read coins from fullnode; services use base64 only
    await wasm.setCfg(JSON.stringify({ shardCount, allowBase58 }));
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
