import Validator from "@lib/utils/validator";
import { MAX_FEE_PER_TX, TX_TYPE } from "@lib/module/Account";
import { PrivacyVersion } from "@lib/core/constants";

async function createTransaction({
     fee = MAX_FEE_PER_TX, // network fee: 100 nano PRV
     tokenID,
     txType = TX_TYPE.BURN,
     version = PrivacyVersion.ver3,

     prvPayments,
     tokenPayments,

     metadata,
     info = "", // memo
 } = {}) {
    let response = {
        txId: null,
        rawTx: null
    }
    try {
        /** ---> Validate params <--- **/
        new Validator("createTransaction-fee", fee).required().amount();
        new Validator("createTransaction-tokenID", tokenID).required().string();
        new Validator("createTransaction-txType", txType).required().number();
        new Validator("createTransaction-prvPayments", prvPayments)
            .required()
            .array();
        new Validator("createTransaction-tokenPayments", tokenPayments)
            .required()
            .array();
        new Validator("createTransaction-txType", txType).required().number();

        await this.updateProgressTx(10, "Generating Data");

        const txHandler = ({ txId, rawTx } = {}) => {
            response = {
                txId,
                rawTx
            }
        }
        await this.transact({
            transfer: {
                prvPayments,
                tokenPayments,
                fee,
                info,
                tokenID: tokenID,
            },
            extra: {
                metadata,
                txType,
                txHandler,
                version,
            },
        });
        await this.updateProgressTx(100, "Completed");
    } catch (error) {
        throw error;
    }
    return response;
}

async function createAndSignTransaction({
     fee = MAX_FEE_PER_TX, // network fee: 100 nano PRV
     tokenID,
     txType = TX_TYPE.BURN,
     version = PrivacyVersion.ver3,

     prvPayments,
     tokenPayments,

     metadata,
     info = "", // memo
     txHashHandler = null, // receive txHash, do sth and send rawData
 } = {}) {
    try {
        /** ---> Validate params <--- **/
        new Validator("createTransaction-fee", fee).required().amount();
        new Validator("createTransaction-tokenID", tokenID).required().string();
        new Validator("createTransaction-txType", txType).required().number();
        new Validator("createTransaction-prvPayments", prvPayments)
            .required()
            .array();
        new Validator("createTransaction-tokenPayments", tokenPayments)
            .required()
            .array();
        new Validator("createTransaction-txType", txType).required().number();

        await this.updateProgressTx(10, "Generating Data");

        const tx = await this.transact({
            transfer: {
                prvPayments,
                tokenPayments,
                fee,
                info,
                tokenID: tokenID,
            },
            extra: {
                metadata,
                txType,
                txHashHandler,
                version,
            },
        });
        await this.updateProgressTx(100, "Completed");
        return tx;
    } catch (error) {
        throw error;
    }
}

export default {
    createTransaction,
    createAndSignTransaction,
};