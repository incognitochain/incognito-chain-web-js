const { Wallet, Transactor : AccountWallet, constants, utils, wasm, KeyWallet } = require('../../');
const { base58CheckEncode : checkEncode, base64Encode, base64Decode } = utils;

async function TestKeyWallet() {
  let privateKeyB64Encode = await wasm.generateKeyFromSeed(base64Encode([123]));
  let spendingKey = base64Decode(privateKeyB64Encode);
  console.log("Spending key: ", spendingKey.join(" , "));
  let keyWallet = await (new KeyWallet().fromPrivateKey(spendingKey));
  console.log("key wallet : ", keyWallet);

  let privateKeyStr = keyWallet.base58CheckSerialize(constants.PriKeyType);
  console.log("key serialize private: ", privateKeyStr);
  let keyDeserialize = KeyWallet.base58CheckDeserialize(privateKeyStr);
  console.log("key deserialize :", keyDeserialize);


  let paymentAddress = keyWallet.base58CheckSerialize(constants.PaymentAddressType);
  console.log("key serial payment adress: ", paymentAddress);
  keyDeserialize = KeyWallet.base58CheckDeserialize(paymentAddress);
  console.log("key deserialize :", keyDeserialize);

  let readonlyKeystr = keyWallet.base58CheckSerialize(constants.ReadonlyKeyType);
  console.log("key serial readonly key: ", readonlyKeystr);
  keyDeserialize = KeyWallet.base58CheckDeserialize(readonlyKeystr);
  console.log("key deserialize :", keyDeserialize);
}
// TestKeyWallet();


async function TestGetKeySetFromPrivateKeyStr(){
  let privateKey = "112t8rnXoBXrThDTACHx2rbEq7nBgrzcZhVZV4fvNEcGJetQ13spZRMuW5ncvsKA1KvtkauZuK2jV8pxEZLpiuHtKX3FkKv2uC5ZeRC8L6we";

  let keyw = KeyWallet.base58CheckDeserialize(privateKey);
  let res = await KeyWallet.getKeySetFromPrivateKeyStr(privateKey);
  console.log("res: ", res);

  // test payment address conversion
  let paymentAddress = '12sttFKciCWyRbNsK1yD1mWEwZoeWi1JtWJZ7gKTbx5eB25U4FnrfkxgxbnZ8zDn2QNhhW44HBZJ1EnfwVBueR44D5ucWxGNpXZMawoCmv6G2cwKi4xkasuysu3WtpV5ZMSYgaJ1mwe9fqgVD9mh';
  let oldPaymentAddress = keyw.toLegacyPaymentAddress(paymentAddress);
  // compare to fixed testcase's result
  if (oldPaymentAddress != '12S3yvTvWUJfubx3whjYLv23NtaNSwQMGWWScSaAkf3uQg8xdZjPFD4fG8vGvXjpRgrRioS5zuyzZbkac44rjBfs7mEdgoL4pwKu87u') throw 'Failed Payment Address Conversion';
  console.log("Payment Address of legacy format: ", oldPaymentAddress);
}
// TestGetKeySetFromPrivateKeyStr()

module.exports = {
    TestKeyWallet,
    TestGetKeySetFromPrivateKeyStr
}