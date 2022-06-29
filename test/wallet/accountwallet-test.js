const { default: Axios } = require("axios");
const {
  Wallet,
  Account: AccountWallet,
  constants,
  init,
  StorageServices,
  isOldPaymentAddress,
  VerifierTx,
  PDexV3,
  setShardNumber,
  PANCAKE_CONSTANTS,
  WEB3_CONSTANT,
  BSC_CONSTANT,
} = require("../../");
const { PaymentAddressType } = constants;

// const rpcClient = "https://lb-fullnode.incognito.org/fullnode";
//  new RpcClient("https://mainnet.incognito.org/fullnode");
const rpcClient = "https://testnet.incognito.org/fullnode";
// const rpcClient = new RpcClient("http://localhost:9334");
// const rpcClient = "http://139.162.55.124:18334";
// const rpcClient = new RpcClient("http://54.39.158.106:9334");
// const rpcClient = new RpcClient("http://139.162.55.124:8334");   // dev-net
// const rpcClient = "https://testnet1.incognito.org/fullnode"; //testnet1
// "http://139.162.55.124:8334";

const stagingServices = "https://api-coinservice-staging.incognito.org";

const rpcCoinService =
  // "https://api-coinservice.incognito.org"; //mainnet
  stagingServices; //testnet
// "https://api-coinservice-staging2.incognito.org"; // testnet1
// "http://51.161.119.66:7001"; //dev-test-coin-service
const rpcTxService = `${stagingServices}/txservice`;
// "http://51.161.119.66:7003";
//  "https://api-coinservice.incognito.org/txservice"; mainnet
// "https://api-coinservice-staging.incognito.org/txservice";
//  "https://api-coinservice-staging2.incognito.org/txservice"; // testnet1

const rpcRequestService = `${stagingServices}/airdrop-service`;
// "https://api-coinservice.incognito.org/airdrop-service"; // mainnet
// "http://51.161.119.66:4000"; //testnet
// "http://51.161.119.66:6000"; // testnet-1
//  "http://51.161.119.66:5000"; //dev-test-coin-service
const privacyVersion = 2;
const rpcApiService =
  //  "https://api-service.incognito.org"; // mainnet
  "https://staging-api-service.incognito.org"; // testnet
//  "https://privacyv2-api-service.incognito.org";
const deviceID = "9AE4B404-3E61-495D-835A-05CEE34BE251";
let wallet;
let senderPrivateKeyStr;
let senderKeyWallet;
let accountSender;
let senderPaymentAddressStr;
let receiverPaymentAddrStr;
let receiverPaymentAddrStr2;

const PRVID =
  "0000000000000000000000000000000000000000000000000000000000000004";

