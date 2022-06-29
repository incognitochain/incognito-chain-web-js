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
} = require("../../");
const { PaymentAddressType } = constants;

const TESTNET_BTC_ID = "4584d5e9b2fc0337dfb17f4b5bb025e5b82c38cfa4f54e8a3d4fcdd03954ff82";
const MAINNET_BTC_ID = "b832e5d3b1f01a4f0623f7fe91d6673461e1f5d37d91fe78c5c2e6183ff39696";

// const rpcClient = "https://lb-fullnode.incognito.org/fullnode";
//  new RpcClient("https://mainnet.incognito.org/fullnode");
// const rpcClient = "https://testnet.incognito.org/fullnode";
const rpcClient = "http://localhost:9334";
// const rpcClient = new RpcClient("https://dev-test-node.incognito.org");
// const rpcClient = new RpcClient("http://54.39.158.106:9334");
// const rpcClient = new RpcClient("http://139.162.55.124:8334");   // dev-net
// const rpcClient = "https://testnet1.incognito.org/fullnode"; //testnet1
// "http://139.162.55.124:8334";

const stagingServices = "https://api-coinservice-staging.incognito.org";

const rpcCoinService =
  // "https://api-coinservice.incognito.org"; //mainnet
  stagingServices; //testnet
// "https://api-coinservice-staging2.incognito.org"; // testnet1
// "http://51.161.119.66:9009"; //dev-test-coin-service
const rpcTxService = `${stagingServices}/txservice`;
//  "https://api-coinservice.incognito.org/txservice"; mainnet
// "https://api-coinservice-staging.incognito.org/txservice";
//  "https://api-coinservice-staging2.incognito.org/txservice"; // testnet1
//  "http://51.161.119.66:8001"; //dev-test-coin-service
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
let account1PrivateKeyStr;
let senderKeyWallet;
let account1;
let account1PaymentAddressStr;
let receiverPaymentAddrStr;
let receiverPaymentAddrStr2;

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
  // senderPrivateKeyStr =
  //   "1139jtfTYJysjtddB4gFs6n3iW8YiDeFKWcKyufRmsb2fsDssj3BWCYXSmNtTR277MqQgHeiXpTWGit9r9mBUJfoyob5besrF9AW9HpLC4Nf";
  account1PrivateKeyStr =
    "112t8rnjeorQyyy36Vz5cqtfQNoXuM7M2H92eEvLWimiAtnQCSZiP2HXpMW7mECSRXeRrP8yPwxKGuziBvGVfmxhQJSt2KqHAPZvYmM1ZKwR";
  // "112t8rniqSuDK8vdvHXGzkDzthVG6tsNtvZpvJEvZc5fUg1ts3GDPLWMZWFNbVEpNHeGx8vPLLoyaJRCUikMDqPFY1VzyRbLmLyWi4YDrS7h";
  account1 = new AccountWallet(Wallet);
  account1.setRPCCoinServices(rpcCoinService);
  account1.setRPCClient(rpcClient);
  account1.setRPCTxServices(rpcTxService);
  account1.setRPCRequestServices(rpcRequestService);
  const data = {
    DeviceID: deviceID,
  };
  const authTokenDt = await Axios.post(`${rpcApiService}/auth/new-token`, data);
  const authToken = authTokenDt.data.Result.Token;
  account1.setRPCApiServices(rpcApiService, authToken);
  await account1.setKey(account1PrivateKeyStr);
  account1PaymentAddressStr =
    account1.key.base58CheckSerialize(PaymentAddressType);
  // await accountSender.submitKeyAndSync([PRVIDSTR, tokenID, secondTokenID]);
//   receiverPaymentAddrStr =
//     "12shR6fDe7ZcprYn6rjLwiLcL7oJRiek66ozzYu3B3rBxYXkqJeZYj6ZWeYy4qR4UHgaztdGYQ9TgHEueRXN7VExNRGB5t4auo3jTgXVBiLJmnTL5LzqmTXezhwmQvyrRjCbED5xVWf4ETHbRCSP";
//   receiverPaymentAddrStr2 =
//     "12sm28usKxzw8HuwGiEojZZLWgvDinAkmZ3NvBNRQLuPrf5LXNLXVXiu4VBCMVDrDm97qjLrgFck3P36UTSWfqNX1PBP9PBD78Cpa95em8vcnjQrnwDNi8EdkdkSA6CWcs4oFatQYze7ETHAUBKH";
}

async function TestGenerateShieldingAddress() {
  try {
    let shieldingAddress = await account1.handleGenerateShieldingAddress (
      { tokenID: TESTNET_BTC_ID, incAddress: account1PaymentAddressStr, chainName : "testnet" }
    );
    console.log("shieldingAddress: ", shieldingAddress);
  } catch(e) {
    console.log("error: ", e);
  }
}

async function RunPortalTests() {
    await setup();

    TestGenerateShieldingAddress()
}

RunPortalTests()