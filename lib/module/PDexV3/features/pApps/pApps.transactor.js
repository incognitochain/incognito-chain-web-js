import { pdexv3 } from "@lib/core/constants";
import { getBurningAddress, PRVIDSTR } from "@lib/core";
import bn from "bn.js";
import { ACCOUNT_CONSTANT, Validator } from "@lib/wallet";
import { MAX_FEE_PER_TX, TX_STATUS } from "@lib/module/Account";

async function createTransactionPApps(params) {
    try {
        const {
            transfer: { fee = MAX_FEE_PER_TX, info = "", version } = {},
            extra: {
                sellTokenID,

                feeReceiverAddress,
                feeTokenID,
                feeAmount,

                // data metadata
                sellAmount,
                callContract, // proxy route
                callData,
                exchangeNetworkID, // networkID exchange, exp: ETH = 1
                buyTokenID,
                buyContractID,
                // remoteAddress, case reDeposit = 0x0000000000000000000000000000000000000000
                // send out EVN use user address
                remoteAddress = "0x0000000000000000000000000000000000000000"
            },
        } = params;

        new Validator("createTransactionPApps-version", version)
            .required()
            .number();
        new Validator("createTransactionPApps-sellTokenID", sellTokenID)
            .required()
            .string();
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
        new Validator("createTransactionPApps-buyTokenID", buyTokenID)
            .required()
            .string();
        new Validator("createTransactionPApps-buyContractID", buyContractID)
            .required()
            .string();
        new Validator("createTransactionPApps-remoteAddress", remoteAddress)
            .required()
            .string();

        const burnAddress = await getBurningAddress()

        let prvPayments, tokenPayments;

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

        const metadata = {
            BurnTokenID: sellTokenID,
            Data: [
                {
                    BurningAmount: sellAmount,
                    ExternalCallAddress: callContract,
                    ExternalCalldata: callData,
                    ExternalNetworkID: exchangeNetworkID,
                    IncTokenID: buyTokenID,
                    ReceiveToken: buyContractID,
                    WithdrawAddress: remoteAddress,
                }
            ],
            Type: 348
        }

        const result = await this.account?.transact({
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
            },
        });
        await this.account?.updateProgressTx(100, "Completed");
    } catch (error) {
        throw error;
    }
}


export default {
    createTransactionPApps,
};