let tokenID, secondTokenID;
async function setup() {
  await init();
  tokenID = "";
  secondTokenID =
    "46107357c32ffbb04d063cf8a08749cba83546a67e299fb9ffcc2a9955df4736";
  // await sleep(10000);
  wallet = new Wallet();
  wallet = await wallet.init(
    "password",
    new StorageServices(),
    "Master",
    "Anon"
  );
  // senderPrivateKeyStr =
  //   "1139jtfTYJysjtddB4gFs6n3iW8YiDeFKWcKyufRmsb2fsDssj3BWCYXSmNtTR277MqQgHeiXpTWGit9r9mBUJfoyob5besrF9AW9HpLC4Nf";
  senderPrivateKeyStr =
    "112t8rnZ9qPE7C6RbrK6Ygat1H94kEkYGSd84fAGiU396yQHu8CBHmV1DDHE947d7orfHnDtKA9WCffDk7NS5zUu5CMCUHK8nkRtrv4nw6uu";
  // "112t8rniqSuDK8vdvHXGzkDzthVG6tsNtvZpvJEvZc5fUg1ts3GDPLWMZWFNbVEpNHeGx8vPLLoyaJRCUikMDqPFY1VzyRbLmLyWi4YDrS7h";
  accountSender = new AccountWallet(Wallet);
  accountSender.setRPCCoinServices(rpcCoinService);
  accountSender.setRPCClient(rpcClient);
  accountSender.setRPCTxServices(rpcTxService);
  accountSender.setRPCRequestServices(rpcRequestService);
  const data = {
    DeviceID: deviceID,
  };
  const authTokenDt = await Axios.post(`${rpcApiService}/auth/new-token`, data);
  const authToken = authTokenDt.data.Result.Token;
  accountSender.setAuthToken(authToken);
  console.log("auth token 2", authToken);
  accountSender.setRPCApiServices(rpcApiService, authToken);
  await accountSender.setKey(senderPrivateKeyStr);
  senderPaymentAddressStr =
    accountSender.key.base58CheckSerialize(PaymentAddressType);
  // await accountSender.submitKeyAndSync([PRVIDSTR, tokenID, secondTokenID]);
  receiverPaymentAddrStr =
    "12shR6fDe7ZcprYn6rjLwiLcL7oJRiek66ozzYu3B3rBxYXkqJeZYj6ZWeYy4qR4UHgaztdGYQ9TgHEueRXN7VExNRGB5t4auo3jTgXVBiLJmnTL5LzqmTXezhwmQvyrRjCbED5xVWf4ETHbRCSP";
  receiverPaymentAddrStr2 =
    "12sm28usKxzw8HuwGiEojZZLWgvDinAkmZ3NvBNRQLuPrf5LXNLXVXiu4VBCMVDrDm97qjLrgFck3P36UTSWfqNX1PBP9PBD78Cpa95em8vcnjQrnwDNi8EdkdkSA6CWcs4oFatQYze7ETHAUBKH";
}
const ETH = "ffd8d42dc40a8d166ea4848baf8b5f6e9fe0e9c30d60062eb7d44a8df9e00854";
async function TestGetBalance() {
  try {
    const account = await createAccountByPrivateKey(
      // "112t8rnXfbmjdsG5PCsSCa4o2ym9irftMfBp2eaRRQ1XMPzt2Wmoig88zmTA6cpByyyTPNHw6f3mJNsKeqpr3ok8n46nhRbgFjRPK3KpwHdy"
      // "112t8rnZDRztVgPjbYQiXS7mJgaTzn66NvHD7Vus2SrhSAY611AzADsPFzKjKQCKWTgbkgYrCPo9atvSMoCf9KT23Sc7Js9RKhzbNJkxpJU6"
      // "112t8rneQvmymBMxTEs1LzpfN7n122hmwjoZ2NZWtruHUE82bRN14xHSvdWc1Wu3wAoczMMowRC2iifXbZRgiu9GuJLYvRJr7VLuoBfhfF8h"
      // "112t8rneQvmymBMxTEs1LzpfN7n122hmwjoZ2NZWtruHUE82bRN14xHSvdWc1Wu3wAoczMMowRC2iifXbZRgiu9GuJLYvRJr7VLuoBfhfF8h"
      // "112t8rnXMEmCBiwPrKTcryP4ZbjUsdcsTVvZ52HUuCY34C6mCN2MrzymtkfnM5dVDZxTrB3x4b7UhbtUeM38EdSJfnkfEYUqkFsKafDdsqvL"
      // "112t8rnXcSzusvgvAdGiLDU4VqHmrn5MjDLwk1Goc6szRbGcWEAmw7R876YKctQGQgniYYMMqa7ZEYSEL4XAMYShnMt8xxqis2Zrew5URfY7"
      // "112t8rnZDRztVgPjbYQiXS7mJgaTzn66NvHD7Vus2SrhSAY611AzADsPFzKjKQCKWTgbkgYrCPo9atvSMoCf9KT23Sc7Js9RKoESjDGbF2J7"
      // "112t8rneQvmymBMxTEs1LzpfN7n122hmwjoZ2NZWtruHUE82bRN14xHSvdWc1Wu3wAoczMMowRC2iifXbZRgiu9GuJLYvRJr7VLuoBfhfF8h"
      // "112t8rnXZyyYeXbMB2TQaSn3JGKsehpZofrJewKWy7MgaEoc2Jg6Fa4ueD4meWEoeSkEdDTvKcTKdScJudzqpUfquYKfQvp2FQqUru4LcECf"
      "112t8rnY86q7sNHHZo9XEJMWgVds7kM913hc6pxqVrqzSA7LdMVZX6vgttLzGqNeHAjPofB5wHfNeKBGs6NZF7ZPfE5cge8ZCaWc76Jy56Ch"
    );
    const tokenID1 =
      "0000000000000000000000000000000000000000000000000000000000000004";
    const tokenID2 =
      "880ea0787f6c1555e59e3958a595086b7802fc7a38276bcd80d4525606557fbc";
    const tokenIDs = [
      tokenID1,
      //  tokenID2,
      // ETH
    ];
    return console.log(typeof account.getOTAReceive());
    const keyInfo = await account.getKeyInfo({
      version: privacyVersion,
    });
    console.log("keyinfo", keyInfo);
    let task = tokenIDs.map((tokenID) =>
      account.getBalance({
        tokenID,
        version: privacyVersion,
      })
    );
    console.log("BALANCE", await Promise.all(task));
    console.log(
      await account.getOutputCoins({ tokenID: tokenID1, version: 2 })
    );
  } catch (e) {
    console.log("Error when get balance: ", e);
  }
}
async function TestGetAllPrivacyTokenBalance() {
  await setup();
  // create and send PRV
  try {
    let result = await accountSender.getAllPrivacyTokenBalance();
    console.log("result: ", result);
  } catch (e) {
    console.log("Error when get balance: ", e);
  }
}
async function TestGetRewardAmount() {
  await setup();
  // get reward amount
  let response0;
  try {
    response0 = await accountSender.getRewardAmount(false, "");
  } catch (e) {
    console.log(e);
  }
  console.log("Response getRewardAmount: ", response0);
}
async function TestCreateAndSendRewardAmountTx() {
  let fee = 100;
  let response;
  try {
    response = await accountSender.createAndSendWithdrawRewardTx({
      transfer: { fee },
      extra: { version: privacyVersion },
    });
    console.log("Response createAndSendWithdrawRewardTx: ", response);
    return response.txId;
  } catch (e) {
    console.log(e);
  }
}
async function TestBurningRequestTx() {
  let fee = 100;
  // create and send burning request tx
  let response;
  try {
    response = await accountSender.createAndSendBurningRequestTx({
      transfer: {
        fee,
        tokenID:
          "d6efe5956aa521f5eeaf2f69cc6fbf9f21bfb3dcb7d0de90fa40913e6e630983",
      },
      extra: {
        remoteAddress: "d5808Ba261c91d640a2D4149E8cdb3fD4512efe4",
        burnAmount: 69000,
        version: privacyVersion,
      },
    });
    console.log("Response createAndSendBurningRequestTx: ", response);
    return response.txId;
  } catch (e) {
    // this tx specifically depends on bridge config, so we let it skip and review manually
    console.error(e);
    //
  }
}
async function TestStakerStatus() {
  // sender key
  await setup();

  // get staker status
  let response0;
  try {
    response0 = await accountSender.stakerStatus();
  } catch (e) {
    console.log(e);
  }

  console.log("Response status staker: ", response0);
}
async function TestCreateAndSendNativeToken() {
  // const a = await createAccountByPrivateKey(
  //   // "112t8rnXMEmCBiwPrKTcryP4ZbjUsdcsTVvZ52HUuCY34C6mCN2MrzymtkfnM5dVDZxTrB3x4b7UhbtUeM38EdSJfnkfEYUqkFsKafDdsqvL"
  //   "112t8rnXcSzusvgvAdGiLDU4VqHmrn5MjDLwk1Goc6szRbGcWEAmw7R876YKctQGQgniYYMMqa7ZEYSEL4XAMYShnMt8xxqis2Zrew5URfY7"
  // );
  // const rf = await a.getDeserializeInformation();
  console.log(
    "isPaymentAddress1",
    isOldPaymentAddress(
      "12RyviD89Vh3vh9iH1maYAY9cAXMEpuycXpDhpcu52AvsMecuvURARJiGW2Ex8VgZX2YsyFuFjyQ4cLN9a4fAq18ZVXy1VU7sqUTJb2"
    )
  );
  // console.log("isPaymentAddress2", isPaymentAddress(rf.PaymentAddress));
  // console.log(
  //   "isPaymentAddress3",
  //   isPaymentAddress(isPaymentAddress(rf.PaymentAddressV1))
  // );
  // return;
  const version = privacyVersion;
  const tokenID =
    "0000000000000000000000000000000000000000000000000000000000000004";
  let fee = 100;
  let info = "SEND 6900 nano PRV";
  let amountTransfer = 1e9; // in nano PRV
  const account = await createAccountByPrivateKey(
    "112t8rnYU5yDsbyr2RGvUYxvLf1a6FozJovLryicMY9Qoxawnnv42pXKQgnTTmiuCuXi5ccBghjuhPnpRZ4iDMV7a9GNDbVoSyCvc82GFJsr"
    // "112t8rnY86q7sNHHZo9XEJMWgVds7kM913hc6pxqVrqzSA7LdMVZX6vgttLzGqNeHAjPofB5wHfNeKBGs6NZF7ZPfE5cge8ZC6TgtJPbuLru"
    // "112t8rnXXD3eyD8wfx7AXmpJHdpafDpHngsWUTJB42FbVzihAyDw1s2dZ56jeSc5ZYC3u1ekjTUjHQHTeR7b58Ru9KLqEgpm5mgcaivLC4Kz"
    // "112t8rnY64dNQLtVTowvvAAM4QQcKNFWm81a5nwg2n8XqmaLby2C1kQSKK3TT6rcJbgnfNzPBtVEdQmjfMqXGQTmrXXN97LJhdRRxHXBwbmY"
    // "112t8rnr8swHUPwFhhw8THdVtXLZqo1AqnoKrg1YFpTYr7k7xyKS46jiquN32nDFMNG85cEoew8eCpFNxUw4VB8ifQhFnZSvqpcyXS7jg3NP"
    // "11111119wSSAFZrfkkqUeqnEd7x3X4SG3g6Gwpq26AAAuNA2xo9p6RztR3ZoF5bcGefDyXVy4uvvfsrF7pbqvArRWdnZuZWxLDv6sEJiEYi"
    // "112t8rnXMEmCBiwPrKTcryP4ZbjUsdcsTVvZ52HUuCY34C6mCN2MrzymtkfnM5dVDZxTrB3x4b7UhbtUeM38EdSJfnkfEYUqkFsKafDdsqvL"
  );
  const accountSenderBalance = await account.getBalance({
    tokenID,
    version,
  });
  console.log("accountSenderBalance", accountSenderBalance);
  const receverAccount = await createAccountByPrivateKey(
    // "112t8rnXMEmCBiwPrKTcryP4ZbjUsdcsTVvZ52HUuCY34C6mCN2MrzymtkfnM5dVDZxTrB3x4b7UhbtUeM38EdSJfnkfEYUqkFsKafDdsqvL"
    "112t8rnXcSzusvgvAdGiLDU4VqHmrn5MjDLwk1Goc6szRbGcWEAmw7R876YKctQGQgniYYMMqa7ZEYSEL4XAMYShnMt8xxqis2Zrew5URfY7"
  );
  let paymentInfosParam = [];
  const receverInfo = await receverAccount.getDeserializeInformation();
  paymentInfosParam[0] = {
    PaymentAddress: receverInfo.PaymentAddress,
    Amount: amountTransfer,
    Message: info,
  };
  // create and send PRV
  try {
    let res = await account.createAndSendNativeToken({
      transfer: { prvPayments: paymentInfosParam, fee, info },
      extra: { isEncryptMessage: true, txType: 0, version },
    });
    console.log("Send tx succesfully with TxID: ", res);
    return res;
  } catch (e) {
    console.log("Error when send PRV: ", e);
  }
}
async function TestSendMultiple() {
  await setup();

  let info = "";

  const receivers = [
    "12shR6fDe7ZcprYn6rjLwiLcL7oJRiek66ozzYu3B3rBxYXkqJeZYj6ZWeYy4qR4UHgaztdGYQ9TgHEueRXN7VExNRGB5t4auo3jTgXVBiLJmnTL5LzqmTXezhwmQvyrRjCbED5xVWf4ETHbRCSP",
    "12sm28usKxzw8HuwGiEojZZLWgvDinAkmZ3NvBNRQLuPrf5LXNLXVXiu4VBCMVDrDm97qjLrgFck3P36UTSWfqNX1PBP9PBD78Cpa95em8vcnjQrnwDNi8EdkdkSA6CWcs4oFatQYze7ETHAUBKH",
  ];
  const amount = 1 * 1e9;
  const paymentInfos = receivers.map((item) => ({
    PaymentAddress: item,
    Amount: amount,
  }));
  try {
    const res = await accountSender.createAndSendNativeToken({
      transfer: { prvPayments: paymentInfos, fee: 100, info },
    });
    console.log("Send tx succesfully with TxID: ", res.Response.txId);
    return res.Response.txId;
  } catch (e) {
    console.log("error:", e);
  }
}
async function TestCreateAndSendConversion() {
  await setup();
  let fee = 100;
  let info = "";
  console.log("Will convert all PRV");

  let paymentInfosParam = [];

  // create and send PRV
  try {
    let res = await accountSender.createAndSendConvertTx({
      transfer: { prvPayments: paymentInfosParam, fee, info },
      extra: { isEncryptMessage: true },
    });
    console.log("Send tx succesfully with TxID: ", res.Response.txId);
    return res.Response.txId;
  } catch (e) {
    console.log("Error when send PRV: ", e);
  }
}
async function TestCreateAndSendTokenConversion() {
  await setup();
  let fee = 100;
  let info = "";
  // use the global var tokenID instead
  // let tokenID = "89eddbfac0e6c4827f378c4c453c9011c2b78e50cc54479d70914c505946d526";
  console.log("Will convert all coins of token", tokenID);

  // PRV for fee, token for convert. So no payment info needed
  let paymentInfo = [];
  let tokenPaymentInfo = [];

  // create and send PRV
  try {
    let res = await accountSender.createAndSendTokenConvertTx({
      transfer: {
        tokenID,
        prvPayments: paymentInfo,
        tokenPayments: tokenPaymentInfo,
        fee,
        info,
      },
      extra: { isEncryptMessageToken: true },
    });
    console.log("Send tx succesfully with TxID: ", res.Response.txId);
    return res.Response.txId;
  } catch (e) {
    console.log("Error when send PRV: ", e);
  }
}

async function TestCreateAndSendPrivacyTokenInit() {
  await setup();
  // payment info for PRV
  let paymentInfos = [];
  // prepare token param for tx privacy token init
  let amountInit = 10000;
  let tokenParams = {
    TokenID: "",
    TokenName: "Rose1",
    TokenSymbol: "RSE",
    TokenTxType: CustomTokenInit,
    Amount: amountInit,
  };
  let tokenPaymentInfo = [
    {
      PaymentAddress: senderPaymentAddressStr,
      Amount: amountInit,
      Message: "Your token",
    },
  ];

  let feePRV = 50;

  try {
    let res = await accountSender.newToken({
      transfer: { tokenPayments: tokenPaymentInfo, fee: feePRV },
      extra: {
        tokenName: tokenParams.TokenName,
        tokenSymbol: tokenParams.TokenSymbol,
      },
    });
    console.log("Send tx succesfully with TxID: ", res.Response.txId);
    console.log("Waiting for new token balance to update");
    const change = await accountSender.waitBalanceChange(res.TokenID);
    console.log(change);
    return {
      tokenID: res.TokenID,
      Response: res.Response,
    };
  } catch (e) {
    console.log("Error when initing ptoken: ", e);
  }
}

async function TestCreateAndSendPrivacyTokenTransfer() {
  await setup();
  let paymentInfos = [];
  // prepare token param for tx custom token init
  let tokenPaymentInfo = [
    {
      PaymentAddress:
        "12srF3RdAc5f93XbxY1YPLgVhKEYqKnQFhYDkpWxSLtcX9eeQxv8mW2MddEYaTVDprkeMChRmqGU8cuevozm4XY5HuaaEdjkEFvGChHSJjTQJL8syraSGAtKi8QVXipT7p5JhnCvJYPhbF6jQknz",
      Amount: 100,
      Message: "Transfer 100 nano ptoken",
    },
  ];
  let feePRV = 100;
  let hasPrivacy = true;
  await accountSender.resetProgressTx();
  try {
    let res = await accountSender.createAndSendPrivacyToken({
      transfer: {
        tokenID:
          "d6efe5956aa521f5eeaf2f69cc6fbf9f21bfb3dcb7d0de90fa40913e6e630983",
        tokenPayments: tokenPaymentInfo,
        fee: feePRV,
        info: "SOME INFO WHEN TRANSFERRING TOKEN",
      },
      extra: { txType: 0, version: privacyVersion },
    });
    console.log("Send tx succesfully with TxID: ", res);
    return res.txId;
  } catch (e) {
    console.log("Error when transferring ptoken: ", e);
  }
}

