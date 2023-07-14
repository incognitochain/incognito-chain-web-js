const { default: Axios } = require("axios");
const {
  Wallet,
  Account: AccountWallet,
  constants,
  init,
  StorageServices,
  newMnemonic,
  isPaymentAddress,
  isOldPaymentAddress,
  VerifierTx,
  setShardNumber,
  StatelessTransactor,
  RpcClient,
} = require("../../");
// const { StatelessTransactor } = require("../../")
// const { StatelessTransactor } = require("@lib/tx/stateless");
// const { RpcClient } = require("@lib/wallet");
const { PaymentAddressType, BurningPRVBEP20RequestMeta } = constants;

const TESTNET_BTC_ID = "4584d5e9b2fc0337dfb17f4b5bb025e5b82c38cfa4f54e8a3d4fcdd03954ff82";
const MAINNET_BTC_ID = "b832e5d3b1f01a4f0623f7fe91d6673461e1f5d37d91fe78c5c2e6183ff39696";

// const rpcClient = "https://lb-fullnode.incognito.org/fullnode";
//  new RpcClient("https://mainnet.incognito.org/fullnode");
// const rpcClient = "https://testnet.incognito.org/fullnode";
const rpcClient = "http://localhost:9334";


const stagingServices = "https://api-coinservice-staging.incognito.org";

// const rpcCoinService =
//   // "https://api-coinservice.incognito.org"; //mainnet
//   // stagingServices; //testnet
//   rpcClient;
// "https://api-coinservice-staging2.incognito.org"; // testnet1
// "http://51.161.119.66:9009"; //dev-test-coin-service
// const rpcTxService = `${stagingServices}/txservice`;
// const rpcTxService = "https://api-coinservice-staging.incognito.org/txservice";
//  "https://api-coinservice.incognito.org/txservice"; mainnet
// "https://api-coinservice-staging.incognito.org/txservice";
//  "https://api-coinservice-staging2.incognito.org/txservice"; // testnet1
//  "http://51.161.119.66:8001"; //dev-test-coin-service
// const rpcRequestService = `${stagingServices}/airdrop-service`;
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
let account1PrivateKeyStr;
let account1;
let account1PaymentAddressStr;
let stateLess;

const PRVID =
  "0000000000000000000000000000000000000000000000000000000000000004";

async function setup() {
  await init();
  // await sleep(10000);
  wallet = new Wallet();
  wallet = await wallet.init(
    "password",
    new StorageServices(),
    "Master",
    "Anon"
  );
  console.log("setShardNumber: ", setShardNumber);
  await setShardNumber(1);
  // TODO: fill the private key
  account1PrivateKeyStr =
    "";
  account1 = new AccountWallet(Wallet);
  // account1.setRPCCoinServices(rpcCoinService);
  account1.setRPCClient(rpcClient);
  // account1.setRPCTxServices(rpcTxService);
  // account1.setRPCRequestServices(rpcRequestService);
  await account1.setKey(account1PrivateKeyStr);
  account1PaymentAddressStr =
    account1.key.base58CheckSerialize(PaymentAddressType);
  // await account1.submitKeyAndSync([PRVIDSTR, tokenID, secondTokenID]);
  //   receiverPaymentAddrStr =
  //     "12shR6fDe7ZcprYn6rjLwiLcL7oJRiek66ozzYu3B3rBxYXkqJeZYj6ZWeYy4qR4UHgaztdGYQ9TgHEueRXN7VExNRGB5t4auo3jTgXVBiLJmnTL5LzqmTXezhwmQvyrRjCbED5xVWf4ETHbRCSP";
  //   receiverPaymentAddrStr2 =
  //     "12sm28usKxzw8HuwGiEojZZLWgvDinAkmZ3NvBNRQLuPrf5LXNLXVXiu4VBCMVDrDm97qjLrgFck3P36UTSWfqNX1PBP9PBD78Cpa95em8vcnjQrnwDNi8EdkdkSA6CWcs4oFatQYze7ETHAUBKH";

  let w = new Wallet();
  let rpc = new RpcClient(rpcClient);
  console.log("StatelessTransactor: ", StatelessTransactor);
  console.log("Account: ", AccountWallet);
  stateLess = new StatelessTransactor({ rpc });
  stateLess.init(rpcClient);
  stateLess.setKey(account1PrivateKeyStr);
}

async function TestConvertPUnifiedToken() {
  let fee = 10;
  let convertAmount = 1000;
  // LINK (PLG)
  let tokenID = 'd43a67133bba907d04691c2b0e918c48b04db1a6ac2d03dd10f42b70422f12d6';
  let pUnifiedTokenID = 'b35756452dc1fa1260513fa121c20c2b516a8645f8d496fa4235274dac0b1b52';
  // let networkID = 3;

  try {
    let result = await account1.createAndSendConvertUnifiedTokenRequestTx(
      {
        transfer: { fee, tokenID },
        extra: {
          pUnifiedTokenID,
          convertAmount,
          version: 2,
        },
      }
    );
    console.log("result: ", result);
  } catch (e) {
    console.log("error: ", e);
  }
}

