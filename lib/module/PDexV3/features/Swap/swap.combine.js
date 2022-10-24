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
const TxStatus = {
    submitting: 'submitting',
    submit_failed: 'submit_failed',
    pending: 'pending',
    executing: 'executing',
    rejected: 'rejected',
    accepted: 'accepted',
}
const Status = {
    success: 'success',
    processing: 'processing',
    fail: 'fail',
    reverted: 'reverted',
}

const getStatusColor = (status) => {
    let color = '#FFC043';
    switch (status) {
        case Status.fail:
        case TxStatus.submit_failed:
        case TxStatus.rejected:
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
            color = '#34C759';
            break;
    }
    return color;
};

function combineSwapTxs({ txsStorage, txsApi }) {
    new Validator('mappingSwapData-txsStorage', txsStorage)
        .required()
        .array();
    new Validator('mappingSwapData-txsApi', txsApi)
        .required()
        .object();
    txsStorage = orderBy(txsStorage, ['time', 'desc']);
    const txs = txsStorage.reduce((prev, curr) => {
        const apiResp = txsApi[curr.txHash];
        if (!apiResp || isEmpty(apiResp)) return prev;
        let tx = {
            requestBurnTxInc: curr.txHash,
            burnTxStatus: apiResp.inc_request_tx_status || TxStatus.rejected,
            burnColor: getStatusColor(apiResp.inc_request_tx_status || TxStatus.rejected),
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
        return [...prev, data];
    }, []);
    return txs;
}

export default {
    combineSwapTxs
}