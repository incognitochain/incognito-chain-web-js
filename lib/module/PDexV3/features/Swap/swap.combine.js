import Validator from "@lib/utils/validator";
import orderBy from "lodash/orderBy";
import isEmpty from "lodash/isEmpty";

const ExchangeStatus = {
    reverted: 'reverted',
    success: 'success',
    failed: 'failed',
    pending: 'pending',
    unvailable: 'unvailable',
}
export const TxStatus = {
    submitting: 'submitting',
    submit_failed: 'submit_failed',
    pending: 'pending',
    executing: 'executing',
    rejected: 'rejected',
    accepted: 'accepted',
    success: 'success',
    submitFail: 'failed',
}
const Status = {
    success: 'success',
    processing: 'processing',
    fail: 'fail',
    reverted: 'reverted',
}

const getStatusColor = (status) => {
    let color = '#FFC043';
    if (!status) return color;
    switch (status.toLowerCase()) {
        case Status.fail:
        case TxStatus.submit_failed:
        case TxStatus.rejected:
        case TxStatus.submitFail:
            color = '#F6465D';
            break;
        case Status.processing:
        case Status.reverted:
        case TxStatus.pending:
        case TxStatus.submitting:
        case TxStatus.executing:
            color = '#FFC043';
            break;
        case Status.success:
        case TxStatus.accepted:
        case TxStatus.success:
            color = '#34C759';
            break;
    }
    return color;
};


function combinePAppAndPDexSwap({ swapTxs, curr }) {
    const apiResp = swapTxs[curr.txHash];
    if (!apiResp || isEmpty(apiResp)) return undefined;
    const pendingTimeStatus =
        ((new Date().getTime() - curr.time) > 60000)
            ? TxStatus.rejected
            : TxStatus.pending;

    const burnStatus =
        apiResp.inc_request_tx_status
        || curr?.defaultStatus
        || pendingTimeStatus;

    let tx = {
        requestBurnTxInc: curr.txHash,
        burnTxStatus: burnStatus,
        burnColor: getStatusColor(burnStatus),
        time: curr.time,
        sellTokenID: curr.sellTokenID,
        buyTokenID: curr.buyTokenID,
        sellAmountText: curr.sellAmountText,
        buyAmountText: curr.buyAmountText,
        callContract: curr.callContract
    };

    if (apiResp.network_result && !isEmpty(apiResp.network_result)) {
        const networkStatus = apiResp.network_result[0];
        tx = {
            ...tx,
            outchainTx: networkStatus.swap_tx,
            outchainTxStatus: networkStatus.swap_tx_status,
            outchainColor: getStatusColor(networkStatus.swap_tx_status),

            swapExchangeStatus: networkStatus.swap_outcome,
            swapExchangeColor: getStatusColor(networkStatus.swap_outcome),

            isRedeposit: !!networkStatus.is_redeposit,
            redepositTxInc: networkStatus.redeposit_inctx,
            redepositStatus: networkStatus.redeposit_status,
            redepositColor: getStatusColor(networkStatus.redeposit_status),

            network: networkStatus.network,
        };
    }

    if (!!apiResp.swap_detail) {
        const swapDetail = apiResp.swap_detail;
        tx = {
            ...tx,
            sellTokenID: swapDetail.token_in || tx.sellTokenID,
            buyTokenID: swapDetail.token_out || tx.buyTokenID,
            sellAmountText: swapDetail.in_amount || tx.sellAmountText,
            buyAmountText: swapDetail.out_amount || tx.buyAmountText,
        };
    }

    // inc_request_tx_status
    // -> bsc_swap_tx_status
    // -> bsc_swap_outcome
    // -> is_redeposit === true bsc_redeposit_status
    /** to many cases, please blame @lam */
    let swapStatus = Status.processing;
    const { burnTxStatus, outchainTxStatus, swapExchangeStatus, isRedeposit, redepositStatus } = tx;
    switch (burnTxStatus) {
        case TxStatus.pending:
        case TxStatus.submitting:
        case TxStatus.executing:
            swapStatus = Status.processing; // processing
            break;
        case TxStatus.submit_failed:
        case TxStatus.rejected:
            swapStatus = Status.fail;
            break;
        case TxStatus.accepted: // <---
        case TxStatus.success:
            if (curr.isPDex) {
                swapStatus = Status.success;
            } else {
                switch (outchainTxStatus) {
                    case TxStatus.pending:
                    case TxStatus.submitting:
                    case TxStatus.executing:
                        break; // processing
                    case TxStatus.submit_failed:
                    case TxStatus.rejected:
                        swapStatus = Status.fail; // fail
                        break;
                    case TxStatus.accepted: // <---
                    case TxStatus.success:
                        switch (swapExchangeStatus) {
                            case ExchangeStatus.pending:
                                break; // processing
                            case ExchangeStatus.failed:
                            case ExchangeStatus.unvailable:
                                swapStatus = Status.fail; // fail
                                break;
                            case ExchangeStatus.success:
                            case ExchangeStatus.reverted: // <---
                                if (isRedeposit) {
                                    switch (redepositStatus) {
                                        case TxStatus.pending:
                                        case TxStatus.submitting:
                                        case TxStatus.executing:
                                            break; // processing
                                        case TxStatus.submit_failed:
                                            swapStatus = Status.fail; // fail
                                            break;
                                        case TxStatus.accepted:
                                        case TxStatus.success:
                                            swapStatus = swapExchangeStatus === ExchangeStatus.success ? Status.success : Status.reverted;
                                            break;
                                    }
                                } else {
                                    swapStatus = Status.success;
                                }
                                break;
                            default:
                                swapStatus = Status.processing;
                                break;
                        }
                        break;
                    default:
                        swapStatus = Status.processing;
                        break;
                }
            }
            break;
        default:
            swapStatus = Status.processing;
            break;
    }
    const data = {
        ...tx,
        status: swapStatus,
        color: getStatusColor(swapStatus),
    };
    return data;
}

