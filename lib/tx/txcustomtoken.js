import {Tx} from './txprivacy';
import {TxTokenVin, TxTokenVout, TxTokenData} from './txcustomtokendata';
import * as privacyUtils from "privacy-js-lib/lib/privacy_utils";
import * as constantsTx from './constants';
import {newHashFromStr, convertHashToStr} from "../common";


class TxCustomToken extends Tx {
    constructor(rpcUrl) {
        super(rpcUrl);      // call constructor of Tx

        this.txTokenData = new TxTokenData();
    }

    toString() {
        // let x = new Tx()
        // Object.assign(x, this);
        // x.hash()
        // let a =Object.getPrototypeOf(this);
        let normalTxHash = super.hash();
        let record = normalTxHash.toString();
        record += this.txTokenData.hash().toString();

        if (this.Metadata !== null) {
            record += this.Metadata.hash().toString();
        }
        return record;
    }

    hash() {
        return privacyUtils.hashBytesToBytes(privacyUtils.stringToBytes(this.toString()));
    }

    convertTxToByte(){
        super.convertTxToByte();
        this.txTokenData.propertyID = convertHashToStr(this.txTokenData.propertyID);
        for (let i=0; i<this.txTokenData.vouts.length; i++){
           this.txTokenData.vouts[i] = this.txTokenData.vouts[i].convertToByte();
           delete this.txTokenData.vouts[i].index;
           delete this.txTokenData.vouts[i].txCustomTokenID;
        }
        return this;
    }

    async init(input, paymentInfos, fee, tokenParams, listCustomTokens, db, metaData, hasPrivacy) {
        // create normal tx for fee
        await super.init(input, paymentInfos, fee, hasPrivacy, db, null, metaData);

        // override txCustomToken type
        this.Type = constantsTx.TxCustomTokenType;

        this.txTokenData = new TxTokenData();

        let handled = false;

        switch (tokenParams.tokenTxType) {
            case constantsTx.CustomTokenInit: {
                handled = true;
                // create vouts for txTokenData on tokenParam's receiver
                let receiver = tokenParams.receivers[0];

                let vouts = new Array(1);
                vouts[0] = new TxTokenVout();
                vouts[0].set(receiver.paymentAddress, receiver.value);

                this.txTokenData.set(tokenParams.tokenTxType, tokenParams.propertyName, tokenParams.propertySymbol, null, vouts, tokenParams.amount);

                // hash tx token data
                let res = this.txTokenData.hash();
                if (res.err !== null) {
                    return res.err;
                }
                let hashTxTokenData = res.data;

                // validate PropertyID is the only one
                for (let token in listCustomTokens) {
                    let str = convertHashToStr(hashTxTokenData);
                    // console.log();
                    // console.log();  
                    // console.log("Str: ", str);
                    if (str === token.ID) {
                        return new Error("Custom token is existed");
                    }
                }

                // assign txTokenData's propertyId
                this.txTokenData.propertyID = hashTxTokenData;
                break;
            }

            case constantsTx.CustomTokenTransfer: {
                handled = true;
                let paymentTokenAmount = 0;
                for (let i = 0; i < tokenParams.receivers.length; i++) {
                    paymentTokenAmount += tokenParams.receivers[i].value;
                }

                let refundTokenAmount = tokenParams.vinsAmount - paymentTokenAmount;
                if (refundTokenAmount < 0) {
                    return new Error("Not enough token for transferring")
                }

                this.txTokenData = new TxTokenData();
                this.txTokenData.set(tokenParams.tokenTxType, tokenParams.propertyName, tokenParams.propertySymbol, tokenParams.vins, null, null);

                this.txTokenData.propertyID = newHashFromStr(tokenParams.propertyID);

                let vouts = [];
                if (refundTokenAmount > 0) {
                    vouts = new Array(tokenParams.receivers.length + 1);
                    vouts[vouts.length - 1] = new TxTokenVout();
                    vouts[vouts.length - 1].set(tokenParams.vins[0].PaymentAddress, refundTokenAmount)
                } else {
                    vouts = new Array(tokenParams.receivers.length);
                }

                for (let i = 0; i < tokenParams.receivers.length; i++) {
                    vouts[i] = new TxTokenVout();
                    vouts[i].set(tokenParams.receivers[i].paymentAddress, tokenParams.receivers[i].value)
                }

                this.txTokenData.vouts = vouts;
            }
        }
        if (!handled) {
            return new Error("Wrong token tx type");
        }

        return null;
    }


}

// can convert byte array to string?

export {TxCustomToken};