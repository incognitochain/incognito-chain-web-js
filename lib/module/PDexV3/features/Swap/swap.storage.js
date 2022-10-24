import Validator from "@lib/utils/validator";
import uniqBy from "lodash/uniqBy";
import flatten from "lodash/flatten";
import orderBy from "lodash/orderBy";
import isEmpty from "lodash/isEmpty";

const HISTORY_KEY = 'NEW_PAPPS_FLOW';
const NUMBER_TXS  = 20
export const FAKE_CALL_CONTRACT_PDEX  = 'incognito'

function removePrefixContract({ contract } = {}) {
    new Validator('removePrefixContract-contract', contract)
        .required()
        .string();
    if (contract.startsWith("0x")) {
        contract = contract.slice(2);
    }
    return contract
}

function getSwapStorageTxIDsByNetworkName({ callContract } = {}) {
    new Validator('getSwapStorageTxIDsByNetworkName-callContract', callContract)
        .required()
        .string();
    callContract = this.removePrefixContract({ contract: callContract })
    const otaKey = this.getOTAKey()
    return `${callContract}-${otaKey}-${HISTORY_KEY}`
}

async function getStorageSwapHistoryByCallContract({ callContract } = {}) {
    new Validator('getStorageSwapHistory-callContract', callContract)
        .required()
        .string();
    callContract = this.removePrefixContract({ contract: callContract })
    const key = this.getSwapStorageTxIDsByNetworkName({ callContract })
    const swapTxs = await this.getStorage(key);
    if (!swapTxs) return [];
    // txHash time
    return uniqBy(swapTxs, 'txHash') || [];
}

async function setStorageSwapHistoryByCallContract({
   callContract,
   txHash,
   sellTokenID,
   buyTokenID,
   sellAmountText,
   buyAmountText,
} = {}) {
    new Validator('setStorageSwapHistoryByCallContract-callContract', callContract)
        .required()
        .string();
    new Validator('setStorageSwapHistoryByCallContract-txHash', txHash)
        .required()
        .string();
    new Validator('setStorageSwapHistoryByCallContract-sellTokenID', sellTokenID)
        .required()
        .string();
    new Validator('setStorageSwapHistoryByCallContract-buyTokenID', buyTokenID)
        .required()
        .string();
    new Validator('setStorageSwapHistoryByCallContract-sellAmountText', sellAmountText)
        .required()
        .string();
    new Validator('setStorageSwapHistoryByCallContract-buyAmountText', buyAmountText)
        .required()
        .string();
    const _callContract = callContract;
    callContract = this.removePrefixContract({ contract: callContract })
    const key = this.getSwapStorageTxIDsByNetworkName({ callContract })
    let swapTxs = (await this.getStorageSwapHistoryByCallContract({ callContract }) || []);
    swapTxs.push({
        txHash,
        time: new Date().getTime(),
        isPDex: callContract === FAKE_CALL_CONTRACT_PDEX,
        callContract: _callContract,
        sellTokenID,
        buyTokenID,
        sellAmountText,
        buyAmountText
    });
    swapTxs = uniqBy(swapTxs, 'txHash');
    await this.setStorage(key, swapTxs || [])
}

async function getSwapHistoryStorage({ callContracts } = {}) {
    let txs = [];
    new Validator('getSwapHistoryStorage-callContract', callContracts)
        .required()
        .array();
    if (callContracts.length > 1) {
        callContracts.push(FAKE_CALL_CONTRACT_PDEX)
    }

    const tasks = await callContracts.map((callContract) => {
        return this.getStorageSwapHistoryByCallContract({
            callContract
        })
    })

    try {
        txs = (await Promise.all(tasks)) || [];
        txs = (flatten(txs) || []).slice(0, NUMBER_TXS);
    } catch(e) {
        throw e
    }
    const txsApi = await this.webAppService.getSwapTxStatus({
        txIDs: txs.map(({ txHash }) => txHash)
    }) || {};

    const history = this.combineSwapTxs({ txsStorage: txs, txsApi }) || []

    return uniqBy(history, 'requestBurnTxInc')
}

export default {
    removePrefixContract,
    getSwapStorageTxIDsByNetworkName,
    setStorageSwapHistoryByCallContract,
    getStorageSwapHistoryByCallContract,
    getSwapHistoryStorage,
}