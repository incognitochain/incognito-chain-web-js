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

// createAndSendBurnUnifiedTokenRequestTx create and send tx burning punified token for withdrawing or interacting with external dApps
/** createAndSendBurnUnifiedTokenRequestTx
 * @param {{paymentAddress: string, amount: number}} prvPayments
 * @param {{paymentAddress: string, amount: number}} tokenPayments
 * @param {number} fee
 * @param {string} info
 * @param {string} tokenID   // punified token ID
 * @param {object} metadata
 * @param {number} burningType
 * @param {boolean} isEncryptMessage
 * @param {{incTokenID: string, burningAmount: number, expectedAmount: number, remoteAddress: string}} burningInfos
 * @param {bool} isDepositToSC  // isDepositToSC: true (for interacting dApps); isDepositToSC: false (for unshielding)
 */
async function createAndSendBurnUnifiedTokenRequestTx({
  transfer: {
    fee, // network fee: 100 nano PRV
    tokenID,
    info = "",
    prvPayments = [],
    tokenPayments = []
  },
  extra: {
    burningType = bridgeaggMeta.BurningUnifiedTokenRequestMeta,
    isEncryptMessage = true,
    isDepositToSC = false,
    burningInfos,
    txHashHandler = null,
    version,
    burningCallback,
  } = {},
}) {
  try {
    /** ---> Validate params <--- **/
    new Validator("createAndSendBurnUnifiedTokenRequestTx-fee", fee).required().amount();
    new Validator("createAndSendBurnUnifiedTokenRequestTx-info", info).string();
    new Validator("createAndSendBurnUnifiedTokenRequestTx-tokenID", tokenID).required().string();
    new Validator("createAndSendBurnUnifiedTokenRequestTx-prvPayments", prvPayments)
      .required()
      .array();
    new Validator("createAndSendBurnUnifiedTokenRequestTx-tokenPayments", tokenPayments)
        .required()
        .array();

    new Validator(
      "createAndSendBurnUnifiedTokenRequestTx-burningType",
      burningType
    ).inList([bridgeaggMeta.BurningUnifiedTokenRequestMeta]);
    new Validator("createAndSendBurnUnifiedTokenRequestTx-isEncryptMessage", isEncryptMessage).boolean();
    new Validator("createAndSendBurnUnifiedTokenRequestTx-burningInfos", burningInfos)
      .required()
      .array();
      // .minLength(1, "at least one burning info item");
    new Validator("createAndSendBurnUnifiedTokenRequestTx-version", version)
      .required()
      .number();

    await this.updateProgressTx(10, "Encrypting Message");
    const burningAddress = await getBurningAddress(this.rpc);

    // calculate total burning amount and prepare burning data
    let burnAmount = 0;
    burningInfos = burningInfos.map((bInfo) => {
      burnAmount += bInfo?.burningAmount;
      let remoteAddress = bInfo?.remoteAddress;
      if (remoteAddress.startsWith("0x")) {
        remoteAddress = remoteAddress.slice(2);
      }

      return {
        IncTokenID: bInfo?.incTokenID,
        BurningAmount: bInfo?.burningAmount,
        RemoteAddress: remoteAddress,
        MinExpectedAmount: bInfo?.expectedAmount,
      }
    });

    /** ---> tokenPayments <--- **/
    tokenPayments = tokenPayments.map((payment) => ({
      PaymentAddress: payment?.paymentAddress,
      Amount: new bn(payment?.amount).toString(),
      Message: "",
    }));

    tokenPayments.push(
      {
        PaymentAddress: burningAddress,
        Amount: new bn(burnAmount).toString(),
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
    // otaReceiver is used to receive punified token when the req is rejected
    let otaReceiver = await this.getOTAReceive();

    const burnReqMetadata = {
      Type: burningType,
      UnifiedTokenID: tokenID,
      Data: burningInfos,
      Receiver: otaReceiver,
      IsDepositToSC: isDepositToSC,
    };
    console.log("burnUnifiedTokenReqMetadata", burnReqMetadata);
    console.log("createAndSendBurnUnifiedTokenRequestTx: ", {
      transfer: {
        prvPayments,
        tokenPayments,
        fee,
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
        fee,
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
  createAndSendBurnUnifiedTokenRequestTx: createAndSendBurnUnifiedTokenRequestTx,
};