async function TestMultipleSendPrivacyToken() {
  await setup();

  let paymentInfos = [];
  let amountTransfer = 100;

  // prepare token param for tx custom token init
  let tokenPaymentInfo = [
    {
      PaymentAddress: receiverPaymentAddrStr,
      Amount: amountTransfer,
      Message: "Transfer ptoken",
    },
    {
      PaymentAddress: receiverPaymentAddrStr2,
      Amount: amountTransfer,
      Message: "Transfer ptoken 2",
    },
  ];

  let feePRV = 10;

  try {
    let res = await accountSender.createAndSendPrivacyToken({
      transfer: {
        tokenID,
        prvPayments: paymentInfos,
        tokenPayments: tokenPaymentInfo,
        fee: feePRV,
      },
    });
    console.log("Send tx succesfully with TxID: ", res.Response.txId);
    return res.Response.txId;
  } catch (e) {
    console.log("Error when transferring ptoken: ", e);
  }
}
async function TestCreateAndSendStakingTx() {
  let fee = 100;
  try {
    let response = await accountSender.createAndSendStakingTx({
      transfer: { fee },
      extra: { version: privacyVersion },
    });
    console.log(response);
    return response.txId;
  } catch (e) {
    console.log("Error when staking: ", e);
  }
}
async function TestCreateAndSendStopAutoStakingTx() {
  // create and send staking tx
  try {
    let response = await accountSender.createAndSendStopAutoStakingTx({
      transfer: { fee: 100 },
      extra: { version: privacyVersion },
    });
    console.log("res", response);
    return response.txId;
  } catch (e) {
    console.log("Error when staking: ", e);
  }
}
async function TestDefragment() {
  await setup();
  // create and send defragment tx
  let response;
  try {
    response = await accountSender.defragmentNativeCoin({
      transfer: { fee: 100 },
    });
  } catch (e) {
    console.log(e);
  }

  console.log("Response defragment: ", response);
}
async function TestMakeFragments() {
  await setup();
  const senders = [
    "112t8rnZDRztVgPjbYQiXS7mJgaTzn66NvHD7Vus2SrhSAY611AzADsPFzKjKQCKWTgbkgYrCPo9atvSMoCf9KT23Sc7Js9RKhzbNJkxpJU6",
  ];

  let utxos = 0;
  // the address of our testing Account; it will receive a lot of 'fragments'
  const receiver =
    "12sxXUjkMJZHz6diDB6yYnSjyYcDYiT5QygUYFsUbGUqK8PH8uhxf4LePiAE8UYoDcNkHAdJJtT1J6T8hcvpZoWLHAp8g6h1BQEfp4h5LQgEPuhMpnVMquvr1xXZZueLhTNCXc8fkVXseeVAGCt8";

  const amountTransfer = 200;
  let paymentInfos = new Array(30);
  paymentInfos.fill({
    PaymentAddress: receiver,
    Amount: amountTransfer,
  });

  while (utxos < 150) {
    for (const sender of senders) {
      let accountSender = new AccountWallet(Wallet);
      await accountSender.setKey(sender);

      // create and send PRV
      let res = await accountSender.createAndSendNativeToken({
        transfer: { prvPayments: paymentInfos, fee: 100, info: "Fragment" },
      });
      console.log("Send tx succesfully with TxID: ", res.Response.txId);
      await accountSender.waitTx(res.Response.txId, 3);
    }

    utxos += paymentInfos.length * senders.length;
    console.log("NEW UTXOs", utxos);
  }
}
/************************* DEX **************************/

async function TestAddLiquidity() {
  try {
    const account = await createAccountByPrivateKey(
      "112t8rnXUbFHzsnX7zdQouzxXEWArruE4rYzeswrEtvL3iBkcgXAXsQk4kQk23XfLNU6wMknyKk8UAu8fLBfkcUVMgxTNsfrYZURAnPqhffA"
    );
    const tokenID1 =
      "0000000000000000000000000000000000000000000000000000000000000004";
    const tokenID2 =
      "ffd8d42dc40a8d166ea4848baf8b5f6e9fe0e9c30d60062eb7d44a8df9e00854";
    const symbol1 = "PRV";
    const symbol2 = "ETH";
    const contributedAmount = 100;
    let response = await account.createAndSendTxsWithContributions({
      tokenID1,
      tokenID2,
      symbol1,
      symbol2,
      fee: 100,
      contributedAmount1: contributedAmount,
      contributedAmount2: contributedAmount,
      version: privacyVersion,
    });
    console.log("response add liquidity", response);
  } catch (e) {
    console.log("Error when staking: ", e);
  }
}

async function TestWithdrawLiquidity() {
  try {
    const account = await createAccountByPrivateKey(
      "112t8rniqSuDK8vdvHXGzkDzthVG6tsNtvZpvJEvZc5fUg1ts3GDPLWMZWFNbVEpNHeGx8vPLLoyaJRCUikMDqPFY1VzyRbLmLyWi4YDrS7h"
    );
    const tokenID1 =
      "0000000000000000000000000000000000000000000000000000000000000004";
    const tokenID2 =
      "ef80ac984c6367c9c45f8e3b89011d00e76a6f17bd782e939f649fcf95a05b74";
    const withdrawalShareAmt = 100;
    let response = await account.createAndSendWithdrawContributionTx({
      transfer: {
        fee: 100,
      },
      extra: {
        withdrawalToken1IDStr: tokenID1,
        withdrawalToken2IDStr: tokenID2,
        withdrawalShareAmt,
        version: privacyVersion,
      },
    });
    console.log("response withdraw liquidity", response);
  } catch (e) {
    console.log("Error when staking: ", e);
  }
}

async function TestWithdrawFeeLiquidity() {
  try {
    const account = await createAccountByPrivateKey(
      "112t8rniqSuDK8vdvHXGzkDzthVG6tsNtvZpvJEvZc5fUg1ts3GDPLWMZWFNbVEpNHeGx8vPLLoyaJRCUikMDqPFY1VzyRbLmLyWi4YDrS7h"
    );
    const tokenID1 =
      "0000000000000000000000000000000000000000000000000000000000000004";
    const tokenID2 =
      "ef80ac984c6367c9c45f8e3b89011d00e76a6f17bd782e939f649fcf95a05b74";
    const withdrawalFeeAmt = 100;
    let response = await account.createAndSendWithdrawContributionFeeTx({
      transfer: {
        fee: 100,
      },
      extra: {
        withdrawalToken1IDStr: tokenID1,
        withdrawalToken2IDStr: tokenID2,
        withdrawalFeeAmt,
        version: privacyVersion,
      },
    });
    console.log("response withdraw fee liquidity", response);
  } catch (e) {
    console.log("Error when staking: ", e);
  }
}

async function TestCustomTradeRequest() {
  let fee = 100;
  let tradingFee = 1000;
  let sellAmount = 1e9;
  let minAcceptableAmount = 100;
  // let tokenIDToSellStr = tokenID;
  // let tokenIDToBuyStr = null;
  // create and send staking tx
  const tokenIDToBuy =
    "b49af494a0703d9bd7366dfc29ec2c270efd4c3fb210a91081b419a4e356e22e";
  const tokenIDToSell =
    "0000000000000000000000000000000000000000000000000000000000000004";
  try {
    const account = await createAccountByPrivateKey(
      "112t8rniqSuDK8vdvHXGzkDzthVG6tsNtvZpvJEvZc5fUg1ts3GDPLWMZWFNbVEpNHeGx8vPLLoyaJRCUikMDqPFY1VzyRbLmLyWi4YDrS7h"
    );
    console.log(
      "ACCOUNT BALANCE",
      await account.getBalance({
        tokenID: tokenIDToBuy,
        version: privacyVersion,
      })
    );
    let res = await account.createAndSendTradeRequestTx({
      transfer: { fee },
      extra: {
        tokenIDToBuy,
        sellAmount,
        minAcceptableAmount,
        tradingFee,
        tokenIDToSell,
        version: privacyVersion,
      },
    });
    console.log("RESPONSE: ", res);
    return res;
  } catch (e) {
    console.log("Error when trading native token: ", e);
  }
}

async function TestCreateAndSendPDEWithdrawTx() {
  await setup();
  let fee = 10;
  let withdrawShareAmount = 500;
  let tokenID1 = null;
  let tokenID2 = tokenID;

  try {
    let res = await accountSender.createAndSendWithdrawDexTx({
      transfer: { fee },
      extra: {
        tokenIDs: [tokenID1, tokenID2],
        withdrawalShareAmt: withdrawShareAmount,
      },
    });
    return res.Response.txId;
  } catch (e) {
    console.log("Error when withdrawing pdex: ", e);
  }
}
async function TestGetOutputCoins() {
  await setup();
  // get all PRV coins from both versions (including spent coins)
  let allCoins = await accountSender.fetchOutputCoins(null, -1);
  console.log("allCoins: ", allCoins);
}

async function GetListReceivedTx() {
  await setup();
  try {
    let receivedTxs = await accountSender.getReceivedTransaction();
    console.log(receivedTxs);
  } catch (e) {}
}

async function GetUnspentCoinV1() {
  await setup();
  try {
    accountSender.useCoinsService = true;
    await accountSender.getAllUnspentCoinsV1();
  } catch (e) {}
}

