import { bridgeaggMeta, pdexv3 } from "@lib/core/constants";
import { getBurningAddress, PRVIDSTR } from "@lib/core";
import { ACCOUNT_CONSTANT, ErrorObject, Validator} from "@lib/wallet";
import { MAX_FEE_PER_TX } from "@lib/module/Account";
import { CustomError } from "@lib/common/errorhandler";

async function createTransactionPApps(params) {
    try {
        let {
            transfer: { fee = MAX_FEE_PER_TX, info = "", version } = {},
            extra: {
                sellTokenID,
                senderFeeAddressShardID,

                feeReceiverAddress,
                feeTokenID,
                feeAmount,

                // data metadata
                sellAmount,
                callContract, // proxy route
                callData,
                exchangeNetworkID, // networkID exchange, exp: ETH = 1
                sellChildTokenID,
                buyContractID,
                // remoteAddress, case reDeposit = 0x0000000000000000000000000000000000000000
                // send out EVN use user address
                remoteAddress = "0x0000000000000000000000000000000000000000",
                buyTokenID,
                sellAmountText,
                buyAmountText,
            },
        } = params;

        new Validator("createTransactionPApps-version", version)
            .required()
            .number();
        new Validator("createTransactionPApps-sellTokenID", sellTokenID)
            .required()
            .string();
        new Validator("createTransactionPApps-senderFeeAddressShardID", senderFeeAddressShardID)
            .required()
            .number();

        new Validator("createTransactionPApps-feeReceiverAddress", feeReceiverAddress)
            .required()
            .string();
        new Validator("createTransactionPApps-feeTokenID", feeTokenID)
            .required()
            .string();
        new Validator("createTransactionPApps-feeAmount", feeAmount)
            .required()
            .string();

        // validate data metadata
        new Validator("createTransactionPApps-sellAmount", sellAmount)
            .required()
            .amount();
        new Validator("createTransactionPApps-feeTokenID", feeTokenID)
            .required()
            .string();
        new Validator("createTransactionPApps-callContract", callContract)
            .required()
            .string();
        new Validator("createTransactionPApps-callData", callData)
            .required()
            .string();
        new Validator("createTransactionPApps-exchangeNetworkID", exchangeNetworkID)
            .required()
            .number();
        new Validator("createTransactionPApps-sellChildTokenID", sellChildTokenID)
            .required()
            .string();
        new Validator("createTransactionPApps-buyContractID", buyContractID)
            .required()
            .string();
        new Validator("createTransactionPApps-remoteAddress", remoteAddress)
            .required()
            .string();
        new Validator("createTransactionPApps-buyTokenID", buyTokenID)
            .required()
            .string();
        new Validator("createTransactionPApps-sellAmountText", sellAmountText)
            .required()
            .string();
        new Validator("createTransactionPApps-buyAmountText", buyAmountText)
            .required()
            .string();

        // Get payments info
        const getPayments = async () => {
            const burnAddress = await getBurningAddress()

            let prvPayments = [];
            let tokenPayments;

            const burnPayment = {
                Amount: sellAmount,
                Message : "",
                PaymentAddress: burnAddress
            }
            const feePayment = {
                Amount: feeAmount,
                Message : "",
                PaymentAddress: feeReceiverAddress
            }
            if (feeTokenID === PRVIDSTR) {
                prvPayments = [
                    {
                        Amount: feeAmount,
                        Message : "",
                        PaymentAddress: feeReceiverAddress
                    }
                ]
                if (sellTokenID === PRVIDSTR) {
                    prvPayments.push(burnPayment)
                } else {
                    tokenPayments = [burnPayment]
                }
            } else {
                tokenPayments = [feePayment, burnPayment]
            }
            return { prvPayments, tokenPayments }
        }
        const { prvPayments, tokenPayments } = await getPayments()

        // Get meta data
        if (callContract.startsWith("0x")) {
            callContract = callContract.slice(2);
        }
        if (buyContractID.startsWith("0x")) {
            buyContractID = buyContractID.slice(2);
        }
        if (remoteAddress.startsWith("0x")) {
            remoteAddress = remoteAddress.slice(2);
        }

        const otaRedepositReceiver = await this.account.getOTAReceive()
        const metadata = {
            BurnTokenID: sellTokenID,
            Data: [
                {
                    BurningAmount: sellAmount,
                    ExternalCallAddress: callContract,
                    ExternalCalldata: callData,
                    ExternalNetworkID: exchangeNetworkID,
                    IncTokenID: sellChildTokenID,
                    ReceiveToken: buyContractID,
                    RedepositReceiver: otaRedepositReceiver,
                    WithdrawAddress: remoteAddress,
                }
            ],
            Type: bridgeaggMeta.BurnForCallRequestMeta,
        }

        let txId, rawTx;
        const tx = await this.account?.transact({
            transfer: {
                prvPayments,
                fee,
                info,
                tokenID: sellTokenID,
                tokenPayments,
            },
            extra: {
                metadata,
                version,
                txType: ACCOUNT_CONSTANT.TX_TYPE.SWAP_PAPPS,
                txHandler: ({ txId: _txId, rawTx: _rawTx }) => {
                    txId = _txId;
                    rawTx = _rawTx;
                }
            },
        });

        const refundFeeOTA = await this.account.getOTAReceiveWithCfg({ senderShardID: senderFeeAddressShardID })
        if (!refundFeeOTA) {
            throw new CustomError(
                ErrorObject.CreateOTAFeeError,
                ErrorObject.CreateOTAFeeError.description
            );
        }

        if (!rawTx) {
            throw new CustomError(
                ErrorObject.CreateRawDataError,
                ErrorObject.CreateRawDataError.description
            );
        }
        // submit rawTx
        await this.webAppService.submitPAppsRawTx({
            rawTx,
            refundFeeOTA
        })
        await this.setStorageSwapHistoryByCallContract({
            callContract,
            txHash: txId,
            sellTokenID: sellTokenID,
            buyTokenID: buyTokenID,
            sellAmountText,
            buyAmountText,
        })
        await this.account?.updateProgressTx(100, "Completed");
        return tx;
    } catch (error) {
        throw error;
    }
}


export default {
    createTransactionPApps,
};
