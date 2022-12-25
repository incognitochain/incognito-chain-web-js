const { Wallet, Transactor : AccountWallet, types, constants, utils, KeyWallet, RpcClient } = require('../../');
const { PaymentAddressType, PRVIDSTR, ENCODE_VERSION } = constants;
const { base58CheckEncode : checkEncode } = utils;


async function TestGetExchangeRatePToken(rpc) {
  let res = await rpc.getPdexv3State();
  console.log("Res: ");
  console.dir(res, {depth: null});
}

async function GetTransactionByReceiver(rpc) {
  var paymentAddressStr = "12Rq9cwXpX11jxEwPZQs9ddtM8A1sSZmgjRTVUayVcqNFz1naurRfVWsCVpYmMTkvgd6SCbuXJePQYEjUzsqmWpjQyRMmXV1p3o6A1A";
  var readonlyKey = "13hSjnKSaK5QkfuR1dbDzKcpGrCD5TZHnwdGkTFZaZxcBMxBm51Ma4aMcQ45RAKkpJXkhwAXEvxXv4HHfxSSTPSmgLFrYEiFZgzCbSt";
  var txs = await rpc.getTransactionByReceiver(paymentAddressStr, readonlyKey);
  console.log(JSON.stringify(txs));
}

// GetTransactionByReceiver();

async function TestGetListPrivacyToken(rpc){
  var ptokens = await rpc.listTokens();
  console.log("ptokens: ", ptokens);
}

// TestGetListPrivacyToken()

async function TestGetBurningAddress(rpc){
  let burningAddress = await rpc.getBurningAddress(3000);
  console.log("burningAddress: ", burningAddress);
}

// TestGetBurningAddress()

module.exports = {
    TestGetBurningAddress,
    TestGetListPrivacyToken,
    TestGetExchangeRatePToken,
    GetTransactionByReceiver
}