async function TestCreateAndSendConvertTx() {
  let fee = 100;
  let info = "";
  console.log("Will convert all PRV");
  let paymentInfosParam = [];

  // create and send PRV
  try {
    let res = await accountSender.createAndSendConvertTx({
      transfer: { prvPayments: paymentInfosParam, fee, info },
      extra: { isEncryptMessage: true },
    });
    // console.log("Send tx succesfully with TxID: ", res.Response.txId);
    // return res.Response.txId;
  } catch (e) {
    console.log("Error when send PRV: ", e);
  }
}
async function TestConvertTokensV1() {
  await setup();
  try {
    // let balance = await accountSender.getBalance();
    // console.log("balance: ", balance.toString());
    accountSender.useCoinsService = true;
    // await accountSender.convertTokensV1();
    await accountSender.clearCacheBalanceV1();
  } catch (e) {}
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createAccountByPrivateKey(privateKey) {
  try {
    let account = new AccountWallet(Wallet);
    const fullNode = rpcClient;
    const coinService = rpcCoinService;
    account.setRPCCoinServices(coinService);
    account.setRPCClient(fullNode);
    account.setRPCTxServices(rpcTxService);
    account.setRPCRequestServices(rpcRequestService);
    const data = {
      DeviceID: deviceID,
    };
    const authTokenDt = await Axios.post(
      `${rpcApiService}/auth/new-token`,
      data
    );
    const authToken = authTokenDt.data.Result.Token;
    account.setAuthToken(authToken);
    account.setRPCApiServices(rpcApiService, authToken);
    await account.setKey(privateKey);
    return account;
  } catch (error) {
    console.log("ERROR CREATE ACCOUNT", privateKey, error);
  }
}

async function TestGetTxsByReceiver() {
  const account = await createAccountByPrivateKey(
    "112t8rniqSuDK8vdvHXGzkDzthVG6tsNtvZpvJEvZc5fUg1ts3GDPLWMZWFNbVEpNHeGx8vPLLoyaJRCUikMDqPFY1VzyRbLmLyWi4YDrS7h"
  );
  const txs = await account.getTxsByReceiver({});
  console.log("txs", txs.length);
}

async function TestGetTxsHistory() {
  let account = await createAccountByPrivateKey(
    // "112t8rnY4wGSgmY58SCFE8wcpe7batDrUMy1HCTda4ymyMgDWYJotNJzXN4EpgEv8G1u2Was92HeLvuu9DAxnwsfcjnZQooHHDDXwXdQ1htn"
    // "112t8rnY64dNQLtVTowvvAAM4QQcKNFWm81a5nwg2n8XqmaLby2C1kQSKK3TT6rcJbgnfNzPBtVEdQmjfMqXGQTmrXXN97LJhdRRxHXBwbmY"
    // "112t8rniqSuDK8vdvHXGzkDzthVG6tsNtvZpvJEvZc5fUg1ts3GDPLWMZWFNbVEpNHeGx8vPLLoyaJRCUikMDqPFY1VzyRbLmLyWi4YDrS7h"
    // "112t8rnXcSzusvgvAdGiLDU4VqHmrn5MjDLwk1Goc6szRbGcWEAmw7R876YKctQGQgniYYMMqa7ZEYSEL4XAMYShnMt8xxqis2Zrew5URfY7"
    // "11111119wSSAFZrfkkqUeqnEd7x3X4SG3g6Gwpq26AAAuNA2xo9p6RztR3ZoF5bcGefDyXVy4uvvfsrF7pbqvArRWdnZuZWxLDv6sEJiEYi"
    // "112t8rnXcSzusvgvAdGiLDU4VqHmrn5MjDLwk1Goc6szRbGcWEAmw7R876YKctQGQgniYYMMqa7ZEYSEL4XAMYShnMt8xxqis2Zrew5URfY7"
    // "112t8rnXMEmCBiwPrKTcryP4ZbjUsdcsTVvZ52HUuCY34C6mCN2MrzymtkfnM5dVDZxTrB3x4b7UhbtUeM38EdSJfnkfEYUqkFsKafDdsqvL"
    // "112t8rnXMEmCBiwPrKTcryP4ZbjUsdcsTVvZ52HUuCY34C6mCN2MrzymtkfnM5dVDZxTrB3x4b7UhbtUeM38EdSJfnkfEYUqkFsKafDdsqvL"
    // "112t8rnX96d4eXEvmDwMv4qCCE6zjSsvaMttkUK7ygn9BdNtkFdjKY4PyLt2pvp64b5sPtU5wPFf3FvFhtt7GhdVvDRnte82zqqeYfPvqEdL"
    // "112t8rnYifHV4UB793i68xgEStbat23eZCkzVng6YkqYXN5ZqGSFgnHvC65ezDvTGtxrFa2kCJsdDxBPVDmbktkzDYaKyygGPkJQ9jPpo3XD"
    // "112t8rnX96d4eXEvmDwMv4qCCE6zjSsvaMttkUK7ygn9BdNtkFdjKY4PyLt2pvp64b5sPtU5wPFf3FvFhtt7GhdVvDRnte82zqqeYfPvqEdL"
    // "112t8rnY86q7sNHHZo9XEJMWgVds7kM913hc6pxqVrqzSA7LdMVZX6vgttLzGqNeHAjPofB5wHfNeKBGs6NZF7ZPfE5cge8ZCaWc76Jy56Ch"
    // "112t8rnXeqsyrBC9CN4QLxpQ9Z6AVBFUhg72NbvpHYGSBogWn4mRvyZ2LeKBmRSxQCcVfiVuM6jw7PgeCFqB99Bsmqhp9T6b1MxroKENS9UG"
    // "112t8rnYKb5czEQ2yRC9zniPHYCiktMP5MiHJL5gtKKrFghqexZF7k2iXjn2GMpVUsPjXn4MpP1GELBYgbCYYSt7eL8YX2FUoo8uHQW7dFKq"
    // "112t8rnXgy4Jwj2w8tWqncvzsSjpuAi2quWZZJHCD9EFMZLHAdbF6DPbKLitBdjE7TcgTLSpumHEUb2h3xJhqfR59ihVU71bNTazFzWM6MFP"
    // "112t8rnYKb5czEQ2yRC9zniPHYCiktMP5MiHJL5gtKKrFghqexZF7k2iXjn2GMpVUsPjXn4MpP1GELBYgbCYYSt7eL8YX2FUoo8uHQW7dFKq"
    // "112t8rne4kpmGQe6KCjTe4JqqsvjTPxHQsw9FWaxY65XqHxUueJuLGxJvoH872vxGmbkz1gkcYgtQ1VnrCjw2wSDgtJzCVyt8nRGFHjcEfpV"
    "112t8rnaoYv9FppLCA7u84ay2K6ybXcCwykzCLoLT1bD9jXiSpbh8DpTKuaJD8t9Myvk2yR1hHxAu7Ac9gmox1NpKqX5ooTefprXjE1s1nd3"
  );
  const version = 2;
  const tokenID =
    "a61df4d870c17a7dc62d7e4c16c6f4f847994403842aaaf21c994d1a0024b032"; //BUSD
  // "b832e5d3b1f01a4f0623f7fe91d6673461e1f5d37d91fe78c5c2e6183ff39696";
  // "ffd8d42dc40a8d166ea4848baf8b5f6e9fe0e9c30d60062eb7d44a8df9e00854";
  // "1e0b165a96d040f6e1b57a1d7efeb5001cd4803cc9ee43fca812ce085db26c7c";
  // "880ea0787f6c1555e59e3958a595086b7802fc7a38276bcd80d4525606557fbc"; // zil
  // "ef80ac984c6367c9c45f8e3b89011d00e76a6f17bd782e939f649fcf95a05b74"; //usdt
  // "ffd8d42dc40a8d166ea4848baf8b5f6e9fe0e9c30d60062eb7d44a8df9e00854"; //eth
  const params = {
    tokenID,
    version,
  };
  // const balance = await account.getBalance(params);
  // console.log("balance", balance);
  // console.log(
  //   "SIZE OUTPUTS COINS",
  //   (await account.getListOutputCoinsStorage(params))[0]
  // );
  // console.log("TestGetTxsHistory-balance", balance);
  const txs = await account.getTxsHistory({
    isPToken: true,
    ...params,
  });
  console.log(txs);
  // const tx = txs.txsTransactor.find(
  //   (t) =>
  //     t.txId ===
  //     "5a682b797ee0fff093a9a7c14d705d82bc2210a0a4e4cf6e5aad4155401bc1cf"
  // );
  // console.log("tx", tx);
  // const txt = await account.getTxHistoryByTxID({ ...params, txId: tx.txId });
  // console.log("txt", txt);
  // console.log(
  //   `\n\n`,
  //   await account.getCoinsStorage({ tokenID, version: privacyVersion })
  // );
  // console.log("TestGetTxsHistory-txs", txs);
  // const history = txs.txsPToken.find((txp) => txp.id === 8);
  // const tx = await account.handleGetPTokenHistoryById({ history });
  // console.log("tx", tx);
  // const retryTx = await account.handleRetryExpiredShield({ history });
  // console.log("retryTx", retryTx);
}

async function TestGetPTokenHistory() {
  try {
    const tokenID =
      "880ea0787f6c1555e59e3958a595086b7802fc7a38276bcd80d4525606557fbc"; //zil
    const account = await createAccountByPrivateKey(
      "112t8rnY64dNQLtVTowvvAAM4QQcKNFWm81a5nwg2n8XqmaLby2C1kQSKK3TT6rcJbgnfNzPBtVEdQmjfMqXGQTmrXXN97LJhdRRxHXBwbmY"
    );
    console.log("account", JSON.stringify(account));
    const history = await account.getPTokenHistory({ tokenID });
    console.log("history", history);
  } catch (error) {
    console.log("error", error);
  }
}

async function TestInitToken() {
  const info = await accountSender.getDeserializeInformation();
  const result = await accountSender.createAndSendInitTokenTx({
    transfer: {
      fee: 100,
      info: "Init token doge coin",
      tokenPayments: [
        { Amount: "1000000000", PaymentAddress: info.PaymentAddress },
      ],
    },
    extra: {
      tokenName: "DOGE COIN",
      tokenSymbol: "DOGE",
      version: privacyVersion,
    },
  });
  console.log(result);
}

async function TestGetContributeHistories() {
  try {
    await accountSender.getContributeHistoriesWithStorage({
      offset: 0,
      limit: 100,
    });
  } catch (error) {
    console.log(error);
  }
}

async function TestGetWithdrawLiquidityHistories() {
  try {
    await accountSender.getLiquidityWithdrawHistoriesWithStorage({
      offset: 0,
      limit: 100,
    });
  } catch (error) {
    console.log(error);
  }
}

async function TestGetWithdrawFeeLiquidityHistories() {
  try {
    await accountSender.getLiquidityWithdrawFeeHistoriesWithStorage({
      offset: 0,
      limit: 100,
    });
  } catch (error) {
    console.log(error);
  }
}

async function TestGetUnspentCoinsByTokenIdV1() {
  const tokenID = PRVID;
  const account = await createAccountByPrivateKey(
    "113hagqt552h92LXY6dWPdBGS8pPdLQX5eFBLgsnzbEoU1nUTLGJkkyrTnWCz7XuURtSKzkUKFfKrMPmoNVPAbmryRbMxvNTst9cY5xqiPNN"
  );
  await account.getUnspentCoinsByTokenIdV1({ tokenID, version: 1 });
}

async function TestConvertCoinsV1() {
  const account = await createAccountByPrivateKey(
    "112t8rneQvmymBMxTEs1LzpfN7n122hmwjoZ2NZWtruHUE82bRN14xHSvdWc1Wu3wAoczMMowRC2iifXbZRgiu9GuJLYvRJr7VLuoBfhfF8h"
  );
  await account.convertCoinsV1();
}

async function TestConsolidate() {
  try {
    const account = await createAccountByPrivateKey(
      // "112t8rnZDRztVgPjbYQiXS7mJgaTzn66NvHD7Vus2SrhSAY611AzADsPFzKjKQCKWTgbkgYrCPo9atvSMoCf9KT23Sc7Js9RKhzbNJkxpJU6"
      // "112t8rne7fpTVvSgZcSgyFV23FYEv3sbRRJZzPscRcTo8DsdZwstgn6UyHbnKHmyLJrSkvF13fzkZ4e8YD5A2wg8jzUZx6Yscdr4NuUUQDAt"
      // "112t8rnXoBXrThDTACHx2rbEq7nBgrzcZhVZV4fvNEcGJetQ13spZRMuW5ncvsKA1KvtkauZuK2jV8pxEZLpiuHtKX3FkKv2uC5ZeRC8L6we"
      // "112t8rneQvmymBMxTEs1LzpfN7n122hmwjoZ2NZWtruHUE82bRN14xHSvdWc1Wu3wAoczMMowRC2iifXbZRgiu9GuJLYvRJr7VLuoBfhfF8h"
      "112t8rnXgy4Jwj2w8tWqncvzsSjpuAi2quWZZJHCD9EFMZLHAdbF6DPbKLitBdjE7TcgTLSpumHEUb2h3xJhqfR59ihVU71bNY6Ev3kyL9jQ"
    );
    const result = await account.consolidate({
      transfer: {
        tokenID: PRVID,
      },
      extra: {
        version: privacyVersion,
      },
    });
    console.log("RESULT", result);
  } catch (error) {
    console.log(error);
  }
}

async function TestGetBurnerAddress() {
  try {
    const account = await createAccountByPrivateKey(
      // "112t8rnZDRztVgPjbYQiXS7mJgaTzn66NvHD7Vus2SrhSAY611AzADsPFzKjKQCKWTgbkgYrCPo9atvSMoCf9KT23Sc7Js9RKhzbNJkxpJU6"
      // "112t8rne7fpTVvSgZcSgyFV23FYEv3sbRRJZzPscRcTo8DsdZwstgn6UyHbnKHmyLJrSkvF13fzkZ4e8YD5A2wg8jzUZx6Yscdr4NuUUQDAt"
      // "112t8rnXoBXrThDTACHx2rbEq7nBgrzcZhVZV4fvNEcGJetQ13spZRMuW5ncvsKA1KvtkauZuK2jV8pxEZLpiuHtKX3FkKv2uC5ZeRC8L6we"
      "112t8rneQvmymBMxTEs1LzpfN7n122hmwjoZ2NZWtruHUE82bRN14xHSvdWc1Wu3wAoczMMowRC2iifXbZRgiu9GuJLYvRJr7VLuoBfhfF8h"
    );
    const result = await account.getBurnerAddress();
    console.log("RESULT", result);
  } catch (error) {
    console.log(error);
  }
}
async function TestImportAccount() {
  try {
    await init();
    let wallet = new Wallet();
    const passphrase = "123";
    await wallet.init(passphrase, new StorageServices(), "Wallet", "Anon");
    const privateKey =
      "112t8rnXA7XuP9TEtBnyZEW1CsYyMxAExyKBs8PcsW5jnBVQumPsJEQNRFDcAYtUfTSLU8ZELacWVYakQPBPAAwFRsnHbgwWE9rfJ6nkDZBt";
    console.log("IMPORT HIEN ACCOUNT");
    await wallet.importAccount(privateKey, "Hien", passphrase);
    console.log("IMPORT HIEN ACCOUNT");
    await wallet.importAccount(
      "112t8rneQvmymBMxTEs1LzpfN7n122hmwjoZ2NZWtruHUE82bRN14xHSvdWc1Wu3wAoczMMowRC2iifXbZRgiu9GuJLYvRJr7VLuoBfhfF8h",
      "Hien",
      passphrase
    );
  } catch (error) {
    console.log(`TestImportAccount$`, error);
  }
}

async function TestLoadWallet() {
  try {
    let wallet = new Wallet();
    wallet.Name = "Hang";
    const password = "$as90_jasLsS";
    const aesKey = "40b2732280dc3eab197dc83d1b2f43ca";
    const passphrase = "$as90_jasLsS";
    // const aesKey = "40b2732280dc3eab197dc83d1b2f43ca";
    // const mnemonic = newMnemonic();
    // console.log("mnemonic", mnemonic);
    await wallet.import(
      // "romance suspect ostrich amount deer crane false concert present evidence atom short",
      // mnemonic,
      "sunny easy talent undo alter giant music slam common glide judge misery",
      aesKey,
      "Masterkey",
      new StorageServices()
    );
    await wallet.save(aesKey, false);
    await wallet.createNewAccount("phat1");
    await wallet.save(aesKey, false);
    await wallet.createNewAccount("phat2");
    await wallet.save(aesKey, false);
    await wallet.loadWallet({
      password: passphrase,
      aesKey,
    });
    console.log(
      "\n\nlistAccount",
      (await wallet.listAccount()).map((account) => account.PrivateKey)
    );
    // await wallet.loadWallet({
    //   password: passphrase,
    //   aesKey,
    // });
    // console.log("listAccount", await wallet.listAccount());
    return;
    // const prvKey =
    //   "112t8rneQvmymBMxTEs1LzpfN7n122hmwjoZ2NZWtruHUE82bRN14xHSvdWc1Wu3wAoczMMowRC2iifXbZRgiu9GuJLYvRJr7VLuoBfhfF8h";
    // await wallet.loadWallet({
    //   password: passphrase,
    //   aesKey,
    // });
    // let a = await wallet.importAccount(prvKey, "phat2");
    // a.setRPCCoinServices(rpcCoinService);
    // a.setRPCClient(rpcClient);
    // a.setRPCTxServices(rpcTxService);
    // await a.addListFollowingToken({
    //   tokenIDs: ["123", "12345678", "1234567"],
    // });
    // await wallet.save(aesKey, false);
    // await wallet.loadWallet({
    //   password: passphrase,
    //   aesKey,
    // });
    // console.log("LIST_ACCOUNT", wallet.MasterAccount.child.length);
    // const listAccount = await wallet.listAccount();
    // listAccount.map((account) => console.log("account", account));
    // let listFollowingTokens = await a.getListFollowingTokens();
    // console.log("listFollowingTokens after add", listFollowingTokens);
    // console.log(await wallet.getMeasureStorageValue());
    return;
    const account = await wallet.createNewAccount("PHAT");
    // const prvKey =
    //   "112t8rneQvmymBMxTEs1LzpfN7n122hmwjoZ2NZWtruHUE82bRN14xHSvdWc1Wu3wAoczMMowRC2iifXbZRgiu9GuJLYvRJr7VLuoBfhfF8h";
    const account2 = await wallet.importAccount(prvKey, "phat2");
    console.log("LIST_ACCOUNT", wallet.MasterAccount.child.length);
    await wallet.removeAccount(prvKey);
    console.log("LIST_ACCOUNT", wallet.MasterAccount.child.length);
    await wallet.save(aesKey, false);
    await wallet.loadWallet({
      password: passphrase,
      aesKey,
    });
    // const account = await createAccountByPrivateKey(
    //   "112t8rneQvmymBMxTEs1LzpfN7n122hmwjoZ2NZWtruHUE82bRN14xHSvdWc1Wu3wAoczMMowRC2iifXbZRgiu9GuJLYvRJr7VLuoBfhfF8h"
    // );
    // console.log("account", account.name);
    // await account.addListFollowingToken({
    //   tokenIDs: ["123", "12345678", "1234567"],
    // });
    // let listFollowingTokens = await account.getListFollowingTokens();
    // console.log("listFollowingTokens after add", listFollowingTokens);
    // await account.removeFollowingToken({ tokenID: PRVID });
    // await account.removeFollowingToken({ tokenID: "1234567" });
    // listFollowingTokens = await account.getListFollowingTokens();
    // console.log("listFollowingTokens after remove PRV", listFollowingTokens);
  } catch (error) {
    console.log("TestLoadWallet ERROR", error);
  }
}

async function TestVerifierTx() {
  try {
    const insVerifiterTx = new VerifierTx();
    insVerifiterTx.setRPCClient(rpcClient);
    const txId =
      "e77043447f1993ecc92ff2be219b87ccc90e84454dc70fe914d949485450fea2";
    const senderSeal =
      "d99071adad109362780b6d4b025dceeb7e84d065112b3302c57dbce1d3706a0200000001";
    const paymentAddress =
      "12snj4DSGwAHfeTh5mxpfqgjRRogVtuej3A9rVBHvXWxwM8Zb4GFgEuhbxrxJBHvnzB4KPsnsVP7s3cQAr77usYFdGeMEJ17bTCCrnMLzGZAX8uLK2ejK1naJinAtetqGJkHujFN1HuFJGUzeoEr";
    const otaKey =
      "14yCTpkbAxREZ7GPVBe7hF3U71F9vjVBrEf8fjTbx7efRWfsYQd7bEzHuAjqu1JBUgyCfpYWdDzdi2iocw3sK7Ekvfua4wNuQJW3npC";
    const reVerifierSentTx = await insVerifiterTx.verifySentTx({
      txId,
      senderSeal,
      paymentAddress,
    });
    console.log("reVerifierSentTx", reVerifierSentTx);
    const reVerifierReceiverTx = await insVerifiterTx.verifyReceivedTx({
      txId,
      otaKey,
    });
    console.log("reVerifierReceiverTx", reVerifierReceiverTx);
  } catch (error) {
    console.log(error);
  }
}

async function TestFollowDefaultPool(pDexV3Instance) {
  const listPools = await pDexV3Instance.getListPools();
  const poolsIDs = listPools.map((pool) => pool.poolId);
  console.log("\npoolsIDs", poolsIDs);
  const listPoolsDetail = await pDexV3Instance.getListPoolsDetail(poolsIDs);
  console.log("listPoolsDetail", listPoolsDetail);
  await pDexV3Instance.followingDefaultPools({ poolsIDs });
  const isFollowedDefaultPools = await pDexV3Instance.isFollowedDefaultPools();
  let getListFollowingPools = await pDexV3Instance.getListFollowingPools();
  console.log(
    "isFollowedDefaultPools",
    isFollowedDefaultPools,
    "getListFollowingPools",
    getListFollowingPools
  );
  await pDexV3Instance.removeFollowingPool({ poolId: "111" });
  getListFollowingPools = await pDexV3Instance.getListFollowingPools();
  console.log("getListFollowingPools", getListFollowingPools);
}

async function TestNFToken(pDexV3Instance) {
  try {
    const tx = await pDexV3Instance.createAndMintNftTx({
      extra: { version: privacyVersion },
    });
    console.log("tx", tx);
    const nftTokenData = await pDexV3Instance.getNFTTokenData({
      version: privacyVersion,
    });
    console.log("nftTokenData", nftTokenData);
  } catch (error) {
    console.log("error-TestNFToken", error);
  }
}

const ETHID =
  "ffd8d42dc40a8d166ea4848baf8b5f6e9fe0e9c30d60062eb7d44a8df9e00854";

async function TestSwap(pDexV3Instance) {
  try {
    let payload = {
      selltoken:
        "0000000000000000000000000000000000000000000000000000000000000004",
      buytoken:
        "fdd928bc86c82bd2a7c54082a68332ebb5f2cde842b1c2e0fa430ededb6e369e",
      sellamount: "1000000000",
      ismax: false,
    };
    try {
      let data = await pDexV3Instance.getEstimateTrade(payload);
      console.log("data1", data);
    } catch (error) {
      console.log("error", error, typeof error);
    }

    // const history = await pDexV3Instance.getSwapHistory({ version: 2 });
    // history.map((h) => console.log(h.requestime));
    // return;
    // const pairs = await pDexV3Instance.getListPair();
    // let tasks = pairs.map(
    //   async ({ tokenId1: selltoken, tokenId2: buytoken }) => {
    //     if (selltoken === PRVID) {
    // const payload = {
    //   selltoken,
    //   buytoken,
    //   feetoken: PRVID,
    //   amount: 1e9,
    //   slippagetolerance: 0.01,
    // };
    // const data = await pDexV3Instance.getEstimateTrade(payload);
    //       if (data.maxGet > 0) {
    //         console.log("\nbuytoken", buytoken);
    //       }
    //     }
    //   }
    // );
    // const tokenIDToSell = ETHID;
    // const sellAmount = 1e9;
    // const tokenIDToBuy = PRVID;
    // const tradingFee = 1e3;
    // const feeToken = PRVID;
    // const tradePath = ["1-2", "3-4"];
    // const isTradingFeeInPRV = feeToken === PRVID;
    // const txSwap = await pDexV3Instance.createAndSendSwapRequestTx({
    //   transfer: { fee: 100, info: "Swap" },
    //   extra: {
    //     tokenIDToSell: PRVID,
    //     sellAmount: 0.001 * 1e9,
    //     tokenIDToBuy:
    //       "c730c34221c277158aa4b44f7eb542a50e5eb858a8fd89b68d3c83388e866162",
    //     tradingFee: 0.000003e9,
    //     tradePath: [
    //       "0000000000000000000000000000000000000000000000000000000000000004-fe75fc6ab38c690effd73c14325e771a19c0dca5de7c7a725bcf8b002755fdab-74cd57515f7ab3b5465f6ec71743406dfde16f091109eed4b771ee4293200193",
    //     ],
    //     feetoken: PRVID,
    //     version: 2,
    //     minAcceptableAmount: 471400,
    //   },
    // });
    // let tx = await pDexV3Instance.getOrderSwapDetail({
    //   version: privacyVersion,
    //   requestTx: txSwap.txId,
    //   fromStorage: true,
    // });
    // await delay(10000);
    // tx = await pDexV3Instance.getOrderSwapDetail({
    //   version: privacyVersion,
    //   requestTx: txSwap.txId,
    //   fromStorage: true,
    // });
    // await delay(10000);
    // tx = await pDexV3Instance.getOrderSwapDetail({
    //   version: privacyVersion,
    //   requestTx: txSwap.txId,
    //   fromStorage: true,
    // });
    // await delay(10000);
    // tx = await pDexV3Instance.getOrderSwapDetail({
    //   version: privacyVersion,
    //   requestTx: txSwap.txId,
    //   fromStorage: true,
    // });
    // await delay(10000);
    // tx = await pDexV3Instance.getOrderSwapDetail({
    //   version: privacyVersion,
    //   requestTx: txSwap.txId,
    //   fromStorage: true,
    // });
  } catch (error) {
    console.log("error-TestSwap", error);
  }
}

async function TestOrderLimit(pDexV3Instance) {
  try {
    // try {
    //   const tx = await pDexV3Instance.createAndSendOrderRequestTx({
    //     extra: {
    //       minAcceptableAmount: "300000000000",
    //       poolPairID:
    //         "0000000000000000000000000000000000000000000000000000000000000004-2f8d0fa112f181a314bb0c62ac46b6e9e6a92edbf32c0ae87757e9792aff6c0f-83a1b5422302e3179e1bfd12bc8c4214b176afd469dc2340512dd904864ecb3c",
    //       sellAmount: "299462196086871900",
    //       tokenIDToBuy:
    //         "0000000000000000000000000000000000000000000000000000000000000004",
    //       tokenIDToSell:
    //         "2f8d0fa112f181a314bb0c62ac46b6e9e6a92edbf32c0ae87757e9792aff6c0f",
    //       version: 2,
    //     },
    //   });
    //   console.log("transaction", tx);
    // } catch (error) {
    //   console.log("ERROR HERE", error);
    // }
    // const { nftToken: nftid } = await pDexV3Instance.getNFTTokenData({
    //   version: privacyVersion,
    // });
    // console.log("nftid", nftid);
    // let history = await pDexV3Instance.getOrderLimitHistory({
    //   poolid:
    //     "0000000000000000000000000000000000000000000000000000000000011112-00000000000000000000000000000000000000000000000000000000000115d7-ea13985e7613aa72fe874583942dcd6b0d0aa6a28db5efe4bfedee8933751478",
    //   version: privacyVersion,
    //   token1ID:
    //     "0000000000000000000000000000000000000000000000000000000000011112",
    //   token2ID:
    //     "00000000000000000000000000000000000000000000000000000000000115d7",
    // });
    // console.log("history", history);
    // try {
    //   const txCancel = await pDexV3Instance.createAndSendWithdrawOrderRequestTx(
    //     {
    //       transfer: { fee: 100 },
    //       extra: {
    //         withdrawTokenIDs: ["123456", "12345t"],
    //         poolPairID: "111",
    //         orderID: "1234",
    //         amount: "6900010000000000000000000000000000",
    //         nftID: "nftid",
    //         version: privacyVersion,
    //         txType: 0,
    //       },
    //     }
    //   );
    //   console.log("txCancel", txCancel);
    // } catch (error) {
    //   console.log("error", error);
    // }

    // const order = await pDexV3Instance.getOrderLimitDetail({
    //   requestTx:
    //     "220bf33f0d6db3037f1cbe99acdeb2c6735450a94becb65fb671e2293894112b",
    // });
    // console.log("order", order);
    let h = await pDexV3Instance.getOpenOrderLimitHistoryFromApi({version: 2});
    let h2 = await pDexV3Instance.getOpenOrderLimitHistoryFromApi({version: 2});
  } catch (error) {
    console.log("TestOrderLimit", error);
  }
}

async function TestApiTradeServices(pDexV3Instance) {
  try {
    // const poolid =
    //   "0000000000000000000000000000000000000000000000000000000000000004-a2b4472e4213ed0b7de2b8a0eba50d3a45785afc9457734c41ced83a9a8d19bd-6c5f07541684338561cbe6ca2b8a72592bbe2b0dca692e2e533f0d8bfef08933";
    // const pairId =
    //   "0000000000000000000000000000000000000000000000000000000000000004-1411bdcae86863b0c09d94de0c6617d6729f0c5b550f6aac236931b8989207c1";
    // const pendingOrders = await pDexV3Instance.getPendingOrder({ poolid });
    // console.log("pendingOrders", pendingOrders);
    // const pricehistory = await pDexV3Instance.getPriceHistory({
    //   poolid,
    //   period: "PT1H",
    //   intervals: "PT24H",
    // });
    // console.log("pricehistory", pricehistory);
    // const tradingVolume24h = await pDexV3Instance.getTradingVolume24h(poolid);
    // console.log("tradingVolume24h", tradingVolume24h);
    const listPools = await pDexV3Instance.getListPools("all");
    console.log("listPools", listPools);
    // const poolIDS = listPools.map((pool) => pool.poolId);
    // console.log("poolIDS", poolIDS);
    // const listPoolsDetail = await pDexV3Instance.getListPoolsDetail(poolIDS);
    // console.log("listPoolsDetail", listPoolsDetail);
    // const listPair = await pDexV3Instance.getListPair();
    // console.log(listPair);
    // const estTrade = await pDexV3Instance.getEstimateTrade({
    //   selltoken: "1",
    //   buytoken: "2",
    //   amount: 1,
    //   feetoken: "feetoken",
    // });
    // console.log(estTrade);
    // const orderBook = await pDexV3Instance.getOrderBook({
    //   poolid: "1",
    //   decimal: 0.1,
    // });
    // console.log(orderBook);
    // const pricehistory = await pDexV3Instance.getPriceHistory({
    //   poolid: "1",
    //   period: "15m",
    //   datapoint: 20,
    //   fromtime: new Date().getTime(),
    // });
    // console.log(pricehistory);
    // const history = await pDexV3Instance.getHistory({
    //   poolid: "1",
    // });
    // console.log(history);
  } catch (error) {
    console.log("error here", error);
  }
}

async function TestPancake(pDexV3Instance) {
  try {
    // const tokens = await pDexV3Instance.getPancakeTokens();
    // console.log("tokens", tokens.length, tokens[0]);
    // const selltoken =
    //   "e5032c083f0da67ca141331b6005e4a3740c50218f151a5e829e9d03227e33e2";
    // const buytoken =
    //   "38fc5ad8434ef02ea77c860eb9d6824485de3d68b3be8455842a5bbf7b0940a5";
    // let tradingFee = await pDexV3Instance.estimatePancakeTradingFee({
    //   srcTokens: selltoken,
    //   destTokens: buytoken,
    //   srcQties: String(69e5),
    // });
    // console.log("tradingFee", tradingFee);
    // let history = await Promise.all([
    //   // pDexV3Instance.getSwapPancakeHistory(),
    // ]);
    const history = await pDexV3Instance.getSwapHistory({ version: 2 });

    console.log("history[0]", history[0]);
    // console.log(
    //   await pDexV3Instance.getOrderSwapPancakeDetail({
    //     version: 2,
    //     fromStorage: false,
    //     tradeID: 47,
    //     requestTx:
    //       "1c82e96328c63cd120e2256f617f9760798bdc26cc64c581a3746db402f14567",
    //   })
    // );
  } catch (error) {
    console.log(error);
  }
}

async function TestTradeService() {
  //Trade services
  let pDexV3Instance = new PDexV3();
  const account = await createAccountByPrivateKey(
    "112t8rnX3VTd3MTWMpfbYP8HGY4ToAaLjrmUYzfjJBrAcb8iPLkNqvVDXWrLNiFV5yb2NBpR3FDZj3VW8GcLUwRdQ61hPMWP4EKByC4ae3nU"
  );
  const data = {
    DeviceID: deviceID,
  };
  const authTokenDt = await Axios.post(`${rpcApiService}/auth/new-token`, data);
  const authToken = authTokenDt.data.Result.Token;
  pDexV3Instance.setAccount(account);
  pDexV3Instance.setAuthToken(authToken);
  pDexV3Instance.setRPCTradeService(rpcCoinService);
  pDexV3Instance.setRPCClient(rpcClient);
  pDexV3Instance.setStorageServices(new StorageServices());
  pDexV3Instance.setRPCApiServices(rpcApiService);
  // let defaultPool = await pDexV3Instance.getDefaultPool();
  // await pDexV3Instance.setDefaultPool("213456");
  // defaultPool = await pDexV3Instance.getDefaultPool();
  // const balance = await account.getBalance({
  //   tokenID: PRVID,
  //   version: privacyVersion,
  // });
  // console.log("balance: ", balance);
  // return await TestPancake(pDexV3Instance);
  // return await TestNFToken(pDexV3Instance);
  // return await TestFollowDefaultPool(pDexV3Instance)
  // return await TestSwap(pDexV3Instance);
  return await TestOrderLimit(pDexV3Instance, account);
  return await TestApiTradeServices(pDexV3Instance);
  // const poolid = "1234";
  // const txCancel = {
  //   cancelTxId: "1",
  //   requesttx: "1",
  //   status: -1,
  // };
  // const txCancel2 = {
  //   cancelTxId: "2",
  //   requesttx: "2",
  //   status: -1,
  // };
  // await pDexV3Instance.setCancelingOrderTx({
  //   poolid,
  //   txCancel,
  // });
  // const cancelingTxs = await pDexV3Instance.getCancelingOrderTxs({
  //   poolid,
  // });
  // console.log("cancelingTxs", cancelingTxs);
  // const volume = await pDexV3Instance.getTradingVolume24h("all");
  // console.log("volume", volume);

  const listShare = await pDexV3Instance.getListShare();
  console.log("listShare", listShare);
  // const listState = await pDexV3Instance.getListState();
  // console.log("listState", listState);
  const estTrade = await pDexV3Instance.getEstimateTrade({
    selltoken: PRVID,
    buytoken: "0fff",
    amount: 1e5,
    feetoken: PRVID,
  });
  console.log("estTrade", estTrade);
  const orders = await pDexV3Instance.getOpenOrders({ poolid: "prv-eth" });
  console.log("orders", orders);
}

async function TestWalletBackup() {
  const passphrase = "$as90_jasLsS";
  const aesKey = "40b2732280dc3eab197dc83d1b2f43ca";
  let network = "mainnet";
  let storage = new StorageServices();
  let wallet2 = new Wallet();
  let wallet = new Wallet();
  wallet.Network = network;
  wallet2.Network = network;
  let wallet2RootName = "Phat-masterkey";
  let walletRootName = "masterless";
  wallet2.RootName = wallet2RootName;
  wallet.RootName = walletRootName;
  await wallet2.init(aesKey, storage, "phat", "Anon");
  let oldMnemonic = wallet2.Mnemonic;
  await wallet2.createNewAccount("phat1");
  await wallet2.createNewAccount("phat2");
  await wallet2.save(aesKey, false);
  let list = (await wallet2.getListStorageBackup({ aesKey })) || [];
  console.log(JSON.stringify(list));
  await wallet2.loadWallet({
    password: passphrase,
    aesKey,
  });
  list = (await wallet2.getListStorageBackup({ aesKey })) || [];
  await wallet2.clearWalletStorage({ key: wallet2RootName });
  await wallet2.import(
    // "romance suspect ostrich amount deer crane false concert present evidence atom short",
    // mnemonic,
    oldMnemonic,
    aesKey,
    "masterKey",
    storage
  );
  await wallet2.loadWallet({
    password: passphrase,
    aesKey,
  });
  list = (await wallet2.getListStorageBackup({ aesKey })) || [];
  try {
    await wallet.import(
      // "romance suspect ostrich amount deer crane false concert present evidence atom short",
      // mnemonic,
      "sunny easy talent undo alter giant music slam common glide judge misery",
      aesKey,
      "masterKey",
      storage
    );
    await wallet.createNewAccount("phat1");
    await wallet.createNewAccount("phat2");
    await wallet.save(aesKey, false);
    await wallet.clearWalletStorage({ key: "masterKey" });
    await wallet.init(aesKey, storage, "masterless", "Anon");
    await wallet.createNewAccount("phat3");
    await wallet.createNewAccount("phat4");
    await wallet.save(aesKey, false);
    //   await wallet.import(
    //     // "romance suspect ostrich amount deer crane false concert present evidence atom short",
    //     // mnemonic,
    //     "sunny easy talent undo alter giant music slam common glide judge misery",
    //     aesKey,
    //     "masterless",
    //     storage
    //   );
    //   await wallet.importAccount(
    //     "112t8rnX2MPqXQc9q5cMvPRnj73BC6m4AnqesSGBTPwsqVGWxRuSPmJDfcPMDhrt5h4UhJCusQo1RBQUSLL5R8XnEL3tGnjHMNeeUeX38Qpz",
    //     "phat3"
    //   );
    //   await wallet.save(aesKey, false);

    const list = (await wallet2.getListStorageBackup({ aesKey })) || [];
    console.log(JSON.stringify(list));
    // await wallet.createNewAccount("phat3");
    // await wallet.save(aesKey, false);
    // await wallet.loadWallet({
    //   password: passphrase,
    //   aesKey,
    // });
    // console.log("list backup 2", await wallet3.getListStorageBackup({ aesKey }));
  } catch (error) {
    console.log(error);
  }
}

const keyboardNumberArr = () => {
  const keyboard = ["", "AB", "DE"];
  const input = 234;
  let result = "";
  const findAllString = (arrStr, result) => {
    for (str of arrStr) {
      // A B C
    }
  };
  const findString = (str) => {
    for (i of str) {
      console.log("i", i);
      findString(ke);
    }
  };
  findAllString(keyboard); // ["ABC", "DEF", "GHI"]
};

async function TestStakingServices() {
  //Trade services
  let pDexV3Instance = new PDexV3();
  const account = await createAccountByPrivateKey(
    "112t8rnXZyyYeXbMB2TQaSn3JGKsehpZofrJewKWy7MgaEoc2Jg6Fa4ueD4meWEoeSkEdDTvKcTKdScJudzqpUfquYKfQvp2FQqUru4LcECf"
  );
  const accountInfo = await account.getDeserializeInformation();
  console.log("accountInfo", accountInfo);
  pDexV3Instance.setAccount(accountInfo);
  pDexV3Instance.setRPCTradeService(
    "https://54ed4c3d-993b-4fc1-accd-7e7e72122248.mock.pstmn.io"
  );
  pDexV3Instance.setStorageServices(new StorageServices());
  const histories = await pDexV3Instance.getStakingHistories({
    tokenID: "0004",
    nftID: "124",
  });
  // const stakingInfo = await pDexV3Instance.getStakingData();
  // console.log('histories', histories)
}

async function TestLiquidity() {
  //Liquidity services
  let pDexV3Instance = new PDexV3();
  // await setShardNumber(2);
  const account = await createAccountByPrivateKey(
    "112t8rnY86q7sNHHZo9XEJMWgVds7kM913hc6pxqVrqzSA7LdMVZX6vgttLzGqNeHAjPofB5wHfNeKBGs6NZF7ZPfE5cge8ZC6TgtJPbuLru"
  );
  pDexV3Instance.setAccount(account);
  pDexV3Instance.setRPCTradeService(rpcCoinService);
  pDexV3Instance.setRPCClient(rpcClient);
  pDexV3Instance.setStorageServices(new StorageServices());
  const stakingData = await pDexV3Instance.serviceStakingHistories({
    tokenID: "0000000000000000000000000000000000000000000000000000000000000004",
    nftID: "7ff888813217555ad24437a4370c760642ccca4b809872ad57af5041962a7b0e",
  });
  // console.log("stakingData: ", stakingData);
  // const balance = await account.getBalance({
  //   tokenID: PRVID,
  //   version: privacyVersion,
  // });
  // return console.log("balance", balance);
  // await pDexV3Instance.setStorageWithdrawLPWithPool({
  //   poolId: '111111',
  //   nftId: '22222',
  //   txId: '9e167bad6b35370e715c204cddb79561c80d1fb20d240992d2f02cf5614dacf7',
  // })
  // const tsx = await pDexV3Instance.updateStatusStorageWithdrawLP();p
  // console.log('SANG TEST: ', tsx)
  // console.log("balance: ", balance);
  // const txMin = await pDexV3Instance.createAndMintNftTx({
  //   extra: { version: privacyVersion },
  // });
  // console.log("txMin", txMin);
  // const listShare = await pDexV3Instance.getListShare();
  // console.log("listShare: ", listShare);
  const poolIds = [
    "0000000000000000000000000000000000000000000000000000000000000004-6133dbf8e3d71a8f8e406ebd459492d34180622ba572b2d8f0fc8484b09ddd47-13a6c00e978a0073f28b19a2a1298542341fad56d0dd4eb27f0acfcede0aef35",
    "0000000000000000000000000000000000000000000000000000000000000004-6133dbf8e3d71a8f8e406ebd459492d34180622ba572b2d8f0fc8484b09ddd47-1437fbee7030f8e0d52ddb157edb2d4f61d4ca851a161f5f716d754951e57337",
    "0000000000000000000000000000000000000000000000000000000000000004-6133dbf8e3d71a8f8e406ebd459492d34180622ba572b2d8f0fc8484b09ddd47-336821fb92dd5035beb71c94be07fe429af040e7ae25e058d5972e9bcfcc1d5d",
    "0000000000000000000000000000000000000000000000000000000000000004-7a9dc93436cb29ba733ad03d3bdb841f6c7b8f6eba30b86217320b7be21cf9cb-097251ed10c56d6e01d009d7f4b033d1e23154642c3d5c0a050f812be636aeed",
  ];
  // const histories = await pDexV3Instance.getRemoveLPHistories();
  return;
  // await Promise.all([
  //   await pDexV3Instance.getContributeHistories(),
  //   await pDexV3Instance.getRemoveLPHistories(),
  //   await pDexV3Instance.getWithdrawFeeLPHistories(),
  // ]);
  // const nft = await pDexV3Instance.getNFTTokenData({
  //   version: privacyVersion,
  // });
  // const { nftToken: nftID } = nft;
  // const tokenId1 = PRVID;
  // const tokenId2 =
  //   "6133dbf8e3d71a8f8e406ebd459492d34180622ba572b2d8f0fc8484b09ddd47";
  // const poolPairID =
  //   "0000000000000000000000000000000000000000000000000000000000000004-6133dbf8e3d71a8f8e406ebd459492d34180622ba572b2d8f0fc8484b09ddd47-336821fb92dd5035beb71c94be07fe429af040e7ae25e058d5972e9bcfcc1d5d";
  // const res = await pDexV3Instance.createContributeTxs({
  //   fee: 100,
  //   tokenId1,
  //   tokenId2,
  //   amount1: 100,
  //   amount2: 1000,
  //   poolPairID,
  //   nftID,
  //   amp: 20000,
  // });
}

// to run this test flow, make sure the Account has enough PRV to stake & some 10000 of this token; both are version 1
// tokenID = "084bf6ea0ad2e54a04a8e78c15081376dbdfc2ef2ce6d151ebe16dc59eae4a47";
async function MainRoutine() {
  console.log("BEGIN WEB WALLET TEST");
  await setup();
  await TestTradeService();
  // await TestTradeService();
  // return await TestLiquidity();
  // return await TestLiquidity();
  // return TestLiquidity();
  // return await TestCreateAndSendNativeToken();
  // return TestVerifierTx();
  // return await TestLoadWallet();
  // return await TestGetTxsHistory();
  // return TestGetBurnerAddress();
  // return await TestImportAccount();
  // await TestConsolidate();
  // return await TestCreateAndSendNativeToken();
  // return await TestGetBalance();
  // await TestGetUnspentCoinsV1();
  // return;
  // sequential execution of tests; the wait might still be too short
  try {
    // return await TestGetTxsHistory();
    //Liquidity
    return await TestGetBalance();
    await delay(3000);
    stGetContributeHistories();
    await delay(3000);
    await TestGetWithdrawLiquidityHistories();
    await delay(3000);
    await TestGetWithdrawFeeLiquidityHistories();
    await delay(3000);
    await TestAddLiquidity();
    await delay(3000);
    await TestWithdrawLiquidity();
    await delay(3000);
    await TestWithdrawFeeLiquidity();
    await delay(3000);

    //Core wallet
    await TestGetTxsHistory();
    await delay(3000);
    await TestGetBalance();
    await delay(3000);
    await TestCreateAndSendNativeToken();
    await delay(3000);
    await TestCreateAndSendPrivacyTokenTransfer();
    await delay(3000);

    // Node
    await TestCreateAndSendStakingTx();
    await delay(3000);
    await TestCreateAndSendStopAutoStakingTx();
    await delay(3000);
    await TestCreateAndSendRewardAmountTx();
    await delay(3000);

    //Trade
    await TestCustomTradeRequest();
    await delay(3000);

    //Unshield
    await TestBurningRequestTx();
    await delay(3000);

    //Init token
    await TestInitToken();
    await delay(3000);

    //Convert
    await TestGetUnspentCoinsByTokenIdV1();
    await delay(3000);
    await TestConvertCoinsV1();

    return;

    // console.log("RESULT", result);
    // return await TestGetBalance();
    // let txh;
    // txh = await TestCustomTradeRequest(null, tokenID, 10000, 800);
    // console.log(txh);
    // return;
    // return await TestGetBalance();
    //  return await TestCreateAndSendNativeToken();

    //  await TestCreateAndSendNativeToken();
    // await setup();
    // const result = await accountSender.getPDeState();
    // console.log("result", result);
    // return;

    return;
    return await TestCreateAndSendPrivacyTokenTransfer();
    // await GetUnspentCoinV1();
    // await TestCreateAndSendConvertTx();
    await TestGetAllPrivacyTokenBalance();
    txh = await TestCreateAndSendConversion();
    await accountSender.waitTx(txh, 5);
    txh = await TestCreateAndSendNativeToken();
    await accountSender.waitTx(txh, 5);

    // txh = await TestCreateAndSendStakingTx();
    // await accountSender.waitTx(txh, 5);
    await GetListReceivedTx();
    await TestStakerStatus();
    await accountSender.waitTx(txh, 10);
    txh = await TestCreateAndSendTokenConversion();
    await accountSender.waitTx(txh, 5);
    // txh = await TestCreateAndSendStopAutoStakingTx();
    // await accountSender.waitTx(txh, 5);
    // deprecated init-token method
    // let temp = await TestCreateAndSendPrivacyTokenInit();
    // await accountSender.waitTx(temp.Response.txId, 5);
    txh = await TestSendMultiple();
    await accountSender.waitTx(txh, 5);
    // burning will return an error since this is not a bridge token
    txh = await TestBurningRequestTx();
    if (txh) {
      await accountSender.waitTx(txh, 5);
    }
    txh = await TestCreateAndSendPrivacyTokenTransfer();
    await accountSender.waitTx(txh, 5);

    // tokenID = temp.tokenID;
    // console.log("New token", temp.tokenID);
    // txh = await TestCreateAndSendPrivacyTokenTransfer();
    await accountSender.waitTx(txh, 5);
    await TestGetOutputCoins();
  } catch (e) {
    console.log("Test failed");
    console.error(e);
  }
  console.log("END WEB WALLET TEST");
}
MainRoutine();

// to run this test flow, make sure the Account has about 2.5mil PRV, 120k of each of FIRST and SECOND token; all version 2
async function PDERoutine() {
  console.log("BEGIN PDE TEST");
  try {
    let txh;
    // // 10:1 ratio; contribute 1mil PRV and 100k token
    txh = await TestCustomContribution("first-prv", null, 1000000);
    // console.debug(txh);
    await accountSender.waitTx(txh, 5);
    txh = await TestCustomContribution("first-prv", tokenID, 100000);
    await accountSender.waitTx(txh, 5);
    // sell 10000 PRV for at least 800 token
    txh = await TestCustomTradeRequest(null, tokenID, 10000, 800);
    await accountSender.waitTx(txh, 5);
    // sell 1000 token for at least 8000 PRV
    txh = await TestCustomTradeRequest(tokenID, null, 1000, 8000);
    // the final wait time is extended to accomodate beacon response delay
    await accountSender.waitTx(txh, 15);

    // to cross trade, we need the above pair and a new second-prv pair
    // also 10:1 ratio
    txh = await TestCustomContribution("second-prv", null, 1000000);
    await accountSender.waitTx(txh, 5);
    txh = await TestCustomContribution("second-prv", secondTokenID, 100000);
    await accountSender.waitTx(txh, 5);
    // sell 15000 FIRST for at least 14000 SECOND
    txh = await TestCustomTradeRequest(tokenID, secondTokenID, 15000, 10000);
    await accountSender.waitTx(txh, 5);
    // sell 5000 SECOND for at least 4000 PRV
    txh = await TestCustomTradeRequest(secondTokenID, tokenID, 5000, 3000);
    await accountSender.waitTx(txh, 15);

    // withdraw some from the first pair
    txh = await TestCreateAndSendPDEWithdrawTx();
    await accountSender.waitTx(txh, 5);
    // deprecated test flows
    // await TestCreateAndSendPRVContributionTx();
    // await wallet.sleep(10000);
    // await TestCreateAndSendPTokenContributionTx();
    // await wallet.sleep(30000);
    // await TestCreateAndSendNativeTokenTradeRequestTx();
    // await wallet.sleep(30000);
    // await TestCreateAndSendPTokenTradeRequestTx();
    // await wallet.sleep(100000);

    console.log("Remember to check the balance of these accounts");
  } catch (e) {
    console.log("Test failed");
    console.error(e);
  }
  console.log("END PDE TEST");
}
// PDERoutine();

// to use this test flow, make sure acc1 has some 10000s in PRV in version 2 coins
async function DefragmentRoutine() {
  console.log("BEGIN DEFRAG TEST");
  try {
    await TestMakeFragments();
    // await wallet.sleep(20000);
    await TestDefragment();
  } catch (e) {
    console.log("Test failed");
    console.error(e);
  }
  console.log("END DEFRAG TEST");
}
// DefragmentRoutine()

module.exports = {
  MainRoutine,
  PDERoutine,
  DefragmentRoutine,
};
