import { INSC_MIN_FEE_PER_KB, INSC_MIN_FEE_PER_TX, TX_TYPE } from "@lib/module/Account/account.constants";
import {
    InscribeRequestMeta,
    PRVID,
    PRVIDSTR,
    PaymentAddressType,
    encryptMessageOutCoin,
    getBurningAddress
} from "@lib/core";
import { KeySet, addressAsObject } from "@lib/common/keySet";
import { createCoin, estimateFee, estimateTxSize } from "@lib/module/Account//account.utils";

import Validator from "@lib/utils/validator";
import bn from "bn.js";

// createAndSendInscribeRequestTx create and send tx inscribe request
/** createAndSendInscribeRequestTx
 * @param {{paymentAddress: string, amount: number}} prvPayments
 * @param {number} fee
 * @param {string} info
 * @param {string} tokenID   //  only PRV
 * @param {object} metadata
 * @param {number} burningType
 * @param {boolean} isEncryptMessage
 * @param {bool} isDepositToSC  // isDepositToSC: true (for interacting dApps); isDepositToSC: false (for unshielding)
 */
async function createAndSendInscribeRequestTx({
    transfer: {
        tokenID = PRVIDSTR,
        info = "",
        prvPayments = [],
        tokenPayments = []
    },
    extra: {
        burningType = InscribeRequestMeta,
        data = "",  // data inscribe
        isEncryptMessage = true,
        txHashHandler = null,
        version,
        burningCallback,
    } = {},
}) {
    try {
        /** ---> Validate params <--- **/
        new Validator("createAndSendInscribeRequestTx-fee", fee).required().amount();
        new Validator("createAndSendInscribeRequestTx-info", info).string();
        new Validator("createAndSendInscribeRequestTx-tokenID", tokenID).required().string();
        new Validator("createAndSendInscribeRequestTx-prvPayments", prvPayments)
            .required()
            .array();
        new Validator("createAndSendInscribeRequestTx-tokenPayments", tokenPayments)
            .required()
            .array();

        new Validator(
            "createAndSendInscribeRequestTx-burningType",
            burningType
        ).inList([bridgeaggMeta.BurningUnifiedTokenRequestMeta]);
        new Validator("createAndSendInscribeRequestTx-isEncryptMessage", isEncryptMessage).boolean();
        new Validator("createAndSendInscribeRequestTx-version", version)
            .required()
            .number();

        await this.updateProgressTx(10, "Encrypting Message");
        const burningAddress = await getBurningAddress(this.rpc);

        /** ---> tokenPayments <--- **/
        // tokenPayments = tokenPayments.map((payment) => ({
        //     PaymentAddress: payment?.paymentAddress,
        //     Amount: new bn(payment?.amount).toString(),
        //     Message: "",
        // }));

        // tokenPayments.push(
        //     {
        //         PaymentAddress: burningAddress,
        //         Amount: new bn(burnAmount).toString(),
        //         Message: "",
        //     },
        // );

        /** ---> prvPayments <--- **/
        prvPayments = prvPayments.map((payment) => ({
            PaymentAddress: payment?.paymentAddress,
            Amount: new bn(payment?.amount).toString(),
            Message: "",
        }));
        // burn 100 nano PRV
        prvPayments.push({
            PaymentAddress: burningAddress,
            Amount: new bn(100).toString(),
            Message: "",
        })

        let totalAmountBN = new bn(0);
        for (const payment of prvPayments) {
            totalAmountBN = totalAmountBN.add(payment.Amount);
        }

        const isEncodeOnly = !isEncryptMessage;
        tokenPayments = await encryptMessageOutCoin(tokenPayments, isEncodeOnly);
        prvPayments = await encryptMessageOutCoin(prvPayments, isEncodeOnly);

        /** ---> prepare meta data for tx <--- **/
        await this.updateProgressTx(15, "Generating Metadata");
        // otaReceiver is used to receive punified token when the req is rejected
        let otaReceiver = await this.getOTAReceive();

        const burnReqMetadata = {
            Type: burningType,
            Data: data,
            Receiver: otaReceiver,
        };
        console.log("createAndSendInscribeRequestTx", burnReqMetadata);

        // estimate tx fee
        // get est inputs
        let inputForTx;
        try {
            inputForTx = await prepareInputForTxV2({
                amountTransfer: totalAmountBN,
                fee: INSC_MIN_FEE_PER_TX,
                tokenID,
                account: this,
            });
        } catch (e) {
            throw e;
        }
        const numInputs = inputForTx.length;

        const txSize = await estimateTxSize(numInputs, prvPayments.length, burnReqMetadata, null);
        const estFee = txSize * INSC_MIN_FEE_PER_KB;
        if (estFee < INSC_MIN_FEE_PER_TX) {
            estFee = INSC_MIN_FEE_PER_TX;
        }

        console.log("createAndSendInscribeRequestTx: ", {
            transfer: {
                prvPayments,
                tokenPayments,
                fee: estFee,
                info,
                tokenID: tokenID,
            },
            extra: {
                metadata: burnReqMetadata,
                txType: TX_TYPE.BURN,
                txHashHandler,
                version,
            },
        })
        const tx = await this.transact({
            transfer: {
                prvPayments,
                tokenPayments,
                fee: estFee,
                info,
                tokenID: tokenID,
            },
            extra: {
                metadata: burnReqMetadata,
                txType: TX_TYPE.BURN,
                txHashHandler,
                version,
            },
        });
        if (typeof burningCallback === 'function') {
            await burningCallback(tx);
        }
        await this.updateProgressTx(100, "Completed");
        return tx;
    } catch (error) {
        throw error;
    }
}
export default {
    createAndSendInscribeRequestTx: createAndSendInscribeRequestTx,
};
