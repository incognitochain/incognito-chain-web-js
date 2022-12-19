import Validator from "@lib/utils/validator";
import orderBy from "lodash/orderBy";
import isEmpty from "lodash/isEmpty";

export const Status = {
    success: 'success',
    pending: 'pending',
    failed: 'failed',
}

const getStatusColor = (status) => {
    let color = '#FFC043';
    switch (status) {
        case Status.failed:
            color = '#F6465D';
            break;
        case Status.pending:
            color = '#FFC043';
            break;
        case Status.success:
            color = '#34C759';
            break;
    }
    return color;
};

function combineUnshieldTxs({ txsStorage, txsApi }) {
    new Validator('combineUnshieldTxs-txsStorage', txsStorage)
        .required()
        .array();
    new Validator('combineUnshieldTxs-txsApi', txsApi)
        .required()
        .object();

    try {
        txsStorage = orderBy(txsStorage, ['time', 'desc']);
        const txs = txsStorage.reduce((prev, curr) => {
            const apiResp = txsApi[curr.txHash];
            if (!apiResp || isEmpty(apiResp)) return prev;
        
            const pendingTimeStatus =
                ((new Date().getTime() - curr.time) > 60000)
                    ? Status.failed
                    : Status.pending;
            
            let status = Status.pending
            if (apiResp.status) {
                status = apiResp.status
            } else {
                if (apiResp) {
                    status =  Status.pending
                } else {
                    status = pendingTimeStatus
                }
            }
        
            let tx = {
                ...curr,
                requestBurnTxInc: curr.txHash,
                burnTxStatus: status,
                burnColor: getStatusColor(status),
                time: curr.time,
            };
    
            const data = {
                ...tx,
                ...apiResp,
                status: status,
                statusStr: status,
                color: getStatusColor(status),
            };
            return [...prev, data];
        }, []);
        return txs
        
    } catch (error) {
        throw error
    }
}

export default {
    combineUnshieldTxs
}