function combineSwapInter({ swapTxs, curr }) {
    const apiResp = swapTxs[curr.txHash];
    if (!apiResp || isEmpty(apiResp)) return undefined;
    const defaultStatus =
        new Date().getTime() - curr.time > 60000
            ? TxStatus.submitFail
            : TxStatus.pending;
    const status = apiResp?.Status || defaultStatus;
    const color = getStatusColor(status);

    if (!curr.sellTokenID || !curr.buyTokenID) return null;

    const sellAmountText = curr.sellAmountText;
    const buyAmountText = curr.buyAmountText;
    const buyTokenID = curr.buyTokenID;
    const sellTokenID = curr.sellTokenID;

    // const sellStr = `${format.amountVer2({ originalAmount: sellAmountText, decimals: 0 })} ${sellToken.symbol}`;
    // const buyStr = `${format.amountVer2({ originalAmount: buyAmountText, decimals: 0 })} ${buyToken.symbol}`;
    // const swapStr = `${sellStr} = ${buyStr}`;
    // const rateStr = `1 ${sellToken.symbol} = ${format.amountVer2({
    //     originalAmount: new BigNumber(buyAmountText).div(sellAmountText).toNumber(),
    //     decimals: 0,
    // })} ${buyToken.symbol}`;
    // const buyNetwork = buyToken.network;
    // const sellNetwork = sellToken.network;

    let pDexTxID = apiResp.PdexTxID;
    let pAppTxID = apiResp.PappTxID;
    if (pDexTxID && pDexTxID === curr.txHash) {
        pDexTxID = '';
    }

    if (pAppTxID && pAppTxID === curr.txHash) {
        pAppTxID = '';
    }

    const refundTxID = apiResp?.RefundTxID;
    const refundAmount = apiResp?.RefundAmount;
    const refundTokenID = apiResp?.RefundToken;

    const outchainTxID = apiResp?.TxIDOutchain;
    const responseTx = apiResp?.ResponseTxID;

    const data = {
        status,

        pAppTxID,
        pDexTxID,

        pAppNetwork: curr?.interPAppNetwork,
        pAppName: curr?.interPAppName,

        color,

        time: curr.time,

        requestBurnTxInc: curr.txHash,

        sellAmountText,
        sellTokenID,

        buyAmountText,
        buyOriginalAmount: apiResp?.ToAmount,
        buyTokenID,

        refundTokenID,
        refundTxID,
        refundOriginalAmount: refundAmount,

        outchainTxID,

        responseTx,
    };
    return data;
}

function combineSwapTxs({ txsStorage, txsApi }) {
    try {
        new Validator('mappingSwapData-txsStorage', txsStorage)
            .required()
            .array();
        new Validator('mappingSwapData-txsApi', txsApi)
            .required()
            .object();
        txsStorage = orderBy(txsStorage, ['time', 'desc']);
        const txs = txsStorage.reduce((prev, curr) => {
            const payload = {
                swapTxs: txsApi,
                curr,
                prev,
            };

            const txMapper =
                !!curr.interPAppName ? combineSwapInter(payload) : combinePAppAndPDexSwap(payload);
            if (txMapper) {
                return [...prev, txMapper];
            }
            return prev;
        }, []);
        return txs;
    } catch (e) {
        console.log('getSwapHistoryStorage: combineSwapTxs error: ', e)
        return []
    }
}

export default {
    combineSwapTxs,
}