import uniqBy from "lodash/uniqBy";
import flatten from "lodash/flatten";
import orderBy from "lodash/orderBy";
import isEmpty from "lodash/isEmpty";
import Validator from "@lib/utils/validator";
import { TX_TYPE, TX_TYPE_STR } from "@lib/module/Account/account.constants";

async function fitlerUnShieldTxListFromStorage(tsxTotal, txUnshiledList) {
  new Validator("setUnShieldEVMHistory-tsxTotal", tsxTotal).required();
  new Validator("setUnShieldEVMHistory-txUnshiledList", txUnshiledList).required();

  try {

    // tsxTotal.txsTransactor = tsxTotal.txsTransactor.map(tx => {
    //   const txFounded = txUnshiledList.find(txUnShield => txUnShield.txHash === tx.txId);
    //   if (txFounded)  {
    //     return {
    //       ...tx,
    //       ...txFounded
    //     }
    //   }
    //   return tx
    // });

    // tsxTotal.txsReceiver = tsxTotal.txsReceiver.filter(tx => !txHashUnshieldList.includes(tx.txId));
    // tsxTotal.txsPortal = tsxTotal.txsPortal.filter(tx => !txHashUnshieldList.includes(tx.txId));
    // tsxTotal.txsPToken = tsxTotal.txsPToken.filter(tx => !txHashUnshieldList.includes(tx.txId));

    // tsxTotal.txsPToken = tsxTotal.txsPToken.map(tx => {

    //   const txFounded = txUnshiledList.find(txUnShield => txUnShield.txHash === tx.txId);
    //   if (txFounded) {
    //     return {
    //       ...tx,
    //       ...txFounded
    //     }
    //   }
    //   return tx
    // });

  } catch (e) {
    throw e;
  } finally {
  }
  return tsxTotal
}

export default {
  fitlerUnShieldTxListFromStorage,
};
