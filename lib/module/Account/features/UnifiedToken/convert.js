import { addressAsObject, KeySet } from "@lib/common/keySet";
import {
  encryptMessageOutCoin,
  getBurningAddress,
  bridgeaggMeta,
  PaymentAddressType
} from "@lib/core";
import { createCoin } from "@lib/module/Account//account.utils";
import Validator from "@lib/utils/validator";
import bn from "bn.js";
import { TX_TYPE } from "@lib/module/Account/account.constants";

// createAndSendConvertUnifiedTokenRequestTx create and send tx burning punified token for withdrawing or interacting with external dApps
/** createAndSendConvertUnifiedTokenRequestTx
 * @param {{paymentAddressStr: string, amount: number}} prvPayments
 * @param {{paymentAddressStr: string, amount: number}} tokenPayments
 * @param {number} fee
 * @param {string} info
 * @param {string} tokenID   // pToken ID will be converted
 * @param {string} pUnifiedTokenID 
 * @param {number} convertAmount
 * @param {boolean} isEncryptMessage
 */
async function createAndSendConvertUnifiedTokenRequestTx({
  transfer: {
    fee,
    tokenID,
    info = "",
    prvPayments = [],
    tokenPayments = []
  },
  extra: {
    pUnifiedTokenID,
    convertAmount,
    isEncryptMessage = true,
    txHashHandler = null,
    version,
    burningCallback,
  } = {},
}) {
  try {
    /** ---> Validate params <--- **/
    new Validator("createAndSendConvertUnifiedTokenRequestTx-fee", fee).required().amount();
    new Validator("createAndSendConvertUnifiedTokenRequestTx-info", info).string();
    new Validator("createAndSendConvertUnifiedTokenRequestTx-tokenID", tokenID).required().string();
    new Validator("createAndSendConvertUnifiedTokenRequestTx-prvPayments", prvPayments)
      .required()
      .array();
    new Validator("createAndSendConvertUnifiedTokenRequestTx-tokenPayments", tokenPayments)
        .required()
        .array();
    new Validator("createAndSendConvertUnifiedTokenRequestTx-pUnifiedTokenID", pUnifiedTokenID).required().string();
    new Validator("createAndSendConvertUnifiedTokenRequestTx-convertAmount", convertAmount).required().amount();
    new Validator("createAndSendConvertUnifiedTokenRequestTx-isEncryptMessage", isEncryptMessage).boolean();
    new Validator("createAndSendConvertUnifiedTokenRequestTx-version", version)
      .required()
      .number();

    await this.updateProgressTx(10, "Encrypting Message");
    const burningAddress = await getBurningAddress(this.rpc);

    /** ---> tokenPayments <--- **/
    tokenPayments = tokenPayments.map((payment) => ({
      PaymentAddress: payment?.paymentAddress,
      Amount: new bn(payment?.amount).toString(),
      Message: "",
    }));

    tokenPayments.push(
      {
        PaymentAddress: burningAddress,
        Amount: new bn(convertAmount).toString(),
        Message: "",
      },
    );

    /** ---> prvPayments <--- **/
    prvPayments = prvPayments.map((payment) => ({
      PaymentAddress: payment?.paymentAddress,
      Amount: new bn(payment?.amount).toString(),
      Message: "",
    }));

    const isEncodeOnly = !isEncryptMessage;
    tokenPayments = await encryptMessageOutCoin(tokenPayments, isEncodeOnly);
    prvPayments = await encryptMessageOutCoin(prvPayments, isEncodeOnly);

    /** ---> prepare meta data for tx <--- **/
    await this.updateProgressTx(15, "Generating Metadata");

    // otaReceiver is used to receive punified token
    let otaReceiver = await this.getOTAReceive();

    const convertReqMetadata = {
      Type: bridgeaggMeta.BridgeAggConvertTokenToUnifiedTokenRequestMeta,
      TokenID: tokenID,
      UnifiedTokenID: pUnifiedTokenID,
      Amount: convertAmount,
      Receiver: otaReceiver,
    };
    console.log("convertUnifiedTokenReqMetadata", convertReqMetadata);

    const tx = await this.transact({
      transfer: {
        prvPayments,
        tokenPayments,
        fee,
        info,
        tokenID: tokenID,
      },
      extra: {
        metadata: convertReqMetadata,
        txType: TX_TYPE.BURN,
        txHashHandler,
        version,
      },
    });
    if(typeof burningCallback === 'function'){
      await burningCallback(tx);
    }
    await this.updateProgressTx(100, "Completed");
    return tx;
  } catch (error) {
    throw error;
  }
}
export default {
  createAndSendConvertUnifiedTokenRequestTx: createAndSendConvertUnifiedTokenRequestTx,
};