async function TestUnshieldPUnifiedToken() {
  let fee = 20;
  //todo
  let unshieldAmount = 1000;
  let remoteAddress = '0xF91cEe2DE943733e338891Ef602c962eF4D7Eb81';
  let unshieldingTokenID = 'b35756452dc1fa1260513fa121c20c2b516a8645f8d496fa4235274dac0b1b52';
  let networkID = 3;
  let incTokenID = "d43a67133bba907d04691c2b0e918c48b04db1a6ac2d03dd10f42b70422f12d6";
  let tokenPayments = [
    // {
    // // "paymentAddress": "12se7yYqc4dwhyBa9iud3b3jXqN9gGVBMcGx6ToFiyZDPo7wNV6GDL18Qb47rrnHQzQPrBFaUERkNTZno72F1Q9uY3cHhRW16xXTn5L5XAWhmq7HYjfBr1fvuP9Zb1it1HCuT9miC8qkxHa3521w", 
    // // "amount": 674990
    // }
  ];
  let prvPayments = [
    // {
    // // "paymentAddress": "12se7yYqc4dwhyBa9iud3b3jXqN9gGVBMcGx6ToFiyZDPo7wNV6GDL18Qb47rrnHQzQPrBFaUERkNTZno72F1Q9uY3cHhRW16xXTn5L5XAWhmq7HYjfBr1fvuP9Zb1it1HCuT9miC8qkxHa3521w", 
    // // "amount": 100
    // }
  ];

  let burningInfos = [{
    incTokenID: incTokenID,
    burningAmount: unshieldAmount,
    expectedAmount: 1000,
    remoteAddress: remoteAddress
  }];

  try {
    let result = await account1.createAndSendBurnUnifiedTokenRequestTx(
      {
        transfer: { fee, tokenID: unshieldingTokenID, prvPayments, tokenPayments },
        extra: {
          burningInfos: burningInfos,
          txHashHandler: null,
          version: 2,
        },
      }
    );
    console.log("result: ", result);
  } catch (e) {
    console.log("error: ", e);
  }
}

async function TestCreateAndSendBurningPegPRVRequestTx() {
  const BurningPRVRequestMeta = 338;
  let fee = 1e8;
  //todo
  let unshieldAmount = 3000;
  let remoteAddress = '0xF91cEe2DE943733e338891Ef602c962eF4D7Eb81';
  let paymentTokenID = "d88840264322db699177328ee5901f42fb78d7b4958b791bd03ca87fa2390f4b";
  let tokenPayments = [
    {
      "paymentAddress": "12svfkP6w5UDJDSCwqH978PvqiqBxKmUnA9em9yAYWYJVRv7wuXY1qhhYpPAm4BDz2mLbFrRmdK3yRhnTqJCZXKHUmoi7NV83HCH2YFpctHNaDdkSiQshsjw2UFUuwdEvcidgaKmF3VJpY5f8RdN",
      "amount": 1000
    }
  ];
  let prvPayments = [
    // {
    // // "paymentAddress": "12se7yYqc4dwhyBa9iud3b3jXqN9gGVBMcGx6ToFiyZDPo7wNV6GDL18Qb47rrnHQzQPrBFaUERkNTZno72F1Q9uY3cHhRW16xXTn5L5XAWhmq7HYjfBr1fvuP9Zb1it1HCuT9miC8qkxHa3521w", 
    // // "amount": 100
    // }
  ];

  try {
    let result = await account1.createAndSendBurningPegPRVRequestTx(
      {
        transfer: { fee, prvPayments, tokenPayments, paymentTokenID },
        extra: {
          txHashHandler: null,
          version: 2,
          burningType: BurningPRVRequestMeta,
          burnAmount: unshieldAmount,
          remoteAddress: remoteAddress,
        },
      }
    );
    console.log("result: ", result);
  } catch (e) {
    console.log("error: ", e);
  }
}


async function TestCreateAndSendInscribeRequestTx() {
  const BurningPRVRequestMeta = 338;
  let fee = 1e8;
  //todo
  let unshieldAmount = 3000;
  let remoteAddress = '0xF91cEe2DE943733e338891Ef602c962eF4D7Eb81';
  let paymentTokenID = "d88840264322db699177328ee5901f42fb78d7b4958b791bd03ca87fa2390f4b";
  let tokenPayments = [
    {
      "paymentAddress": "12svfkP6w5UDJDSCwqH978PvqiqBxKmUnA9em9yAYWYJVRv7wuXY1qhhYpPAm4BDz2mLbFrRmdK3yRhnTqJCZXKHUmoi7NV83HCH2YFpctHNaDdkSiQshsjw2UFUuwdEvcidgaKmF3VJpY5f8RdN",
      "amount": 1000
    }
  ];
  let prvPayments = [
    // {
    // // "paymentAddress": "12se7yYqc4dwhyBa9iud3b3jXqN9gGVBMcGx6ToFiyZDPo7wNV6GDL18Qb47rrnHQzQPrBFaUERkNTZno72F1Q9uY3cHhRW16xXTn5L5XAWhmq7HYjfBr1fvuP9Zb1it1HCuT9miC8qkxHa3521w", 
    // // "amount": 100
    // }
  ];

  let dataobj = { a: "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" };

  try {
    let result = await stateLess.createAndSendInscribeRequestTx(
      {
        transfer: {},
        extra: {
          txHashHandler: null,
          version: 2,
          data: JSON.stringify(dataobj),
        },
      }
    );
    console.log("result: ", result);
  } catch (e) {
    console.log("error: ", e);
  }
}

async function RunPUnifiedTokenTests() {
  await setup();

  // TestConvertPUnifiedToken();
  // TestUnshieldPUnifiedToken();
  await TestCreateAndSendInscribeRequestTx();
}

RunPUnifiedTokenTests()