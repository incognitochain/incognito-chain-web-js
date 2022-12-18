import Validator from "@lib/utils/validator";

async function handleFilterTxsTransactorByTxsUnshieldLocal(txsTransactor, txsUnshieldLocal) {
  new Validator("handleFilterTxsTransactorByTxsUnshieldLocal-txsTransactor", txsTransactor).required();
  new Validator("handleFilterTxsTransactorByTxsUnshieldLocal-txsUnshieldLocal", txsUnshieldLocal).required();

  let txsTransactorNew = []
  let txsTransactorMatchTxUnshieldLocal = []

  // const txsUnshie  ldIdsList = txsUnshieldLocal.map(tx => tx.txHash) || []

  try {
    txsTransactor = txsTransactor.map(tx => {
      const txUnshieldLocalFounded = txsUnshieldLocal.find(txUnShield => txUnShield.txHash === tx.txId);
      //Merge Data txsTransactor and txUnshieldLocal
      if (txUnshieldLocalFounded)  {
        txsTransactorMatchTxUnshieldLocal.push({
          ...tx,
          ...txUnshieldLocalFounded
        })
      } else {
        //Still hold txsTransactor's data, the same filtered by tx Unshield local
        txsTransactorNew.push(tx)
      }
    });
  } catch (e) {
    throw e;
  } finally {
  }
  return { txsTransactorNew, txsTransactorMatchTxUnshieldLocal }
}

export default {
  handleFilterTxsTransactorByTxsUnshieldLocal,
};
